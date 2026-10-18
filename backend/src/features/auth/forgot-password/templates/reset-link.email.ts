export function resetLinkEmail(resetUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  return {
    subject: 'Reset your password',
    text: `Use this link to reset your password. It expires in one hour: ${resetUrl}`,
    html: `<p>Use this link to reset your password. It expires in one hour:</p><p><a href="${resetUrl}">Reset password</a></p>`,
  };
}
