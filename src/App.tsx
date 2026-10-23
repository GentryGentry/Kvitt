import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ToastProvider, useDismissToast } from './components/Toast';
import { computeBalance } from './lib/calc';
import { db, seedBuiltins } from './lib/db';
import { primeKeyboard } from './lib/keyboard';
import { applyTheme } from './lib/theme';
import type { FoodEntry, FoodItem, ResetMarker, RunEntry, Settings } from './lib/types';
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

interface MainProps {
  settings: Settings;
  foods: FoodEntry[];
  runs: RunEntry[];
  resets: ResetMarker[];
  items: FoodItem[];
}

function Main({ settings, foods, runs, resets, items }: MainProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const dismissToast = useDismissToast();

  const open = (s: Sheet) => {
    dismissToast();
    setSheet(s);
  };
  const close = () => setSheet(null);
  const { balanceKm } = computeBalance({ foods, runs, resets });
  // Saldot utan posten som redigeras, så att förhandsvisningen visar nya saldot.
  const without = (id: string) =>
    computeBalance({ foods: foods.filter((f) => f.id !== id), runs: runs.filter((r) => r.id !== id), resets }).balanceKm;

  return (
    <>
      <Start
        settings={settings}
        foods={foods}
        runs={runs}
        resets={resets}
        onEat={() => {
          primeKeyboard('text');
          open({ kind: 'food' });
        }}
        onRun={() => {
          primeKeyboard('decimal');
          open({ kind: 'run' });
        }}
        onEditFood={(entry) => open({ kind: 'editFood', entry })}
        onEditRun={(entry) => open({ kind: 'editRun', entry })}
      />
      {sheet?.kind === 'food' && <FoodSheet items={items} settings={settings} baseKm={balanceKm} onClose={close} />}
      {sheet?.kind === 'run' && <RunSheet runs={runs} baseKm={balanceKm} onClose={close} />}
      {sheet?.kind === 'editFood' && <EditFoodSheet entry={sheet.entry} baseKm={without(sheet.entry.id)} onClose={close} />}
      {sheet?.kind === 'editRun' && <EditRunSheet entry={sheet.entry} baseKm={without(sheet.entry.id)} onClose={close} />}
    </>
  );
}

export function App() {
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

  if (!settingsRow || !foods || !runs || !resets || !items) return <div className="kvitt app" />;

  const settings = settingsRow.row;
  return (
    <div className="kvitt app">
      <ToastProvider>
        {settings ? (
          <Main settings={settings} foods={foods} runs={runs} resets={resets} items={items} />
        ) : (
          <Welcome />
        )}
      </ToastProvider>
    </div>
  );
}
