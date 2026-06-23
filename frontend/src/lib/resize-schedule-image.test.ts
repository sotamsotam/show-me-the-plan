import { describe, expect, it } from 'vitest';

import {
  buildResizedAttachmentFileName,
  computeResizedDimensions,
  SCHEDULE_ATTACHMENT_MAX_WIDTH,
  validateScheduleAttachmentInputFile,
} from './resize-schedule-image';

describe('resize-schedule-image', () => {
  describe('computeResizedDimensions', () => {
    it('keeps dimensions when width is within the max', () => {
      expect(computeResizedDimensions(1200, 800)).toEqual({
        width: 1200,
        height: 800,
      });
    });

    it('scales width down to the max while preserving aspect ratio', () => {
      expect(computeResizedDimensions(2800, 2100, SCHEDULE_ATTACHMENT_MAX_WIDTH)).toEqual({
        width: 1400,
        height: 1050,
      });
    });

    it('rounds height to the nearest integer', () => {
      expect(computeResizedDimensions(3000, 4000, SCHEDULE_ATTACHMENT_MAX_WIDTH)).toEqual({
        width: 1400,
        height: 1867,
      });
    });
  });

  describe('buildResizedAttachmentFileName', () => {
    it('replaces the extension based on output mime', () => {
      expect(buildResizedAttachmentFileName('scan.PNG', 'image/jpeg')).toBe('scan.jpg');
      expect(buildResizedAttachmentFileName('scan.PNG', 'image/webp')).toBe('scan.webp');
      expect(buildResizedAttachmentFileName('scan.PNG', 'image/png')).toBe('scan.png');
    });
  });

  describe('validateScheduleAttachmentInputFile', () => {
    it('rejects unsupported mime types', () => {
      expect(
        validateScheduleAttachmentInputFile({
          type: 'application/pdf',
          size: 1000,
        } as File)
      ).toContain('이미지만');
    });

    it('enforces the final 5MB limit for GIF files', () => {
      expect(
        validateScheduleAttachmentInputFile({
          type: 'image/gif',
          size: 6 * 1024 * 1024,
        } as File)
      ).toContain('5MB');
    });

    it('allows larger originals for photos that will be resized client-side', () => {
      expect(
        validateScheduleAttachmentInputFile({
          type: 'image/jpeg',
          size: 12 * 1024 * 1024,
        } as File)
      ).toBeNull();
    });
  });
});
