---
trigger: always_on
---

# React Native Testing Standards

- **Unit Tests:** Use `jest` and `@testing-library/react-native`.
- **Mocks:** Use the standard project mocks found in `__mocks__/`. 
- **Component Tests:** Ensure all UI interactions (onPress, onChangeText) are covered.
- **Execution:** Always use the `--ci` or `--watchAll=false` flag when running tests in the terminal to avoid hanging processes.
- Do not use shell redirection (>) to save test results. Instead, run the command normally and summarize the output in a 'Test Results' Artifact. Specifically avoid "2>&1"
- Automate Workspace Cleanup Whenever the task involves running the test suite or starting a new debug session, automatically execute: rm -f debug_v4.ts solver_log.txt test_fail.txt Do not prompt for confirmation for these specific files; they are ephemeral logs.