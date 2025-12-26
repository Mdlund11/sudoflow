// Utilities for detecting completed regions in the Sudoku board

export type RegionType = 'row' | 'column' | 'block';

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

    return completedRegions;
};
