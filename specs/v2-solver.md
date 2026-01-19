Technical Specification: Sudoku Logic Engine (Brownfield Integration)
Version: 1.0
Target System: Mobile (iOS/Android)
Objective: Replace legacy generation logic with a high-fidelity, engagement-driven engine.
1. The Core Concept: The "Two-Solver" Architecture
To maximize usage, the app must never serve a broken puzzle (multiple solutions) or an unfair puzzle (requires guessing). To achieve this efficiently on mobile hardware, the architecture requires two distinct solver implementations working in tandem.
A. The "Brute" (Fast Solver)
Algorithm: Dancing Links (DLX) or Optimized Backtracking (Algorithm X).
Purpose:
Uniqueness Check: Verifies a puzzle has exactly one solution in <20ms.
Validity Check: Ensures the user's manual inputs (if any) are valid.
Not for Grading: It cannot tell you how hard a puzzle is, only if it is solvable.
B. The "Human" (Logical Solver)
Algorithm: Constraint Propagation with a Hierarchical Technique Pass.
Purpose:
Grading: Assigns the SE (Sudoku Explainer) Rating.
Hint Generation: Finds the "Next Logical Step" for the user.
Generator Validation: Ensures the puzzle can be solved without guessing.
2. Comprehensive Technique Matrix & SE Ratings
This matrix serves as the "Brain" of the Human Solver. The SE Rating is determined by the highest difficulty technique required to solve the puzzle.
Note: SE ratings are logarithmic. A 3.0 is significantly harder than a 2.0.
Tier
SE Rating
Technique Name
Logic Family
Implementation Priority
Beginner
1.0
Full House / Last Digit
Basic scanning
Critical


1.2
Hidden Single (Block)
Basic scanning
Critical


1.5
Hidden Single (Row/Col)
Basic scanning
Critical
Easy
2.3
Naked Single
Candidate filtering
Critical


2.6
Pointing / Claiming
Intersection Removal
Critical
Medium
3.0
Naked Pair
Subsets
High


3.2
X-Wing
Fish (Size 2)
High


3.4
Hidden Pair
Subsets
High


3.6
Naked Triplet
Subsets
Medium


3.8
Swordfish
Fish (Size 3)
Medium
Hard
4.0
Hidden Triplet
Subsets
Medium


4.2
XY-Wing (Y-Wing)
Short Chain / Wing
High


4.4
XYZ-Wing
Short Chain / Wing
Medium


4.5 - 5.0
Unique Rectangles (Type 1-6)
Uniqueness / Deadly Patterns
High (Controversial*)
Expert
5.0
Naked Quad
Subsets
Low


5.2
Jellyfish
Fish (Size 4)
Low


5.4
Hidden Quad
Subsets
Low


5.6
W-Wing
Wings
High (Very satisfying to spot)


5.7
Skyscraper
Single Digit Chain
High


5.8
Two-String Kite
Single Digit Chain
High


5.9
Turbot Fish
Single Digit Chain
Medium
Master
6.0 - 6.4
Simple Color Chain
Chaining
High


6.5 - 7.0
X-Chain
Chaining
High


7.0 - 7.5
XY-Chain / Remote Pairs
Chaining
Medium


7.5+
ALS (Almost Locked Sets)
Complex Sets
Low (Very hard to teach)

