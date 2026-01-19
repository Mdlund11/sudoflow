
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4, GridModelV4, HOUSES } from '../solver-v4';

const testDataPath = path.resolve(__dirname, '../../../tools/sudoflow_test_data.json');

describe('Step 22 Deep Inspection', () => {
    test.only('Compare Grid States at Step 22', () => {
        try {
            const rawData = fs.readFileSync(testDataPath, 'utf-8');
            const puzzles = JSON.parse(rawData);
            const puzzle = puzzles.find((p: any) => p.id === 16);

            if (!puzzle) return;

            // 1. ENGINE PATH SIMULATION
            // We simulate the grid by applying the EXPECTED steps 0-21 verbatim.
            // This gives us the "Golden Grid" state at Step 22.
            const engineGrid = new GridModelV4(puzzle.initial_grid);
            const expSteps = puzzle.steps;

            console.log("--- SIMULATING ENGINE PATH (Steps 0-21) ---");
            for (let i = 0; i < 22; i++) {
                // We must use the ENGINE'S defined steps. 
                // Note: Engine steps in JSON are descriptive. We need to construct a StepAction to apply.
                // Or easier: Just trust the Description/Technique and perform the elimination manually if possible?
                // Actually, GridModelV4.applyStep takes a StepAction.
                // We might not be able to perfectly reconstruct the Engine's StepAction from the JSON description alone
                // without parsing the description text (which is hard).

                // ALTERNATIVE: 
                // We can't perfectly simulate Engine Grid without a parser.
                // BUT we can look at the Solver Grid and see if it is "missing" something obvious.
            }
            // Skipping partial simulation for now due to complexity of parsing text descriptions.

            // 2. SOLVER INSPECTION
            // Let's look at the Solver grid at Step 22 again, but SPECIFICALLY for the Unique Rectangle requirements.
            // Expected Step 23: Unique Rectangle Type 4.
            // Step 22 (Expected) was Hidden Pair {3,4} in r4c4 (3,3) and r4c6 (3,5).

            const result = gradePuzzleV4(puzzle.initial_grid);
            const solverGrid = new GridModelV4(puzzle.initial_grid);
            for (let i = 0; i < 22; i++) {
                if (result.steps[i]) solverGrid.applyStep(result.steps[i]);
            }

            console.log("--- SOLVER GRID AT STEP 22 ---");

            // Expected Hidden Pair: r4c4, r4c6 (Indices 30, 32)
            // Values: 3, 4.
            const c30 = solverGrid.candidates[30];
            const c32 = solverGrid.candidates[32];
            console.log(`Cell (3,3) [30]: ${GridModelV4.getVals(c30).join(',')}`);
            console.log(`Cell (3,5) [32]: ${GridModelV4.getVals(c32).join(',')}`);

            // Expected Unique Rectangle Type 4
            // Usually involves a "floor" and "roof".
            // If {3,4} is involved, we need 4 cells.
            // Likely (3,3), (3,5) and two others in another row (e.g. Row 4 or 5) forming a rectangle.
            // Let's scan for other {3,4} pairs in Cols 3 and 5.

            console.log("Scanning Cols 3 and 5 for {3,4}...");
            const col3 = HOUSES[3 + 9]; // Index 12. Col 3 (4th col).
            const col5 = HOUSES[5 + 9]; // Index 14. Col 5 (6th col).

            // Check Col 3 (index 3)
            for (const idx of col3) {
                const r = Math.floor(idx / 9);
                const vals = GridModelV4.getVals(solverGrid.candidates[idx]);
                console.log(`Col 3 | Row ${r} [${idx}]: ${vals.join(',')}`);
            }

            // Check Col 5 (index 5)
            for (const idx of col5) {
                const r = Math.floor(idx / 9);
                const vals = GridModelV4.getVals(solverGrid.candidates[idx]);
                console.log(`Col 5 | Row ${r} [${idx}]: ${vals.join(',')}`);
            }

            // Also Check Candidates 3 and 4 in Row 3 (Index 30, 32 location)
            console.log("Scanning Row 3...");
            const row3 = HOUSES[3];
            for (const idx of row3) {
                const c = idx % 9;
                const vals = GridModelV4.getVals(solverGrid.candidates[idx]);
                console.log(`Row 3 | Col ${c} [${idx}]: ${vals.join(',')}`);
            }

        } catch (e) { console.error(e); }
    });
});
