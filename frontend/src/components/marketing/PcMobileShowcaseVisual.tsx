import Image from 'next/image';
import type { PcMobileShowcaseScreen } from '@/content/marketing/types';

export default function PcMobileShowcaseVisual({ screen }: { screen: PcMobileShowcaseScreen }) {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
      <div className="pointer-events-none absolute -right-4 top-6 hidden h-36 w-36 rounded-full bg-mkt-accent/10 blur-3xl lg:block" />
      <div className="pointer-events-none absolute -left-2 bottom-8 hidden h-28 w-28 rounded-full bg-mkt-primary/10 blur-3xl lg:block" />

      <div className="relative mx-auto aspect-[4/3] w-full sm:aspect-[16/11]">
        <div className="absolute inset-0">
          <div className="relative h-full translate-x-3 scale-[0.92] origin-bottom sm:translate-x-6 sm:scale-100 lg:translate-x-8 lg:scale-[1.05]">
            <Image
              src={screen.pc.src}
              alt={screen.pc.alt}
              fill
              sizes="(max-width: 1024px) 90vw, 520px"
              className="object-contain object-bottom"
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 z-10 w-[34%] max-w-[7.5rem] sm:w-[38%] sm:max-w-[9.5rem] lg:max-w-[10.5rem]">
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.25rem] bg-mkt-surface shadow-mkt-hover ring-[3px] ring-white sm:rounded-[1.5rem] sm:ring-4">
            <Image
              src={screen.mobile.src}
              alt={screen.mobile.alt}
              fill
              sizes="(max-width: 640px) 34vw, 168px"
              className="object-cover object-top"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
