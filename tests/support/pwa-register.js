// Vitest resolves the build-only virtual module here; individual tests mock it.
export function useRegisterSW() {
  throw new Error('Mock the PWA registration in component tests.');
}
