import type { ThemeChoice } from './types';

const BG = { light: '#F5F2EC', dark: '#0B0B0C' };

export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m) => {
    const media = m.getAttribute('data-media') ?? m.getAttribute('media') ?? '';
    if (!m.hasAttribute('data-media')) m.setAttribute('data-media', media);
    if (theme === 'auto') {
      m.setAttribute('media', media);
      m.setAttribute('content', media.includes('dark') ? BG.dark : BG.light);
    } else {
      // Båda taggarna pekar på samma färg så att valet gäller oavsett systemläge.
      m.removeAttribute('media');
      m.setAttribute('content', BG[theme]);
    }
  });
}
