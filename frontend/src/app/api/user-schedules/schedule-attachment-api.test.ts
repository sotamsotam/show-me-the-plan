import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';
import { POST as uploadPost } from './attachments/upload/route';

vi.mock('@/lib/auth', () => ({
  getServerStrapiJwt: vi.fn(),
}));

vi.mock('@/lib/strapi', () => ({
  strapiFetch: vi.fn(),
}));

const { getServerStrapiJwt } = await import('@/lib/auth');
const { strapiFetch } = await import('@/lib/strapi');

const SAMPLE_ATTACHMENT = {
  id: 42,
  url: '/uploads/perf.jpg',
  name: 'perf.jpg',
  mime: 'image/jpeg',
  size: 2048,
  width: 1200,
  height: 1600,
};

describe('user-schedules attachment API integration', () => {
  beforeEach(() => {
    vi.mocked(getServerStrapiJwt).mockReset();
    vi.mocked(strapiFetch).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET forwards backend events with attachments into calendar extendedProps', async () => {
    vi.mocked(getServerStrapiJwt).mockResolvedValue('jwt-token');
    vi.mocked(strapiFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          schedules: [
            {
              id: 7,
              title: '수행평가',
              attachments: [SAMPLE_ATTACHMENT],
            },
          ],
          events: [
            {
              id: 'user-7-2026-06-12',
              scheduleId: 7,
              title: '수행평가',
              start: '2026-06-12',
              allDay: true,
              date: '2026-06-12',
              recurrenceType: 'once',
              scheduleCategory: 'other',
              hasOverride: false,
              attachments: [SAMPLE_ATTACHMENT],
            },
          ],
        }),
        { status: 200 }
      )
    );

    const request = new NextRequest(
      'http://localhost:3000/api/user-schedules?start=2026-06-01&end=2026-06-30'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.schedules[0]?.attachments).toEqual([SAMPLE_ATTACHMENT]);
    expect(data.events[0]?.extendedProps?.attachments).toEqual([SAMPLE_ATTACHMENT]);
    expect(strapiFetch).toHaveBeenCalledWith(
      '/api/user-schedules?start=2026-06-01&end=2026-06-30',
      expect.objectContaining({ jwt: 'jwt-token' })
    );
  });

  it('POST upload proxies multipart file to Strapi and returns attachment', async () => {
    vi.mocked(getServerStrapiJwt).mockResolvedValue('jwt-token');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ attachment: SAMPLE_ATTACHMENT }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const formData = new FormData();
    formData.append(
      'file',
      new File([new Uint8Array([1, 2, 3])], 'perf.jpg', { type: 'image/jpeg' })
    );

    const request = new NextRequest(
      'http://localhost:3000/api/user-schedules/attachments/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    const response = await uploadPost(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.attachment).toEqual(SAMPLE_ATTACHMENT);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:1337/api/user-schedules/attachments/upload');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer jwt-token',
    });
    expect(options.body).toBeInstanceOf(FormData);
  });

  it('POST upload returns 401 without jwt', async () => {
    vi.mocked(getServerStrapiJwt).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/user-schedules/attachments/upload',
      {
        method: 'POST',
        body: new FormData(),
      }
    );

    const response = await uploadPost(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('로그인이 필요합니다.');
  });

  it('POST upload returns 400 when file is missing', async () => {
    vi.mocked(getServerStrapiJwt).mockResolvedValue('jwt-token');

    const request = new NextRequest(
      'http://localhost:3000/api/user-schedules/attachments/upload',
      {
        method: 'POST',
        body: new FormData(),
      }
    );

    const response = await uploadPost(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('file이 필요합니다.');
  });
});
