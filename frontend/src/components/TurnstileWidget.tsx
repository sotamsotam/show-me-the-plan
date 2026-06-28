'use client';

import {
  Turnstile,
  type TurnstileInstance,
} from '@marsidev/react-turnstile';
import { forwardRef } from 'react';
import { isTurnstileWidgetEnabled } from '@/lib/turnstile-client';

type TurnstileWidgetProps = {
  onTokenChange: (token: string | null) => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
};

const TurnstileWidget = forwardRef<TurnstileInstance, TurnstileWidgetProps>(
  function TurnstileWidget(
    { onTokenChange, onError, theme = 'light', className },
    ref
  ) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

    if (!isTurnstileWidgetEnabled() || !siteKey) {
      return null;
    }

    return (
      <div className={className}>
        <Turnstile
          ref={ref}
          siteKey={siteKey}
          options={{ theme, size: 'flexible' }}
          onSuccess={onTokenChange}
          onExpire={() => {
            onTokenChange(null);
            if (typeof ref === 'object' && ref?.current) {
              ref.current.reset();
            }
          }}
          onError={() => {
            onTokenChange(null);
            onError?.();
          }}
        />
      </div>
    );
  }
);

export default TurnstileWidget;
