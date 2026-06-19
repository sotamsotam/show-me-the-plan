import fs from 'fs';
import nodemailer from 'nodemailer';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const transport = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: env.BREVO_SMTP_USER,
    pass: env.BREVO_SMTP_KEY,
  },
});

const to = env.EMAIL_DEFAULT_FROM;
const from = `${env.EMAIL_DEFAULT_NAME} <${env.EMAIL_DEFAULT_FROM}>`;

try {
  const info = await transport.sendMail({
    from,
    to,
    subject: 'Routine Maker SMTP test',
    text: 'If you receive this, Brevo SMTP works.',
  });
  console.log('SEND_OK', info.messageId);
} catch (error) {
  console.error('SEND_FAIL', error instanceof Error ? error.message : error);
  process.exit(1);
}
