
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4 } from '../solver-v4';

const testDataPath = path.resolve(__dirname, '../../../tools/sudoflow_test_data.json');

describe('Divergence Analysis', () => {
    test('Analyze Puzzle ID 16', () => {
        try {
            const rawData = fs.readFileSync(testDataPath, 'utf-8');
            const puzzles = JSON.parse(rawData);
            const puzzle = puzzles.find((p: any) => p.id === 16);

            if (!puzzle) {
                console.error('Puzzle ID 16 not found');
                return;
            }

            console.log(`Analyzing Puzzle ID ${puzzle.id}`);
            const result = gradePuzzleV4(puzzle.initial_grid);

            const expectedSteps = puzzle.steps;
            const actualSteps = result.steps;
            const maxSteps = Math.max(expectedSteps.length, actualSteps.length);
            const logLines: string[] = [];

            logLines.push(`Comparing Puzzle 16`);
            logLines.push(`Engine Rating: ${puzzle.engine_rating} | Solver Rating: ${result.rating}`);

            const normalize = (name: string) => name.replace(/\s*\(.*?\)/g, "").replace("Direct", "").replace("Pair", "").trim().toLowerCase();

            for (let i = 0; i < maxSteps; i++) {
                const exp = expectedSteps[i];
                const act = actualSteps[i];

                if (!exp || !act) {
                    logLines.push(`[${i}] LENGTH MISMATCH. Exp: ${exp ? exp.technique : 'END'} | Act: ${act ? act.technique : 'END'}`);
                    break;
                }

                const nExp = normalize(exp.technique);
                const nAct = normalize(act.technique);
                const diffDelta = Math.abs(exp.difficulty - act.difficulty);

                let status = "OK  ";
                // If names are roughly same OR difficulty is very close, we consider it "on track"
                if (nExp !== nAct) {
                    if (diffDelta < 0.5) status = "NAME"; // Name diff, but diff matches
                    else status = "DIFF";
                } else if (diffDelta > 0.5) {
                    status = "DIFF"; // Name match, but diff mismatch
                }

                // formatting
                const expStr = `${exp.technique} (${exp.difficulty})`;
                const actStr = `${act.technique} (${act.difficulty})`;
                logLines.push(`${status} [${i}] E: ${expStr.padEnd(35)} | A: ${actStr}`);

                // If massive divergence, stop and dump details
                if (diffDelta > 2.0) {
                    logLines.push(`\n>>> HUGE DIVERGENCE AT STEP ${i} <<<`);
                    logLines.push(`Expected: ${exp.description}`);
                    logLines.push(`Actual:   ${act.explanation}`);
                    break;
                }
            }

            fs.writeFileSync(path.resolve(__dirname, '../../../divergence_report_16.txt'), logLines.join('\n'));

        } catch (error) {
            console.error(error);
        }
    });
});
