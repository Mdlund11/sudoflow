
import { generateSudoku } from './utils/sudoku';

console.log("Starting generation...");
try {
    const { puzzle: board } = generateSudoku('Easy');
    console.log("Generation successful");
} catch (e) {
    console.error("Error:", e);
}
