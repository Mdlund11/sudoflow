import * as fs from 'fs';
import * as path from 'path';

const INPUT_PATH = path.join(__dirname, '../utils/v2/seeds_v2_full.json');
const OUTPUT_PATH = path.join(__dirname, '../utils/v2/seeds_v2.json');

try {
    const raw = fs.readFileSync(INPUT_PATH, 'utf-8');
    const data = JSON.parse(raw);

    const reduced: Record<string, any[]> = {};
    const LIMIT = 10;

    for (const [key, list] of Object.entries(data)) {
        if (Array.isArray(list)) {
            // Shuffle before picking to get a random assortment
            // Or just take the first N (since mine_gems shuffles anyway)
            // Let's just take the first N for deterministic behavior in this reduction
            reduced[key] = list.slice(0, LIMIT);
            console.log(`Kept ${reduced[key].length} seeds for ${key}`);
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(reduced, null, 2));
    console.log(`✅ Reduced seeds saved to ${OUTPUT_PATH}`);

} catch (e) {
    console.error("Error reducing seeds:", e);
}
