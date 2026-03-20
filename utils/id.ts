/**
 * @boardier-module utils/id
 * @boardier-category Utilities
 * @boardier-description Unique ID generator for element IDs. Uses `Math.random().toString(36)` for fast, collision-resistant short IDs.
 * @boardier-since 0.1.0
 */
/** Generate a short unique identifier. */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
