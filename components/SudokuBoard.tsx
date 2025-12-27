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
import { loadBoard, saveBoard, saveTimer } from '../utils/storage';
import { checkSolution, findConflicts, generateSudoku } from '../utils/sudoku';
import { formatTime } from '../utils/timeUtils';
import Cell from './Cell';
import Timer, { TimerRef } from './Timer';

const SudokuBoard: React.FC = () => {
  const [board, setBoard] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<boolean[][]>([]);
  const [notes, setNotes] = useState<number[][][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [conflictCells, setConflictCells] = useState<{ row: number; col: number }[]>([]);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Expert'>('Medium');
  const [isNoteMode, setIsNoteMode] = useState<boolean>(false);
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [solution, setSolution] = useState<number[][]>([]);
  const [gameId, setGameId] = useState<number>(0);
  const router = useRouter();

  const { highlightEnabled, autoRemoveNotes, hideSolvedNumbers, completionAnimationsEnabled, streakTrackingEnabled, mistakeLimitEnabled, maxMistakes } = useSettings();
  const { recordGameCompletion, recordGameFailure } = useStats();
  const [history, setHistory] = useState<{ board: number[][]; notes: number[][][] }[]>([]);
  const [hasShownEndGameAlert, setHasShownEndGameAlert] = useState<boolean>(false);

  // Animation state: simple trigger ID and map of delays for the wave
  const [animationState, setAnimationState] = useState<{
    id: number; // Unique trigger ID
    delays: Record<string, number>; // Map "row,col" -> delay in ms
  }>({ id: 0, delays: {} });

  const timerRef = React.useRef<TimerRef>(null);

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

  const uiOverhead = Platform.OS === 'web' ? 250 : 280;
  const availableHeight = height - insets.top - insets.bottom - uiOverhead;
  const maxBoardSize = Math.min(width * 0.95, availableHeight);
  const cellSize = Math.floor(maxBoardSize / 9);
  const boardSize = cellSize * 9;

  const numButtonWidth = Math.floor((width - SPACING.m * 2) / 9.5);
  const finalNumButtonWidth = Math.min(numButtonWidth, boardSize / 9);
  const numButtonHeight = Math.floor(finalNumButtonWidth * 1.3);

  const loadGame = async () => {
    const savedData = await loadBoard();
    if (savedData && savedData.board && savedData.initialBoard && savedData.difficulty) {
      setBoard(savedData.board);
      setInitialBoard(savedData.initialBoard);
      setDifficulty(savedData.difficulty);
      setConflictCells(findConflicts(savedData.board));
      setSolution(savedData.solution || []);
      setMistakes(savedData.mistakes || 0);
      setIsFailed(savedData.isFailed || false);
      setHasShownEndGameAlert(savedData.hasShownEndGameAlert || false);

      // Check if already solved
      const solved = checkSolution(savedData.board);
      setIsSolved(solved);

      setGameId(Date.now());

      if (savedData.notes) {
        setNotes(savedData.notes);
      } else {
        setNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => [])));
      }
    } else {
      // Auto-generate Easy game if no saved game exists
      const { puzzle: newBoard, solution } = generateSudoku('Easy');
      const newInitialBoard = newBoard.map(row => row.map(cell => cell !== 0));
      const initialNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));

      setBoard(newBoard);
      setInitialBoard(newInitialBoard);
      setDifficulty('Easy');
      setNotes(initialNotes);
      setSolution(solution);
      setMistakes(0);
      setIsFailed(false);
      setGameId(Date.now());
      setIsSolved(false);
      setHasShownEndGameAlert(false);

      saveBoard({
        board: newBoard,
        initialBoard: newInitialBoard,
        difficulty: 'Easy',
        notes: initialNotes,
        solution,
        mistakes: 0,
        isFailed: false
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
    saveBoard({ board: previousState.board, initialBoard, difficulty, notes: previousState.notes, solution, mistakes, isFailed, hasShownEndGameAlert });
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

    let newMistakes = mistakes;
    let newIsFailed = isFailed;

    if (value !== 0 && solution.length > 0) {
      if (solution[row][col] !== value) {
        newMistakes += 1;
        setMistakes(newMistakes);

        if (mistakeLimitEnabled && newMistakes >= maxMistakes) {
          newIsFailed = true;
          setIsFailed(true);
          recordGameFailure();
          if (!hasShownEndGameAlert) {
            setHasShownEndGameAlert(true);
            Alert.alert(
              'Keep it up!',
              `You've made ${maxMistakes} mistakes. But don't worry, every expert was once a beginner. Start a new game and try again!`,
              [{ text: 'OK' }]
            );
          }
        }
      }
    }

    saveBoard({
      board: newBoard,
      initialBoard,
      difficulty,
      notes: newNotes,
      solution,
      mistakes: newMistakes,
      isFailed: newIsFailed,
      hasShownEndGameAlert: (mistakeLimitEnabled && newMistakes >= maxMistakes) || hasShownEndGameAlert
    });
    setBoard(newBoard);
    setNotes(newNotes);
    setConflictCells(conflicts);

    if (value !== 0 && conflicts.length === 0 && checkSolution(newBoard)) {
      setIsSolved(true);
      if (!hasShownEndGameAlert) {
        setHasShownEndGameAlert(true);
        const finalTime = timerRef.current?.getTime() || 0;

        recordGameCompletion(difficulty).then(({ totalGames, currentStreak }) => {
          const formattedTime = formatTime(finalTime);
          let message = `Congratulations! You solved the puzzle in ${formattedTime}!\n\nTotal games completed: ${totalGames}`;
          if (streakTrackingEnabled && currentStreak > 0) {
            message += `\nWin streak: ${currentStreak} 🔥`;
          }
          Alert.alert('Victory!', message);

          // Update storage with hasShownEndGameAlert
          saveBoard({
            board: newBoard,
            initialBoard,
            difficulty,
            notes: newNotes,
            solution,
            mistakes: newMistakes,
            isFailed: newIsFailed,
            hasShownEndGameAlert: true
          });
        });
      }
    }
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
    saveBoard({ board, initialBoard, difficulty, notes: newNotes, solution, mistakes, isFailed });
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
          <View style={styles.infoGroup}>
            <View style={[styles.difficultyBadge, { backgroundColor: primaryLightColor }]}>
              <Text style={[styles.difficultyText, { color: primaryColor }]}>{difficulty}</Text>
            </View>
          </View>

          <View style={[styles.mistakesBadge, { backgroundColor: surfaceColor, borderColor: mistakes > 0 ? '#ef4444' : borderColor }]}>
            <Text style={[styles.mistakesText, { color: mistakes > 0 ? '#ef4444' : textSecondaryColor }]}>
              Mistakes: {mistakes}{mistakeLimitEnabled ? `/${maxMistakes}` : ''}
            </Text>
          </View>

          <Timer ref={timerRef} key={gameId} isSolved={isSolved} isFailed={isFailed} />
        </View>

        <View style={[styles.board, { width: boardSize + 4, height: boardSize + 4, borderColor: borderDarkColor, backgroundColor: surfaceColor }]}>
          {board.flat().map((cell, index) => {
            const rowIndex = Math.floor(index / 9);
            const colIndex = index % 9;
            const isConflict = conflictCells.some(c => c.row === rowIndex && c.col === colIndex);

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
                onPress={() => !isFailed && !isSolved && handleSelectCell(rowIndex, colIndex)}
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
              style={[styles.toolButton, (isFailed || isSolved) && { opacity: 0.5 }]}
              onPress={toggleNoteMode}
              disabled={isFailed || isSolved}
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
              style={[styles.toolButton, (history.length === 0 || isFailed || isSolved) && { opacity: 0.5 }]}
              onPress={handleUndo}
              disabled={history.length === 0 || isFailed || isSolved}
            >
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons name="undo" size={28} color={textColor} />
              </View>
              <Text style={[styles.toolButtonText, { color: textColor }]}>Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, (isFailed || isSolved) && { opacity: 0.5 }]}
              onPress={handleClearPress}
              disabled={isFailed || isSolved}
            >
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons name="eraser" size={28} color={textColor} />
              </View>
              <Text style={[styles.toolButtonText, { color: textColor }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.numberPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
              const count = board.flat().filter(cell => cell === num).length;
              const isNumberSolved = count === 9;

              if (hideSolvedNumbers && isNumberSolved) {
                return <View key={num} style={{ width: finalNumButtonWidth, height: numButtonHeight }} />;
              }

              return (
                <TouchableOpacity
                  key={num}
                  style={[styles.numButton, { width: finalNumButtonWidth, height: numButtonHeight, backgroundColor: surfaceColor }, (isFailed || isSolved) && { opacity: 0.5 }]}
                  onPress={() => handleNumberPress(num)}
                  disabled={isFailed || isSolved}
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
  infoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mistakesBadge: {
    paddingHorizontal: SPACING.s,
    paddingVertical: 2,
    borderRadius: RADIUS.s,
    borderWidth: 1,
  },
  mistakesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  board: {
    borderWidth: 2,
    borderRadius: RADIUS.m,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
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
  },
  numButtonText: {
    fontWeight: '600',
  },
  toolsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.l,
    justifyContent: 'center',
    width: '100%',
    gap: SPACING.xl,
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

const getNewlyCompletedRegions = (oldBoard: number[][], newBoard: number[][], r: number, c: number) => {
  const regions: { type: 'row' | 'col' | 'box'; index: number; cells: { row: number; col: number }[] }[] = [];

  // Check row
  if (oldBoard[r].some(val => val === 0) && newBoard[r].every(val => val !== 0)) {
    regions.push({ type: 'row', index: r, cells: Array.from({ length: 9 }, (_, i) => ({ row: r, col: i })) });
  }

  // Check col
  if (oldBoard.some(row => row[c] === 0) && newBoard.every(row => row[c] !== 0)) {
    regions.push({ type: 'col', index: c, cells: Array.from({ length: 9 }, (_, i) => ({ row: i, col: c })) });
  }

  // Check box
  const boxRow = Math.floor(r / 3);
  const boxCol = Math.floor(c / 3);
  const boxCells: { row: number; col: number }[] = [];
  let boxWasCompleteBefore = true;
  let boxIsCompleteNow = true;

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const currR = boxRow * 3 + i;
      const currC = boxCol * 3 + j;
      boxCells.push({ row: currR, col: currC });
      if (oldBoard[currR][currC] === 0) boxWasCompleteBefore = false;
      if (newBoard[currR][currC] === 0) boxIsCompleteNow = false;
    }
  }

  if (!boxWasCompleteBefore && boxIsCompleteNow) {
    regions.push({ type: 'box', index: boxRow * 3 + boxCol, cells: boxCells });
  }

  return regions;
};

export default SudokuBoard;
