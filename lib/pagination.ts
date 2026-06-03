export function getPaginationRange(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page++) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "...")[] = [];

  for (let index = 0; index < sorted.length; index++) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
      result.push("...");
    }
    result.push(sorted[index]);
  }

  return result;
}
