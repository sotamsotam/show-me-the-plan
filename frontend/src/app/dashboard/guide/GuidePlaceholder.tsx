interface GuidePlaceholderProps {
  title: string;
}

export default function GuidePlaceholder({ title }: GuidePlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 md:text-2xl">{title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        사용법 안내를 준비 중입니다.
      </p>
    </div>
  );
}
