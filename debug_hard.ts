
import { gradePuzzleV4 } from './utils/v2/solver-v4';

const puzzle = '000000010400000000020000000000050407008000300001090000300400200050100000000806000';
const result = gradePuzzleV4(puzzle);

console.log(`Rating: ${result.rating}`);
console.log(`Solved: ${result.solved}`);
result.steps.slice(0, 10).forEach((s, i) => {
    console.log(`Step ${i + 1}: ${s.technique} (${s.difficulty}) - ${s.explanation}`);
});