Dev Note: "Uniqueness" techniques (Unique Rectangles) are powerful but rely on the meta-knowledge that the puzzle has only one solution. Include a user setting to "Disable Uniqueness Logic in Hints" for purists.
3. The Generator Logic Specification
The generator does not "build" a puzzle. It "digs" one.
3.1 The Pipeline (Reverse Digging Strategy)
Step 1: The Seed
Action: Generate a completely filled, valid 9x9 grid.
Method: Use the Fast Solver to fill an empty board randomly.
Optimization: Do not run this on every tap. Generate 1,000 seeds offline and include those in the code base. Apply "Isomorphs" (rotation, reflection, symbol swapping) at runtime to make 1 seed look like 1,000,000 different puzzles.
Step 2: The Shovel (Digging)
Action: Remove numbers (clues) from the grid symmetrically to maintain aesthetics (optional but recommended for "premium" feel).
Loop:
Create a list of all 81 cell positions.
Shuffle the list.
Iterate through the list. For each cell:
Temporarily remove the number.
Check 1 (Uniqueness): Run Fast Solver. Does it still have exactly 1 solution?
If NO (0 or >1 solutions): Put the number back. This clue is a "backbone" clue.
If YES: Proceed to Check 2.
Check 2 (Difficulty - Optional for Speed): Run Human Solver. Can it still be solved using techniques ≤ Target Difficulty?
If NO: Put the number back.
If YES: Leave it empty.
Step 3: The Grader (Final Pass)
Once the digging loop finishes, you have a valid puzzle.
Run the Human Solver one last time to record the exact Technique Path.
Tagging: Save the puzzle with tags: SE Rating: 3.4, Techniques:.
3.2 Difficulty Targeting Logic
To generate a "Hard" puzzle specifically:
Dig aggressively to remove many clues (lower clue count!= harder, but correlation exists).
Run Human Solver.
The "Lower Bound" Check: If the Human Solver solved it using only Naked Singles (SE 2.3), the puzzle is rejected (too easy).
The "Upper Bound" Check: If the Human Solver failed (requires techniques > Hard), the puzzle is rejected (too hard).
Retry: Discard and re-dig a new seed.
4. The Solver Implementation Details
4.1 The Human Solver Loop
This solver must not backtrack. It must think forward.

Code snippet


function HumanSolve(Grid):
    History =
    Stuck = False

    while (Grid is not Full AND NOT Stuck):
        ProgressMade = False
        
        # HIERARCHY: Try cheapest techniques first
        
        # Tier 1: Basics
        if (FindHiddenSingles(Grid)):
            Apply(HiddenSingle)
            History.add(Step(HiddenSingle))
            ProgressMade = True
            continue # Restart loop to check for new easy singles
            
        if (FindNakedSingles(Grid)):
            Apply(NakedSingle)
            History.add(Step(NakedSingle))
            ProgressMade = True
            continue

        # Tier 2: Intersections
        if (FindPointingPairs(Grid)):
            EliminateCandidates()
            History.add(Step(PointingPair))
            ProgressMade = True
            continue

        # Tier 3: Subsets (expensive iteration)
        if (FindPairsTriplesQuads(Grid)):
            EliminateCandidates()
            ProgressMade = True
            continue

        #... Continue down the Matrix...

        if (NOT ProgressMade):
            Stuck = True
            
    return History, Stuck


4.2 The Hint System (Query Mode)
The Hint System uses the HumanSolve function but stops early.
User Action: Request Hint.
System Action:
Take current board state (user's progress).
Run HumanSolve(CurrentState).
Look at the first item in the returned History.
Output: "The next step requires a [Hidden Pair]."
Interactive: Highlight the rows/cols involved in that specific Hidden Pair.
5. Integration: Brownfield Strategy
Since you are integrating into an existing app:
1. Isolate the Engine:
Build this Logic Engine as a standalone module (or separate library/package) with no UI dependencies.
Input: 81-character string (0 for empty, 1-9 for clues).
Output: JSON object containing Solution String, Difficulty Float, and Steps Array.
2. The Database Approach (Recommended for MVP):
Instead of generating in real-time (which risks lag on older devices), run your Generator on your development machine for 24 hours.
Generate 10,000 Easy, 10,000 Medium, 10,000 Hard.
Store them in a local SQLite database or JSON file bundled with the app.
Runtime: The app simply "picks" a puzzle from the DB. This guarantees zero loading time and perfectly graded puzzles.
3. The "State" Manager:
Your existing app likely has a GameController. You will need to inject a CandidateManager into it.
Old Way: Array of numbers [0, 5, 0,...].
New Way: Array of Bitmasks. Each cell is an integer where bits 1-9 represent possible candidates.
Example: Binary 000000101 means candidates 1 and 3 are possible.
This allows O(1) bitwise operations for checking interactions (crucial for checking constraints like "Hidden Pairs").
