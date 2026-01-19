# **Advanced Architectures for Automated Verification of Sudoku Constraint Satisfaction Algorithms: A Comprehensive Reference on Minimal Candidate Configurations**

## **1\. Introduction: The Epistemology of Algorithmic Verification**

The development of high-performance logical solvers for Constraint Satisfaction Problems (CSPs), and specifically the combinatorial logic puzzle Sudoku, presents a unique verification challenge. Unlike stochastic solvers or brute-force backtracking algorithms—which rely on recursive depth-first searches to exhaust the state space—logical solvers attempt to mimic and formalize human deductive reasoning. These solvers operate not on the "values" of the cells, but on the "candidates" (the set of possible values) remaining in each cell. As the complexity of the strategies increases from basic set theory (Single Candidate elimination) to graph-theoretic analysis (Chaining, Coloring, and Fish patterns), the risk of implementation error grows exponentially. A heuristic solver that incorrectly implements an X-Wing strategy may inadvertently solve a puzzle through invalid logic, producing a "correct" final grid state via an incorrect derivation path. This phenomenon, known as "solving by accident," renders standard black-box testing—where only the final solved state is verified—insufficient for rigorous software engineering.1

To guarantee the integrity of a logical solver, one must employ white-box unit testing strategies that isolate specific inferential rules. This report provides an exhaustive definition of "minimal candidate configurations" for the entire spectrum of standard Sudoku solving techniques. A minimal configuration is defined here as the smallest sufficient set of givens and candidates required to trigger a specific logical elimination rule, while explicitly excluding any conditions that would trigger a simpler rule. The construction of these configurations requires a deep understanding of the underlying geometry of the Sudoku grid, graph theory, and set logic. By feeding these precise configurations into a solver, a test engineer can assert that a specific candidate is eliminated solely due to the target strategy, thereby mathematically proving the correctness of the implementation.3

This reference document is structured to serve as a definitive guide for developers, researchers, and quality assurance engineers building next-generation constraint solvers. It moves beyond simple puzzle examples to define the architectural requirements for testing data structures, covering the entire hierarchy of strategies from elementary subsets to extreme chaining logic.

## ---

**2\. Foundations of Sudoku Test Architecture**

Before analyzing specific strategies, it is imperative to establish the data structures and coordinate systems that allow for the construction of minimal test cases. The standard representation of a Sudoku grid as a simple 2D integer array is inadequate for testing logical strategies. Logical strategies operate on the *possibility space*, not the solution space. Therefore, the fundamental unit of data for these tests is the Candidate Map.

### **2.1 The Bitwise Candidate Map**

To efficiently represent and manipulate candidate sets during testing, modern solvers and their corresponding test harnesses utilize bitwise integers. A standard Sudoku cell $C\_{r,c}$ containing a set of candidates $K \\subseteq \\{1, \\dots, 9\\}$ is best represented as a 9-bit integer where the $n$-th bit is set if $n \\in K$.

$$V(C\_{r,c}) \= \\sum\_{k \\in K} 2^{k-1}$$

For example, a cell containing candidates $\\{1, 5, 9\\}$ is represented as binary 100010001 or decimal 273\. This representation allows for O(1) complexity when checking for set intersections, unions, and subsets—operations that are ubiquitous in strategies like Naked Pairs and Hidden Quads.5  
When designing minimal test configurations, the test harness must allow the injection of these bitmasks directly into specific coordinates. The remaining "irrelevant" cells must not be left empty, as an empty cell usually implies a full candidate set $\\{1..9\\}$, which introduces massive noise into the test environment. Instead, a "Solved Padding" strategy is employed.

### **2.2 The "Solved Padding" Methodology**

A valid unit test for a strategy $S$ must ensure that no simpler strategy $S\_{simple}$ can execute. If we are testing an **X-Wing**, we must ensure that the board does not contain any **Naked Singles** or **Hidden Singles**. The most effective way to achieve this in a minimal configuration is to fill the irrelevant parts of the grid with a pre-solved, valid Sudoku pattern (a "template"), and then surgically "damage" specific cells to create the candidates necessary for the test case.

