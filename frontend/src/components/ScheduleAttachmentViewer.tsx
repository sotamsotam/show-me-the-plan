'use client';

import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import ScheduleAttachmentBadgeIcon from '@/components/ScheduleAttachmentBadgeIcon';
import {
  readEventAttachments,
  resolveScheduleAttachmentUrl,
} from '@/lib/schedule-attachment';
import type { ScheduleAttachment } from '@/lib/user-schedule';
import type { EventInput } from '@fullcalendar/core';
import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from 'react';

export type ScheduleAttachmentViewerVariant = 'badge' | 'calendar';

export type ScheduleAttachmentCalendarTriggerMode = 'full' | 'icon' | 'stacked';

interface ScheduleAttachmentViewerProps {
  event: EventInput;
  title: string;
  variant?: ScheduleAttachmentViewerVariant;
  className?: string;
  badgeClassName?: string;
  calendarInnerClassName?: string;
  calendarTriggerMode?: ScheduleAttachmentCalendarTriggerMode;
}

export default function ScheduleAttachmentViewer({
  event,
  title,
  variant = 'badge',
  className = '',
  badgeClassName = '',
  calendarInnerClassName = '',
  calendarTriggerMode = 'full',
}: ScheduleAttachmentViewerProps) {
  const popoverId = useId();
  const attachmentsKey = JSON.stringify(
    (event.extendedProps as Record<string, unknown> | undefined)?.attachments ?? []
  );
  const attachments = useMemo(
    () => readEventAttachments(event),
    [event.id, attachmentsKey]
  );
  const hasAttachments = attachments.length > 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const resolvedIndex =
    activeIndex >= 0 && activeIndex < attachments.length ? activeIndex : 0;
  const activeAttachment = attachments[resolvedIndex] ?? attachments[0] ?? null;
  const attachmentCountLabel = `${resolvedIndex + 1} / ${attachments.length}`;

  useEffect(() => {
    if (!modalOpen || attachments.length <= 1) {
      return;
    }

    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'ArrowLeft') {
        keyboardEvent.preventDefault();
        setActiveIndex((current) => (current > 0 ? current - 1 : attachments.length - 1));
      }

      if (keyboardEvent.key === 'ArrowRight') {
        keyboardEvent.preventDefault();
        setActiveIndex((current) => (current < attachments.length - 1 ? current + 1 : 0));
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [attachments.length, modalOpen]);

  function openModal(event?: MouseEvent) {
    event?.stopPropagation();
    event?.preventDefault();

    if (!hasAttachments) {
      return;
    }

    setActiveIndex(0);
    setModalOpen(true);
  }

  function showPreviousAttachment() {
    setActiveIndex((current) => (current > 0 ? current - 1 : attachments.length - 1));
  }

  function showNextAttachment() {
    setActiveIndex((current) => (current < attachments.length - 1 ? current + 1 : 0));
  }

  const attachmentModal = (
    <ResponsiveOverlay
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title={title}
      mobileVariant="sheet"
      contentClassName="schedule-attachment-overlay"
    >
      {activeAttachment ? (
        <ScheduleAttachmentGallery
          attachments={attachments}
          activeIndex={resolvedIndex}
          activeAttachment={activeAttachment}
          attachmentCountLabel={attachmentCountLabel}
          onSelectIndex={setActiveIndex}
          onPrevious={showPreviousAttachment}
          onNext={showNextAttachment}
        />
      ) : null}
    </ResponsiveOverlay>
  );

  const attachmentPopover =
    hasAttachments && activeAttachment ? (
      <div
        id={popoverId}
        role="tooltip"
        className="day-slot-allday-attachment-popover"
      >
        <Image
          src={resolveScheduleAttachmentUrl(activeAttachment.url)}
          alt={activeAttachment.name || title}
          width={activeAttachment.width ?? 320}
          height={activeAttachment.height ?? 240}
          unoptimized
          className="day-slot-allday-attachment-popover-image"
        />
        {attachments.length > 1 ? (
          <p className="day-slot-allday-attachment-popover-count">
            첨부 {attachments.length}장
          </p>
        ) : null}
      </div>
    ) : null;

  const attachmentIcon = hasAttachments ? (
    <ScheduleAttachmentBadgeIcon
      count={attachments.length}
      compact={calendarTriggerMode === 'icon' || calendarTriggerMode === 'stacked'}
      className="cal-allday-attachment-icon"
    />
  ) : null;

  if (variant === 'calendar') {
    const innerClassName = [
      'cal-event-inner',
      'cal-event-inner--allday',
      'cal-event-inner--allday-attachment',
      calendarInnerClassName,
    ]
      .filter(Boolean)
      .join(' ');

    if (
      (calendarTriggerMode === 'icon' || calendarTriggerMode === 'stacked') &&
      hasAttachments
    ) {
      const triggerClassName = [
        'cal-allday-attachment-trigger',
        calendarTriggerMode === 'stacked'
          ? 'cal-allday-attachment-trigger--stacked'
          : 'cal-allday-attachment-trigger--icon-only',
      ].join(' ');

      return (
        <>
          <div className={innerClassName}>
            <div className={triggerClassName}>
              <button
                type="button"
                className="cal-allday-attachment-icon-button"
                title={`${title} · 첨부 이미지 ${attachments.length}장 보기`}
                aria-label={`${title} 첨부 이미지 ${attachments.length}장 보기`}
                aria-haspopup="dialog"
                onClick={openModal}
              >
                {attachmentIcon}
              </button>
              <span className="cal-event-title">{title}</span>
            </div>
          </div>
          {attachmentModal}
        </>
      );
    }

    return (
      <>
        <div className={innerClassName}>
          <button
            type="button"
            className={`cal-allday-attachment-trigger${hasAttachments ? ' cal-allday-attachment-trigger--has-file' : ''}`}
            title={
              hasAttachments
                ? `${title} · 첨부 이미지 ${attachments.length}장 보기`
                : title
            }
            aria-haspopup={hasAttachments ? 'dialog' : undefined}
            aria-controls={hasAttachments ? popoverId : undefined}
            onClick={openModal}
          >
            {attachmentIcon}
            <span className="cal-event-title">{title}</span>
          </button>
          {attachmentPopover}
        </div>
        {attachmentModal}
      </>
    );
  }

  return (
    <>
      <span className="relative inline-flex max-w-full">
        <button
          type="button"
          className={`day-slot-allday-badge day-slot-allday-badge-button${hasAttachments ? ' day-slot-allday-badge-has-attachment' : ''} ${badgeClassName} ${className}`.trim()}
          title={
            hasAttachments
              ? `${title} · 첨부 이미지 ${attachments.length}장 보기`
              : title
          }
          aria-haspopup={hasAttachments ? 'dialog' : undefined}
          aria-controls={hasAttachments ? popoverId : undefined}
          onClick={openModal}
        >
          {hasAttachments ? (
            <ScheduleAttachmentBadgeIcon
              count={attachments.length}
              className="day-slot-allday-attachment-icon"
            />
          ) : null}
          <span className="day-slot-allday-badge-label">{title}</span>
        </button>
        {attachmentPopover}
      </span>
      {attachmentModal}
    </>
  );
}

function ScheduleAttachmentGallery({
  attachments,
  activeIndex,
  activeAttachment,
  attachmentCountLabel,
  onSelectIndex,
  onPrevious,
  onNext,
}: {
  attachments: ScheduleAttachment[];
  activeIndex: number;
  activeAttachment: ScheduleAttachment;
  attachmentCountLabel: string;
  onSelectIndex: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const hasMultiple = attachments.length > 1;
  const imageUrl = resolveScheduleAttachmentUrl(activeAttachment.url);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeAttachment.id]);

  function handlePreviousClick(clickEvent: MouseEvent<HTMLButtonElement>) {
    clickEvent.stopPropagation();
    onPrevious();
  }

  function handleNextClick(clickEvent: MouseEvent<HTMLButtonElement>) {
    clickEvent.stopPropagation();
    onNext();
  }

  return (
    <div className="schedule-attachment-gallery">
      <div className="schedule-attachment-gallery__frame">
        <div ref={scrollRef} className="schedule-attachment-gallery__scroll">
          <div className="schedule-attachment-gallery__stage">
            <img
              key={activeAttachment.id}
              src={imageUrl}
              alt={activeAttachment.name || '첨부 이미지'}
              className="schedule-attachment-gallery__image"
            />
          </div>
        </div>

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={handlePreviousClick}
              className="schedule-attachment-gallery__nav schedule-attachment-gallery__nav--prev"
              aria-label="이전 이미지"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextClick}
              className="schedule-attachment-gallery__nav schedule-attachment-gallery__nav--next"
              aria-label="다음 이미지"
            >
              ›
            </button>
            <span className="schedule-attachment-gallery__counter">{attachmentCountLabel}</span>
          </>
        ) : null}
      </div>

      <div className="schedule-attachment-gallery__footer">
        <p className="schedule-attachment-gallery__filename">{activeAttachment.name}</p>
        {hasMultiple ? (
          <div className="schedule-attachment-gallery__thumbs">
            {attachments.map((attachment, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onSelectIndex(index);
                  }}
                  className={`schedule-attachment-gallery__thumb${
                    isActive ? ' schedule-attachment-gallery__thumb--active' : ''
                  }`}
                  aria-label={`${index + 1}번째 이미지 보기`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <Image
                    src={resolveScheduleAttachmentUrl(attachment.url)}
                    alt={attachment.name || `첨부 이미지 ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
