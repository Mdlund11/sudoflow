import { SudokuGeneratorV2 } from '../utils/v2/generator';

const ITERATIONS = 100;
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert", "Master"];

console.log(`\n⚡ Running Game Generation Performance Test (${ITERATIONS} runs per difficulty)...`);
console.log("---------------------------------------------------------------");
console.log("Difficulty | Avg Time (ms) | Min (ms) | Max (ms) | Total (ms)");
console.log("---------------------------------------------------------------");

for (const diff of DIFFICULTIES) {
    const times: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        // Run WITHOUT forceRuntime to mimic actual App behavior (using cached seeds)
        SudokuGeneratorV2.generate(diff);
        const end = performance.now();
        times.push(end - start);
    }

    const total = times.reduce((a, b) => a + b, 0);
    const avg = total / ITERATIONS;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(
        `${diff.padEnd(10)} | ${avg.toFixed(3).padEnd(13)} | ${min.toFixed(3).padEnd(8)} | ${max.toFixed(3).padEnd(8)} | ${total.toFixed(0)}`
    );
}
console.log("---------------------------------------------------------------");
console.log("✅ Done.");