Definition of the Neutral Template:  
A Neutral Template is a fully solved Sudoku grid used as the background canvas. A commonly used template is the sequential shift pattern, though random valid grids are also acceptable.

$$\\text{Row } i \= \[(i \\times 3 \+ \\lfloor i/3 \\rfloor \+ j) \\pmod 9\] \+ 1$$

This formula generates a valid grid. To create a test case, the engineer "unsolves" specific cells by reverting them to candidate sets. This ensures that all "House" constraints (Row, Column, Box) are satisfied for the irrelevant cells, preventing the solver from wasting cycles on them or crashing due to invalid board states.3

### **2.3 Coordinate Systems and House Indexing**

Precise testing requires a standardized coordinate system. This report utilizes the **rNcN** notation, where r denotes Row (1-9) and c denotes Column (1-9).

* **Rows:** $r1$ (Top) to $r9$ (Bottom).  
* **Columns:** $c1$ (Left) to $c9$ (Right).  
* **Boxes (Blocks):** $b1$ to $b9$, indexed top-left to bottom-right.  
  * $b1 \= \\{r1..3, c1..3\\}$  
  * $b5 \= \\{r4..6, c4..6\\}$  
  * $b9 \= \\{r7..9, c7..9\\}$

Unit tests often require iteration over "Peers." The peers of a cell $C\_{r,c}$ are all cells sharing a Row, Column, or Box. A minimal configuration implicitly relies on the Peer relationship to define "visibility" between candidates. For example, in a Y-Wing, the elimination target must "see" both pincer cells. A test case that places the target in a non-peer location is invalid.7

## ---

**3\. The Subset Strategies: Naked and Hidden Tuples**

The most fundamental logical strategies involve subsets of candidates within a single unit (House). These are the first line of defense after Singles and form the baseline for unit testing.

### **3.1 Naked Pairs (Conjugate Pairs)**

A Naked Pair occurs when two cells in the same House contain exactly the same two candidates. The logic dictates that since these two cells must eventually resolve to those two values (in some order), those values cannot exist elsewhere in that House.

#### **3.1.1 Theoretical Mechanism**

Given House $H$ and cells $c\_a, c\_b \\in H$:

$$\\text{If } candidates(c\_a) \= \\{x, y\\} \\land candidates(c\_b) \= \\{x, y\\}$$

$$\\implies \\forall c\_i \\in H \\setminus \\{c\_a, c\_b\\}, candidates(c\_i) \= candidates(c\_i) \\setminus \\{x, y\\}$$

#### **3.1.2 Minimal Test Configuration**

To verify a solver's ability to detect Naked Pairs, we construct a scenario in **Row 1**. We inject a Naked Pair $\\{1, 6\\}$ and noise candidates in the target cells.

**Table 1: Naked Pair Test Vector (Row Logic)**

| Cell Coordinate | Candidates | Logic Role | Description |
| :---- | :---- | :---- | :---- |
| **r1c2** | {1, 6} | **Pair Member A** | Locked set member. |
| **r1c3** | {1, 6} | **Pair Member B** | Locked set member. |
| **r1c5** | {1, 6, 8} | **Elimination Target** | Contains pair values \+ distinct value. |
| **r1c8** | {1, 9} | **Elimination Target** | Contains one pair value \+ distinct value. |
| **r1c1, r1c4...** | {2, 3, 4, 5, 7} | **Padding** | Solved values to prevent noise. |

* **Expected Outcome:**  
  * Eliminate 1 and 6 from r1c5 $\\rightarrow$ Result: {8}.  
  * Eliminate 1 from r1c8 $\\rightarrow$ Result: {9}.  
* **Implementation Note:** The test must explicitly verify that the solver handles partial overlaps (e.g., r1c8 only has 1, not 6). A naive implementation might only clear cells containing *both* candidates, which is incorrect behavior.9

#### **3.1.3 Edge Case: The Box/Line Intersection**

A Naked Pair can exist simultaneously in a Row and a Box (e.g., r1c2 and r1c3 are in Row 1 and Box 1).

