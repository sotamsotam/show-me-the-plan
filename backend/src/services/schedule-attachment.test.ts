import { describe, expect, it } from 'vitest';

import {
  collectRemovedAttachmentIds,
  normalizeAttachmentIds,
  normalizeScheduleAttachments,
  SCHEDULE_ATTACHMENT_MAX_COUNT,
  validateScheduleAttachmentPolicy,
  validateUploadedFileMetadata,
} from './schedule-attachment';

describe('schedule-attachment', () => {
  describe('normalizeAttachmentIds', () => {
    it('accepts numbers, numeric strings, and populated objects', () => {
      expect(normalizeAttachmentIds([1, '2', { id: 3 }])).toEqual([1, 2, 3]);
      expect(normalizeAttachmentIds([1, 1, 2])).toEqual([1, 2]);
    });

    it('returns empty array for invalid input', () => {
      expect(normalizeAttachmentIds(null)).toEqual([]);
      expect(normalizeAttachmentIds([0, -1, 'x'])).toEqual([]);
    });
  });

  describe('normalizeScheduleAttachments', () => {
    it('serializes populated upload records', () => {
      expect(
        normalizeScheduleAttachments([
          {
            id: 10,
            url: '/uploads/test.jpg',
            name: 'test.jpg',
            mime: 'image/jpeg',
            size: 1200,
            width: 800,
            height: 600,
          },
        ])
      ).toEqual([
        {
          id: 10,
          url: '/uploads/test.jpg',
          name: 'test.jpg',
          mime: 'image/jpeg',
          size: 1200,
          width: 800,
          height: 600,
        },
      ]);
    });
  });

  describe('validateScheduleAttachmentPolicy', () => {
    it('allows attachments only on all-day schedules or performance assessments', () => {
      expect(
        validateScheduleAttachmentPolicy({ allDay: true, attachmentIds: [1] })
      ).toBeNull();
      expect(
        validateScheduleAttachmentPolicy({
          allDay: false,
          scheduleCategory: 'performance',
          attachmentIds: [1],
        })
      ).toBeNull();
      expect(
        validateScheduleAttachmentPolicy({ allDay: false, attachmentIds: [1] })
      ).toBe('첨부 이미지는 종일 일정 또는 수행평가에서만 사용할 수 있습니다.');
    });

    it('enforces max attachment count', () => {
      const tooMany = Array.from({ length: SCHEDULE_ATTACHMENT_MAX_COUNT + 1 }, (_, i) => i + 1);
      expect(
        validateScheduleAttachmentPolicy({ allDay: true, attachmentIds: tooMany })
      ).toContain('최대');
    });
  });

  describe('validateUploadedFileMetadata', () => {
    it('rejects unsupported mime types and oversized files', () => {
      expect(
        validateUploadedFileMetadata({
          mime: 'application/pdf',
          size: 1000,
        })
      ).toContain('이미지만');

      expect(
        validateUploadedFileMetadata({
          mime: 'image/jpeg',
          size: 6 * 1024 * 1024,
        })
      ).toContain('5MB');
    });
  });

  describe('collectRemovedAttachmentIds', () => {
    it('returns ids removed during update', () => {
      expect(
        collectRemovedAttachmentIds(
          [
            { id: 1, url: '/a', name: 'a', mime: 'image/jpeg', size: 1, width: null, height: null },
            { id: 2, url: '/b', name: 'b', mime: 'image/jpeg', size: 1, width: null, height: null },
          ],
          [2, 3]
        )
      ).toEqual([1]);
    });
  });
});
