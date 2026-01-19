
import * as fs from 'fs';
import * as path from 'path';
import { SudokuGeneratorV2 } from '../utils/v2/generator';
import { BoardState, gradePuzzleV4 } from '../utils/v2/solver-v4';

interface Gem {
    difficulty: string;
    seRating: number;
    hodokuScore: number;
    puzzle: BoardState;
    solution: BoardState;
    techniques?: string[];
}

const FILE_PATH = path.join(__dirname, '../utils/v2/seeds_v2.json');

// Difficulty Ranges (must match SE standards)
const RANGES: Record<string, { min: number, max: number }> = {
    "Easy": { min: 0.0, max: 2.9 },
    "Medium": { min: 3.0, max: 3.9 },
    "Hard": { min: 4.0, max: 4.9 },
    "Expert": { min: 5.0, max: 5.9 },
    "Master": { min: 6.0, max: 9.9 },
};

// Target Counts for mining
const TARGETS: Record<string, number> = {
    "Easy": 1000,
    "Medium": 1000,
    "Hard": 1000,
    "Expert": 1000,
    "Master": 50
};

// Bins to store found gems
let bins: Record<string, Gem[]> = {
    "Easy": [],
    "Medium": [],
    "Hard": [],
    "Expert": [],
    "Master": []
};

// Load existing seeds if they exist
try {
    if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        bins["Easy"] = data.Easy || [];
        bins["Medium"] = data.Medium || [];
        bins["Hard"] = data.Hard || [];
        bins["Expert"] = data.Expert || [];
        bins["Master"] = data.Master || [];
        console.log(`Loaded existing progress: Ez:${bins.Easy.length} M:${bins.Medium.length} H:${bins.Hard.length} E:${bins.Expert.length} X:${bins.Master.length}`);
    }
} catch (e) {
    console.log("Could not load existing seeds, starting fresh.");
}

function saveGems(silent = false) {
    if (!silent) console.log("\n💾 Saving progress...");
    const output = {
        Easy: bins["Easy"],
        Medium: bins["Medium"],
        Hard: bins["Hard"],
        Expert: bins["Expert"],
        Master: bins["Master"]
    };
    fs.writeFileSync(FILE_PATH, JSON.stringify(output, null, 2));
    if (!silent) console.log(`Saved to ${FILE_PATH}`);
}

async function reGradeExisting() {
    console.log("🔍 Re-grading existing seeds with V3 Grader...");
    const newBins: Record<string, Gem[]> = { "Easy": [], "Medium": [], "Hard": [], "Expert": [], "Master": [] };
    let processed = 0;
    let changed = 0;

    const allGems = [...bins.Master, ...bins.Expert, ...bins.Hard, ...bins.Medium, ...bins.Easy];

    for (const gem of allGems) {
        processed++;
        const result = gradePuzzleV4(gem.puzzle);

        let newCategory: string | null = null;
        for (const [label, range] of Object.entries(RANGES)) {
            if (result.rating >= range.min && result.rating <= range.max) {
                newCategory = label;
                break;
            }
        }

        if (newCategory && newBins[newCategory]) {
            if (newBins[newCategory].length >= 1000) continue; // Cap at 1000
            if (newCategory !== gem.difficulty) changed++;
            newBins[newCategory].push({
                ...gem,
                difficulty: newCategory,
                seRating: result.rating,
                techniques: Array.from(new Set(result.steps.map(s => s.technique)))
            });
        }

        if (processed % 10 === 0) {
            process.stdout.write(`\rProcessed ${processed}/${allGems.length} | Moved: ${changed}    `);
        }
    }

    bins = newBins;
    saveGems();
    console.log("\n✅ Re-grading complete.");
}

async function mineGems() {
    console.log("💎 Starting V3-Validated Gems Miner...");
    console.log("Press Ctrl+C to stop and save at any time.\n");

    let totalFound = 0;
    process.on('SIGINT', () => {
        saveGems();
        process.exit();
    });

    let attempts = 0;
    const startTime = Date.now();

    while (true) {
        attempts++;

        // Determine which bins still need filling
        const needed = Object.keys(TARGETS).filter(k => bins[k].length < TARGETS[k]);

        if (needed.length === 0) {
            console.log("\n\n🏆 Target Reached: All bins full!");
            break;
        }

        // Pick a random target from needed categories to keep variety high
        const target = needed[Math.floor(Math.random() * needed.length)];

        // Step 1: Generate using V2
        // We accept whatever comes back, but targeting helps the generator fail-fast into the right zone
        const resultV2 = SudokuGeneratorV2.generate(target, { maxAttempts: 1, forceRuntime: true });

        // Step 2: Validate with V4 (accurate grading)
        const resultV4 = gradePuzzleV4(resultV2.puzzle);

        // Identify where this puzzle REALLY belongs
        let category: string | null = null;
        for (const [label, range] of Object.entries(RANGES)) {
            if (resultV4.rating >= range.min && resultV4.rating <= range.max) {
                category = label;
                break;
            }
        }

        if (category && bins[category] !== undefined && bins[category].length < TARGETS[category]) {
            bins[category].push({
                difficulty: category,
                seRating: resultV4.rating,
                hodokuScore: Math.floor(resultV4.rating * 100),
                puzzle: resultV2.puzzle,
                solution: resultV2.solution,
                techniques: Array.from(new Set(resultV4.steps.map(s => s.technique)))
            });
            totalFound++;

            if (totalFound % 10 === 0) saveGems(true);


        }

        if (attempts % 5 === 0) {
            const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            process.stdout.write(
                `\r[${timeElapsed}s] Ez:${bins.Easy.length} | M:${bins.Medium.length} | H:${bins.Hard.length} | E:${bins.Expert.length} | X:${bins.Master.length} | Tot: ${totalFound}    `
            );
        }
    }

    saveGems();
}

// Control logic
const args = process.argv.slice(2);
if (args.includes('--regrade')) {
    reGradeExisting();
} else {
    mineGems().catch(console.error);
}

