/** Generate a short unique identifier. */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
