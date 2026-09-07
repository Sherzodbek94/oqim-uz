import { HttpError, isAllowedOrigin } from './http';

export interface MailEnv { RESEND_API_KEY?: string; MAIL_FROM?: string; PUBLIC_APP_URL?: string; }
export function mailConfig(env: MailEnv): {key: string; from: string; origin: string} {
  let url: URL | null = null;
  try { url = env.PUBLIC_APP_URL ? new URL(env.PUBLIC_APP_URL) : null; } catch { /* invalid configuration */ }
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !url || url.protocol !== 'https:' || !isAllowedOrigin(url.origin))
    throw new HttpError(503, 'Email xizmati hali sozlanmagan. Keyinroq urinib ko‘ring.');
  return {key: env.RESEND_API_KEY, from: env.MAIL_FROM, origin: url.origin};
}

/** Only a configured, trusted origin can appear in account links. */
export async function sendAccountLink(env: MailEnv, email: string, token: string, purpose: 'verify' | 'reset'): Promise<void> {
  const config = mailConfig(env);
  const fragment = new URLSearchParams({action: purpose, email, token});
  const url = `${config.origin}/hisob#${fragment}`;
  const subject = purpose === 'reset' ? 'OQIM — parolni tiklash' : 'OQIM — emailni tasdiqlash';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(10_000),
    headers: {Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({from: config.from, to: [email], subject,
      text: `${subject}\n\n${url}\n\nHavola bir marta ishlaydi. Amal qilish muddati: ${purpose === 'reset' ? '15 daqiqa' : '24 soat'}.\nBu amalni so‘ramagan bo‘lsangiz, xatni e’tiborsiz qoldiring.`}),
  });
  if (!response.ok) throw new Error('Account email delivery failed');
}
