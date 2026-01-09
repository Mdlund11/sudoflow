# 3D Animation Implementation Plan (Finalized) 🚀

This document preserves the approved strategy for implementing 3D animations in Sudoflow.

## Universal Strategy: The "Unified Wave" 🌊
This strategy ensures perfect coherence regardless of how many regions (Row, Column, 3x3 Block) are completed by a single move.

### 1. Step-by-Step Logic
1.  **Identify**: Find all newly completed regions (Row, Col, Block) from the user's move.
2.  **Consolidate**: Build a flat set of all unique cells involved across all regions.
3.  **Calculate**: For each unique cell, calculate its Manhattan distance from the "Move Cell":
    `Distance = |moveRow - cellRow| + |moveCol - cellCol|`
4.  **Map Delays**: Generate a `delays` map where each cell has:
    `Delay = Distance * STAGGER_AMOUNT` (e.g., 30ms).
5.  **Prioritize Type**:
    - If any region is a **3x3 Block**, use a 3D **rotateY** ("Blade Flip") for the entire set.
    - If only **Rows/Columns** are completed, use the same "Blade Flip" for a unified sweep.
6.  **Trigger**: Fire a single `setAnimationState` call with the consolidated `delays` and `animationType`.

---

## Phased Roadmap

### Phase 1: Unified Region Completion (Blade Flip + Unified Wave)
- **Cell**: Add `blade-flip` type and `rotateY` 3D transform using native drivers.
- **Board**: Implement the `getUnifiedWaveDelays` helper and update `handleCellChange`.

### Phase 2: Game Victory (Orbiting Trophy + Message)
- **Component**: `Victory3D.tsx` (Three.js/Fiber).
- **Effect**: 3D trophy model orbiting or rotating with celebratory overlay text.

### Phase 3: Game Failure (The Sink + Message)
- **Animation**: Board vibrates (X-axis) then "Sinks" (scale + perspective) away from the user.
- **Overlay**: Center-aligned "Keep it up!" message.

---

## Timing Constants
- `BLADE_FLIP_DURATION`: 500ms
- `STAGGER_AMOUNT`: 30ms
