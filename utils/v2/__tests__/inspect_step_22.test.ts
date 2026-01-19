
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4, GridModelV4, HOUSES } from '../solver-v4';

const testDataPath = path.resolve(__dirname, '../../../tools/sudoflow_test_data.json');

describe('Step 22 Grid Inspection', () => {
    test.only('Inspect Grid at Step 22', () => {
        try {
            const rawData = fs.readFileSync(testDataPath, 'utf-8');
            const puzzles = JSON.parse(rawData);
            const puzzle = puzzles.find((p: any) => p.id === 16);

            if (!puzzle) return;

            // Run Solver to get steps up to 22
            const result = gradePuzzleV4(puzzle.initial_grid);

            // Replay steps 0-21 onto a fresh grid
            const grid = new GridModelV4(puzzle.initial_grid);
            for (let i = 0; i < 22; i++) {
                // If the solver produced different steps, we are replaying SOLVER's path.
                // Assuming result.steps has at least 22 steps.
                if (result.steps[i]) {
                    grid.applyStep(result.steps[i]);
                }
            }

            console.log('--- Grid State at Step 22 (Solver Path) ---');

            // Inspect Block 4 (Center Block)
            // Indices: 30,31,32, 39,40,41, 48,49,50 ? 
            // HOUSES[22] is Block 4.
            const block4 = HOUSES[22];
            console.log('Block 4 Indices:', block4);

            const getVals = (mask: number) => {
                const res = [];
                for (let v = 1; v <= 9; v++) if (mask & (1 << (v - 1))) res.push(v);
                return res;
            };

            for (const idx of block4) {
                const r = Math.floor(idx / 9);
                const c = idx % 9;
                const vals = getVals(grid.candidates[idx]);
                const cellVal = grid.cells[idx];
                console.log(`Cell (${r},${c}) [${idx}]: Value=${cellVal}, Candidates=${vals.join(',')}`);
            }

            // Check for Hidden Pair 3,4
            // Should be in (3,3) -> r=3,c=3 -> Index 30.
            // And (3,5) -> r=3,c=5 -> Index 32.

        } catch (e) { console.error(e); }
    });
});
