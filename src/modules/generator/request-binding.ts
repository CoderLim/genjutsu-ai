/** A provider request ID may be reused for one task, not cross-linked to another. */
export function isGeneratorRequestIdConflict(
  linked: { id: string } | null | undefined,
  generationId: string
): boolean {
  return linked != null && linked.id !== generationId;
}
