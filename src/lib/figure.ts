import { balanceTone, formatDecimal, roundTenth } from './calc';

/** Ett tal delat i tecken, heltal och decimal för stora siffror. Heltalssiffrorna styr storleken. */
export function figure(km: number) {
  const r = Math.abs(roundTenth(km));
  const int = Math.floor(r + 1e-9);
  const dec = Math.round((r - int) * 10);
  const tone = balanceTone(km);
  return {
    sign: tone === 'plus' ? '+' : tone === 'minus' ? '−' : '',
    int: formatDecimal(int, 0),
    dec: `,${dec}`,
    digits: Math.min(4, String(int).length),
  };
}