* **Test Requirement:** The test configuration must include a target in **r2c3** (Box 1, but not Row 1).  
* **Minimal Setup:** Place {1, 5} in r2c3.  
* **Assertion:** The solver must correctly identify that the Naked Pair in r1c2/r1c3 affects the *entire* Box 1, removing 1 from r2c3.5

### **3.2 Naked Triples and Quads**

Naked Triples introduce combinatorial complexity because the union of candidates must be size 3, but individual cells do not need to contain all 3 candidates.

#### **3.2.1 The Subset Configurations**

A Naked Triple on $\\{A, B, C\\}$ can manifest in several permutations:

1. **Complete:** $\\{ABC\\}, \\{ABC\\}, \\{ABC\\}$ (Trivial).  
2. **Partial:** $\\{AB\\}, \\{BC\\}, \\{AC\\}$ (The "loop" pattern).  
3. **Mixed:** $\\{AB\\}, \\{ABC\\}, \\{BC\\}$.

#### **3.2.2 Minimal Test Configuration (Column Logic)**

**Objective:** Detect Naked Triple $\\{2, 8, 9\\}$ in **Column 4**.

**Table 2: Naked Triple Test Vector (Mixed Pattern)**

| Cell Coordinate | Candidates | Logic Role | Note |
| :---- | :---- | :---- | :---- |
| **r4c4** | {2, 8} | **Triple Member** | Missing 9\. |
| **r5c4** | {8, 9} | **Triple Member** | Missing 2\. |
| **r6c4** | {2, 9} | **Triple Member** | Missing 8\. |
| **r2c4** | {2, 8, 9, 5} | **Target** | Contains valid 5\. |
| **r7c4** | {1, 2} | **Target** | Contains valid 1\. |

* **Expected Outcome:**  
  * r2c4 $\\rightarrow$ {5} (Eliminate 2, 8, 9).  
  * r7c4 $\\rightarrow$ {1} (Eliminate 2).  
* **Validation Insight:** This test explicitly targets the "Partial" configuration logic. A solver that simply searches for three identical cells will fail this test case, highlighting a critical logic gap.1

### **3.3 Hidden Subsets (Pairs/Triples)**

Hidden subsets are the inverse of Naked subsets. The candidates are "hidden" by noise candidates. If $N$ candidates appear in exactly $N$ cells in a house, they are locked to those cells.

#### **3.3.1 Noise Injection Strategy**

Testing Hidden Subsets requires careful "Noise Injection." If we want to test a Hidden Pair $\\{6, 7\\}$, we must add noise candidates $\\{1, 2, 3, 4\\}$ to the pair cells such that $\\{6, 7\\}$ appear nowhere else.

#### **3.3.2 Minimal Test Configuration (Box Logic)**

**Objective:** Hidden Pair $\\{6, 7\\}$ in **Box 3**.

**Table 3: Hidden Pair Test Vector**

| Cell Coordinate | Candidates | Logic Role |
| :---- | :---- | :---- |
| **r1c8** | {6, 7, 1, 2} | **Hidden Pair Location** |
| **r1c9** | {6, 7, 3, 4} | **Hidden Pair Location** |
| **Box 3 Other** | {1, 2, 3, 4, 5, 8, 9} | **Rest of Box** (NO 6 or 7\) |

* **Constraint:** The test setup must aggressively ensure that digit 6 and digit 7 do NOT appear in r1c7, r2c7...r3c9.  
* **Expected Outcome:**  
  * r1c8 $\\rightarrow$ {6, 7} (Eliminate 1, 2).  
  * r1c9 $\\rightarrow$ {6, 7} (Eliminate 3, 4).  
* **Significance:** The elimination here is *internal* to the set cells. Unlike Naked sets which eliminate candidates from *peers*, Hidden sets eliminate noise from *themselves*.11

## ---

**4\. Intersection Strategies: Geometric Locking**

Intersection strategies exploit the overlapping geometry between Boxes and Lines (Rows/Columns). These are crucial for creating minimal constraints that unlock advanced patterns.

### **4.1 Pointing Pairs (Locked Candidates Type 1\)**

If a candidate is restricted to a single row or column within a box, it must be eliminated from that row or column in the rest of the grid.

#### **4.1.1 Minimal Test Configuration**

