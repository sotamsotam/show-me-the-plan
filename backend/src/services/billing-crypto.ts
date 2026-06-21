import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer | null {
  const secret = process.env.BILLING_ENCRYPTION_KEY?.trim();

  if (!secret) {
    return null;
  }

  return createHash('sha256').update(secret).digest();
}

export function encryptBillingSecret(value: string): string {
  const key = getEncryptionKey();

  if (!key) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ['enc', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(
    ':'
  );
}

export function decryptBillingSecret(value: string): string {
  if (!value.startsWith('enc:')) {
    return value;
  }

  const key = getEncryptionKey();

  if (!key) {
    throw new Error('BILLING_ENCRYPTION_KEY is required to decrypt billing secrets.');
  }

  const [, ivBase64, tagBase64, payloadBase64] = value.split(':');

  if (!ivBase64 || !tagBase64 || !payloadBase64) {
    throw new Error('Invalid encrypted billing secret format.');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivBase64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
