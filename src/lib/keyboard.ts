let proxy: HTMLInputElement | null = null;

/**
 * iOS visar bara tangentbordet om fokus sätts direkt i ett tryck.
 * Sheeten monteras först efter tryckhändelsen, så vi fokuserar ett dolt fält
 * här och låter sheetens eget fält ta över fokus när det finns.
 */
export function primeKeyboard(mode: 'text' | 'decimal' = 'text'): void {
  if (!proxy) {
    proxy = document.createElement('input');
    proxy.setAttribute('aria-hidden', 'true');
    proxy.tabIndex = -1;
    Object.assign(proxy.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      opacity: '0',
      fontSize: '16px',
      pointerEvents: 'none',
    });
    document.body.appendChild(proxy);
  }
  proxy.inputMode = mode;
  proxy.focus({ preventScroll: true });
}
