import SectionHeading from '@/components/marketing/SectionHeading';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import type { MessageGroupsContent } from '@/content/marketing/types';

const groupAccentClasses = [
  'border-blue-600 text-blue-600',
  'border-sky-500 text-sky-600',
  'border-indigo-500 text-indigo-600',
];

export default function MessageGroupsSection({
  eyebrow = '왜 SHOW ME THE PLAN 인가요?',
  title,
  groups,
}: MessageGroupsContent) {
  return (
    <MarketingSection variant="default">
      {title ? (
        <SectionHeading eyebrow={eyebrow} title={title} />
      ) : (
        <div className="mb-10 text-center sm:mb-12">
          {eyebrow ? (
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              {eyebrow}
            </h1>
          ) : null}
        </div>
      )}

      <div className="space-y-14 sm:space-y-16 lg:space-y-20">
        {groups.map((group, groupIndex) => (
          <div key={group.title}>
            <div className="mb-6 flex items-start gap-4 sm:mb-8">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 bg-white text-sm font-extrabold ${groupAccentClasses[groupIndex % groupAccentClasses.length]}`}
              >
                {String(groupIndex + 1).padStart(2, '0')}
              </span>
              <h3 className="pt-1 text-xl font-extrabold leading-snug text-gray-900 sm:text-2xl">
                {group.title}
              </h3>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {group.items.map((item, itemIndex) => (
                <li
                  key={`${group.title}-${itemIndex}`}
                  className="mkt-card-shadow-sm relative rounded-3xl bg-[#f5f7fa] p-6 ring-1 ring-gray-100 sm:p-7"
                >
                  <span
                    className="pointer-events-none absolute left-5 top-4 select-none font-serif text-5xl leading-none text-blue-200 sm:left-6 sm:text-6xl"
                    aria-hidden
                  >
                    "
                  </span>
                  <p className="relative z-10 pt-6 text-sm font-medium leading-relaxed text-gray-800 sm:text-[15px] sm:leading-7">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </MarketingSection>
  );
}
