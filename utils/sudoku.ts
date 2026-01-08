// sudoku.ts

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Grandmaster';
type Board = number[][];
type Candidates = number[][][];

const DIFFICULTY_LEVELS: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
  Expert: 4,
  Grandmaster: 5,
};

export interface Hint {
  row: number;
  col: number;
  val: number;
  technique: string;
  explanation: string;
  contributingCells: { row: number; col: number }[];
}

export const generateSudoku = (difficulty: Difficulty): { puzzle: Board, solution: Board } => {
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
    if (difficulty === 'Expert') cluesToRemove = 56;
    if (difficulty === 'Grandmaster') cluesToRemove = 62;

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
      return { puzzle, solution: solvedBoard };
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
    if (applyIntersectionRemoval(candidates)) {
      maxTechnique = Math.max(maxTechnique, 3);
      changed = true;
      continue;
    }

    // 4. Advanced Logic (Expert)
    const advancedHint = findNakedPairHint(board, candidates) ||
      findHiddenPairHint(board, candidates) ||
      findNakedTripleHint(board, candidates) ||
      findXWingHint(board, candidates) ||
      findYWingHint(board, candidates);

    if (advancedHint) {
      const { row, col, val } = advancedHint;
      fillCell(board, candidates, row, col, val);
      maxTechnique = Math.max(maxTechnique, 4);
      changed = true;
      continue;
    }
  }

  if (isSolved(board)) {
    if (maxTechnique <= 1) return 'Easy';
    if (maxTechnique === 2) return 'Medium';
    if (maxTechnique === 3) return 'Hard';
    if (maxTechnique === 4) return 'Expert';
    return 'Grandmaster';
  } else {
    return 'Grandmaster';
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

export const getHint = (board: Board, solution: Board, selectedCell: { row: number, col: number } | null): Hint | null => {
  const candidates = getInitialCandidates(board);

  // 1. Try to find a hint for the SELECTED cell first if it's empty
  if (selectedCell && board[selectedCell.row][selectedCell.col] === 0) {
    const r = selectedCell.row;
    const c = selectedCell.col;

    // Check for Naked Single
    if (candidates[r][c].length === 1) {
      const val = candidates[r][c][0];
      return {
        row: r,
        col: c,
        val,
        technique: 'Naked Single',
        explanation: `Cell (${r + 1}, ${c + 1}) can only contain the number ${val} because all other numbers are already present in its row, column, or 3x3 block.`,
        contributingCells: getContributingCellsForNakedSingle(board, r, c, val)
      };
    }

    // Check for Hidden Single in its Row
    const rowCounts = countCandidates(candidates, r, 0, r, 8);
    for (const [valStr, positions] of Object.entries(rowCounts)) {
      const val = Number(valStr);
      if (positions.length === 1 && positions[0].r === r && positions[0].c === c) {
        return {
          row: r,
          col: c,
          val,
          technique: 'Hidden Single',
          explanation: `In row ${r + 1}, the number ${val} can only be placed in cell (${r + 1}, ${c + 1}).`,
          contributingCells: getContributingCellsForHiddenSingle(board, 'row', r, c, val)
        };
      }
    }

    // Check for Hidden Single in its Column
    const colCounts = countCandidates(candidates, 0, c, 8, c);
    for (const [valStr, positions] of Object.entries(colCounts)) {
      const val = Number(valStr);
      if (positions.length === 1 && positions[0].r === r && positions[0].c === c) {
        return {
          row: r,
          col: c,
          val,
          technique: 'Hidden Single',
          explanation: `In column ${c + 1}, the number ${val} can only be placed in cell (${r + 1}, ${c + 1}).`,
          contributingCells: getContributingCellsForHiddenSingle(board, 'col', r, c, val)
        };
      }
    }

    // Check for Hidden Single in its Block
    const startRow = Math.floor(r / 3) * 3;
    const startCol = Math.floor(c / 3) * 3;
    const blockCounts = countCandidates(candidates, startRow, startCol, startRow + 2, startCol + 2);
    for (const [valStr, positions] of Object.entries(blockCounts)) {
      const val = Number(valStr);
      if (positions.length === 1 && positions[0].r === r && positions[0].c === c) {
        return {
          row: r,
          col: c,
          val,
          technique: 'Hidden Single',
          explanation: `In this 3x3 block, the number ${val} can only be placed in cell (${r + 1}, ${c + 1}).`,
          contributingCells: getContributingCellsForHiddenSingle(board, 'block', r, c, val)
        };
      }
    }
  }

  // 2. If no hint for selected cell or no selection, find ANY Naked Single
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0 && candidates[i][j].length === 1) {
        const val = candidates[i][j][0];
        return {
          row: i,
          col: j,
          val,
          technique: 'Naked Single',
          explanation: `Cell (${i + 1}, ${j + 1}) can only contain the number ${val} because all other numbers are already present in its row, column, or 3x3 block.`,
          contributingCells: getContributingCellsForNakedSingle(board, i, j, val)
        };
      }
    }
  }

  // 3. Find ANY Hidden Single
  const hidden = findHiddenSingle(board, candidates);
  if (hidden) {
    // Determine which region had the hidden single
    const regions: ('row' | 'col' | 'block')[] = ['row', 'col', 'block'];
    for (const regionType of regions) {
      let r1 = 0, c1 = 0, r2 = 8, c2 = 8;
      if (regionType === 'row') { r1 = r2 = hidden.row; }
      else if (regionType === 'col') { c1 = c2 = hidden.col; }
      else {
        r1 = Math.floor(hidden.row / 3) * 3;
        r2 = r1 + 2;
        c1 = Math.floor(hidden.col / 3) * 3;
        c2 = c1 + 2;
      }

      const counts = countCandidates(candidates, r1, c1, r2, c2);
      if (counts[hidden.val]?.length === 1) {
        const regionName = regionType === 'row' ? `row ${hidden.row + 1}` : regionType === 'col' ? `column ${hidden.col + 1}` : `this 3x3 block`;
        return {
          row: hidden.row,
          col: hidden.col,
          val: hidden.val,
          technique: 'Hidden Single',
          explanation: `In ${regionName}, the number ${hidden.val} can only be placed in cell (${hidden.row + 1}, ${hidden.col + 1}).`,
          contributingCells: getContributingCellsForHiddenSingle(board, regionType, hidden.row, hidden.col, hidden.val)
        };
      }
    }
  }

  // 4. Try Pointing Pairs / Triples
  const pointingPair = findPointingPairHint(board, candidates);
  if (pointingPair) {
    return pointingPair;
  }

  // 5. Try Naked Pairs
  const nakedPair = findNakedPairHint(board, candidates);
  if (nakedPair) {
    return nakedPair;
  }

  // 6. Try Hidden Pairs
  const hiddenPair = findHiddenPairHint(board, candidates);
  if (hiddenPair) {
    return hiddenPair;
  }

  // 7. Try Naked Triples
  const nakedTriple = findNakedTripleHint(board, candidates);
  if (nakedTriple) {
    return nakedTriple;
  }

  // 8. Try X-Wings
  const xWing = findXWingHint(board, candidates);
  if (xWing) {
    return xWing;
  }

  // 9. Try Y-Wings
  const yWing = findYWingHint(board, candidates);
  if (yWing) {
    return yWing;
  }

  // 10. Fallback: Grandmaster Insight
  // This happens if more advanced techniques are needed or no simple logic applies.
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === 0) {
        return {
          row: i,
          col: j,
          val: solution[i][j],
          technique: 'Grandmaster Insight',
          explanation: `This puzzle reaches a level of complexity beyond standard advanced patterns (like X-Wings or Y-Wings). This insight provides a correct move in cell (${i + 1}, ${j + 1}) to help you progress through this Grandmaster-level challenge.`,
          contributingCells: []
        };
      }
    }
  }

  return null;
};

