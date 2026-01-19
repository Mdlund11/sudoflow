
import { gradePuzzleV4 } from '../solver-v4';

describe('Debug Hard Puzzle', () => {
    test('trace hard puzzle', () => {
        const puzzle = '000000010400000000020000000000050407008000300001090000300400200050100000000806000';
        const result = gradePuzzleV4(puzzle);
        console.log(`Rating: ${result.rating}`);
        console.log(`Solved: ${result.solved}`);
        result.steps.forEach((s, i) => {
            console.log(`Step ${i + 1}: ${s.technique} (${s.difficulty}) - ${s.explanation}`);
        });
    });
});