**Objective:** Pointing Pair of 5s in **Box 1** pointing along **Row 3**.

**Table 4: Pointing Pair Test Vector**

| Cell Coordinate | Candidates | Logic Role |
| :---- | :---- | :---- |
| **r3c1** | {5, 9} | **Pointer A** |
| **r3c2** | {5, 8} | **Pointer B** |
| **r3c3** | {1, 2} | **Blocking Cell** (No 5\) |
| **r1c1...r2c3** | {1, 2, 3, 4} | **Box Context** (No 5s) |
| **r3c7** | {5, 6} | **Target (External)** |

* **Logic Flow:**  
  1. Solver scans Box 1 for digit 5\.  
  2. Finds 5 only at r3c1, r3c2.  
  3. Determines alignment: Both are Row 3\.  
  4. Executes Elimination on Row 3 outside Box 1\.  
* **Expected Outcome:** r3c7 $\\rightarrow$ {6}.  
* **Bug Watch:** Ensure the solver does not eliminate 5s from the pointers themselves (r3c1, r3c2).12

### **4.2 Box/Line Reduction (Locked Candidates Type 2\)**

Often called "Claiming," this is the reverse of Pointing. If a candidate in a Row is restricted to a single Box, it is eliminated from the rest of that Box.

#### **4.2.1 Minimal Test Configuration**

**Objective:** Claiming 7s in **Row 2** confined to **Box 1**.

**Table 5: Box/Line Reduction Test Vector**

| Cell Coordinate | Candidates | Logic Role |
| :---- | :---- | :---- |
| **r2c1** | {7, 1} | **Claimer A** |
| **r2c2** | {7, 2} | **Claimer B** |
| **r2c3** | {7, 3} | **Claimer C** |
| **r2c4...r2c9** | {1, 2, 3...} | **Row Context** (No 7s) |
| **r3c2** | {7, 9} | **Target (Internal to Box)** |

* **Logic Flow:**  
  1. Solver scans Row 2 for digit 7\.  
  2. Finds 7 only in r2c1, r2c2, r2c3.  
  3. Determines containment: All are in Box 1\.  
  4. Executes Elimination on Box 1 outside Row 2\.  
* **Expected Outcome:** r3c2 $\\rightarrow$ {9}.12

## ---

**5\. The Fish Patterns: Coupled Sector Logic**

Fish strategies involve identifying patterns where a candidate's potential locations in $N$ rows (Base Sets) align perfectly with $N$ columns (Cover Sets). Testing these requires precise candidate placement to form the characteristic grid.

### **5.1 X-Wing (2x2 Fish)**

The X-Wing is the simplest Fish pattern. It detects a rectangle of candidates.

#### **5.1.1 Minimal Test Configuration (Row-Base)**

Objective: X-Wing on Digit 7\.  
Base Sets: Row 2, Row 6\.  
Cover Sets: Col 4, Col 8\.  
**Table 6: X-Wing Test Vector**

| Cell Coordinate | Candidates | Role |
| :---- | :---- | :---- |
| **r2c4** | {7, 1} | **Wing Corner (Top-Left)** |
| **r2c8** | {7, 2} | **Wing Corner (Top-Right)** |
| **r6c4** | {7, 3} | **Wing Corner (Bottom-Left)** |
| **r6c8** | {7, 4} | **Wing Corner (Bottom-Right)** |
| **r2c1...r2c9** | No 7s | (Except c4, c8) |
| **r6c1...r6c9** | No 7s | (Except c4, c8) |
| **r4c4** | {7, 9} | **Target (Col 4\)** |
| **r8c8** | {7, 5} | **Target (Col 8\)** |

* **Logic Trace:** Since Row 2 has 7s only at c4/c8, and Row 6 has 7s only at c4/c8, the 7s for these rows must occupy c4 and c8. Therefore, Col 4 and Col 8 cannot have 7s anywhere else.  
* **Expected Outcome:** Eliminate 7 from r4c4 and r8c8.  
* **Anti-Test (Finned X-Wing):** Add a 7 at r2c5. The strict X-Wing solver must **FAIL** to eliminate. This verifies the "exact match" constraint.13