const getContributingCellsForNakedSingle = (board: Board, r: number, c: number, val: number): { row: number, col: number }[] => {
  const contributing: { row: number, col: number }[] = [];
  const numbersToFind = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => n !== val);

  // For each number that rules out candidates, find ONE cell that contains it in the same row, col, or block
  for (const n of numbersToFind) {
    let found = false;
    // Row
    for (let j = 0; j < 9; j++) {
      if (board[r][j] === n) { contributing.push({ row: r, col: j }); found = true; break; }
    }
    if (found) continue;
    // Col
    for (let i = 0; i < 9; i++) {
      if (board[i][c] === n) { contributing.push({ row: i, col: c }); found = true; break; }
    }
    if (found) continue;
    // Block
    const startRow = Math.floor(r / 3) * 3;
    const startCol = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const currR = startRow + i;
        const currC = startCol + j;
        if (board[currR][currC] === n) { contributing.push({ row: currR, col: currC }); found = true; break; }
      }
      if (found) break;
    }
  }
  return contributing;
};

const findPointingPairHint = (board: Board, candidates: Candidates): Hint | null => {
  // We want to see if any Pointing Pair removal LEADS to a Single (Naked or Hidden)
  // To avoid recursion, we check if the candidate being removed was the last thing
  // preventing a cell from being a Single.

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

        if (positions.length < 2 || positions.length > 3) continue;

        // Check Row
        const firstRow = positions[0].r;
        if (positions.every(p => p.r === firstRow)) {
          // It's a pointing pair in a row. Check if it rules out 'num' elsewhere in that row
          // AND if that removal reveals a Single.
          for (let k = 0; k < 9; k++) {
            if (k >= startCol && k < startCol + 3) continue; // Skip current box
            if (candidates[firstRow][k].includes(num)) {
              // If we remove 'num' from candidates[firstRow][k], does it become a Single?
              if (candidates[firstRow][k].length === 2) {
                const otherVal = candidates[firstRow][k].find(n => n !== num)!;
                return {
                  row: firstRow,
                  col: k,
                  val: otherVal,
                  technique: 'Pointing Pair',
                  explanation: `In the 3x3 block at (${boxRow + 1}, ${boxCol + 1}), the number ${num} can only be in row ${firstRow + 1}. Therefore, it cannot be anywhere else in that row. This reveals that cell (${firstRow + 1}, ${k + 1}) must be ${otherVal}.`,
                  contributingCells: [...positions.map(p => ({ row: p.r, col: p.c })), { row: firstRow, col: k }]
                };
              }
            }
          }
        }

        // Check Col
        const firstCol = positions[0].c;
        if (positions.every(p => p.c === firstCol)) {
          // It's a pointing pair in a column.
          for (let k = 0; k < 9; k++) {
            if (k >= startRow && k < startRow + 3) continue; // Skip current box
            if (candidates[k][firstCol].includes(num)) {
              if (candidates[k][firstCol].length === 2) {
                const otherVal = candidates[k][firstCol].find(n => n !== num)!;
                return {
                  row: k,
                  col: firstCol,
                  val: otherVal,
                  technique: 'Pointing Pair',
                  explanation: `In the 3x3 block at (${boxRow + 1}, ${boxCol + 1}), the number ${num} can only be in column ${firstCol + 1}. Therefore, it cannot be anywhere else in that column. This reveals that cell (${k + 1}, ${firstCol + 1}) must be ${otherVal}.`,
                  contributingCells: [...positions.map(p => ({ row: p.r, col: p.c })), { row: k, col: firstCol }]
                };
              }
            }
          }
        }
      }
    }
  }
  return null;
};

