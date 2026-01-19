import { gradePuzzleV4 } from './utils/v2/solver-v4';

const puzzle = '000105000140000670080002400063070010900000003010090520007200080026000035000409000';
const result = gradePuzzleV4(puzzle);
console.log('Final Rating:', result.rating);
console.log('Steps:');
result.steps.forEach((s, i) => {
    console.log(`${i + 1}: ${s.technique} (${s.difficulty}) - ${s.explanation}`);
});
