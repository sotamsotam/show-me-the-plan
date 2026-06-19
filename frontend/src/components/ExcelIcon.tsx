interface ExcelIconProps {
  className?: string;
}

export default function ExcelIcon({ className = 'h-4 w-4 shrink-0' }: ExcelIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <rect width="24" height="24" rx="4" fill="#217346" />
      <path fill="#33C481" d="M4 4h7.5v16H6a2 2 0 0 1-2-2V4z" />
      <path
        fill="#fff"
        d="M7.1 8.2 9.2 12l-2.1 3.8H8.6l1.1-2 1.1 2h1.5L10.2 12l2.1-3.8h-1.5l-1.1 2-1.1-2H7.1z"
      />
      <path
        fill="#fff"
        fillOpacity="0.92"
        d="M12.8 7.5h5.7c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2h-5.7V7.5zm1.8 2v1.3h3.4V9.5h-3.4zm0 2.5v1.3h3.4v-1.3h-3.4zm0 2.5v1.3h3.4v-1.3h-3.4z"
      />
    </svg>
  );
}
