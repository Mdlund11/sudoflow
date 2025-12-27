
import { generateSudoku } from './utils/sudoku';

const benchmark = (difficulty: 'Hard' | 'Expert') => {
    console.log(`Generating ${difficulty} puzzle...`);
    const start = Date.now();
    const { puzzle } = generateSudoku(difficulty);
    const end = Date.now();
    console.log(`Generated ${difficulty} puzzle in ${end - start}ms`);
};

// Run benchmarks
console.log('Starting benchmarks...');
for (let i = 0; i < 3; i++) {
    benchmark('Hard');
}
for (let i = 0; i < 3; i++) {
    benchmark('Expert');
}
