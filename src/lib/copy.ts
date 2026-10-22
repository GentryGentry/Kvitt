import type { BalanceState } from './calc';

export const LINES: Record<BalanceState, string[]> = {
  empty: [
    'Ingen skuld. Ännu.',
    'Tomt på båda sidor.',
    'Vågen väntar på första posten.',
    'Inget att bokföra. Än.',
    'Skorna står kvar vid dörren.',
    'Ren tavla. Det varar sällan.',
  ],
  deepDebt: [
    'Räkningen kommer. Skorna väntar.',
    'Det här blir mer än en runda.',
    'Vågen har tagit ställning. Åt vänster.',
    'Stor skuld, men den är bara kilometer.',
    'Skorna har väntat länge nu.',
    'Kilometer går att betala av. En i taget.',
  ],
  debt: [
    'Bullen är inte betald än.',
    'Några kilometer kvar att betala.',
    'Skulden går att hantera.',
    'Liten räkning. Ändå en räkning.',
    'Skorna hinner ikapp.',
    'Inte hela världen. Några kilometer.',
  ],
  even: [
    'Jämnt. Misstänkt jämnt.',
    'Kvitt. Än så länge.',
    'Vågen står still.',
    'Precis i balans.',
    'Ingen skuld, inget tillgodo.',
    'Jämnt skägg.',
  ],
  credit: [
    'Tillgodo. Fredagsmyset är förbetalt.',
    'Du ligger före.',
    'Plus på kontot.',
    'Kilometrarna är redan sprungna.',
    'Ett litet förskott på något gott.',
    'Vågen lutar rätt håll.',
  ],
  bigCredit: [
    'Du kan äta en hel pizza utan att blinka.',
    'Rejält tillgodo. Det finns utrymme.',
    'Fikat är betalt flera dagar framåt.',
    'Här har någon sprungit i förväg.',
    'Stort förskott. Du väljer själv vad det blir.',
    'Mycket plus. Kanske en kanelbulle?',
  ],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** En rad per läge och dag. Samma dag ger samma rad. */
export function pickLine(state: BalanceState, day: string): string {
  const lines = LINES[state];
  return lines[hash(`${day}|${state}`) % lines.length];
}
