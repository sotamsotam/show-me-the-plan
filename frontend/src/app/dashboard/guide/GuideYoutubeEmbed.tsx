import type { GuideYoutubeEmbed as GuideYoutubeEmbedConfig } from '@/content/guide/types';

interface GuideYoutubeEmbedProps extends GuideYoutubeEmbedConfig {
  fallbackTitle?: string;
}

export default function GuideYoutubeEmbed({
  videoId,
  title,
  startSeconds,
  fallbackTitle,
}: GuideYoutubeEmbedProps) {
  const embedSrc =
    startSeconds != null
      ? `https://www.youtube.com/embed/${videoId}?start=${startSeconds}`
      : `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-neutral-700">
      <div className="relative aspect-[16/10] w-full">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={embedSrc}
          title={title ?? fallbackTitle ?? '가이드 동영상'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}
