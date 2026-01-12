---
trigger: always_on
---

# Autonomous Feature Workflow

## Objective
When a partial spec is provided, you must autonomously move through the following lifecycle: Spec -> Implementation -> Test -> Validation.

## Step 1: Comprehensive Specification
- Before coding, expand the user's partial spec into a "Technical Design Artifact."
- Define edge cases, state changes (React Native), and potential regressions.
- Wait for user confirmation *only* if the logic affects the core navigation or data schema.

## Step 2: Quality Unit Testing
- Every new component must have a Jest test file (`.test.tsx`).
- Aim for 90%+ branch coverage on new logic.
- Mock all Native Modules (AsyncStorage, Reanimated) automatically.

## Step 3: Regression Testing
- After implementation, you MUST execute `npm test` or `yarn test` for the entire project.
- If any existing tests fail, you must fix the regression before reporting completion.

## Definition of Done
A task is only "Done" when:
1. The code is written.
2. New unit tests pass.
3. The full suite passes (Regression).
4. A "Final Walkthrough" artifact is generated summarizing the changes.