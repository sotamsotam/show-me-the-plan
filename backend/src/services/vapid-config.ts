export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function requireVapidConfig(): VapidConfig {
  const config = getVapidConfig();

  if (!config) {
    throw new Error(
      'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT 환경 변수가 필요합니다.'
    );
  }

  return config;
}
