
import { DirectHiddenPairStrategy, GridModelV4 } from '../solver-v4';


describe('DirectHiddenPairStrategy', () => {
    let strategy: DirectHiddenPairStrategy;

    beforeEach(() => {
        strategy = new DirectHiddenPairStrategy();
    });

    test('should detect a Direct Hidden Pair in a row', () => {
        const grid = new GridModelV4('');
        // Clear all candidates to start fresh
        for (let i = 0; i < 81; i++) grid.candidates[i] = 0;

        // Setup Row 0
        // Pair: {1, 2} in (0,0) and (0,1)
        // Victim: 3.
        // 3 is in (0,0) and (0,2).
        // (0,0) has {1, 2, 3}
        // (0,1) has {1, 2}
        // (0,2) has {3} 
        // Other cells empty/irrelevant but must not contain 1, 2.

        // Note: For valid Hidden Pair {1,2}, 1 and 2 must NOT appear elsewhere in Row 0.

        grid.candidates[0] = (1 << 0) | (1 << 1) | (1 << 2); // {1, 2, 3}
        grid.candidates[1] = (1 << 0) | (1 << 1);            // {1, 2}
        grid.candidates[2] = (1 << 2);                       // {3}

        // Ensure 1 and 2 are not elsewhere (cells 3-8)
        for (let c = 3; c < 9; c++) grid.candidates[c] = (1 << 3); // {4} just noise

        // When {1,2} Hidden Pair is found in (0,0)/(0,1):
        // It eliminates 3 from (0,0).
        // Before elim: 3 was in (0,0) and (0,2).
        // After elim: 3 is only in (0,2) -> Hidden Single.
        // This qualifies as Direct Hidden Pair.

        // Also need to ensure cells are considered "empty" (value 0)
        for (let i = 0; i < 9; i++) grid.cells[i] = 0;

        const result = strategy.find(grid);

        expect(result).not.toBeNull();
        expect(result?.technique).toBe('Direct Hidden Pair');
        expect(result?.difficulty).toBe(2.0);

        // Verify highlights
        const elims = result?.highlights.filter(h => h.type === 'elimination');
        expect(elims).toHaveLength(1);
        expect(elims?.[0]).toEqual({ row: 0, col: 0, type: 'elimination', val: 3 });
    });

    test.only('should NOT detect if it does not force a Hidden Single', () => {
        const grid = new GridModelV4('');
        for (let i = 0; i < 81; i++) grid.candidates[i] = 0;

        // Setup Row 0
        // Pair: {1, 2} in (0,0) and (0,1)
        // Victim: 3.
        // 3 is in (0,0), (0,2), AND (0,3).
        // Removing 3 from (0,0) leaves 3 in (0,2) and (0,3).
        // NOT a Hidden Single yet.

        grid.candidates[0] = (1 << 0) | (1 << 1) | (1 << 2); // {1, 2, 3}
        grid.candidates[1] = (1 << 0) | (1 << 1);            // {1, 2}
        grid.candidates[2] = (1 << 2);                       // {3}
        grid.candidates[3] = (1 << 2);                       // {3}

        for (let c = 4; c < 9; c++) grid.candidates[c] = (1 << 3);

        for (let i = 0; i < 9; i++) grid.cells[i] = 0;

        const result = strategy.find(grid);
        if (result) {
            console.log("Unexpected Result:", JSON.stringify(result, null, 2));
        }
        expect(result).toBeNull();
    });

    test('should NOT detect standard Naked Pair as Direct Hidden Pair', () => {
        // Technically Naked Pair is subset of Hidden Pair if candidates are exact?
        // No, Hidden Pair looks for digits that appear ONLY in the pair cells.
        // Naked Pair looks for cells that have ONLY the pair digits.

        // Direct Hidden Pair requires the Hidden property: digits appear nowhere else in house.
        // If we have {1,2} in (0,0) and (0,1), and {1,2} nowhere else.
        // And (0,0) has no extra candidates? Then no eliminations possible from (0,0).
        // Strategy should return null because elims.length === 0.

        const grid = new GridModelV4('');
        for (let i = 0; i < 81; i++) grid.candidates[i] = 0;

        grid.candidates[0] = (1 << 0) | (1 << 1); // {1, 2}
        grid.candidates[1] = (1 << 0) | (1 << 1); // {1, 2}

        // Clean rest of row
        for (let c = 2; c < 9; c++) grid.candidates[c] = (1 << 2); // {3}

        for (let i = 0; i < 9; i++) grid.cells[i] = 0;

        const result = strategy.find(grid);
        expect(result).toBeNull(); // No eliminations to make
    });

    // Real world case from Puzzle 16 Step 11
    test('should detect Col 2 case from Puzzle 16', () => {
        // "The two cells r5c2 and r6c2 are the only possible positions of the two values 3 and 8 in the column."
        // "It follows that the cell r7c2 is the only remaining possible position of the value 7 in the column."

        // Indices: r5c2 -> (4,1), r6c2 -> (5,1), r7c2 -> (6,1)
        // Values: 3, 8 (Pair). 7 (Victim).

        const grid = new GridModelV4('');
        for (let i = 0; i < 81; i++) grid.candidates[i] = 0;

        // Set Col 1 (2nd column)
        // Pair positions
        grid.candidates[4 * 9 + 1] = (1 << 2) | (1 << 7) | (1 << 6); // {3, 8, 7}
        grid.candidates[5 * 9 + 1] = (1 << 2) | (1 << 7);            // {3, 8} (maybe 7 too? spec says "Other values can therefore not be in these cells". implies they HAVE other values to remove)

        // Victim position
        grid.candidates[6 * 9 + 1] = (1 << 6);                       // {7} Only place for 7 besides the pair cells?
        // Wait, if 7 is in (4,1) and (6,1). 
        // Eliminating 7 from (4,1) makes (6,1) the only spot.

        // Ensure 3 and 8 are NOT elsewhere in Col 1
        for (let r = 0; r < 9; r++) {
            if (r !== 4 && r !== 5) {
                // Ensure no 3 or 8
                // Fill with junk
                if (r !== 6) grid.candidates[r * 9 + 1] = (1 << 8); // {9}
            }
        }

        for (let i = 0; i < 81; i++) grid.cells[i] = 0;

        const result = strategy.find(grid);

        expect(result).not.toBeNull();
        expect(result?.technique).toBe("Direct Hidden Pair");
        expect(result?.explanation).toContain("forces 7");
    });
});
