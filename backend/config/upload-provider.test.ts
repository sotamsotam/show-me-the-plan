import { describe, expect, it } from 'vitest';

import {
  buildUploadPluginConfig,
  resolveUploadProviderMode,
  resolveUploadPublicOrigins,
} from './upload-provider';

function createEnv(values: Record<string, string | boolean>) {
  return Object.assign(
    (key: string, defaultValue = '') => {
      const value = values[key];
      return value == null ? defaultValue : String(value);
    },
    {
      bool: (key: string, defaultValue = false) => {
        const value = values[key];
        if (typeof value === 'boolean') {
          return value;
        }

        if (value == null) {
          return defaultValue;
        }

        return String(value).toLowerCase() === 'true';
      },
    }
  );
}

describe('upload-provider', () => {
  it('defaults to local provider', () => {
    const env = createEnv({});

    expect(resolveUploadProviderMode(env)).toBe('local');
    expect(buildUploadPluginConfig(env)).toEqual({});
    expect(resolveUploadPublicOrigins(env)).toEqual([]);
  });

  it('accepts s3/r2 aliases for provider mode', () => {
    expect(resolveUploadProviderMode(createEnv({ UPLOAD_PROVIDER: 'r2' }))).toBe('s3');
    expect(resolveUploadProviderMode(createEnv({ UPLOAD_PROVIDER: 'aws-s3' }))).toBe('s3');
  });

  it('builds aws-s3 plugin config for R2-style env', () => {
    const env = createEnv({
      UPLOAD_PROVIDER: 'r2',
      UPLOAD_S3_BUCKET: 'routine-maker',
      UPLOAD_S3_ACCESS_KEY_ID: 'key',
      UPLOAD_S3_SECRET_ACCESS_KEY: 'secret',
      UPLOAD_S3_REGION: 'auto',
      UPLOAD_S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
      UPLOAD_S3_BASE_URL: 'https://cdn.example.com',
      UPLOAD_S3_ROOT_PATH: 'uploads',
    });

    expect(buildUploadPluginConfig(env)).toEqual({
      upload: {
        config: {
          provider: 'aws-s3',
          providerOptions: {
            baseUrl: 'https://cdn.example.com',
            rootPath: 'uploads',
            s3Options: {
              credentials: {
                accessKeyId: 'key',
                secretAccessKey: 'secret',
              },
              region: 'auto',
              endpoint: 'https://example.r2.cloudflarestorage.com',
              params: {
                Bucket: 'routine-maker',
              },
            },
          },
          actionOptions: {
            upload: {},
            uploadStream: {},
            delete: {},
          },
        },
      },
    });
    expect(resolveUploadPublicOrigins(env)).toEqual([
      'https://cdn.example.com',
      'cdn.example.com',
    ]);
  });

  it('throws when s3 provider env is incomplete', () => {
    const env = createEnv({
      UPLOAD_PROVIDER: 's3',
      UPLOAD_S3_BUCKET: 'routine-maker',
    });

    expect(() => buildUploadPluginConfig(env)).toThrow(/UPLOAD_S3_/);
  });
});
