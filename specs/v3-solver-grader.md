# Technical Specification: Sudoku Solver & Grader V3

## Overview
The V3 architecture moves away from a linear "list of techniques" approach towards a logical "Inference Engine." It splits the Sudoku logic into two optimized modules: the **Solver** (for hints and gameplay) and the **Grader** (for accurate difficulty assessment).

## 1. The Core Engines

### 1.1 Unified AIC Engine (Option 1)
The engine will use **Alternating Inference Chains (AIC)** as its mathematical foundation.
- **Strong Links**: If A is false, B must be true.
- **Weak Links**: If A is true, B must be false.
- **Chain Construction**: The engine will perform a Breadth-First Search (BFS) for alternating sequences of strong and weak links.
- **Techniques Covered**: X-Chains, XY-Chains, Remote Pairs, W-Wings, M-Wings, and more.

### 1.2 Recursive Path Search (Option 4)
The **Grader** will utilize a recursive tree search to simulate every possible deduction path.
- **Goal**: Find the **minimum-difficulty path** to solve the puzzle.
- **Reasoning**: A puzzle is only as hard as its *easiest* solution path. If a "Master" technique exists but a "Pointing Pair" can solve the same cells, the puzzle is "Easy."

---

## 2. Component Split

### 2.1 The Solver (Move/Hint Engine)
- **Primary Goal**: Find the single "best" next move for a user.
- **Priority**: Human-friendly techniques (Options 1, 2) first.
- **Output**: A single `SolverStep` with highlighting data and a human-readable name.
- **Nishio (Option 3)**: If stuck, the solver performs a single-level depth check ("If I place X here, does it create a contradiction?") to provide a hint for very difficult boards.

### 2.2 The Grader (Rating Engine)
- **Primary Goal**: Assign a 100% accurate SE Rating.
- **Methodology**:
    1. Identify all available techniques at the current state.
    2. Branch the search for each technique.
    3. Recursively solve each branch.
    4. Select the path with the **lowest maximum weight**.
- **Result**: `seRating`, `hodokuScore`, and `difficultyLabel`.

---

## 3. Technique Hierarchy (V3)

| Tier | SE | Technique | Logic Basis |
| :--- | :--- | :--- | :--- |
| **Basics** | 1.0-2.3 | Singles | Constraint Satisfaction |
| **Intersections**| 2.6 | Pointing/Claiming | Box-Line Logic |
| **Subsets** | 3.0-5.4 | Pairs, Triples, Quads | Set Theory |
| **Wings** | 4.2-5.6 | XY, XYZ, W-Wing | Unified AIC (Length 3-5) |
| **Chains** | 5.8-7.5 | X-Chain, XY-Chain | Unified AIC (Length 4+) |
| **Extreme** | 7.5+ | Nishio / Contradiction | Deep Recursion (Option 3) |

---

## 4. Implementation Strategy

### Phase 1: The AIC Engine
Implement a discovery function `findAIC(candidates, lengthLimit)` that identifies strong/weak links between nodes (Cell-Digit pairs) and returns valid chains.

### Phase 2: Mapping (Option 2)
Create a "Human Name Mapper" that translates specific AIC lengths and patterns into names:
- Length 4 chain on 1 digit -> **Skyscraper** or **Two-String Kite**.
- Length 3 chain on 2 digits -> **XY-Wing**.

### Phase 3: The Grader Loop (Option 4)
Implement the recursive `grade(board)` function that manages the search tree and identifies the "Path of Least Resistance."
