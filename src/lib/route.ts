import { useSyncExternalStore } from 'react';

export type Route = 'start' | 'history' | 'stats' | 'settings' | 'saved';

const HASH: Record<Route, string> = {
  start: '#/',
  history: '#/historik',
  stats: '#/statistik',
  settings: '#/installningar',
  saved: '#/installningar/sparade',
};

export function parseRoute(hash: string): Route {
  const h = hash.replace(/\/$/, '');
  return (Object.keys(HASH) as Route[]).find((r) => HASH[r].replace(/\/$/, '') === h) ?? 'start';
}

const EVENT = 'kvitt-route';
let depth = (history.state as { k?: number } | null)?.k ?? 0;

/** Flyttar fram i appen. Systemets bakåt (kantsvep, bakåtknapp) fungerar eftersom varje steg är en historikpost. */
export function navigate(to: Route): void {
  depth += 1;
  history.pushState({ k: depth }, '', HASH[to]);
  window.dispatchEvent(new Event(EVENT));
}

/** Bakåt: ett steg i historiken om vi kom hit inifrån appen, annars direkt till `fallback`. */
export function goBack(fallback: Route): void {
  if (depth > 0) history.back();
  else {
    history.replaceState({ k: 0 }, '', HASH[fallback]);
    window.dispatchEvent(new Event(EVENT));
  }
}

function subscribe(cb: () => void): () => void {
  const onPop = (e: PopStateEvent) => {
    depth = (e.state as { k?: number } | null)?.k ?? 0;
    cb();
  };
  window.addEventListener('popstate', onPop);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('popstate', onPop);
    window.removeEventListener(EVENT, cb);
  };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash, () => '');
  return parseRoute(hash);
}
