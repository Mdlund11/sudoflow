// sudoku.ts

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';
type Board = number[][];
type Candidates = number[][][];

const DIFFICULTY_LEVELS: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
  Expert: 4,
};

export const generateSudoku = (difficulty: Difficulty): Board => {
  let attempts = 0;
  // Safety break to avoid infinite loops
  while (attempts < 200) {
    // 1. Generate a full valid board
    const solvedBoard = Array(9).fill(null).map(() => Array(9).fill(0));
    solveSudokuBacktrack(solvedBoard);

    // 2. Create a puzzle by removing numbers
    const puzzle = solvedBoard.map(row => row.slice());
    const cells = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        cells.push([i, j]);
      }
    }
    shuffle(cells);

    // Heuristic: Remove more cells for harder difficulties
    let cluesToRemove = 30;
    if (difficulty === 'Medium') cluesToRemove = 40;
    if (difficulty === 'Hard') cluesToRemove = 50;
    if (difficulty === 'Expert') cluesToRemove = 58;

    // Remove cells while maintaining uniqueness
    for (const [row, col] of cells) {
      if (cluesToRemove <= 0) break;

      const temp = puzzle[row][col];
      puzzle[row][col] = 0;

      if (countSolutions(puzzle) !== 1) {
        puzzle[row][col] = temp;
      } else {
        cluesToRemove--;
      }
    }

    // 3. Grade the puzzle
    const ratedDifficulty = rateDifficulty(puzzle);

    if (ratedDifficulty === difficulty) {
      return puzzle;
    }

    attempts++;
  }

  console.warn(`Failed to generate ${difficulty} puzzle after ${attempts} attempts.`);
  return generateSudoku('Easy');
};

// Returns the difficulty based on the HARDEST technique required to solve it.
const rateDifficulty = (initialBoard: Board): Difficulty => {
  const board = initialBoard.map(row => row.slice());
  const candidates = getInitialCandidates(board);

  let maxTechnique = 0; // 1: Naked, 2: Hidden, 3: Intersection (Hard), 4: Expert

  let changed = true;
  while (changed) {
    changed = false;

    // 1. Naked Singles (Easy)
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[i][j] === 0 && candidates[i][j].length === 1) {
          const val = candidates[i][j][0];
          fillCell(board, candidates, i, j, val);
          maxTechnique = Math.max(maxTechnique, 1);
          changed = true;
        }
      }
    }
    if (changed) continue;

    // 2. Hidden Singles (Medium)
    const hidden = findHiddenSingle(board, candidates);
    if (hidden) {
      fillCell(board, candidates, hidden.row, hidden.col, hidden.val);
      maxTechnique = Math.max(maxTechnique, 2);
      changed = true;
      continue;
    }

    // 3. Intersection Removal (Hard)
    // Pointing Pairs/Triples and Box-Line Reduction
    if (applyIntersectionRemoval(candidates)) {
      maxTechnique = Math.max(maxTechnique, 3);
      changed = true;
      continue;
    }
  }

  if (isSolved(board)) {
    if (maxTechnique <= 1) return 'Easy';
    if (maxTechnique === 2) return 'Medium';
    if (maxTechnique === 3) return 'Hard';
    return 'Expert';
  } else {
    // If not solved by above techniques, it requires Expert logic (X-Wing, Y-Wing, etc.)
    return 'Expert';
  }
};

const fillCell = (board: Board, candidates: Candidates, row: number, col: number, val: number) => {
  board[row][col] = val;
  candidates[row][col] = [];

  for (let j = 0; j < 9; j++) {
    if (j !== col) removeCandidate(candidates, row, j, val);
  }
  for (let i = 0; i < 9; i++) {
    if (i !== row) removeCandidate(candidates, i, col, val);
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = startRow + i;
      const c = startCol + j;
      if (r !== row || c !== col) removeCandidate(candidates, r, c, val);
    }
  }
};

const removeCandidate = (candidates: Candidates, row: number, col: number, val: number): boolean => {
  const idx = candidates[row][col].indexOf(val);
  if (idx !== -1) {
    candidates[row][col].splice(idx, 1);
    return true;
  }
  return false;
};

