/** Löparsko, sedd från sidan. Samma linjestil som Lucide (24 px, 1,6 i linjetjocklek). */
export function RunningShoe({ size = 24, strokeWidth = 1.6 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 18v-7.5a1 1 0 0 1 1-1h2.6c.5 1.6 1.7 2.6 3.4 2.8l3.4.4c1.7.2 3 1 4 2.3l2.3 3c.2.3.3.6.3 1Z" />
      <path d="M3 15.2h16.6" />
      <path d="m10.2 12.2 1.4-1.8m1.8 2.1 1.4-1.8" />
    </svg>
  );
}
