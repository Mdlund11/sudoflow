
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4 } from '../solver-v4';

const testDataPath = path.resolve(__dirname, '../../../tools/sudoflow_test_data.json');

describe('Step Analysis', () => {
    test('Analyze Step 11', () => {
        try {
            const rawData = fs.readFileSync(testDataPath, 'utf-8');
            const puzzles = JSON.parse(rawData);
            const puzzle = puzzles.find((p: any) => p.id === 16);

            if (!puzzle) return;

            const result = gradePuzzleV4(puzzle.initial_grid);
            const exp = puzzle.steps[11];
            const act = result.steps[11];

            console.log(`Analyzing Step Index 11`);
            console.log('--- EXPECTED ---');
            console.log(JSON.stringify(exp, null, 2));
            console.log('--- ACTUAL ---');
            console.log(JSON.stringify(act, null, 2));
        } catch (e) { console.error(e); }
    });
});
