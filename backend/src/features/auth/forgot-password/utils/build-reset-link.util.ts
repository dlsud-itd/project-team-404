export function buildResetLink(webBaseUrl: string, token: string): string {
  const resetUrl = new URL('/reset-password', webBaseUrl);
  resetUrl.searchParams.set('token', token);
  return resetUrl.toString();
}
