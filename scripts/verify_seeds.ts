import * as fs from 'fs';
import * as path from 'path';

const FILE_PATH = path.join(__dirname, '../utils/v2/seeds_v2.json');

const RANGES: Record<string, { min: number, max: number }> = {
    "Easy": { min: 0.0, max: 2.9 },
    "Medium": { min: 3.0, max: 3.9 },
    "Hard": { min: 4.0, max: 4.9 },
    "Expert": { min: 5.0, max: 5.9 },
    "Master": { min: 6.0, max: 9.9 },
};

try {
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);

    console.log("--- Seed Verification Report ---");

    for (const [difficulty, seeds] of Object.entries(data)) {
        const castSeeds = seeds as any[];
        if (!castSeeds.length) {
            console.log(`${difficulty}: Empty`);
            continue;
        }

        let minStr = 99.0;
        let maxStr = 0.0;
        let failures = 0;
        let nullRatings = 0;

        for (const s of castSeeds) {
            if (s.seRating === undefined || s.seRating === null) {
                nullRatings++;
                continue;
            }
            if (s.seRating < minStr) minStr = s.seRating;
            if (s.seRating > maxStr) maxStr = s.seRating;

            const range = RANGES[difficulty];
            if (range) {
                if (s.seRating < range.min || s.seRating > range.max) {
                    failures++;
                }
            }
        }

        console.log(`${difficulty.padEnd(8)} | Count: ${castSeeds.length.toString().padEnd(5)} | Range: [${minStr.toFixed(1)} - ${maxStr.toFixed(1)}] | Compliant: ${((castSeeds.length - failures) / castSeeds.length * 100).toFixed(1)}% ${failures > 0 ? `(${failures} FAIL)` : '✅'}`);
    }

} catch (e) {
    console.error("Error verifying seeds:", e);
}
