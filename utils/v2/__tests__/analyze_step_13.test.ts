
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4 } from '../solver-v4';

const testDataPath = path.resolve(__dirname, '../../../tools/sudoflow_test_data.json');

describe('Step 13 Analysis', () => {
    test.only('Analyze Step 13 Divergence', () => {
        try {
            const rawData = fs.readFileSync(testDataPath, 'utf-8');
            const puzzles = JSON.parse(rawData);
            const puzzle = puzzles.find((p: any) => p.id === 16);

            if (!puzzle) return;

            const result = gradePuzzleV4(puzzle.initial_grid);
            const exp = puzzle.steps[13];
            const act = result.steps[13];

            console.log(`Analyzing Step Index 13`);
            console.log('--- EXPECTED (Engine) ---');
            console.log(JSON.stringify(exp, null, 2));
            console.log('--- ACTUAL (Solver) ---');
            console.log(JSON.stringify(act, null, 2));

            // let's look at step 12 too to see context
            console.log('--- ACTUAL Step 12 ---');
            console.log(JSON.stringify(result.steps[12], null, 2));

        } catch (e) { console.error(e); }
    });
});
