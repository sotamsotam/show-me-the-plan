import Image from 'next/image';
import type { PcMobileShowcaseScreen } from '@/content/marketing/types';

export default function PcMobileShowcaseVisual({ screen }: { screen: PcMobileShowcaseScreen }) {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
      <div className="pointer-events-none absolute -right-4 top-6 hidden h-36 w-36 rounded-full bg-mkt-accent/10 blur-3xl lg:block" />
      <div className="pointer-events-none absolute -left-2 bottom-8 hidden h-28 w-28 rounded-full bg-mkt-primary/10 blur-3xl lg:block" />

      <div className="relative mx-auto mb-[100px] aspect-[4/3] w-full sm:mb-0 sm:aspect-[16/11]">
        <div className="absolute inset-0">
          <div className="relative top-[50px] left-[30px] h-full scale-[0.92] origin-bottom sm:top-0 sm:left-0 sm:translate-x-6 sm:scale-100 lg:translate-x-8 lg:scale-[1.05]">
            <Image
              src={screen.pc.src}
              alt={screen.pc.alt}
              fill
              sizes="(max-width: 1024px) 90vw, 520px"
              className="object-contain object-bottom"
            />
          </div>
        </div>

        <div className="absolute bottom-0 left-[30px] z-10 w-[40%] max-w-[9rem] translate-y-[50px] sm:left-0 sm:w-[44%] sm:max-w-[11rem] sm:translate-y-0 lg:max-w-[12.5rem]">
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.25rem] bg-mkt-surface shadow-[0_6px_20px_rgba(15,23,42,0.16),0_18px_48px_rgba(15,23,42,0.24)] ring-[3px] ring-white sm:rounded-[1.5rem] sm:ring-4">
            {screen.mobile.type === 'video' ? (
              <video
                src={screen.mobile.src}
                aria-label={screen.mobile.alt}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            ) : (
              <Image
                src={screen.mobile.src}
                alt={screen.mobile.alt}
                fill
                sizes="(max-width: 640px) 40vw, 200px"
                className="object-cover object-top"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
