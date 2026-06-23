import { resolveUploadPublicOrigins, resolveUploadProviderMode } from './upload-provider';

export default ({ env }) => {
  const uploadOrigins = resolveUploadPublicOrigins(env);
  const useExternalUpload = resolveUploadProviderMode(env) === 's3';

  const securityMiddleware =
    useExternalUpload && uploadOrigins.length > 0
      ? {
          name: 'strapi::security',
          config: {
            contentSecurityPolicy: {
              useDefaults: true,
              directives: {
                'connect-src': ["'self'", 'https:'],
                'img-src': ["'self'", 'data:', 'blob:', ...uploadOrigins],
                'media-src': ["'self'", 'data:', 'blob:', ...uploadOrigins],
                upgradeInsecureRequests: null,
              },
            },
          },
        }
      : 'strapi::security';

  return [
    'strapi::logger',
    'strapi::errors',
    securityMiddleware,
    {
      name: 'strapi::cors',
      config: {
        origin: env.array('CORS_ORIGIN', ['http://localhost:3000', 'http://localhost']),
        credentials: true,
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};
