import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { goBack, type Route } from '../lib/route';

/** Undervy: bakåtpil, rubrik, fast verktygsrad och scrollande innehåll. */
export function Page({
  route,
  title,
  back,
  tools,
  children,
}: {
  route: Route;
  title: string;
  back: Route;
  tools?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="screen page" data-route={route}>
      <header className="page__head">
        <button className="nav-btn nav-btn--back" type="button" aria-label="Tillbaka" onClick={() => goBack(back)}>
          <Icon name="arrow-left" />
        </button>
      </header>
      <h1 className="page__title">{title}</h1>
      {tools && <div className="page__tools">{tools}</div>}
      <div className="page__body">{children}</div>
    </main>
  );
}
