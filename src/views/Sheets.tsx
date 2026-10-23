import { useState } from 'react';
import { Field, TextInput } from '../components/Fields';
import { Icon } from '../components/Icon';
import { SetRow } from '../components/Controls';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { deleteItem, updateItem } from '../lib/actions';
import { summarize, type Backup } from '../lib/backup';
import { balanceTone, formatKm, parseNumber, roundTenth } from '../lib/calc';
import { KCAL_ERROR, MAX_KCAL } from '../lib/draft';
import { figure } from '../lib/figure';
import type { Route } from '../lib/route';
import type { FoodItem } from '../lib/types';
import { WEIGHT_TEXT } from './Settings';

export function MenuSheet({
  entries,
  weightKg,
  onGo,
  onClose,
}: {
  entries: number;
  weightKg: number;
  onGo: (r: Route) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Meny" onClose={onClose}>
      <div className="navlist">
        <SetRow label="Historik" meta={`${entries} ${entries === 1 ? 'post' : 'poster'}`} onClick={() => onGo('history')} />
        <SetRow label="Statistik" meta="30 dagar" onClick={() => onGo('stats')} />
        <SetRow label="Inställningar" meta={`${WEIGHT_TEXT(weightKg)} kg`} onClick={() => onGo('settings')} />
      </div>
    </Sheet>
  );
}

export function ResetSheet({ balanceKm, onConfirm, onClose }: { balanceKm: number; onConfirm: () => void; onClose: () => void }) {
  const zero = roundTenth(balanceKm) === 0;
  const fig = figure(balanceKm);
  const tone = balanceTone(balanceKm);
  const footer = (
    <>
      <button className="btn btn--ink" type="button" disabled={zero} onClick={onConfirm}>
        Nollställ
      </button>
      <button className="btn btn--outline" type="button" onClick={onClose}>
        Avbryt
      </button>
    </>
  );
  return (
    <Sheet title="Nollställ saldot" onClose={onClose} footer={footer}>
      <p className="sheet__fig" data-state={tone === 'minus' ? 'debt' : tone === 'plus' ? 'credit' : 'zero'}>
        <span>{fig.sign}</span>
        <span>{fig.int}</span>
        <span className="balance__dec">{fig.dec}</span>
        <small>km</small>
      </p>
      <p className="help" style={{ marginTop: -4 }}>
        {zero
          ? 'Saldot är redan 0,0. Det finns inget att nollställa.'
          : `Saldot ${formatKm(balanceKm, { sign: true })} nollställs. Inget raderas: äldre poster ligger kvar i Historik, nedtonade, under en avdelare. Du kan ångra tills du loggar nästa post.`}
      </p>
    </Sheet>
  );
}

export type ImportState = { ok: true; name: string; backup: Backup } | { ok: false };

export function ImportSheet({
  state,
  current,
  onPickAgain,
  onConfirm,
  onClose,
}: {
  state: ImportState;
  current: { entries: number; items: number };
  onPickAgain: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!state.ok) {
    return (
      <Sheet
        title="Importera data"
        onClose={onClose}
        footer={
          <>
            <button className="btn btn--ink" type="button" onClick={onPickAgain}>
              Välj annan fil
            </button>
            <button className="btn btn--outline" type="button" onClick={onClose}>
              Stäng
            </button>
          </>
        }
      >
        <p className="empty-note">
          <Icon name="alert" />
          <span>
            <b style={{ color: 'var(--text)' }}>Filen går inte att läsa som Kvitt-data.</b>
            <br />
            Inget ändrades. Välj en fil som skapats av Exportera i Kvitt.
          </span>
        </p>
      </Sheet>
    );
  }
  const sum = summarize(state.backup);
  return (
    <Sheet
      title="Importera data"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ink" type="button" onClick={onConfirm}>
            Ersätt allt
          </button>
          <button className="btn btn--outline" type="button" onClick={onClose}>
            Avbryt
          </button>
        </>
      }
    >
      <dl className="kv">
        <div className="kv__row">
          <dt>Fil</dt>
          <dd style={{ fontSize: 15 }}>{state.name}</dd>
        </div>
        <div className="kv__row">
          <dt>Innehåll</dt>
          <dd style={{ fontSize: 15 }}>
            {sum.entries} poster, {sum.items} saker
          </dd>
        </div>
      </dl>
      <p className="empty-note">
        <Icon name="alert" />
        <span>
          Importen ersätter allt som finns nu: {current.entries} poster och {current.items} sparade saker, samt vikt och inställningar. Du kan ångra tills du laddar om appen. Exportera först om du är osäker.
        </span>
      </p>
    </Sheet>
  );
}

export function ItemSheet({ item, onClose }: { item: FoodItem; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(item.name);
  const [kcalText, setKcalText] = useState(String(item.kcalPerUnit));
  const [unit, setUnit] = useState(item.unitLabel);
  const [alias, setAlias] = useState(item.aliases.join(', '));

  const kcal = parseNumber(kcalText);
  const kcalOk = kcal !== undefined && kcal >= 1 && kcal <= MAX_KCAL;
  const valid = name.trim() !== '' && kcalOk && unit.trim() !== '';

  return (
    <Sheet
      title="Ändra sak"
      onClose={onClose}
      onDelete={async () => {
        const undo = await deleteItem(item);
        toast({ title: item.name, message: 'borttagen', actionLabel: 'Ångra', onAction: undo });
        onClose();
      }}
      footer={
        <button
          className="btn btn--ink"
          type="button"
          disabled={!valid}
          onClick={async () => {
            await updateItem(item, {
              name: name.trim(),
              kcalPerUnit: Math.round(kcal!),
              unitLabel: unit.trim(),
              aliases: alias.split(',').map((a) => a.trim()).filter(Boolean),
            });
            onClose();
          }}
        >
          Spara
        </button>
      }
    >
      <Field id="it-name" label="Namn">
        <TextInput id="it-name" value={name} onChange={setName} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
        <Field id="it-kcal" label="Energi per enhet" error={kcalOk ? undefined : KCAL_ERROR}>
          <TextInput id="it-kcal" num value={kcalText} onChange={setKcalText} inputMode="numeric" invalid={!kcalOk} />
          <span className="field__unit">kcal</span>
        </Field>
        <Field id="it-unit" label="Enhet">
          <TextInput id="it-unit" value={unit} onChange={setUnit} />
        </Field>
      </div>
      <Field id="it-alias" label="Alias">
        <TextInput id="it-alias" value={alias} onChange={setAlias} placeholder="Kommaseparerat" />
      </Field>
      {item.source === 'builtin' && (
        <p className="help">Inbyggd, riktvärde. Ändrar du kcal blir den din egen och räknas som exakt.</p>
      )}
    </Sheet>
  );
}
