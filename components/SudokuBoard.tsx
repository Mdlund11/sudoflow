import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useStats } from '../context/StatsContext';
import { useThemeColor } from '../hooks/use-theme-color';
import { getNewlyCompletedRegions, getUnifiedWaveDelays } from '../utils/completionUtils';
import { loadBoard, saveBoard, saveTimer } from '../utils/storage';
import { checkSolution, findConflicts } from '../utils/sudoku';
import { formatTime } from '../utils/timeUtils';
import { SudokuGeneratorV2 } from '../utils/v2/generator';
import { StepAction as SolverStep, SudokuSolverV2 } from '../utils/v2/solver-v4';
import Cell from './Cell';
import FailureOverlay from './FailureOverlay';
import Timer, { TimerRef } from './Timer';
import VictoryOverlay from './VictoryOverlay';

const TECHNIQUE_DESCRIPTIONS: Record<string, string> = {
  "Full House": "This is the easiest one! A row, column, or 3x3 box is almost full and has only one empty cell left. Since every group needs 1-9, just see what's missing—it must go there!",
  "Last Digit": "This is when a number (like '5') appears 8 times on the board. There is only one 3x3 box missing a '5', and if you look closely, there's only one spot it can go!",
  "Hidden Single (Block)": "A 'Block' (or box) is one of the 9 grids of 3x3 squares. Every block needs 1-9. Sometimes, a specific number can't go in most spots because other copies of that number block them. If there's only one spot left in a block for that number, it MUST go there.",
  "Hidden Single (Row)": "Every horizontal row needs numbers 1-9. Check a row where a number is missing. If that number is blocked from all other empty cells in that row (by columns above/below), it has to go in the one spot left.",
  "Hidden Single (Col)": "Every vertical column needs numbers 1-9. If a number can only fit in one specific empty spot in a column because all other spots are blocked, it must go there.",
  "Naked Single": "Focus on just one specific cell. Check its row, column, and block. If you see that 8 out of the 9 possible numbers are already 'seen' by this cell, then only one number is physically possible. It has no other choice!",
  "Direct Hidden Pair": "In a block (or row/column), imagine two empty cells. If two numbers (like 3 and 7) can ONLY go in these two cells and nowhere else in that block, they form a couple. No other numbers can invade their spots!",
  "Simple Coloring": "This is an advanced trick! We color candidates 'A' and 'B'. If a chain forces one color to be impossible, we can safely remove or place numbers based on that chain logic.",
  "X-Wing": "Imagine a rectangle formed by four cells. If a number (like '4') can only appear in two spots for two different rows, and they line up vertically, we can rule out '4' from the rest of those columns.",
  "Y-Wing": "This pattern involves three cells acting like a 'Y' shape. A central 'pivot' cell connects to two 'pincers'. Their relationship allows us to eliminate candidates that can 'see' both pincers.",
  "Swordfish": "A harder version of the X-Wing! It uses three rows and three columns to trap a number. If the number fits a specific grid pattern, we can clear it from other parts of the columns.",
  "Jellyfish": "The big brother of the Swordfish! It uses four rows and four columns to restrict where a number can go. It's rare but very powerful for clearing the board.",
};

interface SudokuBoardProps {
  seed?: string;
  initialDifficulty?: 'Easy' | 'Medium' | 'Hard' | 'Expert';
}

