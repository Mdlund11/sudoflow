import { PUZZLE_SEEDS } from './seeds';
// @ts-ignore
import SEEDS_V2 from './seeds_v2.json';
import { BoardState, SudokuSolverV2 } from './solver-v4';

export class SudokuGeneratorV2 {
    /**
     * Generates a new puzzle by applying transformations to a seed and digging clues.
     */
    static generate(targetLabel: string, options?: { maxAttempts?: number; forceRuntime?: boolean }): { puzzle: BoardState; solution: BoardState; seRating: number; hodokuScore: number } {
        // 1. Try to load from Tiered Seeds (Offline Mining)
        if (!options?.forceRuntime) {
            const seeds = this.loadTieredSeeds();
            if (seeds && seeds[targetLabel] && seeds[targetLabel].length > 0) {
                const gem = seeds[targetLabel][Math.floor(Math.random() * seeds[targetLabel].length)];

                // Apply isomorphs to make it look unique
                // Note: We need to apply the SAME transformation to both puzzle and solution
                const { puzzle, solution } = this.applyIsomorphsToPair(gem.puzzle, gem.solution);

                return {
                    puzzle,
                    solution,
                    seRating: gem.seRating,
                    hodokuScore: gem.hodokuScore
                };
            }
        }

        // 2. Fallback: Runtime Generation (Original Logic)
        const difficultyRanges: Record<string, { min: number, max: number }> = {
            "Easy": { min: 2.3, max: 2.9 },
            "Medium": { min: 3.0, max: 3.9 },
            "Hard": { min: 4.0, max: 4.9 },
            "Expert": { min: 5.0, max: 5.9 },
            "Master": { min: 6.0, max: 7.5 },
        };
        const range = difficultyRanges[targetLabel] || difficultyRanges["Easy"];

        let attempts = 0;
        const maxAttempts = options?.maxAttempts || 50;

        while (attempts < maxAttempts) {
            attempts++;
            const seed = PUZZLE_SEEDS[Math.floor(Math.random() * PUZZLE_SEEDS.length)];
            let solution = this.applyIsomorphs(seed);

            let puzzle = solution.map(r => [...r]);
            const cells = [];
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    cells.push({ r, c });
                }
            }
            this.shuffle(cells);

            let currentSe = 0;
            let currentHodoku = 0;

            for (const { r, c } of cells) {
                const temp = puzzle[r][c];
                puzzle[r][c] = 0;

                // Check uniqueness using Fast Solver (countSolutions)
                if (SudokuSolverV2.countSolutions(puzzle) !== 1) {
                    puzzle[r][c] = temp;
                    continue;
                }

                // Check difficulty using Human Solver
                const result = SudokuSolverV2.solveHuman(puzzle);
                if (!result.solved || result.seRating > range.max) {
                    // If it becomes unsolvable by the Human Solver or exceeds max difficulty, put it back
                    puzzle[r][c] = temp;
                } else {
                    currentSe = result.seRating;
                    currentHodoku = result.hodokuScore;
                }
            }

            // Check if it meets the minimum difficulty (and ensure we actually calculated it)
            if (currentSe >= range.min || attempts === maxAttempts) {
                return { puzzle, solution, seRating: currentSe, hodokuScore: currentHodoku };
            }
            // If too easy, retry with another seed/digging order
        }

        // Fallback (should not be reached if maxAttempts is reasonable)
        return { puzzle: [], solution: [], seRating: 0, hodokuScore: 0 };
    }

    private static loadTieredSeeds(): any | null {
        return SEEDS_V2;
    }

    private static applyIsomorphsToPair(puzzle: BoardState, solution: BoardState): { puzzle: BoardState, solution: BoardState } {
        let newPuzzle = puzzle.map(r => [...r]);
        let newSolution = solution.map(r => [...r]);

        // 1. Digit Swapping
        const map = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const swap = (val: number) => val === 0 ? 0 : map[val - 1];

        newPuzzle = newPuzzle.map(row => row.map(swap));
        newSolution = newSolution.map(row => row.map(swap));

        // 2. Rotation (0, 90, 180, 270)
        const rotations = Math.floor(Math.random() * 4);
        for (let i = 0; i < rotations; i++) {
            newPuzzle = this.rotate90(newPuzzle);
            newSolution = this.rotate90(newSolution);
        }

        // 3. Reflection
        if (Math.random() > 0.5) {
            newPuzzle = newPuzzle.reverse();
            newSolution = newSolution.reverse();
        }
        if (Math.random() > 0.5) {
            newPuzzle = newPuzzle.map(row => row.reverse());
            newSolution = newSolution.map(row => row.reverse());
        }

        return { puzzle: newPuzzle, solution: newSolution };
    }

    private static applyIsomorphs(board: BoardState): BoardState {
        let newBoard = board.map(r => [...r]);

        // 1. Digit Swapping
        const map = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        newBoard = newBoard.map(row => row.map(val => val === 0 ? 0 : map[val - 1]));

        // 2. Rotation (0, 90, 180, 270)
        const rotations = Math.floor(Math.random() * 4);
        for (let i = 0; i < rotations; i++) {
            newBoard = this.rotate90(newBoard);
        }

        // 3. Reflection
        if (Math.random() > 0.5) newBoard = newBoard.reverse(); // Horizontal flip
        if (Math.random() > 0.5) newBoard = newBoard.map(row => row.reverse()); // Vertical flip

        return newBoard;
    }

    private static rotate90(board: BoardState): BoardState {
        const N = 9;
        const result = Array(N).fill(0).map(() => Array(N).fill(0));
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                result[c][N - 1 - r] = board[r][c];
            }
        }
        return result;
    }

    private static shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
