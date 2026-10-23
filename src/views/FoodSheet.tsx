import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Stepper, TextInput, TimeField } from '../components/Fields';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { logFood, toggleFavorite } from '../lib/actions';
import {
  formatKcal,
  formatKm,
  formatKmApprox,
  kcalPerKm,
  kmFromKcal,
  parseNumber,
} from '../lib/calc';
import {
  buildFoodDraft,
  exactKcal,
  KCAL_ERROR,
  KCAL_STEP,
  MAX_KCAL,
  pickedKcal,
  type FoodDraft,
  type PickedFood,
} from '../lib/draft';
import { BUILTIN_ITEMS, builtinOrder } from '../lib/foods';
import { findSuggestions, parseQuantity } from '../lib/parse';
import { favoriteItems, recentItems } from '../lib/stats';
import type { FoodItem, Settings } from '../lib/types';
import { Preview } from './Preview';

const COMMON = ['Kanelbulle', 'Glass (kula)', 'Pizza (hel)', 'Chips (liten påse)'];

export function stepKcal(text: string, delta: number): string {
  const cur = Math.round(parseNumber(text) ?? 0);
  return String(Math.min(MAX_KCAL, Math.max(1, cur + delta)));
}

export function FoodPreview({
  draft,
  baseKm,
  perKm,
}: {
  draft: Pick<FoodDraft, 'kcal' | 'isEstimate'> | undefined;
  baseKm: number;
  perKm: number;
}) {
  if (!draft) return <Preview idle="Ange kcal så räknar jag om till kilometer." />;
  const km = kmFromKcal(draft.kcal, perKm);
  return (
    <Preview
      idle=""
      from={`${formatKcal(draft.kcal, { approx: draft.isEstimate })} →`}
      to={`${draft.isEstimate ? 'ca ' : ''}${formatKm(km, { unit: false })}`}
      foot={
        <>
          Nytt saldo <b>{formatKm(baseKm - km, { sign: true })}</b>
        </>
      }
    />
  );
}

function Chip({ item, onTap, onHold }: { item: FoodItem; onTap: () => void; onHold: () => void }) {
  const timer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const clear = () => window.clearTimeout(timer.current);
  return (
    <button
      className="chip"
      type="button"
      style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
      onPointerDown={() => {
        held.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          held.current = true;
          onHold();
        }, 450);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!held.current) onTap();
      }}
    >
      {item.name}
    </button>
  );
}

function Highlighted({ name, query }: { name: string; query: string }) {
  const q = query.trim().toLocaleLowerCase('sv');
  const i = q ? name.toLocaleLowerCase('sv').indexOf(q) : -1;
  if (i < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)}
      <mark>{name.slice(i, i + q.length)}</mark>
      {name.slice(i + q.length)}
    </>
  );
}

interface Props {
  items: FoodItem[];
  settings: Settings;
  baseKm: number;
  onClose: () => void;
}

