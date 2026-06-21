export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
}) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';

  return (
    <div className={`mb-10 max-w-3xl sm:mb-12 ${alignClass}`}>
      {eyebrow ? (
        <p className="mb-2 text-sm font-bold tracking-wide text-blue-600">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
