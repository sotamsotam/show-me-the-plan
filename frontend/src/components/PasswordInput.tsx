'use client';

import { InputHTMLAttributes, useState, type SVGProps } from 'react';

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <path
        fillRule="evenodd"
        d="M.664 10.59a1.651 1.651 0 010-.818 10.003 10.003 0 0119.672 0 1.651 1.651 0 01-.818 2.684 8.002 8.002 0 00-13.674 0 1.651 1.651 0 01-.818-2.684zm9.336 2.91a4 4 0 100-8 4 4 0 000 8z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EyeSlashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path
        fillRule="evenodd"
        d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 00-1.818-2.684 8.002 8.002 0 00-10.59 0 1.65 1.65 0 00-1.51 1.37l-1.66-1.66zM7.53 9.8l1.61 1.61A2 2 0 0110.94 13a2 2 0 01-3.41-3.2zm4.47 4.47l1.61 1.61a4 4 0 01-5.66-5.66l1.61 1.61a2 2 0 002.83 2.83z"
        clipRule="evenodd"
      />
      <path d="M12.45 12.45l-1.06-1.06a2.5 2.5 0 00-3.54-3.54L6.79 6.79a8.002 8.002 0 00-3.3 4.38 1.651 1.651 0 001.818 2.684 8.002 8.002 0 006.132 0z" />
    </svg>
  );
}

const defaultInputClassName =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-zinc-800';

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export default function PasswordInput({
  value,
  onChange,
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className ?? defaultInputClassName} pr-10`}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
      >
        {visible ? (
          <EyeSlashIcon className="h-5 w-5" />
        ) : (
          <EyeIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