const findHiddenSingle = (board: Board, candidates: Candidates): { row: number, col: number, val: number } | null => {
  // Check Rows
  for (let i = 0; i < 9; i++) {
    const counts = countCandidates(candidates, i, 0, i, 8);
    for (const [val, positions] of Object.entries(counts)) {
      if (positions.length === 1) {
        const { r, c } = positions[0];
        if (board[r][c] === 0) return { row: r, col: c, val: Number(val) };
      }
    }
  }
  // Check Cols
  for (let j = 0; j < 9; j++) {
    const counts = countCandidates(candidates, 0, j, 8, j);
    for (const [val, positions] of Object.entries(counts)) {
      if (positions.length === 1) {
        const { r, c } = positions[0];
        if (board[r][c] === 0) return { row: r, col: c, val: Number(val) };
      }
    }
  }
  // Check Boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const startRow = boxRow * 3;
      const startCol = boxCol * 3;
      const counts = countCandidates(candidates, startRow, startCol, startRow + 2, startCol + 2);
      for (const [val, positions] of Object.entries(counts)) {
        if (positions.length === 1) {
          const { r, c } = positions[0];
          if (board[r][c] === 0) return { row: r, col: c, val: Number(val) };
        }
      }
    }
  }
  return null;
};

// Strategy: Intersection Removal (Pointing Pairs/Triples)
// If in a box, all candidates for 'n' are in the same row/col, remove 'n' from the rest of that row/col.
const applyIntersectionRemoval = (candidates: Candidates): boolean => {
  let changed = false;

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const startRow = boxRow * 3;
      const startCol = boxCol * 3;

      for (let num = 1; num <= 9; num++) {
        const positions: { r: number, c: number }[] = [];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (candidates[startRow + i][startCol + j].includes(num)) {
              positions.push({ r: startRow + i, c: startCol + j });
            }
          }
        }

        if (positions.length === 0) continue;

        // Check if all in same row
        const firstRow = positions[0].r;
        if (positions.every(p => p.r === firstRow)) {
          // Remove from rest of row
          for (let k = 0; k < 9; k++) {
            // Skip if column is inside the current box
            if (k >= startCol && k < startCol + 3) continue;
            if (removeCandidate(candidates, firstRow, k, num)) changed = true;
          }
        }

        // Check if all in same col
        const firstCol = positions[0].c;
        if (positions.every(p => p.c === firstCol)) {
          // Remove from rest of col
          for (let k = 0; k < 9; k++) {
            // Skip if row is inside the current box
            if (k >= startRow && k < startRow + 3) continue;
            if (removeCandidate(candidates, k, firstCol, num)) changed = true;
          }
        }
      }
    }
  }
  return changed;
}

const countCandidates = (candidates: Candidates, r1: number, c1: number, r2: number, c2: number) => {
  const counts: Record<number, { r: number, c: number }[]> = {};
  for (let i = r1; i <= r2; i++) {
    for (let j = c1; j <= c2; j++) {
      for (const val of candidates[i][j]) {
        if (!counts[val]) counts[val] = [];
        counts[val].push({ r: i, c: j });
      }
    }
  }
  return counts;
};

const getInitialCandidates = (board: Board): Candidates => {
  const candidates: Candidates = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, i, j, num)) {
            candidates[i][j].push(num);
          }
        }
      }
    }
  }
  return candidates;
};

export const isValid = (board: Board, row: number, col: number, num: number): boolean => {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }
  return true;
};

const solveSudokuBacktrack = (board: Board): boolean => {
  const emptyCells: { r: number, c: number }[] = [];
  const rows = new Int16Array(9);
  const cols = new Int16Array(9);
  const boxes = new Int16Array(9);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        emptyCells.push({ r, c });
      } else {
        const val = 1 << (board[r][c] - 1);
        rows[r] |= val;
        cols[c] |= val;
        boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= val;
      }
    }
  }

  const solve = (idx: number): boolean => {
    if (idx === emptyCells.length) return true;

    const { r, c } = emptyCells[idx];
    const boxIdx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const used = rows[r] | cols[c] | boxes[boxIdx];

    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]); // Keep randomization for generation

    for (const num of nums) {
      const bit = 1 << (num - 1);
      if (!(used & bit)) {
        board[r][c] = num;
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[boxIdx] |= bit;

        if (solve(idx + 1)) return true;

        rows[r] &= ~bit;
        cols[c] &= ~bit;
        boxes[boxIdx] &= ~bit;
        board[r][c] = 0;
      }
    }
    return false;
  };

  return solve(0);
};

