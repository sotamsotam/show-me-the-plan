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
      {eyebrow ? <p className="mkt-eyebrow mb-2">{eyebrow}</p> : null}
      <h2 className="mkt-h2 whitespace-pre-line">{title}</h2>
      {description ? <p className="mkt-lead mt-4 whitespace-pre-line">{description}</p> : null}
    </div>
  );
}