### **5.2 Swordfish (3x3 Fish)**

The Swordfish extends the logic to three rows and three columns.

#### **5.2.1 Minimal Test Configuration (Column-Base 2-2-2)**

A "2-2-2" Swordfish means each base column contains exactly two candidates, forming a chain. This is the most efficient minimal test.  
Objective: Swordfish on Digit 4\.  
Base Cols: C2, C3, C5.  
Cover Rows: R2, R4, R7.  
**Table 7: Swordfish Test Vector**

| Cell Coordinate | Candidates | Connectivity |
| :---- | :---- | :---- |
| **r2c2** | {4, 1} | Node (R2/C2) |
| **r2c5** | {4, 1} | Node (R2/C5) |
| **r4c2** | {4, 2} | Node (R4/C2) |
| **r4c3** | {4, 2} | Node (R4/C3) |
| **r7c3** | {4, 3} | Node (R7/C3) |
| **r7c5** | {4, 3} | Node (R7/C5) |
| **r2c8** | {4, 9} | **Target (Row 2\)** |
| **r4c9** | {4, 8} | **Target (Row 4\)** |

* **Configuration Note:** Notice r2c3, r4c5, r7c2 are empty of 4s. This "staggered" formation is critical for testing valid Swordfish detection; a solver requiring a full 3x3 grid (9 candidates) is logically flawed.  
* **Expected Outcome:** Eliminate 4 from targets in the Cover Rows (r2c8, r4c9).15

### **5.3 Jellyfish (4x4 Fish)**

The Jellyfish involves 4 rows and 4 columns. While rare in manual play, it is a standard unit test for algorithmic solvers.  
Base Rows: 1, 2, 4, 5\. Cover Cols: 1, 4, 7, 8\.  
Target: Digit 9 in r8c1 (Col 1 is a Cover Set).

* **Minimal Setup:** Place 9s at the intersections (e.g., r1c1, r1c4, r2c1, r2c7, etc.) ensuring Base Rows have no other 9s.  
* **Assertion:** Remove 9 from r8c1, r9c4, etc..13

## ---

**6\. Wing Strategies: Hinges and Pivots**

Wing strategies rely on bivalue cells (cells with exactly two candidates) arranged to force a contradiction. They differ from Fish strategies as they rely on multiple different candidate values interacting.

### **6.1 XY-Wing (Y-Wing)**

The XY-Wing utilizes a "Pivot" cell and two "Pincer" cells. It connects three values $X, Y, Z$.

#### **6.1.1 Minimal Test Configuration**

Values: X=7, Y=1, Z=2.  
Structure: Pivot $XY$, Pincers $XZ$ and $YZ$.  
**Table 8: XY-Wing Test Vector**

| Cell Coordinate | Candidates | Logic Role |
| :---- | :---- | :---- |
| **r1c1** | {7, 1} | **Pivot (XY)** |
| **r1c7** | {7, 2} | **Pincer A (XZ)** \- Sees Pivot via Row |
| **r5c1** | {1, 2} | **Pincer B (YZ)** \- Sees Pivot via Col |
| **r5c7** | {2, 9} | **Target (Z)** \- Sees Both Pincers |

* **Logic:**  
  * If Pivot is 7 $\\rightarrow$ Pincer A is 2\.  
  * If Pivot is 1 $\\rightarrow$ Pincer B is 2\.  
  * Result: One of the Pincers MUST be 2\.  
  * Any cell seeing *both* Pincers cannot be 2\.  
* **Geometric Constraint:** The target r5c7 must be visible to both r1c7 and r5c1. r5c7 is in Row 5 (sees r5c1) and Column 7 (sees r1c7). This forms a rectangle.  
* **Expected Outcome:** Eliminate 2 from r5c7.16

### **6.2 XYZ-Wing**

An extension of the XY-Wing where the Pivot contains three candidates $\\{X, Y, Z\\}$ but is restricted by geography.

#### **6.2.1 Minimal Test Configuration**

Structure: Pivot in Box, Pincer 1 in same Box, Pincer 2 outside Box.  
Pivot: r4c4 {1, 2, 3}.  
Pincer 1: r4c2 {1, 3} (Same Row).  
Pincer 2: r5c5 {2, 3} (Same Box).  
Target: r5c4 {3, 8}.

