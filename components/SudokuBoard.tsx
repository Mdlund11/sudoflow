import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useStats } from '../context/StatsContext';
import { useThemeColor } from '../hooks/use-theme-color';
import { getNewlyCompletedRegions } from '../utils/completionUtils';
import { loadBoard, saveBoard, saveTimer } from '../utils/storage';
import { checkSolution, findConflicts, generateSudoku } from '../utils/sudoku';
import { formatTime } from '../utils/timeUtils';
import Cell from './Cell';
import Timer from './Timer';

const SudokuBoard: React.FC = () => {
  const [board, setBoard] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<boolean[][]>([]);
  const [notes, setNotes] = useState<number[][][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [conflictCells, setConflictCells] = useState<{ row: number; col: number }[]>([]);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Expert'>('Medium');
  const [isNoteMode, setIsNoteMode] = useState<boolean>(false);
  const [isSolved, setIsSolved] = useState(false);
  const [gameId, setGameId] = useState<number>(0);
  const router = useRouter();

  const { highlightEnabled, autoRemoveNotes, hideSolvedNumbers, completionAnimationsEnabled, streakTrackingEnabled } = useSettings();
  const { recordGameCompletion } = useStats();
  const [history, setHistory] = useState<{ board: number[][]; notes: number[][][] }[]>([]);

  // Animation state: simple trigger ID and map of delays for the wave
  const [animationState, setAnimationState] = useState<{
    id: number; // Unique trigger ID
    delays: Record<string, number>; // Map "row,col" -> delay in ms
  }>({ id: 0, delays: {} });

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const primaryColor = useThemeColor({}, 'primary');
  const primaryLightColor = useThemeColor({}, 'primaryLight');
  const borderColor = useThemeColor({}, 'border');
  const borderDarkColor = useThemeColor({}, 'borderDark');

  // Cleanup animation state after it should have finished
  React.useEffect(() => {
    if (animationState.id !== 0) {
      const timeout = setTimeout(() => {
        setAnimationState({ id: 0, delays: {} });
      }, 500); // 500ms is enough for a 300ms animation
      return () => clearTimeout(timeout);
    }
  }, [animationState.id]);

  // Aggressive responsive scaling:
  // We subtract space for Top Info / Status bar (~80) and Bottom Controls (~180 on iPad, ~220 on phone)
  // Let's use a safe 300px overhead to ensure EVERYTHING fits on any aspect ratio.
  const uiOverhead = Platform.OS === 'web' ? 250 : 280;
  const availableHeight = height - insets.top - insets.bottom - uiOverhead;
  const maxBoardSize = Math.min(width * 0.95, availableHeight);
  const cellSize = Math.floor(maxBoardSize / 9);
  const boardSize = cellSize * 9;

  // Scale numbers to always match the board width (ensure they fill the row)
  const numButtonWidth = Math.floor((width - SPACING.m * 2) / 9.5);
  // Cap the button width so they don't look ridiculous on ultra-wide screens, 
  // but keep it large for iPad.
  const finalNumButtonWidth = Math.min(numButtonWidth, boardSize / 9);
  const numButtonHeight = Math.floor(finalNumButtonWidth * 1.3);

  const loadGame = async () => {
    const savedData = await loadBoard();
    if (savedData && savedData.board && savedData.initialBoard && savedData.difficulty) {
      setBoard(savedData.board);
      setInitialBoard(savedData.initialBoard);
      setDifficulty(savedData.difficulty);
      setConflictCells(findConflicts(savedData.board));

      // Check if already solved
      const solved = checkSolution(savedData.board);
      setIsSolved(solved);

      // Generate a game ID based on board content to reset timer on new game
      // We use a simple sum or hash, or just a timestamp if it was saved
      // For now, let's use a timestamp if we had one, or just random
      setGameId(Date.now());

      if (savedData.notes) {
        setNotes(savedData.notes);
      } else {
        setNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => [])));
      }
    } else {
      // Auto-generate Easy game if no saved game exists
      const newBoard = generateSudoku('Easy');
      const newInitialBoard = newBoard.map(row => row.map(cell => cell !== 0));
      const initialNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));

      setBoard(newBoard);
      setInitialBoard(newInitialBoard);
      setDifficulty('Easy');
      setNotes(initialNotes);
      setGameId(Date.now());
      setIsSolved(false);

      saveBoard({
        board: newBoard,
        initialBoard: newInitialBoard,
        difficulty: 'Easy',
        notes: initialNotes
      });
      saveTimer(0);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGame();
    }, [])
  );

  const handleUndo = () => {
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setBoard(previousState.board);
    setNotes(previousState.notes);
    setHistory(newHistory);

    const conflicts = findConflicts(previousState.board);
    setConflictCells(conflicts);
    saveBoard({ board: previousState.board, initialBoard, difficulty, notes: previousState.notes });
  };

  const handleCellChange = (row: number, col: number, value: number) => {
    // Save current state to history before changing
    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      notes: notes.map(r => r.map(c => [...c]))
    }]);

    const oldBoard = board.map(r => r.slice());
    const newBoard = board.map(r => r.slice());
    newBoard[row][col] = value;

    const newNotes = notes.map(r => r.map(c => [...c]));
    if (value !== 0) {
      newNotes[row][col] = []; // Clear notes in the placed cell

      // Auto-remove notes logic
      if (autoRemoveNotes) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (r === row || c === col || (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3))) {
              newNotes[r][c] = newNotes[r][c].filter(n => n !== value);
            }
          }
        }
      }

      // Check for newly completed regions and trigger animations
      if (completionAnimationsEnabled) {
        const completedRegions = getNewlyCompletedRegions(oldBoard, newBoard, row, col);
        if (completedRegions.length > 0) {
          const delays: Record<string, number> = {};

          completedRegions.forEach(region => {
            region.cells.forEach((cell) => {
              const key = `${cell.row},${cell.col}`;
              delays[key] = 0; // Flash all at once
            });
          });

          // Trigger all animations at once with a new ID
          if (Object.keys(delays).length > 0) {
            setAnimationState({
              id: Date.now(),
              delays
            });
          }
        }
      }
    }

    const conflicts = findConflicts(newBoard);
    saveBoard({ board: newBoard, initialBoard, difficulty, notes: newNotes });
    setBoard(newBoard);
    setNotes(newNotes);
    setConflictCells(conflicts);

    if (value !== 0 && conflicts.length === 0 && checkSolution(newBoard)) {
      setIsSolved(true);
    }
  };

  const handleGameComplete = (finalSeconds: number) => {
    recordGameCompletion(difficulty).then(({ totalGames, currentStreak }) => {
      const formattedTime = formatTime(finalSeconds);
      let message = `Congratulations! You solved the puzzle in ${formattedTime}!\n\nTotal games completed: ${totalGames}`;
      if (streakTrackingEnabled && currentStreak > 0) {
        message += `\nDaily streak: ${currentStreak} 🔥`;
      }
      Alert.alert('Victory!', message);
    });
  };

  const handleNoteChange = (row: number, col: number, num: number) => {
    // Save current state to history before changing
    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      notes: notes.map(r => r.map(c => [...c]))
    }]);

    const newNotes = notes.map(r => r.map(c => [...c]));
    const cellNotes = newNotes[row][col];

    if (cellNotes.includes(num)) {
      newNotes[row][col] = cellNotes.filter(n => n !== num);
    } else {
      newNotes[row][col] = [...cellNotes, num].sort();
    }

    setNotes(newNotes);
    saveBoard({ board, initialBoard, difficulty, notes: newNotes });
  };

  const handleSelectCell = (row: number, col: number) => {
    setSelectedCell({ row, col });
  };

  const handleNumberPress = (num: number) => {
    if (selectedCell && !initialBoard[selectedCell.row]?.[selectedCell.col]) {
      if (isNoteMode) {
        handleNoteChange(selectedCell.row, selectedCell.col, num);
      } else {
        handleCellChange(selectedCell.row, selectedCell.col, num);
      }
    }
  };

  const handleClearPress = () => {
    if (selectedCell && !initialBoard[selectedCell.row]?.[selectedCell.col]) {
      handleCellChange(selectedCell.row, selectedCell.col, 0);
    }
  };

  const toggleNoteMode = () => {
    setIsNoteMode(!isNoteMode);
  };

  if (board.length === 0) return null;

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.infoContainer}>
          <View style={[styles.difficultyBadge, { backgroundColor: primaryLightColor }]}>
            <Text style={[styles.difficultyText, { color: primaryColor }]}>{difficulty}</Text>
          </View>
          <Timer key={gameId} isSolved={isSolved} onComplete={handleGameComplete} />
        </View>

        <View style={[styles.board, { width: boardSize + 4, height: boardSize + 4, borderColor: borderDarkColor, backgroundColor: surfaceColor }]}>
          {board.flat().map((cell, index) => {
            const rowIndex = Math.floor(index / 9);
            const colIndex = index % 9;
            const isConflict = conflictCells.some(c => c.row === rowIndex && c.col === colIndex);

            // Get animation delay for this cell if it's part of the current wave
            const cellKey = `${rowIndex},${colIndex}`;
            const animationDelay = animationState.delays[cellKey];

            let isHighlightRow = false;
            let isHighlightCol = false;
            let isHighlightBlock = false;
            let isHighlightNumber = false;

            if (selectedCell) {
              const { row: selectedRow, col: selectedCol } = selectedCell;
              const selectedValue = board[selectedRow][selectedCol];

              if (highlightEnabled) {
                isHighlightRow = rowIndex === selectedRow;
                isHighlightCol = colIndex === selectedCol;
                isHighlightBlock = Math.floor(rowIndex / 3) === Math.floor(selectedRow / 3) && Math.floor(colIndex / 3) === Math.floor(selectedCol / 3);
              }

              isHighlightNumber = selectedValue !== 0 && cell === selectedValue;
            }

            return (
              <Cell
                key={index}
                row={rowIndex}
                col={colIndex}
                value={cell}
                notes={notes[rowIndex]?.[colIndex] || []}
                isSelected={selectedCell?.row === rowIndex && selectedCell?.col === colIndex}
                onPress={() => handleSelectCell(rowIndex, colIndex)}
                size={cellSize}
                isInitial={initialBoard[rowIndex]?.[colIndex]}
                isConflict={isConflict}
                isHighlightRow={isHighlightRow}
                isHighlightCol={isHighlightCol}
                isHighlightBlock={isHighlightBlock}
                isHighlightNumber={isHighlightNumber}
                animationTrigger={animationDelay !== undefined ? animationState.id : undefined}
                animationDelay={animationDelay}
              />
            );
          })}
        </View>

        <View style={styles.controlsContainer}>
          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={toggleNoteMode}
            >
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons
                  name={isNoteMode ? "pencil" : "pencil-outline"}
                  size={28}
                  color={isNoteMode ? primaryColor : textColor}
                />
                <View style={[styles.badge, { backgroundColor: isNoteMode ? primaryColor : textColor, borderColor: surfaceColor }]}>
                  <Text style={[styles.badgeText, { color: surfaceColor }]}>{isNoteMode ? 'ON' : 'OFF'}</Text>
                </View>
              </View>
              <Text style={[styles.toolButtonText, { color: isNoteMode ? primaryColor : textColor }]}>
                Notes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, history.length === 0 && { opacity: 0.5 }]}
              onPress={handleUndo}
              disabled={history.length === 0}
            >
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons name="undo" size={28} color={textColor} />
              </View>
              <Text style={[styles.toolButtonText, { color: textColor }]}>Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleClearPress}
            >
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons name="eraser" size={28} color={textColor} />
              </View>
              <Text style={[styles.toolButtonText, { color: textColor }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.numberPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
              // Count occurrences of this number on the board
              const count = board.flat().filter(cell => cell === num).length;
              const isNumberSolved = count === 9;

              if (hideSolvedNumbers && isNumberSolved) {
                return <View key={num} style={{ width: finalNumButtonWidth, height: numButtonHeight }} />;
              }

              return (
                <TouchableOpacity
                  key={num}
                  style={[styles.numButton, { width: finalNumButtonWidth, height: numButtonHeight, backgroundColor: surfaceColor }]}
                  onPress={() => handleNumberPress(num)}
                >
                  <Text style={[styles.numButtonText, { fontSize: finalNumButtonWidth * 0.5, color: textColor }]}>{num}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: surfaceColor }]}
              onPress={() => router.push('/statistics')}
            >
              <MaterialCommunityIcons name="chart-bar" size={24} color={primaryColor} />
              <Text style={[styles.actionButtonText, { color: textColor }]}>Stats</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: surfaceColor }]}
              onPress={() => router.push('/new-game')}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color={primaryColor} />
              <Text style={[styles.actionButtonText, { color: textColor }]}>New Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: SPACING.m,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginBottom: SPACING.m,
  },
  difficultyBadge: {
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: RADIUS.full,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  board: {
    borderWidth: 2,
    borderRadius: RADIUS.m,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden', // Ensure cells don't bleed out of rounded corners
    ...SHADOWS.medium,
  },
  controlsContainer: {
    marginTop: SPACING.l,
    width: '100%',
    alignItems: 'center',
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '95%',
    alignSelf: 'center',
    paddingHorizontal: SPACING.s,
  },
  numButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.s,
    ...SHADOWS.small,
    // Removed border for cleaner look, shadow provides depth
  },
  numButtonText: {
    fontWeight: '600',
  },
  toolsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.l,
    justifyContent: 'center',
    width: '100%',
    gap: SPACING.xl, // Use gap for spacing between tools
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.m,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  toolButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '95%',
    gap: SPACING.m,
    marginTop: SPACING.xl,
    paddingBottom: SPACING.l,
    alignSelf: 'center',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.m,
    borderRadius: RADIUS.m,
    gap: SPACING.s,
    ...SHADOWS.small,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SudokuBoard;
