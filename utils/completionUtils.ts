// Utilities for detecting completed regions in the Sudoku board

export type RegionType = 'row' | 'column' | 'block' | 'number';

export interface CompletedRegion {
    type: RegionType;
    index: number; // row/col index, or block index (0-8)
    cells: { row: number; col: number }[];
}

/**
 * Check if a row contains all 9 unique numbers (1-9)
 */
export const isRowComplete = (board: number[][], row: number): boolean => {
    const seen = new Set<number>();
    for (let col = 0; col < 9; col++) {
        const value = board[row][col];
        if (value === 0) return false;
        if (seen.has(value)) return false;
        seen.add(value);
    }
    return seen.size === 9;
};

/**
 * Check if a column contains all 9 unique numbers (1-9)
 */
export const isColumnComplete = (board: number[][], col: number): boolean => {
    const seen = new Set<number>();
    for (let row = 0; row < 9; row++) {
        const value = board[row][col];
        if (value === 0) return false;
        if (seen.has(value)) return false;
        seen.add(value);
    }
    return seen.size === 9;
};

/**
 * Check if a 3x3 block contains all 9 unique numbers (1-9)
 * @param blockRow - Block row index (0-2)
 * @param blockCol - Block column index (0-2)
 */
export const isBlockComplete = (board: number[][], blockRow: number, blockCol: number): boolean => {
    const seen = new Set<number>();
    const startRow = blockRow * 3;
    const startCol = blockCol * 3;

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const value = board[startRow + i][startCol + j];
            if (value === 0) return false;
            if (seen.has(value)) return false;
            seen.add(value);
        }
    }
    return seen.size === 9;
};

/**
 * Get all cells in a row
 */
const getRowCells = (row: number): { row: number; col: number }[] => {
    const cells = [];
    for (let col = 0; col < 9; col++) {
        cells.push({ row, col });
    }
    return cells;
};

/**
 * Get all cells in a column
 */
const getColumnCells = (col: number): { row: number; col: number }[] => {
    const cells = [];
    for (let row = 0; row < 9; row++) {
        cells.push({ row, col });
    }
    return cells;
};

/**
 * Get all cells in a 3x3 block
 * @param blockRow - Block row index (0-2)
 * @param blockCol - Block column index (0-2)
 */
const getBlockCells = (blockRow: number, blockCol: number): { row: number; col: number }[] => {
    const cells = [];
    const startRow = blockRow * 3;
    const startCol = blockCol * 3;

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            cells.push({ row: startRow + i, col: startCol + j });
        }
    }
    return cells;
};

/**
 * Check if all 9 instances of a number are placed on the board.
 */
export const isNumberComplete = (board: number[][], num: number): boolean => {
    let count = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === num) count++;
        }
    }
    return count === 9;
};

/**
 * Get all cells containing a specific number.
 */
export const getNumberCells = (board: number[][], num: number): { row: number; col: number }[] => {
    const cells = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === num) {
                cells.push({ row: r, col: c });
            }
        }
    }
    return cells;
};

/**
 * Detect newly completed regions after placing a cell
 * Only returns regions that are now complete (weren't complete before)
 */
export const getNewlyCompletedRegions = (
    oldBoard: number[][],
    newBoard: number[][],
    row: number,
    col: number
): CompletedRegion[] => {
    const completedRegions: CompletedRegion[] = [];
    const placedValue = newBoard[row][col];

    // Check row
    if (isRowComplete(newBoard, row) && !isRowComplete(oldBoard, row)) {
        completedRegions.push({
            type: 'row',
            index: row,
            cells: getRowCells(row),
        });
    }

    // Check column
    if (isColumnComplete(newBoard, col) && !isColumnComplete(oldBoard, col)) {
        completedRegions.push({
            type: 'column',
            index: col,
            cells: getColumnCells(col),
        });
    }

    // Check block
    const blockRow = Math.floor(row / 3);
    const blockCol = Math.floor(col / 3);
    if (isBlockComplete(newBoard, blockRow, blockCol) && !isBlockComplete(oldBoard, blockRow, blockCol)) {
        completedRegions.push({
            type: 'block',
            index: blockRow * 3 + blockCol,
            cells: getBlockCells(blockRow, blockCol),
        });
    }

    // Check number completion
    if (placedValue !== 0 && isNumberComplete(newBoard, placedValue) && !isNumberComplete(oldBoard, placedValue)) {
        completedRegions.push({
            type: 'number',
            index: placedValue,
            cells: getNumberCells(newBoard, placedValue),
        });
    }

    return completedRegions;
};

/**
 * Calculate staggered delays for a unified wave animation starting from the move cell.
 */
export const getUnifiedWaveDelays = (
    moveRow: number,
    moveCol: number,
    completedRegions: CompletedRegion[]
): Record<string, number> => {
    const delays: Record<string, number> = {};
    const STAGGER_AMOUNT = 30; // Matches ANIMATION_TIMINGS.STAGGER_AMOUNT

    // 1. Build flat set of unique cells involved across all regions
    const uniqueCells = new Map<string, { row: number; col: number }>();
    completedRegions.forEach(region => {
        region.cells.forEach(cell => {
            uniqueCells.set(`${cell.row},${cell.col}`, cell);
        });
    });

    // 2. Calculate Manhattan distance from the "Move Cell" and map delays
    uniqueCells.forEach((cell, key) => {
        const distance = Math.abs(moveRow - cell.row) + Math.abs(moveCol - cell.col);
        delays[key] = distance * STAGGER_AMOUNT;
    });

    return delays;
};