const SudokuBoard: React.FC<SudokuBoardProps> = ({ seed, initialDifficulty }) => {
  const [board, setBoard] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<boolean[][]>([]);
  const [centerNotes, setCenterNotes] = useState<number[][][]>([]);
  const [cornerNotes, setCornerNotes] = useState<number[][][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [conflictCells, setConflictCells] = useState<{ row: number; col: number }[]>([]);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Expert'>('Medium');
  const [noteType, setNoteType] = useState<'center' | 'corner'>('center');
  const [isNoteMode, setIsNoteMode] = useState<boolean>(false);
  const [isSolved, setIsSolved] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [solution, setSolution] = useState<number[][]>([]);
  const [seRating, setSeRating] = useState<number>(0);
  const [hodokuScore, setHodokuScore] = useState<number>(0);
  const [gameId, setGameId] = useState<number>(0);
  const router = useRouter();

  const { highlightEnabled, autoRemoveNotes, hideSolvedNumbers, completionAnimationsEnabled, streakTrackingEnabled, mistakeLimitEnabled, maxMistakes, solutionCheckingEnabled } = useSettings();
  const { recordGameCompletion, recordGameFailure, stats } = useStats();
  const [history, setHistory] = useState<{ board: number[][]; centerNotes: number[][][]; cornerNotes: number[][][] }[]>([]);
  const [hasShownEndGameAlert, setHasShownEndGameAlert] = useState<boolean>(false);
  const [isHintMode, setIsHintMode] = useState<boolean>(false);
  const [currentHint, setCurrentHint] = useState<SolverStep | null>(null);
  const [hintStage, setHintStage] = useState<number>(0); // 0: Nudge, 1: Technique, 2: Explanation
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false);
  const [showFailureOverlay, setShowFailureOverlay] = useState(false);
  const [isExplanationVisible, setIsExplanationVisible] = useState(false);


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

  const [isGenerating, setIsGenerating] = useState(false); // New State

  const loadGame = async () => {
    setIsGenerating(true);

    // Allow UI to render loading state before heavy lifting
    setTimeout(async () => {
      if (seed) {
        const { puzzle: newBoard, solution, seRating: newSeRating, hodokuScore: newHodokuScore } = SudokuGeneratorV2.generate(initialDifficulty || 'Medium');
        const newInitialBoard = newBoard.map(row => row.map(cell => cell !== 0));
        const initialNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));
        const initialCornerNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));

        setBoard(newBoard);
        setInitialBoard(newInitialBoard);
        setDifficulty(initialDifficulty || 'Medium');
        setSeRating(newSeRating);
        setHodokuScore(newHodokuScore);
        setCenterNotes(initialNotes);
        setCornerNotes(initialCornerNotes);
        setSolution(solution);
        setMistakes(0);
        setIsFailed(false);
        setGameId(Date.now());
        setIsSolved(false);
        setHasShownEndGameAlert(false);
        saveTimer(0);
        setIsGenerating(false);
        return;
      }

      const savedData = await loadBoard();
      if (savedData && savedData.board && savedData.initialBoard && savedData.difficulty) {
        setBoard(savedData.board);
        setInitialBoard(savedData.initialBoard);
        setDifficulty(savedData.difficulty);
        setSeRating(savedData.seRating || 0);
        setHodokuScore(savedData.hodokuScore || 0);
        setConflictCells(findConflicts(savedData.board));
        setSolution(savedData.solution || []);
        setMistakes(savedData.mistakes || 0);
        setIsFailed(savedData.isFailed || false);
        setHasShownEndGameAlert(savedData.hasShownEndGameAlert || false);

        // Check if already solved
        const solved = checkSolution(savedData.board);
        setIsSolved(solved);

        setGameId(Date.now());

        if (savedData.centerNotes) {
          setCenterNotes(savedData.centerNotes);
        } else if (savedData.notes) {
          setCenterNotes(savedData.notes);
        } else {
          setCenterNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => [])));
        }

        if (savedData.cornerNotes) {
          setCornerNotes(savedData.cornerNotes);
        } else {
          setCornerNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => [])));
        }
      } else {
        // Auto-generate Easy game if no saved game exists
        const { puzzle: newBoard, solution, seRating: newSeRating, hodokuScore: newHodokuScore } = SudokuGeneratorV2.generate('Easy');
        const newInitialBoard = newBoard.map(row => row.map(cell => cell !== 0));
        const initialNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));
        const initialCornerNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));

        setBoard(newBoard);
        setInitialBoard(newInitialBoard);
        setDifficulty('Easy');
        setSeRating(newSeRating);
        setHodokuScore(newHodokuScore);
        setCenterNotes(initialNotes);
        setCornerNotes(initialCornerNotes);
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
          centerNotes: initialNotes,
          cornerNotes: initialCornerNotes,
          solution,
          mistakes: 0,
          isFailed: false
        });
        saveTimer(0);
      }
      setIsGenerating(false);
    }, 100); // 100ms delay to ensure render
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
    setCenterNotes(previousState.centerNotes);
    setCornerNotes(previousState.cornerNotes);
    setHistory(newHistory);

    const conflicts = findConflicts(previousState.board);
    setConflictCells(conflicts);
    saveBoard({
      board: previousState.board,
      initialBoard,
      difficulty,
      centerNotes: previousState.centerNotes,
      cornerNotes: previousState.cornerNotes,
      solution,
      mistakes,
      isFailed,
      hasShownEndGameAlert
    });
  };

  const handleCellChange = (row: number, col: number, value: number) => {
    // Save current state to history before changing
    setHistory(prev => [...prev, {
      board: board.map(r => [...r]),
      centerNotes: centerNotes.map(r => r.map(c => [...c])),
      cornerNotes: cornerNotes.map(r => r.map(c => [...c]))
    }]);

    const oldBoard = board.map(r => r.slice());
    const newBoard = board.map(r => r.slice());
    newBoard[row][col] = value;

    const newCenterNotes = centerNotes.map(r => r.map(c => [...c]));
    const newCornerNotes = cornerNotes.map(r => r.map(c => [...c]));

    if (value !== 0) {
      newCenterNotes[row][col] = [];
      newCornerNotes[row][col] = [];

      // Auto-remove notes logic
      if (autoRemoveNotes) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (r === row || c === col || (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3))) {
              newCenterNotes[r][c] = newCenterNotes[r][c].filter(n => n !== value);
              newCornerNotes[r][c] = newCornerNotes[r][c].filter(n => n !== value);
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
      centerNotes: newCenterNotes,
      cornerNotes: newCornerNotes,
      solution,
      mistakes: newMistakes,
      isFailed: newIsFailed,
      seRating,
      hodokuScore,
      hasShownEndGameAlert: (mistakeLimitEnabled && newMistakes >= maxMistakes) || hasShownEndGameAlert
    });
    setBoard(newBoard);
    setCenterNotes(newCenterNotes);
    setCornerNotes(newCornerNotes);
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
          centerNotes: newCenterNotes,
          cornerNotes: newCornerNotes,
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
      centerNotes: centerNotes.map(r => r.map(c => [...c])),
      cornerNotes: cornerNotes.map(r => r.map(c => [...c]))
    }]);

    if (noteType === 'center') {
      const newNotes = centerNotes.map(r => r.map(c => [...c]));
      const cellNotes = newNotes[row][col];
      if (cellNotes.includes(num)) {
        newNotes[row][col] = cellNotes.filter(n => n !== num);
      } else {
        newNotes[row][col] = [...cellNotes, num].sort();
      }
      setCenterNotes(newNotes);
      saveBoard({ board, initialBoard, difficulty, centerNotes: newNotes, cornerNotes, solution, mistakes, isFailed });
    } else {
      const newNotes = cornerNotes.map(r => r.map(c => [...c]));
      const cellNotes = newNotes[row][col];
      if (cellNotes.includes(num)) {
        newNotes[row][col] = cellNotes.filter(n => n !== num);
      } else {
        newNotes[row][col] = [...cellNotes, num].sort();
      }
      setCornerNotes(newNotes);
      saveBoard({ board, initialBoard, difficulty, centerNotes, cornerNotes: newNotes, solution, mistakes, isFailed });
    }
  };

  const handleSelectCell = (row: number, col: number) => {
    if (isSolved || isFailed) return;
    setSelectedCell({ row, col });

    // Hybrid Input: If a number is already selected, apply it to the cell
    if (selectedNumber !== null && !initialBoard[row][col]) {
      if (isNoteMode) {
        handleNoteChange(row, col, selectedNumber);
      } else {
        handleCellChange(row, col, selectedNumber);
      }
    }

    if (isHintMode) {
      setIsHintMode(false);
      setCurrentHint(null);
    }
  };

  const handleNumberPress = (num: number) => {
    if (isSolved || isFailed) return;

    // Hybrid Input: Set selected number
    setSelectedNumber(num);

    // If a cell is selected, apply the number
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

  const toggleNoteType = () => {
    setNoteType(prev => prev === 'center' ? 'corner' : 'center');
  };

  const handleHintPress = () => {
    if (isHintMode) {
      if (hintStage < 2) {
        setHintStage(prev => prev + 1);
      } else if (currentHint) {
        // Step 4: Execute the move
        if (currentHint.row !== undefined && currentHint.col !== undefined && currentHint.row !== -1 && currentHint.val !== undefined && currentHint.val !== 0) {
          handleCellChange(currentHint.row, currentHint.col, currentHint.val!);
        } else if (currentHint.highlightCells.some(c => c.type === 'elimination')) {
          // If it's an elimination technique, we should apply it to notes
          // This is a bit more complex, for now let's just exit
          setIsHintMode(false);
          setHintStage(0);
          setCurrentHint(null);
        } else {
          setIsHintMode(false);
          setHintStage(0);
          setCurrentHint(null);
        }
      }
    } else {
      const { steps, solved } = SudokuSolverV2.solveHuman(board);
      if (steps.length > 0) {
        const hint = steps[0];
        setIsHintMode(true);
        setHintStage(0);
        setCurrentHint(hint);
        if (hint.row !== -1) {
          setSelectedCell({ row: hint.row, col: hint.col });
        }
      } else {
        Alert.alert('No Hints Available', 'I couldn\'t find any logical moves right now. Keep trying!');
      }
    }
  };

  if (board.length === 0 || isGenerating) {
    return (
      <View style={[styles.root, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={{ marginTop: 20, color: textColor, fontWeight: '600' }}>Generating {initialDifficulty || ''} Puzzle...</Text>
      </View>
    );
  }

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

              isHighlightNumber = selectedValue !== 0 && cell === selectedValue || (selectedNumber !== null && cell === selectedNumber);
            } else if (selectedNumber) {
              isHighlightNumber = cell === selectedNumber;
            }

            const isTargetHint = isHintMode && currentHint?.highlightCells.some(c => c.row === rowIndex && c.col === colIndex && c.type === 'target');
            const isContributingHint = isHintMode && currentHint?.highlightCells.some(c => c.row === rowIndex && c.col === colIndex && (c.type === 'hint' || c.type === 'elimination'));

            return (
              <Cell
                key={index}
                row={rowIndex}
                col={colIndex}
                value={cell}
                centerNotes={centerNotes[rowIndex]?.[colIndex] || []}
                cornerNotes={cornerNotes[rowIndex]?.[colIndex] || []}
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
                <View style={[styles.hintHeader, { justifyContent: 'space-between' }]}>
                  <TouchableOpacity onPress={() => setIsExplanationVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={20} color={primaryColor} />
                    <Text style={[styles.hintTechnique, { color: primaryColor, textDecorationLine: 'underline' }]}>
                      {currentHint.technique}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.hintTextContainer}>
                  <Text style={[styles.hintExplanation, { color: textColor }]}>
                    {hintStage === 0 ? `Look for a ${currentHint.technique}.` :
                      hintStage === 1 ? currentHint.explanation :
                        "Tap again to execute this move automatically."}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.toolButton, (isFailed || isSolved) && { opacity: 0.5 }]}
                  onPress={toggleNoteMode}
                  onLongPress={toggleNoteType}
                  disabled={isFailed || isSolved}
                >
                  <View style={styles.iconWrapper}>
                    <MaterialCommunityIcons
                      name={isNoteMode ? "pencil" : "pencil-outline"}
                      size={28}
                      color={isNoteMode ? primaryColor : textColor}
                    />
                    <View style={[styles.badge, { backgroundColor: isNoteMode ? primaryColor : textColor, borderColor: surfaceColor }]}>
                      <Text style={[styles.badgeText, { color: surfaceColor }]}>
                        {isNoteMode ? (noteType === 'center' ? 'CNT' : 'CNR') : 'OFF'}
                      </Text>
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
                  style={[
                    styles.numButton,
                    { width: finalNumButtonWidth, height: numButtonHeight, backgroundColor: surfaceColor },
                    selectedNumber === num && { borderColor: primaryColor, borderWidth: 2 },
                    (isFailed || isSolved) && { opacity: 0.5 }
                  ]}
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
          board={board}
          mistakes={mistakes}
          seRating={seRating}
          hodokuScore={hodokuScore}
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

      {isExplanationVisible && currentHint && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
          <TouchableWithoutFeedback onPress={() => setIsExplanationVisible(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableWithoutFeedback>
                <View style={{ alignItems: 'center', backgroundColor: surfaceColor, borderColor: primaryColor, borderWidth: 2, borderRadius: RADIUS.m, width: '90%', maxWidth: 400, padding: SPACING.l, ...SHADOWS.medium }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.m }}>
                    <MaterialCommunityIcons name="lightbulb-on" size={24} color={primaryColor} />
                    <Text style={{ color: primaryColor, fontSize: 20, fontWeight: 'bold' }}>{currentHint.technique}</Text>
                  </View>
                  <Text style={{ color: textColor, fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
                    {TECHNIQUE_DESCRIPTIONS[currentHint.technique] || "No description available."}
                  </Text>
                  <Text style={{ marginTop: SPACING.l, textAlign: 'center', color: textSecondaryColor, fontSize: 13 }}>
                    (Tap anywhere outside to dismiss)
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
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
