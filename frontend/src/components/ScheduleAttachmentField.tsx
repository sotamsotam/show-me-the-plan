'use client';

import {
  resolveScheduleAttachmentUrl,
  SCHEDULE_ATTACHMENT_ACCEPT,
  SCHEDULE_ATTACHMENT_MAX_COUNT,
  validateScheduleAttachmentFile,
} from '@/lib/schedule-attachment';
import { prepareScheduleAttachmentFile } from '@/lib/resize-schedule-image';
import { ScheduleAttachmentCameraIcon, ScheduleAttachmentPickerIcon } from '@/components/ScheduleAttachmentBadgeIcon';
import type { ScheduleAttachment } from '@/lib/user-schedule';
import Image from 'next/image';
import { ChangeEvent, useRef, useState } from 'react';

export type PendingScheduleAttachment = {
  key: string;
  file: File;
  previewUrl: string;
};

export function createPendingScheduleAttachment(file: File): PendingScheduleAttachment {
  return {
    key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

interface ScheduleAttachmentFieldProps {
  attachments: ScheduleAttachment[];
  pendingAttachments: PendingScheduleAttachment[];
  onAddFile: (file: File) => void;
  onRemoveAttachment: (attachmentId: number) => void;
  onRemovePending: (key: string) => void;
  disabled?: boolean;
  /** 부모가 라벨을 표시할 때 내부 헤더 숨김 */
  hideHeader?: boolean;
}

const PICKER_BUTTON_CLASS =
  'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 transition-colors hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-700 disabled:opacity-50 dark:border-neutral-600 dark:text-gray-400 dark:hover:border-amber-500 dark:hover:bg-amber-950/20 dark:hover:text-amber-300';

const ADD_MORE_BUTTON_CLASS =
  'flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-4 text-xs text-gray-500 transition-colors hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-700 disabled:opacity-50 dark:border-neutral-600 dark:text-gray-400 dark:hover:border-amber-500 dark:hover:bg-amber-950/20 dark:hover:text-amber-300';

export default function ScheduleAttachmentField({
  attachments,
  pendingAttachments,
  onAddFile,
  onRemoveAttachment,
  onRemovePending,
  disabled = false,
  hideHeader = false,
}: ScheduleAttachmentFieldProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState('');
  const [processing, setProcessing] = useState(false);

  const totalCount = attachments.length + pendingAttachments.length;
  const canAddMore = totalCount < SCHEDULE_ATTACHMENT_MAX_COUNT;
  const inputsDisabled = disabled || processing || !canAddMore;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = SCHEDULE_ATTACHMENT_MAX_COUNT - totalCount;
    if (remainingSlots <= 0) {
      setLocalError(`첨부 이미지는 최대 ${SCHEDULE_ATTACHMENT_MAX_COUNT}장까지 등록할 수 있습니다.`);
      return;
    }

    const filesToProcess = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      setLocalError(
        `최대 ${SCHEDULE_ATTACHMENT_MAX_COUNT}장까지 등록할 수 있어 ${remainingSlots}장만 추가했습니다.`
      );
    } else {
      setLocalError('');
    }

    setProcessing(true);

    try {
      for (const file of filesToProcess) {
        const preparedFile = await prepareScheduleAttachmentFile(file);
        const validationError = validateScheduleAttachmentFile(preparedFile);
        if (validationError) {
          setLocalError(validationError);
          continue;
        }

        onAddFile(preparedFile);
      }
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : '이미지 처리에 실패했습니다.'
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-2">
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            첨부 이미지(수행평가 기준 프린트물 등)
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            최대 {SCHEDULE_ATTACHMENT_MAX_COUNT}장 · 자동 최적화 · 장당 5MB
          </span>
        </div>
      ) : null}

      {totalCount > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attachments.map((attachment) => (
            <AttachmentPreviewCard
              key={`saved-${attachment.id}`}
              previewUrl={resolveScheduleAttachmentUrl(attachment.url)}
              label={attachment.name}
              disabled={disabled || processing}
              onRemove={() => onRemoveAttachment(attachment.id)}
            />
          ))}

          {pendingAttachments.map((pending) => (
            <AttachmentPreviewCard
              key={pending.key}
              previewUrl={pending.previewUrl}
              label={pending.file.name}
              disabled={disabled || processing}
              onRemove={() => onRemovePending(pending.key)}
            />
          ))}

          {canAddMore ? (
            <>
              <button
                type="button"
                disabled={inputsDisabled}
                onClick={() => galleryInputRef.current?.click()}
                className={ADD_MORE_BUTTON_CLASS}
              >
                <span>{processing ? '최적화 중…' : '갤러리'}</span>
              </button>
              <button
                type="button"
                disabled={inputsDisabled}
                onClick={() => cameraInputRef.current?.click()}
                className={ADD_MORE_BUTTON_CLASS}
              >
                <span>{processing ? '최적화 중…' : '촬영'}</span>
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={inputsDisabled}
            onClick={() => galleryInputRef.current?.click()}
            className={PICKER_BUTTON_CLASS}
          >
            <ScheduleAttachmentPickerIcon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            <span>{processing ? '이미지 최적화 중…' : '갤러리에서 선택'}</span>
          </button>
          <button
            type="button"
            disabled={inputsDisabled}
            onClick={() => cameraInputRef.current?.click()}
            className={PICKER_BUTTON_CLASS}
          >
            <ScheduleAttachmentCameraIcon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            <span>{processing ? '이미지 최적화 중…' : '사진 촬영'}</span>
          </button>
        </div>
      )}

      {/* 카메라: capture로 촬영 앱 우선 호출 (한 장씩) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={SCHEDULE_ATTACHMENT_ACCEPT}
        capture="environment"
        className="hidden"
        disabled={inputsDisabled}
        onChange={handleFileChange}
      />

      {/* 갤러리/앨범: capture 없이 다중 선택 */}
      <input
        ref={galleryInputRef}
        type="file"
        accept={SCHEDULE_ATTACHMENT_ACCEPT}
        multiple
        className="hidden"
        disabled={inputsDisabled}
        onChange={handleFileChange}
      />

      {localError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{localError}</p>
      ) : null}
    </div>
  );
}

function AttachmentPreviewCard({
  previewUrl,
  label,
  disabled,
  onRemove,
}: {
  previewUrl: string;
  label: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-neutral-700">
      <div className="relative aspect-[4/3] w-full bg-gray-50 dark:bg-zinc-800">
        <Image
          src={previewUrl}
          alt={label || '첨부 이미지 미리보기'}
          fill
          unoptimized
          className="object-contain"
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-2 py-1.5 dark:border-neutral-700">
        <p className="min-w-0 truncate text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="shrink-0 text-[11px] font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
