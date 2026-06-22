import Image from 'next/image';

const PC_CAPTURE = '/images/main_pc.png';
const MOBILE_CAPTURE = '/images/mobile_todo.jpg';

export default function HeroAppPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-2xl lg:max-w-none"
      aria-hidden
    >
      <div className="pointer-events-none absolute -right-6 top-8 hidden h-40 w-40 rounded-full bg-mkt-accent/10 blur-3xl lg:block" />
      <div className="pointer-events-none absolute -left-4 bottom-4 hidden h-32 w-32 rounded-full bg-mkt-primary/10 blur-3xl lg:block" />

      <div className="relative mx-auto aspect-[4/2.9] w-full translate-y-9 sm:translate-y-10 lg:translate-y-11 sm:aspect-[5/3.5] lg:aspect-[16/10]">
        {/* PC — 모니터 목업 이미지 */}
        <div className="mkt-hero-pc absolute inset-0">
          <div className="relative h-full translate-x-14 scale-[1.06] origin-bottom sm:translate-x-16 sm:scale-110 lg:translate-x-20 lg:scale-[1.18]">
            <Image
              src={PC_CAPTURE}
              alt="Show Me The Plan PC 주간 공부계획 화면"
              fill
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 640px"
              className="object-contain object-bottom"
            />
          </div>
        </div>

        {/* 모바일 — 2초 후 등장 */}
        <div className="mkt-hero-mobile absolute bottom-0 left-0 z-10 w-[44%] max-w-[11rem] sm:max-w-[12.5rem] lg:max-w-[13.5rem]">
          <div className="mkt-hero-mobile-float relative">
            <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.35rem] bg-mkt-surface shadow-mkt-hover ring-[3px] ring-white sm:rounded-[1.5rem] sm:ring-4">
              <Image
                src={MOBILE_CAPTURE}
                alt="Show Me The Plan 모바일 TODO 화면"
                fill
                sizes="(max-width: 768px) 44vw, 216px"
                className="object-cover object-top"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
