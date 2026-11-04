/** Keep the brand once across document titles and social metadata. */
export function withBrand(title: string): string {
  return /russia\.md/i.test(title) ? title : `${title} | Russia.md`;
}
