import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ToastProvider } from './components/Toast';
import { computeBalance } from './lib/calc';
import { db, seedBuiltins } from './lib/db';
import { primeKeyboard } from './lib/keyboard';
import { applyTheme } from './lib/theme';
import type { FoodEntry, RunEntry } from './lib/types';
import { EditFoodSheet, EditRunSheet } from './views/EditSheets';
import { FoodSheet } from './views/FoodSheet';
import { RunSheet } from './views/RunSheet';
import { Start } from './views/Start';
import { Welcome } from './views/Welcome';

type Sheet =
  | { kind: 'food' }
  | { kind: 'run' }
  | { kind: 'editFood'; entry: FoodEntry }
  | { kind: 'editRun'; entry: RunEntry }
  | null;

export function App() {
  const [sheet, setSheet] = useState<Sheet>(null);

  const settingsRow = useLiveQuery(async () => ({ row: await db.settings.get('main') }), []);
  const foods = useLiveQuery(() => db.foods.toArray(), []);
  const runs = useLiveQuery(() => db.runs.toArray(), []);
  const resets = useLiveQuery(() => db.resets.toArray(), []);
  const items = useLiveQuery(() => db.items.toArray(), []);

  useEffect(() => {
    void seedBuiltins();
  }, []);

  const theme = settingsRow?.row?.theme ?? 'auto';
  useEffect(() => applyTheme(theme), [theme]);

  if (!settingsRow || !foods || !runs || !resets || !items) return null;

  const settings = settingsRow.row;
  if (!settings) return <Welcome />;

  const close = () => setSheet(null);
  const { balanceKm } = computeBalance({ foods, runs, resets });

  return (
    <ToastProvider>
      <Start
        settings={settings}
        foods={foods}
        runs={runs}
        resets={resets}
        onEat={() => {
          primeKeyboard('text');
          setSheet({ kind: 'food' });
        }}
        onRun={() => {
          primeKeyboard('decimal');
          setSheet({ kind: 'run' });
        }}
        onEditFood={(entry) => setSheet({ kind: 'editFood', entry })}
        onEditRun={(entry) => setSheet({ kind: 'editRun', entry })}
      />
      {sheet?.kind === 'food' && <FoodSheet items={items} settings={settings} balanceKm={balanceKm} onClose={close} />}
      {sheet?.kind === 'run' && <RunSheet runs={runs} balanceKm={balanceKm} onClose={close} />}
      {sheet?.kind === 'editFood' && <EditFoodSheet entry={sheet.entry} onClose={close} />}
      {sheet?.kind === 'editRun' && <EditRunSheet entry={sheet.entry} onClose={close} />}
    </ToastProvider>
  );
}
