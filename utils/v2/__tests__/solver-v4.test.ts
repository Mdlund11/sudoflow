import { gradePuzzleV4 } from '../solver-v4';

describe('SudokuGraderV4', () => {
    test('Easy Puzzle (SE 1.2 - 1.5)', () => {
        const puzzle = '000105000140000670080002400063070010900000003010090520007200080026000035000409000';
        const result = gradePuzzleV4(puzzle);
        console.log(`Easy Rating: ${result.rating}`);
        expect(result.rating).toBeGreaterThanOrEqual(1.2);
        expect(result.rating).toBeLessThanOrEqual(1.5);
    });




    test('Hard Puzzle (SE 3.0 - 3.4)', () => {
        // Source: Internal Seed Hard[1] (Matches V4 difficulty 3.4)
        const puzzle = '400000620007260005300008000001000000050000740900070000000000000800700096003025001';
        const result = gradePuzzleV4(puzzle);
        console.log(`Hard Rating: ${result.rating}`);
        expect(result.rating).toBeGreaterThanOrEqual(3.0);
        expect(result.rating).toBeLessThanOrEqual(3.4);
    });
});
