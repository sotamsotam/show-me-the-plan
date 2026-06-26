export function maskEmailHint(email: string): string {
  const normalized = email.trim();
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return '***@***';
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const visibleLength = Math.min(3, localPart.length);
  const visible = localPart.slice(0, visibleLength);
  const maskedLength = localPart.length - visibleLength;
  const masked = maskedLength > 0 ? '*'.repeat(maskedLength) : '';

  return `${visible}${masked}@${domain}`;
}