const findNakedPairHint = (board: Board, candidates: Candidates): Hint | null => {
  // Check Rows
  for (let r = 0; r < 9; r++) {
    const hint = findNakedPairInRegion(board, candidates, 'row', r);
    if (hint) return hint;
  }
  // Check Cols
  for (let c = 0; c < 9; c++) {
    const hint = findNakedPairInRegion(board, candidates, 'col', c);
    if (hint) return hint;
  }
  // Check Boxes
  for (let b = 0; b < 9; b++) {
    const hint = findNakedPairInRegion(board, candidates, 'block', b);
    if (hint) return hint;
  }
  return null;
};

const findNakedPairInRegion = (board: Board, candidates: Candidates, type: 'row' | 'col' | 'block', index: number): Hint | null => {
  const regionCells: { r: number, c: number }[] = [];
  if (type === 'row') {
    for (let j = 0; j < 9; j++) regionCells.push({ r: index, c: j });
  } else if (type === 'col') {
    for (let i = 0; i < 9; i++) regionCells.push({ r: i, c: index });
  } else {
    const startRow = Math.floor(index / 3) * 3;
    const startCol = (index % 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) regionCells.push({ r: startRow + i, c: startCol + j });
    }
  }

  const pairs: { cell1: { r: number, c: number }, cell2: { r: number, c: number }, nums: number[] }[] = [];
  for (let i = 0; i < regionCells.length; i++) {
    const c1 = regionCells[i];
    if (board[c1.r][c1.c] === 0 && candidates[c1.r][c1.c].length === 2) {
      for (let j = i + 1; j < regionCells.length; j++) {
        const c2 = regionCells[j];
        if (board[c2.r][c2.c] === 0 && candidates[c2.r][c2.c].length === 2) {
          const nums1 = candidates[c1.r][c1.c];
          const nums2 = candidates[c2.r][c2.c];
          if (nums1[0] === nums2[0] && nums1[1] === nums2[1]) {
            pairs.push({ cell1: c1, cell2: c2, nums: nums1 });
          }
        }
      }
    }
  }

  for (const pair of pairs) {
    // Check if this pair rules out candidates in other cells of the region
    for (const cell of regionCells) {
      if ((cell.r === pair.cell1.r && cell.c === pair.cell1.c) || (cell.r === pair.cell2.r && cell.c === pair.cell2.c)) continue;
      if (board[cell.r][cell.c] !== 0) continue;

      for (const num of pair.nums) {
        if (candidates[cell.r][cell.c].includes(num)) {
          // If we remove this num, does it reveal a Single?
          if (candidates[cell.r][cell.c].length === 2) {
            const otherVal = candidates[cell.r][cell.c].find(n => n !== num)!;
            const regionName = type === 'row' ? `row ${index + 1}` : type === 'col' ? `column ${index + 1}` : `this 3x3 block`;
            return {
              row: cell.r,
              col: cell.c,
              val: otherVal,
              technique: 'Naked Pair',
              explanation: `Cells (${pair.cell1.r + 1}, ${pair.cell1.c + 1}) and (${pair.cell2.r + 1}, ${pair.cell2.c + 1}) both contain only the numbers ${pair.nums[0]} and ${pair.nums[1]}. In ${regionName}, these numbers must go in these two cells. This rules them out elsewhere in the same region, revealing that cell (${cell.r + 1}, ${cell.c + 1}) must be ${otherVal}.`,
              contributingCells: [{ row: pair.cell1.r, col: pair.cell1.c }, { row: pair.cell2.r, col: pair.cell2.c }, { row: cell.r, col: cell.c }]
            };
          }
        }
      }
    }
  }

  return null;
};