export function FoodSheet({ items, settings, baseKm, onClose }: Props) {
  const toast = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [kcalText, setKcalText] = useState('');
  const [kcalTouched, setKcalTouched] = useState(false);
  const [picked, setPicked] = useState<PickedFood | null>(null);
  const [wantFavorite, setWantFavorite] = useState(false);
  const [at, setAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    nameRef.current?.focus({ preventScroll: true });
  }, []);

  const perKm = kcalPerKm(settings);
  const trimmed = name.trim();
  const pickedItem = picked ? items.find((i) => i.id === picked.item.id) ?? picked.item : null;
  const suggestions = useMemo(
    () => (trimmed && !picked ? findSuggestions(trimmed, items, { limit: 4, order: builtinOrder }) : []),
    [trimmed, picked, items],
  );
  const favorites = useMemo(() => favoriteItems(items), [items]);
  const recents = useMemo(() => recentItems(items, 6), [items]);
  const common = useMemo(
    () => COMMON.map((n) => BUILTIN_ITEMS.find((i) => i.name === n)).filter((i): i is FoodItem => Boolean(i)),
    [],
  );

  const draft = buildFoodDraft({ name, kcalText, picked, wantFavorite });
  const kcalError =
    kcalText.trim() !== '' || kcalTouched ? (exactKcal(kcalText) === undefined ? KCAL_ERROR : undefined) : undefined;
  const starred = pickedItem ? pickedItem.isFavorite : wantFavorite;

  async function commit(d: FoodDraft) {
    if (busy) return;
    setBusy(true);
    const logged = await logFood({ settings, at: at ?? new Date().toISOString(), ...d });
    const km = logged.entry.kmEquivalent;
    toast({
      title: d.label,
      message: `loggad · ${d.isEstimate ? formatKmApprox(-km) : formatKm(-km)}`,
      actionLabel: 'Ångra',
      onAction: logged.undo,
    });
    onClose();
  }

  function pick(item: FoodItem, quantity: number) {
    const baseKcal = pickedKcal(item, quantity);
    setPicked({ item, quantity, baseKcal });
    setName(item.name);
    setKcalText(String(baseKcal));
  }

  const quickLog = (item: FoodItem) =>
    commit({
      label: item.name,
      kcal: Math.round(item.kcalPerUnit),
      isEstimate: item.source === 'builtin',
      item,
      quantity: 1,
    });

  function onName(v: string) {
    setName(v);
    if (picked) {
      setPicked(null);
      if (kcalText === String(picked.baseKcal)) setKcalText('');
    }
  }

  const group = (icon: 'star' | 'clock' | null, label: string, list: FoodItem[]) =>
    list.length > 0 && (
      <div className="group" key={label}>
        <h3 className="group__label">
          {icon && <Icon name={icon} />}
          {label}
        </h3>
        <div className="chips">
          {list.map((i) => (
            <Chip key={i.id} item={i} onTap={() => quickLog(i)} onHold={() => pick(i, 1)} />
          ))}
        </div>
      </div>
    );

  const rest = parseQuantity(trimmed).rest;
  const footer = (
    <>
      <FoodPreview draft={draft} baseKm={baseKm} perKm={perKm} />
      <button className="btn" type="button" disabled={!draft || busy} onClick={() => draft && commit(draft)}>
        Logga
      </button>
    </>
  );

  return (
    <Sheet kind="ate" title="Jag åt något" onClose={onClose} footer={footer}>
      <Field id="s-name" label="Vad?">
        <TextInput
          ref={nameRef}
          id="s-name"
          value={name}
          onChange={onName}
          onEnter={() => {
            if (!picked && suggestions[0]) pick(suggestions[0].item, suggestions[0].quantity);
            else if (draft) void commit(draft);
          }}
          enterKeyHint="next"
        />
        <button
          className="field__act"
          type="button"
          aria-pressed={starred}
          aria-label={starred ? 'Ta bort favorit' : 'Spara som favorit'}
          disabled={!trimmed}
          onClick={() => (pickedItem ? toggleFavorite(pickedItem) : setWantFavorite(!wantFavorite))}
        >
          <Icon name={starred ? 'star' : 'star-off'} />
        </button>
      </Field>

      {!trimmed && (
        <div style={{ display: 'grid', gap: 16 }}>
          {group('star', 'Favoriter', favorites)}
          {group('clock', 'Senaste', recents)}
          {favorites.length === 0 && recents.length === 0 && group(null, 'Vanliga', common)}
        </div>
      )}
      {trimmed && !picked && suggestions.length > 0 && (
        <ul className="suggest" role="listbox" aria-label="Förslag">
          {suggestions.map((s) => (
            <li key={s.item.id}>
              <button className="suggest__item" type="button" role="option" aria-selected={false} onClick={() => pick(s.item, s.quantity)}>
                <span className="suggest__name">
                  {s.quantity !== 1 && `${String(s.quantity).replace('.', ',')} × `}
                  <Highlighted name={s.item.name} query={rest} />
                </span>
                <span className="suggest__kcal">{formatKcal(s.kcal, { approx: s.item.source === 'builtin' })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {trimmed.length >= 2 && !picked && suggestions.length === 0 && (
        <p className="empty-note">
          <Icon name="alert" />
          <span>Ingen träff på ”{trimmed}”. Ange kcal själv så sparas den som ny.</span>
        </p>
      )}

      <Field id="s-val" label="Energi" error={kcalError}>
        <TextInput
          id="s-val"
          num
          value={kcalText}
          onChange={setKcalText}
          onBlur={() => setKcalTouched(true)}
          onEnter={() => draft && commit(draft)}
          placeholder="0"
          inputMode="numeric"
          enterKeyHint="done"
          invalid={Boolean(kcalError)}
        />
        <span className="field__unit">kcal</span>
        <Stepper
          step={`${KCAL_STEP} kcal`}
          onDec={() => setKcalText(stepKcal(kcalText, -KCAL_STEP))}
          onInc={() => setKcalText(stepKcal(kcalText, KCAL_STEP))}
        />
      </Field>

      <TimeField value={at} onChange={setAt} />
    </Sheet>
  );
}
