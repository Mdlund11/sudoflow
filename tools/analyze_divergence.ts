
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4 } from '../utils/v2/solver-v4';

const testDataPath = path.resolve(__dirname, 'sudoflow_test_data.json');

function analyze() {
    try {
        const rawData = fs.readFileSync(testDataPath, 'utf-8');
        const puzzles = JSON.parse(rawData);
        const puzzle = puzzles.find((p: any) => p.id === 16);

        if (!puzzle) {
            console.error('Puzzle ID 16 not found');
            return;
        }

        console.log(`Analyzing Puzzle ID ${puzzle.id}`);
        console.log(`Initial Grid: ${puzzle.initial_grid}`);
        console.log(`Expected Rating: ${puzzle.engine_rating}`);

        const result = gradePuzzleV4(puzzle.initial_grid);
        console.log(`Solver Rating: ${result.rating}`);

        const expectedSteps = puzzle.steps;
        const actualSteps = result.steps;

        console.log(`\n--- Step Comparison ---`);

        let divergenceFound = false;
        const maxSteps = Math.max(expectedSteps.length, actualSteps.length);

        for (let i = 0; i < maxSteps; i++) {
            const exp = expectedSteps[i];
            const act = actualSteps[i];

            if (!exp) {
                console.log(`[${i}] Expected: <END> | Actual: ${act.technique} (Diff: ${act.difficulty})`);
                divergenceFound = true;
                continue;
            }
            if (!act) {
                console.log(`[${i}] Expected: ${exp.technique} (Diff: ${exp.difficulty}) | Actual: <END>`);
                divergenceFound = true;
                continue;
            }

            // Normalize technique names for comparison if needed, but strict string compare is a good start
            // The solver often has detailed descriptions, checking the technique name is key
            const match = exp.technique === act.technique;

            // Check if difficulties match close enough
            const diffMatch = Math.abs(exp.difficulty - act.difficulty) < 0.1;

            let prefix = match && diffMatch ? "OK  " : "DIFF";
            if (prefix === "DIFF" && !divergenceFound) {
                prefix = ">>>>"; // Highlight first divergence
                divergenceFound = true;
            }

            console.log(`${prefix} [${i}] Expected: ${exp.technique.padEnd(25)} (${exp.difficulty}) | Actual: ${act.technique.padEnd(25)} (${act.difficulty})`);


            if (prefix === ">>>>") {
                console.log(`\nDetailed Divergence at Step ${i}:`);
                console.log(`Expected Description: ${exp.description}`);
                console.log(`Actual Description:   ${act.explanation}`);
                // Stop after a few more steps to show context
                if (i + 5 < maxSteps) {
                    console.log("Showing next 5 steps for context...");
                } else {
                    break;
                }
            }
            if (divergenceFound && i > maxSteps) break; // Safety break
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

analyze();
