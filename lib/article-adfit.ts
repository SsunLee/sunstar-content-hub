export function getArticleAdFitSectionIndexes(sectionCount: number) {
  const lastInlineIndex = Math.max(0, sectionCount - 2);
  const first = Math.min(
    lastInlineIndex,
    Math.max(0, Math.ceil(sectionCount / 3) - 1),
  );
  const second = Math.min(
    lastInlineIndex,
    Math.max(first + 1, Math.ceil((sectionCount * 2) / 3) - 1),
  );

  return { first, second } as const;
}
