export function BrandMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M7 22.5c4.4-8.3 10.5-12.7 18-13.4"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M8.5 15.5c3.1-3.1 6.9-4.7 11.4-4.9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="23" r="2.6" fill="currentColor" />
      <circle cx="16.2" cy="15.2" r="2.6" fill="currentColor" />
      <circle cx="24.5" cy="9" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function BrandLogo({
  className = "",
  markClassName = "h-11 w-11 rounded-[16px]",
  showTagline = false,
  tagline = "官网客服转化台",
}: {
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
  tagline?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span
        className={`grid shrink-0 place-items-center bg-[#ff6b4a] text-white shadow-[0_14px_30px_rgba(255,107,74,0.2)] ${markClassName}`}
      >
        <BrandMark className="h-[56%] w-[56%]" />
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-extrabold tracking-[0.01em] text-[#111318] dark:text-white">
          Lopuo <span className="text-[#ff6b4a]">Signal</span>
        </span>
        {showTagline ? <span className="mt-1.5 block text-xs font-semibold text-[#777e89]">{tagline}</span> : null}
      </span>
    </span>
  );
}
