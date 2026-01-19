
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4 } from '../solver-v4';

const testDataPath = path.resolve(__dirname, '../../../tools/sudoflow_test_data.json');

describe('Step 25/26 Analysis', () => {
    test.only('Analyze Step 25 Failure', () => {
        try {
            const rawData = fs.readFileSync(testDataPath, 'utf-8');
            const puzzles = JSON.parse(rawData);
            const puzzle = puzzles.find((p: any) => p.id === 16);

            if (!puzzle) return;

            const result = gradePuzzleV4(puzzle.initial_grid);

            // Solver failed at Step 25 (Index 25).
            // It found "Forcing Chain".
            // Engine found "XY-Wing" (Index 25).
            // BUT Solver found "XY-Wing" at Step 24.

            // So we need to see what Engine found at Step 26.
            const engStep26 = puzzle.steps[26];

            console.log('--- ENGINE STEP 26 ---');
            console.log(JSON.stringify(engStep26, null, 2));

            console.log('--- SOLVER STEP 25 (Actual) ---');
            console.log(JSON.stringify(result.steps[25], null, 2));

        } catch (e) { console.error(e); }
    });
});
