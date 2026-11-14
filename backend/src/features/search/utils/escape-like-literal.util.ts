export function escapeLikeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
