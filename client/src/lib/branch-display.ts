/** Presentation-only labels. Never use these values as branch identifiers. */
export function displayBranchName(branchId: string): string {
  return branchId === "T.GLLEN" ? "T.Gllen" : branchId;
}
