export default ({ env }) => {
  const defaultFromEmail = env('EMAIL_DEFAULT_FROM');
  const defaultFromName = env('EMAIL_DEFAULT_NAME', 'Show Me The Plan');
  const defaultFrom =
    defaultFromEmail && defaultFromName
      ? `${defaultFromName} <${defaultFromEmail}>`
      : defaultFromEmail;

  return {
    email: {
      config: {
        provider: 'nodemailer',
        providerOptions: {
          host: env('SMTP_HOST', 'smtp-relay.brevo.com'),
          port: env.int('SMTP_PORT', 587),
          secure: env.bool('SMTP_SECURE', false),
          auth: {
            user: env('BREVO_SMTP_USER'),
            pass: env('BREVO_SMTP_KEY'),
          },
        },
        settings: {
          defaultFrom,
          defaultReplyTo: defaultFromEmail,
        },
      },
    },
  };
};
