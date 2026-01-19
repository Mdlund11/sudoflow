
import { GridModelV4, HiddenSingleStrategy } from '../solver-v4';

const m = (...digits: number[]) => digits.reduce((acc, d) => acc | (1 << (d - 1)), 0);

function createMinimalHiddenState(coordinates: Record<string, number>): GridModelV4 {
    const grid = new GridModelV4("");
    for (let i = 0; i < 81; i++) grid.setCellValue(i, 9);
    for (const [coord, mask] of Object.entries(coordinates)) {
        const r = parseInt(coord[1]) - 1, c = parseInt(coord[3]) - 1;
        grid.cells[r * 9 + c] = 0;
        grid.candidates[r * 9 + c] = mask & ~(1 << 8); // No 9s
    }
    return grid;
}

describe('HiddenSingleStrategy Spec-Compliant Validation', () => {
    let strategy: HiddenSingleStrategy;
    beforeEach(() => { strategy = new HiddenSingleStrategy(); });

    it('Should find Hidden Single (Block) (1.2)', () => {
        // Digit 5 is the ONLY single. 7 and 8 are noise pairs.
        const grid = createMinimalHiddenState({
            'r1c1': m(5, 7, 8),
            'r1c2': m(7, 8)
        });
        const step = strategy.find(grid);
        expect(step).not.toBeNull();
        expect(step!.val).toBe(5);
        expect(step!.technique).toBe('Hidden Single (Block)');
    });

    it('Should find Hidden Single (Line) (1.5) in a Row', () => {
        // Digit 5 is in r1c1 and r2c2 (Box 1).
        // Row 1 only has 5 in r1c1 (Index 0).
        // Row 2 only has 5 in r2c2 (Index 11).
        // Box 1 has 5 in BOTH.
        // We add noise to prevent other singles.
        const grid = createMinimalHiddenState({
            'r1c1': m(5, 7),
            'r1c2': m(7),
            'r2c1': m(8),
            'r2c2': m(5, 8)
        });
        const step = strategy.find(grid);
        expect(step).not.toBeNull();
        expect(step!.technique).toBe('Hidden Single (Line)');
        expect(step!.val).toBe(5);
    });

    it('Should respect cross-house constraints', () => {
        const grid = createMinimalHiddenState({
            'r1c1': m(5, 7),
            'r1c2': m(5, 7)
        });
        grid.setCellValue(37, 5); // r5c2 
        const step = strategy.find(grid);
        expect(step).not.toBeNull();
        expect(step!.val).toBe(5);
    });

    it('Should not flag solved cells', () => {
        const grid = createMinimalHiddenState({});
        grid.setCellValue(0, 5);
        const step = strategy.find(grid);
        if (step && step.val === 5 && step.row === 0 && step.col === 0) {
            throw new Error('Found Hidden Single on solved cell');
        }
    });
});
