
import { GridModelV4, UniqueRectangleStrategy } from '../solver-v4';

describe('UniqueRectangleStrategy', () => {
    let strategy: UniqueRectangleStrategy;

    beforeEach(() => {
        strategy = new UniqueRectangleStrategy();
    });

    test('Type 1: Basic UR (Eliminate pair from roof cell)', () => {
        const grid = new GridModelV4('');
        // Clear all
        for (let i = 0; i < 81; i++) grid.candidates[i] = 0;

        // Rectangle: Rows 0, 1. Cols 0, 1.
        // Pair {1,2}
        // Floor: (0,0), (0,1) -> {1,2}
        // Roof 1: (1,0) -> {1,2}
        // Roof 2: (1,1) -> {1,2,3}  <-- Extra '3'.
        // logic: If (1,1) was {1,2}, we'd have deadly pattern. So (1,1) MUST NOT be 1 or 2?
        // Wait. if (1,1) is 1 or 2, it completes the pattern.
        // Therefore, (1,1) MUST be 3.
        // So eliminate 1 and 2 from (1,1).

        grid.candidates[0] = (1 << 0) | (1 << 1); // {1,2}
        grid.candidates[1] = (1 << 0) | (1 << 1); // {1,2}
        grid.candidates[9] = (1 << 0) | (1 << 1); // {1,2} (Index 1*9 + 0)
        grid.candidates[10] = (1 << 0) | (1 << 1) | (1 << 2); // {1,2,3} (Index 1*9 + 1)

        // Ensure these are in proper blocks (Rows 0,1 in same block... wait.)
        // Block 0: r0c0, r0c1, r1c0, r1c1.
        // THIS IS ONE BLOCK!
        // Standard UR requires **TWO BLOCKS**.
        // So this geometry is INVALID for UR Strategy (it's just a local subset).

        // Let's set up 2-Block Geometry.
        // Floor: (0,0), (0,3). (Col 0 in B0, Col 3 in B1).
        // Roof: (1,0), (1,3).
        // Cells: 0, 3 (Row 0). 9, 12 (Row 1).

        // Reset grid
        for (let i = 0; i < 81; i++) grid.candidates[i] = 0;

        const mask12 = (1 << 0) | (1 << 1);
        grid.candidates[0] = mask12;        // r0, c0 {1,2}
        grid.candidates[3] = mask12;        // r0, c3 {1,2}
        grid.candidates[9] = mask12;        // r1, c0 {1,2}
        grid.candidates[12] = mask12 | (1 << 2); // r1, c3 {1,2,3}

        const result = strategy.find(grid);
        expect(result).not.toBeNull();
        expect(result!.technique).toBe('Unique Rectangle (Type 1)');
        expect(result!.explanation).toContain('avoid deadly pattern');

        // Should eliminate 1 and 2 from (1,3)
        const elims = result!.highlights.filter(h => h.type === 'elimination');
        expect(elims.length).toBe(2);
        expect(elims).toEqual(expect.arrayContaining([
            { row: 1, col: 3, type: 'elimination', val: 1 },
            { row: 1, col: 3, type: 'elimination', val: 2 }
        ]));
    });

    test('Type 2: Extra candidate in both roof cells', () => {
        const grid = new GridModelV4('');
        for (let i = 0; i < 81; i++) grid.candidates[i] = 0;

        // Geometry: Cols 0, 3. Rows 0, 1.
        // Floor: (0,0), (0,3) -> {1,2}
        // Roof: (1,0), (1,3) -> {1,2,3} and {1,2,3}
        // Extra is '3' in BOTH.
        // Logic: One of the roof cells MUST be 3.
        // So 3 can be eliminated from any cell that sees BOTH roof cells.
        // Peers of (1,0) and (1,3):
        // - Entire Row 1.
        // - (Are they in same block? 0 vs 3. Block 0 vs Block 1). No.
        // - So only Row 1 is shared.

        const mask12 = (1 << 0) | (1 << 1);
        const mask123 = mask12 | (1 << 2);

        grid.candidates[0] = mask12;
        grid.candidates[3] = mask12;
        grid.candidates[9] = mask123;
        grid.candidates[12] = mask123;

        // Victim: (1, 4) -> {3, 9}
        // Should elim 3.
        grid.candidates[13] = (1 << 2) | (1 << 8);

        const result = strategy.find(grid);
        expect(result).not.toBeNull();
        expect(result!.technique).toBe('Unique Rectangle (Type 2)');

        const elims = result!.highlights.filter(h => h.type === 'elimination');
        expect(elims.length).toBe(1);
        expect(elims[0]).toEqual({ row: 1, col: 4, type: 'elimination', val: 3 });
    });

    test('Type 4: Locked candidate in roof', () => {
        const grid = new GridModelV4('');
        for (let i = 0; i < 81; i++) grid.candidates[i] = 0;

        // Geometry: Cols 0, 3. Rows 0, 1.
        // Floor: (0,0), (0,3) -> {1,2}
        // Roof: (1,0), (1,3).
        // Roof candidates: {1,2,5} and {1,2,6}.
        // Condition: '1' is NOT present anywhere else in Row 1.
        // '2' IS present elsewhere.
        // Logic: '1' is locked in Roof cells (1,0)/(1,3).
        // Since '1' must be in the roof to avoid emptying the row?
        // Wait. Row 1 has 1 in (1,0) and (1,3). Nowhere else.
        // Valid positions for 1 in Row 1 are ONLY roof cells.
        // So one of them MUST be 1.
        // If one is 1, then that cell cannot be 2.
        // If the other is 2 (from deadly pattern logic), we risk deadly pattern.
        // Logic:
        // Attempt to place 2 in Roof?
        // If we place 2 in (1,0) and 2 in (1,3)? No, duplicate.
        // If we DON'T have 1 in roof, Row 1 has no 1. Impossible.
        // So 1 is definitely in Roof.
        // Elimination: The OTHER candidate (2) can be eliminated from Roof cells?
        // Yes.
        // Explanation: If (1,0) was 2, then (1,3) must be 1.
        // That creates 2-1 on roof.
        // Floor is 2-1 or 1-2.
        // If Floor is 2-1, we have 2-1/2-1 (Deadly).
        // If Floor is 1-2, we have 1-2/2-1 (Deadly).
        // So '2' in any roof cell creates deadly pattern potential?
        // wait.
        // If (1,0) is 2. Then (1,3) is 1.
        // If (0,0) is 2 and (0,3) is 1. -> Deadly.
        // Since we assume the solution is unique, we must avoid this state.
        // Therefore, we cannot allow the state that makes Deadly Pattern possible.
        // The state "1 is in roof" is FORCED by the row.
        // So we remove 2 from the roof.

        const mask12 = (1 << 0) | (1 << 1);
        grid.candidates[0] = mask12;
        grid.candidates[3] = mask12;

        grid.candidates[9] = mask12 | (1 << 4); // {1,2,5}
        grid.candidates[12] = mask12 | (1 << 5); // {1,2,6}

        // Ensure '1' is not elsewhere in Row 1 (indices 10,11,13..17).
        // Ensure '2' IS elsewhere (otherwise it's a hidden pair/locked).
        grid.candidates[13] = (1 << 1) | (1 << 8); // {2, 9}

        const result = strategy.find(grid);
        expect(result).not.toBeNull();
        expect(result!.technique).toBe('Unique Rectangle (Type 4)');

        // Should elim 2 from (1,0) and (1,3)
        const elims = result!.highlights.filter(h => h.type === 'elimination');
        expect(elims.length).toBeGreaterThan(0);
        expect(elims).toEqual(expect.arrayContaining([
            { row: 1, col: 0, type: 'elimination', val: 2 },
            { row: 1, col: 3, type: 'elimination', val: 2 }
        ]));
    });
});
