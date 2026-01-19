
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4 } from '../solver-v4';

const testDataPath = path.resolve(__dirname, '../../../tools/sudoflow_test_data.json');

describe('Step 22 Analysis', () => {
    test.only('Analyze Step 22 Divergence', () => {
        try {
            const rawData = fs.readFileSync(testDataPath, 'utf-8');
            const puzzles = JSON.parse(rawData);
            const puzzle = puzzles.find((p: any) => p.id === 16);

            if (!puzzle) return;

            const result = gradePuzzleV4(puzzle.initial_grid);
            const exp = puzzle.steps[22];
            const act = result.steps[22];

            console.log(`Analyzing Step Index 22`);
            console.log('--- EXPECTED (Engine) ---');
            console.log(JSON.stringify(exp, null, 2));
            console.log('--- ACTUAL (Solver) ---');
            console.log(JSON.stringify(act, null, 2));

            // Look closely at the grid state if possible? 
            // We'd need to simulate up to step 22.

        } catch (e) { console.error(e); }
    });
});
