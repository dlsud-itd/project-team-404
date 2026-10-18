export function parseBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}
