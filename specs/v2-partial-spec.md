Application Specification: Project "Flow State" (Sudoku)
Document Type: Technical Specification (Brownfield Refactor) Objective: Maximize Daily Active Users (DAU), Retention, and Session Time. Constraint: Brownfield Development (Leverage/Refactor existing code; Modular implementation).

1. Architectural Strategy: The "Strangler Fig" Approach
Since this is a brownfield project, we cannot risk a full rewrite that alienates existing users or introduces instability. We will use the "Strangler Fig" pattern: gradually replacing specific legacy modules with high-performance, engagement-focused components.

Phase 1 (The Core): Replace the Puzzle Generator/Solver logic. This is a backend/logic-only change with high impact on puzzle quality (Trust).

Phase 2 (The Interaction): Refactor the Input Controller to support "Hybrid Input" and "Smart Hints" (Flow).

Phase 3 (The Growth): Inject Viral Mechanics (Deep Links/Sharing) into the existing result screens (Growth).

2. Module A: The Logic Engine (Priority: Critical)
Current State Assumption: Likely a brute-force generator or a static database of puzzles. Target State: On-device, logic-based generation ensuring unique solutions and "human" solve paths.

2.1 Component: The Human-Like Solver

Requirement 1.1 (Uniqueness): The solver must guarantee exactly one solution per grid.

Requirement 1.2 (Grading): Implement a two-pass grading system:

Pass A (SE Rating): Identify the single hardest technique required (e.g., "X-Wing"). This sets the difficulty label (Easy/Medium/Hard/Expert).

Pass B (Hodoku Score): Sum the difficulty weights of all steps to estimate "Time to Solve." Use this to filter out puzzles that are "technically Easy" but "tediously long".

Requirement 1.3 (Technique Hierarchy): The solver must not use backtracking. It must attempt to solve using this strict hierarchy of techniques:

Hidden/Naked Singles (The "Bread and Butter").

Pointing Pairs / Box-Line Reduction.

Subsets (Pairs/Triples/Quads).

Fish (X-Wing, Swordfish).

Chains (XY-Chain, AIC) – Only for "Expert" tier.

2.2 Component: The Generator Service
Refactor Strategy: Create an abstract interface IPuzzleProvider. Deprecate the old implementation but keep it as a fallback. Wire the new LogicGenerator implementation to IPuzzleProvider.

Seed Strategy: Do not generate from scratch every time (battery drain). Maintain a local database of ~50,000 "Seeds" (valid filled grids).

Runtime Transformation: On puzzle load, apply random transformations to a Seed to create a "new" puzzle instantly :

Digit Swapping (e.g., Map 1→9, 2→3...).

Rotation/Reflection.

Band/Stack Permutation.

3. Module B: The Engagement UX (Priority: High)
Current State Assumption: Standard "Digit-First" or "Cell-First" input with basic conflict highlighting. Target State: A "Smart Input" controller that reduces cognitive load and enables flow.

3.1 Component: The Smart Input Controller
Requirement 2.1 (Hybrid Input): The UI must accept both Select Cell -> Press Digit and Select Digit -> Press Cell without a mode toggle switch. The app determines intent based on the last interaction.

Requirement 2.2 (Snyder Toggle): Implement a specialized "Note Mode" toggle.

State A (Center Notes): Candidates placed in the center (standard).

State B (Corner/Snyder Notes): Candidates placed in the corners.

Logic: Advanced players use Corner notes for "Box Restriction" (strong links) and Center notes for "Cell Candidates." Supporting this distinction separates "pro" apps from "basic" apps.

Requirement 2.3 (Auto-Cleanup): Middleware must intercept every "Set Value" event.

Action: When Cell A1 is set to 5, traverse Row A, Col 1, and Box 1. Remove candidate 5 from all other cells.

Visual: Animate the removal to provide positive reinforcement.

3.2 Component: The Teaching Engine (Hint System 2.0)
Legacy Replacement: Replace the "Reveal Cell" hint function.

New Flow:

User taps Hint.

Snapshot: App sends current board state + user candidates to the Logic Engine.

Analysis: Solver finds the next easiest logical step (not the final solution).

UX Output:

Phase 1: Highlight the region (e.g., Row 4). Text: "Look for a Naked Pair in Row 4."

Phase 2: Highlight the specific cells. Text: "These two cells can only be 3 or 7."

Phase 3: Execute the move.

4. Module C: Growth & Viral Infrastructure (Priority: Medium)
Current State Assumption: No deep linking; generic "Share" button sending a screenshot. Target State: Playable links and visual social proof.

4.1 Component: Deep Link Handler
URI Schema: Define sudoku://puzzle?seed={id}&difficulty={diff}&variant={type}.

Web Fallback: Create a simple landing page that redirects to the store or opens the app via Universal Links (iOS) / App Links (Android).

Logic: When opened via link, bypass the main menu and load the exact puzzle configuration. If the user doesn't have the app, defer the deep link through the install process (using a tool like Branch.io or Firebase Dynamic Links).

4.2 Component: Social Share Generator
Trigger: "Puzzle Completed" Event.

Output: Do not share a screenshot of the grid (spoilers). Generate a "Result Card" image:

Visuals: Difficulty rating, Time taken, and a visual "Heatmap" or "Flow Chart" of the solve.

Call to Action: "Can you beat my time?"

Wordle-like Grid: For "Daily Challenges," generate a text-based emoji grid representing the struggle (e.g., 🟩 for easy steps, 🟥 for stalls).

5. Module D: Retention & Gamification (Priority: Medium)
5.1 Component: The Daily Routine
Backend Requirement: A server-side or local deterministic schedule that ensures every user sees the same puzzle on the same day.

Streak Logic:

Store last_played_date locally.

Streak Freeze: If current_date - last_played_date > 1 AND has_freeze_item, consume item and maintain streak. This prevents "streak-break churn".

5.2 Component: Analytics Dashboard ("Quantified Self")
Metric Collection: Track time_per_step, mistake_rate, and hint_usage.

Visualization: Graph "Average Time vs. Difficulty" over the last 30 days. Showing improvement is the strongest retention hook for logic games.

6. Technical Requirements (Non-Functional)
Offline First: The app must be fully functional (generation, play, stats) in Airplane Mode. Sync only when network is restored.

Battery Optimization:

Rendering: Use "Dirty Rect" rendering. Do not run the game loop at 60fps when the board is static. Only repaint on input or animation.

Dark Mode: Enforce True Black (#000000) for OLED battery savings.

Accessibility:

Color Blindness: Do not rely solely on Red/Green for errors. Use Shapes (e.g., a small 'x') or High Contrast colors (Blue/Orange) for error states.

7. Execution Roadmap (Brownfield)
Sprint 1: Abstract the puzzle generation logic into an Interface. Implement the "Human Solver" in a separate library.

Sprint 2: Swap the generator. Add "Uniqueness" checks.

Sprint 3: Refactor Input Controller. Add "Auto-Cleanup" and "Snyder Toggle."

Sprint 4: Implement Deep Linking and the "Challenge a Friend" result card.

