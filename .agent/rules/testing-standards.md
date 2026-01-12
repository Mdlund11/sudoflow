---
trigger: always_on
---

# React Native Testing Standards

- **Unit Tests:** Use `jest` and `@testing-library/react-native`.
- **Mocks:** Use the standard project mocks found in `__mocks__/`. 
- **Component Tests:** Ensure all UI interactions (onPress, onChangeText) are covered.
- **Execution:** Always use the `--ci` or `--watchAll=false` flag when running tests in the terminal to avoid hanging processes.