* **Logic:**  
  * Pivot=1 $\\rightarrow$ Pincer 1 (r4c2) is 3\.  
  * Pivot=2 $\\rightarrow$ Pincer 2 (r5c5) is 3\.  
  * Pivot=3 $\\rightarrow$ Pivot is 3\.  
  * Conclusion: The digit 3 is locked into the union of cells $\\{r4c4, r4c2, r5c5\\}$.  
  * Target r5c4 sees all three of these cells.  
* **Expected Outcome:** Eliminate 3 from r5c4.17

## ---

**7\. Chaining and Graph Coloring**

Strategies in this category treat the grid as a graph where candidates are nodes and logic rules form edges.

### **7.1 Simple Coloring (Single Digit Graph)**

This strategy constructs a graph for a single digit (e.g., 5\) using "Strong Links." A Strong Link exists between two cells in a unit if they are the *only* two cells containing that digit.

#### **7.1.1 Minimal Test Configuration (Rule 4: Chain Contradiction)**

Objective: Eliminate 5 using a bicameral graph (Colors A and B).  
Digit: 5\.  
**Table 9: Simple Coloring Test Vector**

| Cell | Candidates | Link Type | Color |
| :---- | :---- | :---- | :---- |
| **r2c9** | {5, 1} | Start | **A** |
| **r6c9** | {5, 2} | Strong Link (Col 9\) | **B** |
| **r6c5** | {5, 3} | Strong Link (Row 6\) | **A** |
| **r4c5** | {5, 4} | Strong Link (Col 5\) | **B** |
| **r4c9** | {5, 9} | **Target** | **X** |

* **Logic:**  
  * The chain proves that A and B are conjugates (One is True, one is False).  
  * Target r4c9 sees r2c9 (Color A) and r4c5 (Color B).  
  * Since one of A or B must be 5, the Target r4c9 sees a 5 regardless of which color is true.  
* **Expected Outcome:** Eliminate 5 from r4c9.  
* **Implementation Requirement:** The test graph must ensure no other 5s exist in Col 9, Row 6, or Col 5 to preserve the Strong Links.18

### **7.2 XY-Chain**

This connects different values across bivalue cells, creating a generic implication chain.  
Sequence: r1c1(1,2) \-\> r1c5(2,3) \-\> r5c5(3,4) \-\> r5c1(4,1).

* **Start:** r1c1. If NOT 1, then 2 $\\rightarrow$... $\\rightarrow$ r5c1 is 1\.  
* **End:** r5c1.  
* **Implication:** Either start or end is 1\.  
* **Target:** r2c2 (sees both Start and End). Eliminate 1\.19

## ---

**8\. Uniqueness Strategies: The "Deadly Pattern"**

Uniqueness strategies rely on the meta-assumption that every valid Sudoku puzzle has exactly one solution. They detect states that would lead to two solutions and eliminate candidates to prevent this.

### **8.1 Unique Rectangle (Type 1\)**

The "Deadly Pattern" is a rectangle of four cells over two boxes containing exactly the candidates $\\{A, B\\}$. If this state is allowed to exist, $A$ and $B$ could be swapped without violating any rules, implying 2 solutions.

#### **8.1.1 Minimal Test Configuration**

Candidates: $\\{1, 2\\}$.  
Location: Rows 1/2, Cols 1/2. Spanning Box 1 and Box 2\. (c1 in Box 1, c2 in Box 1 is INVALID for UR testing; they must be in different boxes to avoid box constraints resolving them).  
Correct Setup: r1c1 (Box 1), r1c4 (Box 2), r2c1 (Box 1), r2c4 (Box 2).  
**Table 10: Unique Rectangle Type 1 Vector**

| Cell | Candidates | Role |
| :---- | :---- | :---- |
| **r1c1** | {1, 2} | Floor |
| **r2c1** | {1, 2} | Floor |
| **r1c4** | {1, 2} | Floor |
| **r2c4** | {1, 2, 3} | **Roof (Target)** |

