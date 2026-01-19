
import { getCombinations, getHouseCells, GridModelV4, StepAction, Strategy } from '../solver-v4';

/**
 * Direct Hidden Pair Strategy (Difficulty 2.0)
 * 
 * Logic:
 * A Hidden Pair in a House (Row/Col/Block) such that applying the eliminations
 * in the pair cells immediately forces a Hidden Single in the same house.
 * 
 * Example:
 * In Row R, cells c1, c2 contain values {A, B} hidden. 
 * If identifying this pair effectively removes candidate C from c1 or c2,
 * and C was only possible in c1/c2 and some other single cell c3,
 * then eliminating C leads to c3 being a Hidden Single for C.
 * 
 * Difficulty: 2.0 (Simpler than full Hidden Pair 3.4)
 */
export class DirectHiddenPairStrategy implements Strategy {
    find(grid: GridModelV4): StepAction | null {
        // We only look for Pairs (n=2)
        const n = 2;

        for (let h = 0; h < 27; h++) {
            const houseCells = getHouseCells(h);
            const emptyCells = houseCells.filter(idx => grid.cells[idx] === 0);
            if (emptyCells.length <= n) continue;

            const digitsInHouse = new Set<number>();
            for (const idx of emptyCells) {
                const vals = GridModelV4.getVals(grid.candidates[idx]);
                for (const v of vals) digitsInHouse.add(v);
            }
            if (digitsInHouse.size <= n) continue;

            const combinations = getCombinations(Array.from(digitsInHouse), n);
            for (const comboDigits of combinations) {
                // comboDigits = [A, B]
                const mask = comboDigits.reduce((acc, v) => acc | (1 << (v - 1)), 0);
                const cellsWithDigits = emptyCells.filter(idx => (grid.candidates[idx] & mask) !== 0);

                if (cellsWithDigits.length === n) {
                    // Check if this is a valid Hidden Pair first
                    // Are ALL instances of [A,B] confined to these cells?
                    // The filter above only checks if the cell has AT LEAST ONE of the digits.
                    // We need to ensure that [A,B] ONLY appear in these cells in this House.

                    let validHiddenSubset = true;
                    // Check logic: 
                    // Verify that no other cell in the house contains A or B.
                    for (const idx of emptyCells) {
                        if (!cellsWithDigits.includes(idx)) {
                            if ((grid.candidates[idx] & mask) !== 0) {
                                validHiddenSubset = false;
                                break;
                            }
                        }
                    }
                    if (!validHiddenSubset) continue;

                    // It is a Hidden Pair. Now check for "Direct" property.
                    // Calculate potential eliminations
                    const elims: { row: number, col: number, type: 'elimination', val: number }[] = [];
                    for (const idx of cellsWithDigits) {
                        const otherMask = grid.candidates[idx] & ~mask;
                        if (otherMask !== 0) {
                            const otherVals = GridModelV4.getVals(otherMask);
                            for (const ov of otherVals) {
                                elims.push({ row: Math.floor(idx / 9), col: idx % 9, type: 'elimination' as const, val: ov });
                            }
                        }
                    }

                    if (elims.length === 0) continue; // No eliminations, boring

                    // CHECK: Does this enable a Hidden Single in THIS house?
                    // Simulation: 
                    // Construct a set of candidate counts for the house, assuming the eliminations happen.
                    let foundDirect = false;
                    let winningVal = -1;
                    let winningIdx = -1;

                    // Which values are being eliminated?
                    const eliminatedValues = new Set(elims.map(e => e.val));

                    for (const v of eliminatedValues) {
                        // Count occurrences of v in this house
                        // BUT excluding the bits we are about to eliminate
                        let count = 0;
                        let lastIdx = -1;

                        for (const idx of houseCells) {
                            if (grid.cells[idx] !== 0) continue;
                            let hasVal = (grid.candidates[idx] & (1 << (v - 1))) !== 0;

                            // If this cell is one of the pair cells, we are effectively removing 'v' from it
                            if (cellsWithDigits.includes(idx)) {
                                hasVal = false; // Eliminated
                            }

                            if (hasVal) {
                                count++;
                                lastIdx = idx;
                            }
                        }

                        if (count === 1) {
                            foundDirect = true;
                            winningVal = v;
                            winningIdx = lastIdx;
                            break;
                        }
                    }

                    if (foundDirect) {
                        const r = Math.floor(winningIdx / 9);
                        const c = winningIdx % 9;
                        return {
                            technique: "Direct Hidden Pair",
                            difficulty: 2.0,
                            explanation: `Direct Hidden Pair: ${comboDigits.join(',')} in cells (${cellsWithDigits.map(i => `${Math.floor(i / 9) + 1},${i % 9 + 1}`).join(' & ')}) forces ${winningVal} in (${r + 1},${c + 1})`,
                            highlights: [
                                ...cellsWithDigits.map(p => ({ row: Math.floor(p / 9), col: p % 9, type: 'hint' as const })),
                                ...elims
                            ]
                        };
                    }
                }
            }
        }
        return null;
    }
}
