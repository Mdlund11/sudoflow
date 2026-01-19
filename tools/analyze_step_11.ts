
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4 } from '../utils/v2/solver-v4';

const testDataPath = path.resolve(__dirname, 'sudoflow_test_data.json');

function analyzeStep(stepIndex: number) {
    try {
        const rawData = fs.readFileSync(testDataPath, 'utf-8');
        const puzzles = JSON.parse(rawData);
        const puzzle = puzzles.find((p: any) => p.id === 16);

        if (!puzzle) { console.error('Puzzle 16 not found'); return; }

        const result = gradePuzzleV4(puzzle.initial_grid);

        const exp = puzzle.steps[stepIndex];
        const act = result.steps[stepIndex];

        console.log(`Analyzing Step Index ${stepIndex} (1-based Step ${stepIndex + 1})`);
        console.log('--- EXPECTED ---');
        console.log(JSON.stringify(exp, null, 2));
        console.log('--- ACTUAL ---');
        console.log(JSON.stringify(act, null, 2));

    } catch (e) { console.error(e); }
}

analyzeStep(11); // Analyzing the first logical difference