const countSolutions = (board: Board, limit: number = 2): number => {
  const emptyCells: { r: number, c: number }[] = [];
  const rows = new Int16Array(9);
  const cols = new Int16Array(9);
  const boxes = new Int16Array(9);

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        emptyCells.push({ r, c });
      } else {
        const val = 1 << (board[r][c] - 1);
        rows[r] |= val;
        cols[c] |= val;
        boxes[Math.floor(r / 3) * 3 + Math.floor(c / 3)] |= val;
      }
    }
  }

  let count = 0;
  const solve = (idx: number) => {
    if (idx === emptyCells.length) {
      count++;
      return;
    }

    const { r, c } = emptyCells[idx];
    const boxIdx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const used = rows[r] | cols[c] | boxes[boxIdx];

    for (let num = 1; num <= 9; num++) {
      const bit = 1 << (num - 1);
      if (!(used & bit)) {
        rows[r] |= bit;
        cols[c] |= bit;
        boxes[boxIdx] |= bit;

        solve(idx + 1);

        rows[r] &= ~bit;
        cols[c] &= ~bit;
        boxes[boxIdx] &= ~bit;

        if (count >= limit) return;
      }
    }
  };

  solve(0);
  return count;
};

const isSolved = (board: Board): boolean => {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0) return false;
    }
  }
  return true;
};

const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const checkSolution = (board: Board) => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) return false;
      const num = board[row][col];
      board[row][col] = 0;
      if (!isValid(board, row, col, num)) {
        board[row][col] = num;
        return false;
      }
      board[row][col] = num;
    }
  }
  return true;
}

export const findConflicts = (board: Board): { row: number, col: number }[] => {
  const conflicts = new Set<string>();
  // Check rows
  for (let i = 0; i < 9; i++) {
    const rowMap = new Map<number, { row: number, col: number }[]>();
    for (let j = 0; j < 9; j++) {
      const value = board[i][j];
      if (value !== 0) {
        if (!rowMap.has(value)) rowMap.set(value, []);
        rowMap.get(value)!.push({ row: i, col: j });
      }
    }
    for (const cells of rowMap.values()) {
      if (cells.length > 1) cells.forEach(cell => conflicts.add(`${cell.row},${cell.col}`));
    }
  }
  // Check columns
  for (let j = 0; j < 9; j++) {
    const colMap = new Map<number, { row: number, col: number }[]>();
    for (let i = 0; i < 9; i++) {
      const value = board[i][j];
      if (value !== 0) {
        if (!colMap.has(value)) colMap.set(value, []);
        colMap.get(value)!.push({ row: i, col: j });
      }
    }
    for (const cells of colMap.values()) {
      if (cells.length > 1) cells.forEach(cell => conflicts.add(`${cell.row},${cell.col}`));
    }
  }
  // Check 3x3 subgrids
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const subgrid = new Map<number, { row: number, col: number }[]>();
      for (let i = boxRow * 3; i < boxRow * 3 + 3; i++) {
        for (let j = boxCol * 3; j < boxCol * 3 + 3; j++) {
          const value = board[i][j];
          if (value !== 0) {
            if (!subgrid.has(value)) subgrid.set(value, []);
            subgrid.get(value)!.push({ row: i, col: j });
          }
        }
      }
      for (const cells of subgrid.values()) {
        if (cells.length > 1) cells.forEach(cell => conflicts.add(`${cell.row},${cell.col}`));
      }
    }
  }
  return Array.from(conflicts).map(conflict => {
    const [row, col] = conflict.split(',').map(Number);
    return { row, col };
  });
};