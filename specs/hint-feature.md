# Specification: Sudoku Hint Feature

## Overview
The "Hint" feature aims to assist users in solving Sudoku puzzles by not only providing the next move but also explaining the underlying technique. This is intended to be an educational tool helping users learn advanced Sudoku strategies.

## User Interface Requirements

### 1. Hint Button
- **Placement**: Located in the main tools row, next to the "Clear" button.
- **Icon**: `lightbulb-outline` or `help-circle-outline` from `MaterialCommunityIcons`.
- **Label**: "Hint".
- **Interaction**: Pressing the button toggles "Hint Mode".

### 2. Hint Mode
- When active, the app displays a "Hint Overlay" or a dedicated message area.
- The button state should visually reflect that Hint Mode is active (e.g., changed color or highlighted background).
- The user can exit Hint Mode by pressing the button again, selecting a different cell, or entering a number (which might automatically apply the hint if it was for the selected cell).

### 3. Visual Feedback
- **Target Cell**: The cell for which the hint is provided should be highlighted with a distinct color (e.g., a "hint" blue or gold).
- **Contributing Cells**: Cells that inform the current hint (e.g., other cells in the same row, column, or block that rule out candidates) should be highlighted with a different, secondary color.
- **Explanation**: A text area should explain:
    - The name of the technique used (e.g., "Naked Single").
    - A detailed explanation of why the value belongs in that cell.
    - Reference to the contributing cells.

## Functional Requirements

### 1. Hint Generation Logic
The logic should find the "easiest" next move that hasn't been made yet. Techniques should be prioritized from simplest to most complex:
1. **Naked Single**: Only one number is possible in a cell.
2. **Hidden Single**: Only one cell in a row/column/block can contain a specific number.
3. **Intersection Removal**: Pointing pairs/triples that rule out candidates in other regions.

### 2. Hint Data Structure
A hint should provide:
- `row`, `col`: Coordinates of the target cell.
- `value`: The correct value for the cell.
- `technique`: Name of the technique.
- `explanation`: Human-readable explanation.
- `contributingCells`: Array of `{row, col}` indicating cells that factor into the solution.

### 3. Interaction Logic
- If a cell is already selected when Hint is pressed, the app should prioritize a hint for that specific cell if possible.
- If no hint is found for the selected cell, it should find the next logical move elsewhere on the board and select that cell.
- If the user enters the correct hinted value while in Hint Mode, the hint should clear and Hint Mode should deactivate.

## Implementation Details

### `utils/sudoku.ts`
- Implement `findNextMove(board, candidates): Hint | null`.
- Enhance existing strategy functions to return metadata about *why* a move was found (the contributing cells).

### `components/SudokuBoard.tsx`
- Add `isHintMode` state.
- Add `currentHint` state to store the `Hint` object.
- Update `toolsRow` to include the Hint button.
- Update `Cell` rendering to support "Hint Highlight" and "Contributing Highlight".
- Implement a `HintMessage` component to display the explanation.

## Verification Plan
1. **Easy Puzzles**: Verify "Naked Single" hints are accurate and clearly explained.
2. **Medium/Hard Puzzles**: Verify "Hidden Single" and "Intersection Removal" hints correctly highlight contributing cells.
3. **UI Consistency**: Ensure Hint Mode is easily togglable and doesn't interfere with normal gameplay.
4. **Resilience**: Ensure hints are updated correctly if the user makes a manual move while in Hint Mode.
