
import * as fs from 'fs';
import * as path from 'path';
import { gradePuzzleV4 } from '../solver-v4';

const testDataPath = path.resolve(__dirname, '../../../tools/sudoflow_test_data.json');
const reportPath = path.resolve(__dirname, '../../../sudoflow_report.txt');

// clear report file
try { fs.writeFileSync(reportPath, ''); } catch (e) { }

describe('Sudoflow Comparison Tests', () => {
    let puzzles: any[] = [];

    try {
        const rawData = fs.readFileSync(testDataPath, 'utf-8');
        puzzles = JSON.parse(rawData);
    } catch (error) {
        console.error("Failed to read test data:", error);
    }

    puzzles.forEach((puzzle: any) => {
        test(`Puzzle ID ${puzzle.id}`, () => {
            const result = gradePuzzleV4(puzzle.initial_grid);
            const diff = Math.abs(result.rating - puzzle.engine_rating);

            const msg = `ID: ${puzzle.id} | Engine: ${puzzle.engine_rating} | Solver: ${result.rating.toFixed(2)} | Diff: ${diff.toFixed(2)} | Pass: ${diff <= 0.1}\n`;
            fs.appendFileSync(reportPath, msg);

            expect(result.rating).toBeCloseTo(puzzle.engine_rating, 1);
        });
    });
});
