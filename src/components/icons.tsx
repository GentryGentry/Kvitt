import { useId } from 'react';

interface IconProps {
  size?: number;
}

/** Kaka med en tugga ur. Fylld form: bitarna är urstansade och visar bakgrunden. */
export function CookieIcon({ size = 24 }: IconProps) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <mask id={id}>
          <rect width="24" height="24" fill="#fff" />
          <circle cx="19.2" cy="4.8" r="4.4" fill="#000" />
          <circle cx="8" cy="9.5" r="1.4" fill="#000" />
          <circle cx="12.5" cy="15.2" r="1.4" fill="#000" />
          <circle cx="7.5" cy="15.8" r="1.1" fill="#000" />
          <circle cx="16.2" cy="12.6" r="1.1" fill="#000" />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="10" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

/** Löparsko i profil, fylld form med sula och snörning urstansade. */
export function RunningShoeIcon({ size = 24 }: IconProps) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <mask id={id}>
          <path
            fill="#fff"
            d="M2.8 9.2C2.8 8.5 3.4 8 4 8h3c.3 1.8 1.6 3 3.6 3.4l2.6.5c1.9.3 3.3 1.2 4.4 2.5l2.7 3.1c.4.5.6 1 .6 1.7v.3c0 .5-.4.9-.9.9H3.7c-.5 0-.9-.4-.9-.9Z"
          />
          <path d="M2.5 16.6h19" stroke="#000" strokeWidth="1.5" />
          <path d="m10.6 12.6 1.2-1.5m1.9 1.9 1.2-1.5" stroke="#000" strokeWidth="1.3" strokeLinecap="round" />
        </mask>
      </defs>
      <rect width="24" height="24" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}
