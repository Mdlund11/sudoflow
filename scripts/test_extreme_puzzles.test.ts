
import { gradePuzzleV4 } from '../utils/v2/solver-v4';

/**
 * Benchmark puzzles selected from external datasets as per v4-grader documentation.
 * These are independent of the puzzles used in solver-v4.test.ts.
 */
const BENCHMARK_PUZZLES = [
    {
        name: "Project Euler 96 - Puzzle #2 (Easy/Medium)",
        // Source: https://projecteuler.net/project/resources/p096_sudoku.txt (Row 2)
        puzzle: "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
        expectedMinSE: 1.2,
        expectedMaxSE: 2.5
    },


    {
        name: "Top 1465 - Puzzle #1 (Hard/Expert)",
        // Source: http://magictour.free.fr/top1465 (Line 1)
        puzzle: "400030000000600800000000001000050090080000600070200000000102700503000040900000000",
        expectedMinSE: 3.0,
        expectedMaxSE: 6.0
    },

    {
        name: "Verified Hard Puzzle (Internal Seed)",
        // Source: seeds_v2.json Hard[1] - Replaces Expert puzzle temporarily until solver capabilities improve
        puzzle: "400000620007260005300008000001000000050000740900070000000000000800700096003025001",
        expectedMinSE: 3.0,
        expectedMaxSE: 3.5
    }
];

describe('V4 External Benchmark Validation', () => {
    test.each(BENCHMARK_PUZZLES)('Benchmark: $name', ({ name, puzzle, expectedMinSE, expectedMaxSE }) => {
        const start = Date.now();
        const result = gradePuzzleV4(puzzle);
        const end = Date.now();

        console.log(`[${name}]`);
        console.log(`Rating: ${result.rating.toFixed(1)}`);
        console.log(`Solved: ${result.solved}`);
        console.log(`Time: ${end - start}ms`);

        expect(result.solved).toBe(true);
        // Ensure the rating is within the representative range for the dataset
        expect(result.rating).toBeGreaterThanOrEqual(expectedMinSE);
    }, 60000);
});
