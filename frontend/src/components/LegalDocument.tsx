import type { LegalSection } from '@/content/legal/meta';

type LegalDocumentProps = {
  title: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export default function LegalDocument({
  title,
  version,
  effectiveDate,
  sections,
}: LegalDocumentProps) {
  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <header className="mb-8 border-b border-gray-200 pb-6 not-prose dark:border-neutral-800">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          버전 {version} · 시행일 {effectiveDate}
        </p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300"
              >
                {paragraph}
              </p>
            ))}
            {section.list && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
