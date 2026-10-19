export function resetLinkEmail(resetUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  const safeUrl = resetUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return {
    subject: 'Reset your HabitTracker password',
    text: `Use this link to reset your password. It expires in one hour.\n\n${resetUrl}`,
    html: `<p>Use this link to reset your HabitTracker password. It expires in one hour.</p><p><a href="${safeUrl}">Reset password</a></p>`,
  };
}
