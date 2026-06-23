import type { EventInput } from '@fullcalendar/core';
import { describe, expect, it } from 'vitest';

import {
  readEventAttachments,
  resolveScheduleAttachmentUrl,
  validateScheduleAttachmentFile,
} from './schedule-attachment';

describe('schedule-attachment', () => {
  it('resolves relative Strapi upload URLs with default localhost fallback', () => {
    const previousUpload = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL;
    const previousStrapi = process.env.NEXT_PUBLIC_STRAPI_URL;
    delete process.env.NEXT_PUBLIC_UPLOAD_BASE_URL;
    process.env.NEXT_PUBLIC_STRAPI_URL = 'http://localhost:1337';

    expect(resolveScheduleAttachmentUrl('/uploads/test.jpg')).toBe(
      'http://localhost:1337/uploads/test.jpg'
    );
    expect(resolveScheduleAttachmentUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png'
    );

    process.env.NEXT_PUBLIC_UPLOAD_BASE_URL = previousUpload;
    process.env.NEXT_PUBLIC_STRAPI_URL = previousStrapi;
  });

  it('prefers NEXT_PUBLIC_UPLOAD_BASE_URL for relative upload paths', () => {
    const previous = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL;
    process.env.NEXT_PUBLIC_UPLOAD_BASE_URL = 'https://cdn.example.com';

    expect(resolveScheduleAttachmentUrl('/uploads/test.jpg')).toBe(
      'https://cdn.example.com/uploads/test.jpg'
    );

    process.env.NEXT_PUBLIC_UPLOAD_BASE_URL = previous;
  });

  it('reads attachments from calendar event extendedProps', () => {
    const event: EventInput = {
      id: 'user-1-2026-06-12',
      title: '수행평가',
      extendedProps: {
        attachments: [
          {
            id: 3,
            url: '/uploads/perf.jpg',
            name: 'perf.jpg',
            mime: 'image/jpeg',
            size: 1200,
            width: 800,
            height: 600,
          },
        ],
      },
    };

    expect(readEventAttachments(event)).toEqual([
      {
        id: 3,
        url: '/uploads/perf.jpg',
        name: 'perf.jpg',
        mime: 'image/jpeg',
        size: 1200,
        width: 800,
        height: 600,
      },
    ]);
  });

  it('reads multiple attachments from calendar event extendedProps', () => {
    const event: EventInput = {
      id: 'user-1-2026-06-12',
      title: '수행평가',
      extendedProps: {
        attachments: [
          {
            id: 3,
            url: '/uploads/perf-1.jpg',
            name: 'perf-1.jpg',
            mime: 'image/jpeg',
            size: 1200,
            width: 800,
            height: 600,
          },
          {
            id: 4,
            url: '/uploads/perf-2.jpg',
            name: 'perf-2.jpg',
            mime: 'image/jpeg',
            size: 900,
            width: 640,
            height: 480,
          },
        ],
      },
    };

    expect(readEventAttachments(event)).toHaveLength(2);
    expect(readEventAttachments(event)[1]?.id).toBe(4);
  });

  it('validates client-side file constraints', () => {
    expect(
      validateScheduleAttachmentFile({
        type: 'application/pdf',
        size: 1000,
      } as File)
    ).toContain('이미지만');

    expect(
      validateScheduleAttachmentFile({
        type: 'image/jpeg',
        size: 6 * 1024 * 1024,
      } as File)
    ).toContain('5MB');
  });
});