* **Logic:** If r2c4 were {1, 2}, the deadly pattern $\\{1, 2\\}$ would exist in all 4 corners. To avoid ambiguity, r2c4 MUST be 3\.  
* **Expected Outcome:** Eliminate 1 and 2 from r2c4, leaving {3}.  
* **Safety Check:** The solver must verify that the rectangle spans exactly two boxes. If r1c1 and r1c4 were in the same box (impossible 4-col distance, but theoretically), UR logic does not apply.17

## ---

**9\. Advanced Diabolical Strategies**

For completeness in high-level solver testing, minimal configurations for advanced graph theory are required.

### **9.1 Finned X-Wing**

A Finned X-Wing is an X-Wing where one corner has an extra candidate (the "Fin") that breaks the perfect rectangle.  
Config: X-Wing Base (R2, R6 / C4, C8).  
Fin: Add a 7 at r2c5 (in base row, same box as corner r2c4).  
Target: Eliminate 7 from r6c5 (Same box as fin r2c5 and sees other corner r6c4).

* **Logic:** Either the X-Wing is true (eliminations valid) OR the Fin is true (eliminations valid). Intersection of truth allows elimination.20

### **9.2 Sue-de-Coq**

A complex subset intersection strategy involving a Box and a Line.  
Config:

* **Intersection Set (Box/Line):** r1c1, r1c2 {1, 2}.  
* **Line Set:** r1c3, r1c4 {1, 2, 3}.  
* **Box Set:** r2c1, r2c2 {1, 2, 4}.  
* **Logic:** The union of candidates vs cells forces eliminations in the rest of the Row and Box.  
* **Minimalism:** This requires precise set construction to avoid simpler Naked Subset triggers.20

## ---

**10\. Automated Test Factory Architecture**

To scale the testing of these configurations, a TestFactory pattern is recommended. This allows for the procedural generation of the minimal states described above.

### **10.1 Pseudo-Code for Minimal State Generation**

Python

class SudokuTestFactory:  
    def create\_minimal\_state(strategy\_type, coordinates, candidates):  
        \# 1\. Initialize a fully solved board (The Neutral Template)  
        board \= Board.from\_template("Sequential\_Shift\_9x9")  
          
        \# 2\. "Damage" the board to create candidates  
        \# Convert fixed values back to candidate bitmasks  
        for coord in coordinates:  
            board.set\_candidates(coord, candidates\[coord\])  
              
        \# 3\. Inject the logic candidates  
        \# This overrides the template's solved value with the test case  
        \# ensuring the "rest of board" remains valid logic context.  
        return board

    def verify\_minimality(board, target\_strategy):  
        \# Regression Suite  
        simpler\_strategies \=  
        for strategy in simpler\_strategies:  
            if strategy.solve(board).changes \> 0:  
                raise InvalidTestException("Test case polluted by simpler logic")  
          
        \# Execute Target  
        result \= target\_strategy.solve(board)  
        assert result.changes \> 0

### **10.2 Regression Testing**

A critical requirement for the minimal configuration is stability against regression. If an improvement to the **Naked Pair** solver makes it smarter (e.g., detecting disjoint pairs), it might inadvertently solve a **Hidden Pair** test case. The verify\_minimality function ensures that the test cases remain valid benchmarks for the specific logic they are designed to exercise.

## ---

**11\. Conclusion**

The verification of Sudoku strategies requires a shift from result-oriented testing to logic-oriented testing. The minimal candidate configurations detailed in this report—spanning Subsets, Intersections, Fish, Wings, Chains, and Uniqueness patterns—provide the mathematical bedrock for this verification. By isolating specific logical geometric patterns (like the 2-2-2 Swordfish or the Type 1 Unique Rectangle) within a controlled, noise-free environment, developers can prove the correctness of their solvers with rigor. These configurations serve not only as test cases but as canonical definitions of the strategies themselves, stripping away the complexity of a full puzzle to reveal the pure logical mechanism underneath.

Future research in this domain should focus on the automated synthesis of "Alien" strategies (patterns found by AI without human nomenclature) and the formal verification of these minimal states using constraint programming solvers like Z3 to prove that no other derivations are possible for a given configuration.

