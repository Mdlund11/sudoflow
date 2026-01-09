import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Animated } from 'react-native';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useStats } from '../context/StatsContext';
import { useThemeColor } from '../hooks/use-theme-color';
import { getNewlyCompletedRegions, getUnifiedWaveDelays } from '../utils/completionUtils';
import { loadBoard, saveBoard, saveTimer } from '../utils/storage';
import { checkSolution, findConflicts, generateSudoku, getHint, Hint } from '../utils/sudoku';
import { formatTime } from '../utils/timeUtils';
import Cell from './Cell';
import FailureOverlay from './FailureOverlay';
import Timer, { TimerRef } from './Timer';
import VictoryOverlay from './VictoryOverlay';
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

  const { highlightEnabled, autoRemoveNotes, hideSolvedNumbers, completionAnimationsEnabled, streakTrackingEnabled, mistakeLimitEnabled, maxMistakes, solutionCheckingEnabled } = useSettings();
  const { recordGameCompletion, recordGameFailure, stats } = useStats();
  const [history, setHistory] = useState<{ board: number[][]; notes: number[][][] }[]>([]);
  const [hasShownEndGameAlert, setHasShownEndGameAlert] = useState<boolean>(false);
  const [isHintMode, setIsHintMode] = useState<boolean>(false);
  const [currentHint, setCurrentHint] = useState<Hint | null>(null);
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false);
  const [showFailureOverlay, setShowFailureOverlay] = useState(false);

  const failureAnim = React.useRef(new Animated.Value(0)).current;

  // Animation state: simple trigger ID and map of delays for the wave
  const [animationState, setAnimationState] = useState<{
    id: number; // Unique trigger ID
    delays: Record<string, number>; // Map "row,col" -> delay in ms
    type: 'flash' | 'blade-flip';
  }>({ id: 0, delays: {}, type: 'flash' });

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
        setAnimationState({ id: 0, delays: {}, type: 'flash' });
      }, 700); // Increased slightly for blade-flip
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
          const delays = getUnifiedWaveDelays(row, col, completedRegions);

          // Trigger all animations at once with a new ID
          if (Object.keys(delays).length > 0) {
            setAnimationState({
              id: Date.now(),
              delays,
              type: 'blade-flip'
            });
          }
        }
      }
    }

    const conflicts = findConflicts(newBoard);

    let newMistakes = mistakes;
    let newIsFailed = isFailed;

    if (value !== 0) {
      const isMistake = solutionCheckingEnabled
        ? (solution.length > 0 && solution[row][col] !== value)
        : conflicts.some(c => c.row === row && c.col === col);

      if (isMistake) {
        newMistakes += 1;
        setMistakes(newMistakes);

        if (mistakeLimitEnabled && newMistakes >= maxMistakes) {
          newIsFailed = true;
          setIsFailed(true);
          recordGameFailure();
          if (!hasShownEndGameAlert) {
            setHasShownEndGameAlert(true);

            // Trigger failure animation sequence
            failureAnim.setValue(0);
            // Trigger failure overlay after a short delay
            setTimeout(() => {
              setShowFailureOverlay(true);
            }, 500);
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

    // Deactivate hint mode when a number is entered
    if (isHintMode) {
      setIsHintMode(false);
      setCurrentHint(null);
    }

    if (value !== 0 && conflicts.length === 0 && checkSolution(newBoard)) {
      setIsSolved(true);
      if (!hasShownEndGameAlert) {
        setHasShownEndGameAlert(true);
        setShowVictoryOverlay(true);

        recordGameCompletion(difficulty);

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
    // If selecting a different cell while in hint mode, maybe stay in hint mode but find a new hint?
    // User spec says: "The user can exit Hint Mode by ... selecting a different cell"
    if (isHintMode) {
      setIsHintMode(false);
      setCurrentHint(null);
    }
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
    if (isHintMode) {
      setIsHintMode(false);
      setCurrentHint(null);
    }
  };

  const handleHintPress = () => {
    if (isHintMode) {
      setIsHintMode(false);
      setCurrentHint(null);
    } else {
      const hint = getHint(board, solution, selectedCell);
      if (hint) {
        setIsHintMode(true);
        setCurrentHint(hint);
        setSelectedCell({ row: hint.row, col: hint.col });
      } else {
        Alert.alert('No Hints Available', 'I couldn\'t find any logical moves right now. Keep trying!');
      }
    }
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

        <Animated.View
          style={[
            styles.board,
            {
              width: boardSize + 4,
              height: boardSize + 4,
              borderColor: borderDarkColor,
              backgroundColor: surfaceColor,
            }
          ]}
        >
          {board.flat().map((cell, index) => {
            const rowIndex = Math.floor(index / 9);
            const colIndex = index % 9;
            const isConflict = conflictCells.some(c => c.row === rowIndex && c.col === colIndex);
            const isSolutionMismatch = solutionCheckingEnabled && board[rowIndex][colIndex] !== 0 && solution.length > 0 && board[rowIndex][colIndex] !== solution[rowIndex][colIndex];
            const isError = isConflict || isSolutionMismatch;

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

            const isTargetHint = isHintMode && currentHint?.row === rowIndex && currentHint?.col === colIndex;
            const isContributingHint = isHintMode && currentHint?.contributingCells.some(c => c.row === rowIndex && c.col === colIndex);

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
                isConflict={isError}
                isHighlightRow={isHighlightRow}
                isHighlightCol={isHighlightCol}
                isHighlightBlock={isHighlightBlock}
                isHighlightNumber={isHighlightNumber}
                isTargetHint={isTargetHint}
                isContributingHint={isContributingHint}
                animationTrigger={animationDelay !== undefined ? animationState.id : undefined}
                animationDelay={animationDelay}
                animationType={animationState.type}
              />
            );
          })}
        </Animated.View>

        <View style={styles.controlsContainer}>
          <View style={styles.toolsRow}>
            {isHintMode && currentHint ? (
              <View style={[styles.inlineHintContainer, { backgroundColor: surfaceColor, borderColor: primaryColor }]}>
                <View style={styles.hintHeader}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={20} color={primaryColor} />
                  <Text style={[styles.hintTechnique, { color: primaryColor }]}>{currentHint.technique}</Text>
                </View>
                <View style={styles.hintTextContainer}>
                  <Text style={[styles.hintExplanation, { color: textColor }]}>{currentHint.explanation}</Text>
                </View>
              </View>
            ) : (
              <>
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
              </>
            )}

            <TouchableOpacity
              style={[styles.toolButton, (isFailed || isSolved) && { opacity: 0.5 }]}
              onPress={handleHintPress}
              disabled={isFailed || isSolved}
            >
              <View style={styles.iconWrapper}>
                <MaterialCommunityIcons
                  name={isHintMode ? "lightbulb" : "lightbulb-outline"}
                  size={28}
                  color={isHintMode ? primaryColor : textColor}
                />
              </View>
              <Text style={[styles.toolButtonText, { color: isHintMode ? primaryColor : textColor }]}>Hint</Text>
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

      {showVictoryOverlay && (
        <VictoryOverlay
          time={formatTime(timerRef.current?.getTime() || 0)}
          difficulty={difficulty}
          streak={stats.currentStreak}
          onNewGame={() => {
            setShowVictoryOverlay(false);
            router.push('/new-game');
          }}
          onDismiss={() => setShowVictoryOverlay(false)}
        />
      )}

      {showFailureOverlay && (
        <FailureOverlay
          onNewGame={() => {
            setShowFailureOverlay(false);
            failureAnim.setValue(0);
            router.push('/new-game');
          }}
          onDismiss={() => {
            setShowFailureOverlay(false);
          }}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '90%',
    // Fixed height removed to allow expansion
    minHeight: 60,
  },
  inlineHintContainer: {
    flex: 1,
    marginRight: SPACING.m,
    padding: SPACING.s,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    justifyContent: 'center',
    // Fixed height removed
  },
  hintTextContainer: {
    // No specific constraints, let it flow
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.s,
    minWidth: 60,
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
  // Kept for type safety but likely unused now
  hintContainer: {
    width: '90%',
    marginTop: SPACING.m,
    padding: SPACING.m,
    borderRadius: RADIUS.m,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: 2,
  },
  hintTechnique: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  hintExplanation: {
    fontSize: 14, // Bumped up slightly for readability since we have space now
    lineHeight: 20,
  },
});


export default SudokuBoard;
