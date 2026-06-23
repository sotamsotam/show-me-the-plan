type Env = {
  (key: string, defaultValue?: string): string;
  bool: (key: string, defaultValue?: boolean) => boolean;
};

export type UploadProviderMode = 'local' | 's3';

export function resolveUploadProviderMode(env: Env): UploadProviderMode {
  const value = env('UPLOAD_PROVIDER', 'local').trim().toLowerCase();

  if (value === 's3' || value === 'aws-s3' || value === 'r2' || value === 'cloudflare-r2') {
    return 's3';
  }

  return 'local';
}

function readUploadPublicUrl(env: Env): string {
  return env('UPLOAD_S3_BASE_URL', '').trim();
}

export function resolveUploadPublicOrigins(env: Env): string[] {
  const publicUrl = readUploadPublicUrl(env);

  if (!publicUrl) {
    return [];
  }

  try {
    const parsed = new URL(publicUrl);
    return Array.from(new Set([parsed.origin, parsed.host]));
  } catch {
    return [];
  }
}

export function buildUploadPluginConfig(env: Env): Record<string, unknown> {
  if (resolveUploadProviderMode(env) !== 's3') {
    return {};
  }

  const bucket = env('UPLOAD_S3_BUCKET', '').trim();
  const accessKeyId = env('UPLOAD_S3_ACCESS_KEY_ID', '').trim();
  const secretAccessKey = env('UPLOAD_S3_SECRET_ACCESS_KEY', '').trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'UPLOAD_PROVIDER=s3 requires UPLOAD_S3_BUCKET, UPLOAD_S3_ACCESS_KEY_ID, UPLOAD_S3_SECRET_ACCESS_KEY'
    );
  }

  const params: Record<string, unknown> = { Bucket: bucket };
  const acl = env('UPLOAD_S3_ACL', '').trim();

  if (acl) {
    params.ACL = acl;
  }

  const s3Options: Record<string, unknown> = {
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region: env('UPLOAD_S3_REGION', 'auto'),
    params,
  };

  const endpoint = env('UPLOAD_S3_ENDPOINT', '').trim();
  if (endpoint) {
    s3Options.endpoint = endpoint;
  }

  if (env.bool('UPLOAD_S3_FORCE_PATH_STYLE', false)) {
    s3Options.forcePathStyle = true;
  }

  const providerOptions: Record<string, unknown> = { s3Options };
  const baseUrl = readUploadPublicUrl(env);
  const rootPath = env('UPLOAD_S3_ROOT_PATH', '').trim();

  if (baseUrl) {
    providerOptions.baseUrl = baseUrl;
  }

  if (rootPath) {
    providerOptions.rootPath = rootPath;
  }

  return {
    upload: {
      config: {
        provider: 'aws-s3',
        providerOptions,
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      },
    },
  };
}