const findNakedTripleHint = (board: Board, candidates: Candidates): Hint | null => {
  // Check Rows
  for (let r = 0; r < 9; r++) {
    const hint = findNakedTripleInRegion(board, candidates, 'row', r);
    if (hint) return hint;
  }
  // Check Cols
  for (let c = 0; c < 9; c++) {
    const hint = findNakedTripleInRegion(board, candidates, 'col', c);
    if (hint) return hint;
  }
  // Check Boxes
  for (let b = 0; b < 9; b++) {
    const hint = findNakedTripleInRegion(board, candidates, 'block', b);
    if (hint) return hint;
  }
  return null;
};

const findNakedTripleInRegion = (board: Board, candidates: Candidates, type: 'row' | 'col' | 'block', index: number): Hint | null => {
  const regionCells: { r: number, c: number }[] = [];
  if (type === 'row') {
    for (let j = 0; j < 9; j++) regionCells.push({ r: index, c: j });
  } else if (type === 'col') {
    for (let i = 0; i < 9; i++) regionCells.push({ r: i, c: index });
  } else {
    const startRow = Math.floor(index / 3) * 3;
    const startCol = (index % 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) regionCells.push({ r: startRow + i, c: startCol + j });
    }
  }

  const emptyCells = regionCells.filter(cell => board[cell.r][cell.c] === 0 && candidates[cell.r][cell.c].length >= 2 && candidates[cell.r][cell.c].length <= 3);

  if (emptyCells.length < 3) return null;

  for (let i = 0; i < emptyCells.length; i++) {
    for (let j = i + 1; j < emptyCells.length; j++) {
      for (let k = j + 1; k < emptyCells.length; k++) {
        const c1 = emptyCells[i];
        const c2 = emptyCells[j];
        const c3 = emptyCells[k];

        const combinedCandidates = Array.from(new Set([...candidates[c1.r][c1.c], ...candidates[c2.r][c2.c], ...candidates[c3.r][c3.c]])).sort((a, b) => a - b);

        if (combinedCandidates.length === 3) {
          // Found a Naked Triple
          // Check if it rules out any candidates in other cells of the region
          for (const cell of regionCells) {
            if ([c1, c2, c3].some(c => c.r === cell.r && c.c === cell.c)) continue;
            if (board[cell.r][cell.c] !== 0) continue;

            for (const num of combinedCandidates) {
              if (candidates[cell.r][cell.c].includes(num)) {
                // If we remove this num, does it reveal a Single?
                if (candidates[cell.r][cell.c].length === 2) {
                  const otherVal = candidates[cell.r][cell.c].find(n => n !== num)!;
                  const regionName = type === 'row' ? `row ${index + 1}` : type === 'col' ? `column ${index + 1}` : `this 3x3 block`;
                  return {
                    row: cell.r,
                    col: cell.c,
                    val: otherVal,
                    technique: 'Naked Triple',
                    explanation: `Cells (${c1.r + 1}, ${c1.c + 1}), (${c2.r + 1}, ${c2.c + 1}), and (${c3.r + 1}, ${c3.c + 1}) contain only the numbers ${combinedCandidates.join(', ')}. In ${regionName}, these numbers must go in these three cells. This rules them out elsewhere in the region, revealing that cell (${cell.r + 1}, ${cell.c + 1}) must be ${otherVal}.`,
                    contributingCells: [
                      { row: c1.r, col: c1.c },
                      { row: c2.r, col: c2.c },
                      { row: c3.r, col: c3.c },
                      { row: cell.r, col: cell.c }
                    ]
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
};

const findXWingHint = (board: Board, candidates: Candidates): Hint | null => {
  // X-Wing in Rows
  for (let num = 1; num <= 9; num++) {
    const rowPositions: number[][] = Array(9).fill(null).map(() => []);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0 && candidates[r][c].includes(num)) {
          rowPositions[r].push(c);
        }
      }
    }

    const twoCandRows = rowPositions.map((cols, idx) => ({ r: idx, cols })).filter(row => row.cols.length === 2);

    for (let i = 0; i < twoCandRows.length; i++) {
      for (let j = i + 1; j < twoCandRows.length; j++) {
        const r1 = twoCandRows[i];
        const r2 = twoCandRows[j];

        if (r1.cols[0] === r2.cols[0] && r1.cols[1] === r2.cols[1]) {
          // Potential X-Wing! Check columns r1.cols[0] and r1.cols[1] for removals in other rows.
          const cols = [r1.cols[0], r1.cols[1]];
          for (const c of cols) {
            for (let r = 0; r < 9; r++) {
              if (r === r1.r || r === r2.r) continue;
              if (board[r][c] === 0 && candidates[r][c].includes(num)) {
                // Removal possible. Check if it reveals a Single.
                if (candidates[r][c].length === 2) {
                  const otherVal = candidates[r][c].find(n => n !== num)!;
                  return {
                    row: r,
                    col: c,
                    val: otherVal,
                    technique: 'X-Wing',
                    explanation: `The number ${num} appears exactly twice in row ${r1.r + 1} and row ${r2.r + 1}, in columns ${cols[0] + 1} and ${cols[1] + 1}. This forms an X-Wing pattern, meaning ${num} must be in one of these four corners. Therefore, ${num} cannot be anywhere else in these columns. This reveals that cell (${r + 1}, ${c + 1}) must be ${otherVal}.`,
                    contributingCells: [
                      { row: r1.r, col: cols[0] },
                      { row: r1.r, col: cols[1] },
                      { row: r2.r, col: cols[0] },
                      { row: r2.r, col: cols[1] },
                      { row: r, col: c }
                    ]
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  // X-Wing in Columns (Symmetric to rows)
  for (let num = 1; num <= 9; num++) {
    const colPositions: number[][] = Array(9).fill(null).map(() => []);
    for (let c = 0; c < 9; c++) {
      for (let r = 0; r < 9; r++) {
        if (board[r][c] === 0 && candidates[r][c].includes(num)) {
          colPositions[c].push(r);
        }
      }
    }

    const twoCandCols = colPositions.map((rows, idx) => ({ c: idx, rows })).filter(col => col.rows.length === 2);

    for (let i = 0; i < twoCandCols.length; i++) {
      for (let j = i + 1; j < twoCandCols.length; j++) {
        const c1 = twoCandCols[i];
        const c2 = twoCandCols[j];

        if (c1.rows[0] === c2.rows[0] && c1.rows[1] === c2.rows[1]) {
          const rows = [c1.rows[0], c1.rows[1]];
          for (const r of rows) {
            for (let c = 0; c < 9; c++) {
              if (c === c1.c || c === c2.c) continue;
              if (board[r][c] === 0 && candidates[r][c].includes(num)) {
                if (candidates[r][c].length === 2) {
                  const otherVal = candidates[r][c].find(n => n !== num)!;
                  return {
                    row: r,
                    col: c,
                    val: otherVal,
                    technique: 'X-Wing',
                    explanation: `The number ${num} appears exactly twice in column ${c1.c + 1} and column ${c2.c + 1}, in rows ${rows[0] + 1} and ${rows[1] + 1}. This forms an X-Wing pattern, meaning ${num} must be in one of these four corners. Therefore, ${num} cannot be anywhere else in these rows. This reveals that cell (${r + 1}, ${c + 1}) must be ${otherVal}.`,
                    contributingCells: [
                      { row: rows[0], col: c1.c },
                      { row: rows[1], col: c1.c },
                      { row: rows[0], col: c2.c },
                      { row: rows[1], col: c2.c },
                      { row: r, col: c }
                    ]
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
};

const findHiddenPairHint = (board: Board, candidates: Candidates): Hint | null => {
  // Check Rows
  for (let r = 0; r < 9; r++) {
    const hint = findHiddenPairInRegion(board, candidates, 'row', r);
    if (hint) return hint;
  }
  // Check Cols
  for (let c = 0; c < 9; c++) {
    const hint = findHiddenPairInRegion(board, candidates, 'col', c);
    if (hint) return hint;
  }
  // Check Boxes
  for (let b = 0; b < 9; b++) {
    const hint = findHiddenPairInRegion(board, candidates, 'block', b);
    if (hint) return hint;
  }
  return null;
};

const findHiddenPairInRegion = (board: Board, candidates: Candidates, type: 'row' | 'col' | 'block', index: number): Hint | null => {
  const regionCells: { r: number, c: number }[] = [];
  if (type === 'row') {
    for (let j = 0; j < 9; j++) regionCells.push({ r: index, c: j });
  } else if (type === 'col') {
    for (let i = 0; i < 9; i++) regionCells.push({ r: i, c: index });
  } else {
    const startRow = Math.floor(index / 3) * 3;
    const startCol = (index % 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) regionCells.push({ r: startRow + i, c: startCol + j });
    }
  }

  // Count occurrences of each candidate in the region
  const counts: Record<number, { r: number, c: number }[]> = {};
  for (let num = 1; num <= 9; num++) counts[num] = [];

  for (const cell of regionCells) {
    if (board[cell.r][cell.c] === 0) {
      for (const num of candidates[cell.r][cell.c]) {
        counts[num].push(cell);
      }
    }
  }

  // Find numbers that appear exactly twice
  const potentialNums = Object.keys(counts).map(Number).filter(num => counts[num].length === 2);

  for (let i = 0; i < potentialNums.length; i++) {
    for (let j = i + 1; j < potentialNums.length; j++) {
      const n1 = potentialNums[i];
      const n2 = potentialNums[j];
      const cells1 = counts[n1];
      const cells2 = counts[n2];

      if (cells1[0].r === cells2[0].r && cells1[0].c === cells2[0].c &&
        cells1[1].r === cells2[1].r && cells1[1].c === cells2[1].c) {

        // Found a Hidden Pair!
        // Check if these cells have OTHER candidates that can be removed
        for (const cell of cells1) {
          const others = candidates[cell.r][cell.c].filter(n => n !== n1 && n !== n2);
          if (others.length > 0) {
            // Removal reveals a Single?
            if (candidates[cell.r][cell.c].length - others.length === 1) {
              const revealedVal = candidates[cell.r][cell.c].find(n => n === n1 || n === n2)!;
              const regionName = type === 'row' ? `row ${index + 1}` : type === 'col' ? `column ${index + 1}` : `this 3x3 block`;
              return {
                row: cell.r,
                col: cell.c,
                val: revealedVal,
                technique: 'Hidden Pair',
                explanation: `In ${regionName}, the numbers ${n1} and ${n2} can only be in cells (${cells1[0].r + 1}, ${cells1[0].c + 1}) and (${cells1[1].r + 1}, ${cells1[1].c + 1}). Therefore, no other numbers can be in those cells. This reveals that cell (${cell.r + 1}, ${cell.c + 1}) must be ${revealedVal}.`,
                contributingCells: [
                  { row: cells1[0].r, col: cells1[0].c },
                  { row: cells1[1].r, col: cells1[1].c },
                  { row: cell.r, col: cell.c }
                ]
              };
            }
          }
        }
      }
    }
  }
  return null;
};

const findYWingHint = (board: Board, candidates: Candidates): Hint | null => {
  // 1. Find all bivalue cells
  const bivalueCells: { r: number, c: number, nums: number[] }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0 && candidates[r][c].length === 2) {
        bivalueCells.push({ r, c, nums: candidates[r][c] });
      }
    }
  }

  if (bivalueCells.length < 3) return null;

  for (const pivot of bivalueCells) {
    const [A, B] = pivot.nums;

    // 2. Find pincers (cells that see pivot and share one candidate)
    const pincers: { r: number, c: number, nums: number[], shared: number, other: number }[] = [];
    for (const other of bivalueCells) {
      if (other.r === pivot.r && other.c === pivot.c) continue;

      const seesPivot = (other.r === pivot.r) || (other.c === pivot.c) ||
        (Math.floor(other.r / 3) === Math.floor(pivot.r / 3) && Math.floor(other.c / 3) === Math.floor(pivot.c / 3));

      if (seesPivot) {
        const [X, Y] = other.nums;
        if ((X === A && Y !== B) || (Y === A && X !== B)) {
          pincers.push({ ...other, shared: A, other: X === A ? Y : X });
        } else if ((X === B && Y !== A) || (Y === B && X !== A)) {
          pincers.push({ ...other, shared: B, other: X === B ? Y : X });
        }
      }
    }

    // 3. Check pairs of pincers
    for (let i = 0; i < pincers.length; i++) {
      for (let j = i + 1; j < pincers.length; j++) {
        const p1 = pincers[i];
        const p2 = pincers[j];

        // Must share different candidates with the pivot
        if (p1.shared === p2.shared) continue;

        // Must share the same "other" candidate (C)
        if (p1.other === p2.other) {
          const C = p1.other;

          // 4. Find cells that see BOTH pincers and have candidate C
          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              if (board[r][c] !== 0) continue;
              if ((r === p1.r && c === p1.c) || (r === p2.r && c === p2.c) || (r === pivot.r && c === pivot.c)) continue;

              const seesP1 = (r === p1.r) || (c === p1.c) ||
                (Math.floor(r / 3) === Math.floor(p1.r / 3) && Math.floor(c / 3) === Math.floor(p1.c / 3));
              const seesP2 = (r === p2.r) || (c === p2.c) ||
                (Math.floor(r / 3) === Math.floor(p2.r / 3) && Math.floor(c / 3) === Math.floor(p2.c / 3));

              if (seesP1 && seesP2 && candidates[r][c].includes(C)) {
                // Potential removal! Check if it reveals a Single.
                if (candidates[r][c].length === 2) {
                  const revealedVal = candidates[r][c].find(n => n !== C)!;
                  return {
                    row: r,
                    col: c,
                    val: revealedVal,
                    technique: 'Y-Wing',
                    explanation: `Cells (${pivot.r + 1}, ${pivot.c + 1}), (${p1.r + 1}, ${p1.c + 1}), and (${p2.r + 1}, ${p2.c + 1}) form a Y-Wing. Pivot (${pivot.r + 1}, ${pivot.c + 1}) has ${pivot.nums.join(',')}. Pincers share ${C}. This rules out ${C} from any cell that sees both pincers, revealing cell (${r + 1}, ${c + 1}) must be ${revealedVal}.`,
                    contributingCells: [
                      { row: pivot.r, col: pivot.c },
                      { row: p1.r, col: p1.c },
                      { row: p2.r, col: p2.c },
                      { row: r, col: c }
                    ]
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
};

const getContributingCellsForHiddenSingle = (board: Board, regionType: 'row' | 'col' | 'block', r: number, c: number, val: number): { row: number, col: number }[] => {
  const contributing: { row: number, col: number }[] = [];
  const startRow = Math.floor(r / 3) * 3;
  const startCol = Math.floor(c / 3) * 3;

  // In a hidden single, we want to show cells in OTHER regions that rule out 'val' from other cells in THIS region.
  // Actually, for simplicity, let's just highlight the other cells in the SAME region that are occupied.
  // BUT the user asked for "how those cells factor in". 
  // A better interpretation for "Hidden Single" is: "Why is this the ONLY cell in this row that can be a 5?"
  // Because other cells in this row are ruled out by 5s in their respective columns or blocks.

  let cellsToCheck: { r: number, c: number }[] = [];
  if (regionType === 'row') {
    for (let j = 0; j < 9; j++) { if (j !== c && board[r][j] === 0) cellsToCheck.push({ r, c: j }); }
  } else if (regionType === 'col') {
    for (let i = 0; i < 9; i++) { if (i !== r && board[i][c] === 0) cellsToCheck.push({ r: i, c }); }
  } else {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const currR = startRow + i;
        const currC = startCol + j;
        if ((currR !== r || currC !== c) && board[currR][currC] === 0) cellsToCheck.push({ r: currR, c: currC });
      }
    }
  }

  for (const cell of cellsToCheck) {
    // Find WHY value 'val' is ruled out for this cell
    let found = false;
    // Check Row
    for (let j = 0; j < 9; j++) {
      if (board[cell.r][j] === val) { contributing.push({ row: cell.r, col: j }); found = true; break; }
    }
    if (found) continue;
    // Check Col
    for (let i = 0; i < 9; i++) {
      if (board[i][cell.c] === val) { contributing.push({ row: i, col: cell.c }); found = true; break; }
    }
    if (found) continue;
    // Check Block
    const bRow = Math.floor(cell.r / 3) * 3;
    const bCol = Math.floor(cell.c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[bRow + i][bCol + j] === val) { contributing.push({ row: bRow + i, col: bCol + j }); found = true; break; }
      }
      if (found) break;
    }
  }

  return contributing;
};