---

**References within the text refer to the Source Index provided in the research materials.**

#### **Works cited**

1. Introducing an actually helpful sudoku solver \- TimVink.nl, accessed January 15, 2026, [https://timvink.nl/blog/introducing-sudoku-solver/](https://timvink.nl/blog/introducing-sudoku-solver/)  
2. sudoku-solver · GitHub Topics, accessed January 15, 2026, [https://github.com/topics/sudoku-solver](https://github.com/topics/sudoku-solver)  
3. Generating minimal/irreducible Sudokus \- algorithm \- Stack Overflow, accessed January 15, 2026, [https://stackoverflow.com/questions/14147761/generating-minimal-irreducible-sudokus](https://stackoverflow.com/questions/14147761/generating-minimal-irreducible-sudokus)  
4. messersm/sudokutools: Yet another python sudoku library. \- GitHub, accessed January 15, 2026, [https://github.com/messersm/sudokutools](https://github.com/messersm/sudokutools)  
5. What if Naked pair/triplet found within chute \- The New Sudoku Players' Forum, accessed January 15, 2026, [http://forum.enjoysudoku.com/what-if-naked-pair-triplet-found-within-chute-t32696.html](http://forum.enjoysudoku.com/what-if-naked-pair-triplet-found-within-chute-t32696.html)  
6. How to generate Sudoku boards with unique solutions \- Stack Overflow, accessed January 15, 2026, [https://stackoverflow.com/questions/6924216/how-to-generate-sudoku-boards-with-unique-solutions](https://stackoverflow.com/questions/6924216/how-to-generate-sudoku-boards-with-unique-solutions)  
7. 36\. Valid Sudoku \- In-Depth Explanation \- AlgoMonster, accessed January 15, 2026, [https://algo.monster/liteproblems/36](https://algo.monster/liteproblems/36)  
8. Sudoku Assistant \-- Solving Techniques \- St. Olaf College, accessed January 15, 2026, [https://www.stolaf.edu/people/hansonr/sudoku/explain.htm](https://www.stolaf.edu/people/hansonr/sudoku/explain.htm)  
9. Naked Candidates \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/naked\_candidates](https://www.sudokuwiki.org/naked_candidates)  
10. Solve Sudoku using Naked Pairs Triples or Quads, accessed January 15, 2026, [https://sudokubliss.com/guides/naked-pairs-triples-quads](https://sudokubliss.com/guides/naked-pairs-triples-quads)  
11. Hidden Candidates \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/Hidden\_Candidates](https://www.sudokuwiki.org/Hidden_Candidates)  
12. Solving Techniques \- Intersections (Locked Candidates ... \- HoDoKu, accessed January 15, 2026, [https://hodoku.sourceforge.net/en/tech\_intersections.php](https://hodoku.sourceforge.net/en/tech_intersections.php)  
13. Solving Techniques \- Basic Fish (X-Wing, Swordfish ... \- HoDoKu, accessed January 15, 2026, [https://hodoku.sourceforge.net/en/tech\_fishb.php](https://hodoku.sourceforge.net/en/tech_fishb.php)  
14. X-Wing Strategy \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/x\_wing\_strategy](https://www.sudokuwiki.org/x_wing_strategy)  
15. Swordfish Strategy \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/sword\_fish\_strategy](https://www.sudokuwiki.org/sword_fish_strategy)  
16. Y-Wing Strategy \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/Y\_Wing\_Strategy](https://www.sudokuwiki.org/Y_Wing_Strategy)  
17. Strategy Families \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/strategy\_families](https://www.sudokuwiki.org/strategy_families)  
18. Simple Colouring \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/Simple\_Colouring](https://www.sudokuwiki.org/Simple_Colouring)  
19. XY-Chains \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/XY\_Chains](https://www.sudokuwiki.org/XY_Chains)  
20. The Relative Incidence of Sudoku Strategies \- SudokuWiki.org, accessed January 15, 2026, [https://www.sudokuwiki.org/The\_Relative\_Incidence\_of\_Sudoku\_Strategies](https://www.sudokuwiki.org/The_Relative_Incidence_of_Sudoku_Strategies)