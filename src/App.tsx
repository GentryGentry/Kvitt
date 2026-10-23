import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ToastProvider, useDismissToast, useToast } from './components/Toast';
import { currentBalanceKm, resetBalance, undoReset } from './lib/actions';
import { parseBackup, readBackup, replaceAll } from './lib/backup';
import { computeBalance, formatKm } from './lib/calc';
import { db, seedBuiltins } from './lib/db';
import { primeKeyboard } from './lib/keyboard';
import { navigate, useRoute } from './lib/route';
import { applyTheme } from './lib/theme';
import type { FoodEntry, FoodItem, ResetMarker, RunEntry, Settings } from './lib/types';
import { EditFoodSheet, EditRunSheet } from './views/EditSheets';
import { FoodSheet } from './views/FoodSheet';
import { History } from './views/History';
import { RunSheet } from './views/RunSheet';
import { Saved } from './views/Saved';
import { Settings as SettingsView } from './views/Settings';
import { ImportSheet, ItemSheet, MenuSheet, ResetSheet, type ImportState } from './views/Sheets';
import { Start } from './views/Start';
import { Stats } from './views/Stats';
import { Welcome } from './views/Welcome';

type Sheet =
  | { kind: 'food' }
  | { kind: 'run' }
  | { kind: 'editFood'; entry: FoodEntry }
  | { kind: 'editRun'; entry: RunEntry }
  | { kind: 'menu' }
  | { kind: 'reset' }
  | { kind: 'import'; candidate: ImportState }
  | { kind: 'item'; item: FoodItem }
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
  const route = useRoute();
  const toast = useToast();
  const dismissToast = useDismissToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const open = (s: Sheet) => {
    dismissToast();
    setSheet(s);
  };
  const close = () => setSheet(null);
  const { balanceKm } = computeBalance({ foods, runs, resets });
  // Saldot utan posten som redigeras, så att förhandsvisningen visar nya saldot.
  const without = (id: string) =>
    computeBalance({ foods: foods.filter((f) => f.id !== id), runs: runs.filter((r) => r.id !== id), resets }).balanceKm;

  const editFood = (entry: FoodEntry) => open({ kind: 'editFood', entry });
  const editRun = (entry: RunEntry) => open({ kind: 'editRun', entry });

  async function confirmReset() {
    const before = await currentBalanceKm();
    await resetBalance(before);
    close();
    toast({
      message: `Saldot ${formatKm(before, { sign: true })} nollställt`,
      actionLabel: 'Ångra',
      onAction: async () => void (await undoReset()),
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const backup = parseBackup(await file.text());
    open({ kind: 'import', candidate: backup ? { ok: true, name: file.name, backup } : { ok: false } });
  }

  async function confirmImport(candidate: Extract<ImportState, { ok: true }>) {
    const snapshot = await readBackup(undefined, false);
    await replaceAll(candidate.backup);
    close();
    toast({
      message: `Importerade ${candidate.backup.foods.length + candidate.backup.runs.length} poster`,
      actionLabel: 'Ångra',
      onAction: async () => {
        if (snapshot) await replaceAll(snapshot);
      },
    });
  }

  let view;
  switch (route) {
    case 'history':
      view = <History foods={foods} runs={runs} resets={resets} items={items} onEditFood={editFood} onEditRun={editRun} />;
      break;
    case 'stats':
      view = <Stats foods={foods} runs={runs} resets={resets} />;
      break;
    case 'settings':
      view = (
        <SettingsView
          settings={settings}
          resets={resets}
          items={items}
          onReset={() => open({ kind: 'reset' })}
          onImportClick={() => fileRef.current?.click()}
        />
      );
      break;
    case 'saved':
      view = <Saved items={items} onItem={(item) => open({ kind: 'item', item })} />;
      break;
    default:
      view = (
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
          onEditFood={editFood}
          onEditRun={editRun}
          onMenu={() => open({ kind: 'menu' })}
        />
      );
  }

  // Sidbyte är en 120 ms fade: `key` på rutten startar om animationen.
  return (
    <>
      <div className="kvitt-view" key={route}>
        {view}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {sheets()}
    </>
  );

  function sheets() {
    switch (sheet?.kind) {
      case 'food':
        return <FoodSheet items={items} settings={settings} baseKm={balanceKm} onClose={close} />;
      case 'run':
        return <RunSheet runs={runs} baseKm={balanceKm} onClose={close} />;
      case 'editFood':
        return <EditFoodSheet entry={sheet.entry} baseKm={without(sheet.entry.id)} onClose={close} />;
      case 'editRun':
        return <EditRunSheet entry={sheet.entry} baseKm={without(sheet.entry.id)} onClose={close} />;
      case 'menu':
        return (
          <MenuSheet
            entries={foods.length + runs.length}
            weightKg={settings.weightKg}
            onGo={(r) => {
              close();
              navigate(r);
            }}
            onClose={close}
          />
        );
      case 'reset':
        return <ResetSheet balanceKm={balanceKm} onConfirm={confirmReset} onClose={close} />;
      case 'import':
        return (
          <ImportSheet
            state={sheet.candidate}
            current={{ entries: foods.length + runs.length, items: items.length }}
            onPickAgain={() => {
              close();
              fileRef.current?.click();
            }}
            onConfirm={() => sheet.candidate.ok && confirmImport(sheet.candidate)}
            onClose={close}
          />
        );
      case 'item':
        return <ItemSheet item={sheet.item} onClose={close} />;
      default:
        return null;
    }
  }
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
