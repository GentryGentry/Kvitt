import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Star } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { useToast } from '../components/Toast';
import { logFood, toggleFavorite } from '../lib/actions';
import {
  formatKcal,
  formatKm,
  formatKmApprox,
  formatQty,
  kcalPerKm,
  kmFromKcal,
} from '../lib/calc';
import { buildFoodDraft, exactKcal, MAX_QTY, MIN_QTY } from '../lib/draft';
import { builtinOrder } from '../lib/foods';
import { findSuggestions, type Suggestion } from '../lib/parse';
import { favoriteItems, recentItems } from '../lib/stats';
import type { FoodItem, Settings } from '../lib/types';
import { TimeField } from './shared';
import s from './sheet.module.css';

interface Props {
  items: FoodItem[];
  settings: Settings;
  balanceKm: number;
  onClose: () => void;
}

function Chip({
  item,
  onTap,
  onHold,
}: {
  item: FoodItem;
  onTap: () => void;
  onHold: () => void;
}) {
  const timer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const clear = () => window.clearTimeout(timer.current);
  return (
    <button
      className={s.chip}
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
      <span className={s.chipName}>{item.name}</span>
      <span className={s.chipMeta}>
        {formatKcal(item.kcalPerUnit)} / {item.unitLabel}
      </span>
    </button>
  );
}

export function FoodSheet({ items, settings, balanceKm, onClose }: Props) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [kcalText, setKcalText] = useState('');
  const [selected, setSelected] = useState<{ item: FoodItem; quantity: number } | null>(null);
  const [saveAsCustom, setSaveAsCustom] = useState(true);
  const [at, setAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const perKm = kcalPerKm(settings);
  const suggestions = useMemo<Suggestion[]>(
    () => (selected ? [] : findSuggestions(text, items, { order: builtinOrder })),
    [text, items, selected],
  );
  const favorites = useMemo(() => favoriteItems(items), [items]);
  const recents = useMemo(() => recentItems(items), [items]);

  const draft = buildFoodDraft({ text, kcalText, selected, saveAsCustom });
  const kcalInvalid = kcalText.trim() !== '' && exactKcal(kcalText) === undefined;
  const typed = text.trim().length >= 2;
  const noMatch = typed && !selected && suggestions.length === 0;

  async function commit(input: {
    label: string;
    kcal: number;
    isEstimate: boolean;
    item?: FoodItem;
    quantity: number;
    newItem?: NonNullable<ReturnType<typeof buildFoodDraft>>['newItem'];
  }) {
    if (busy) return;
    setBusy(true);
    const logged = await logFood({ settings, at: at ?? new Date().toISOString(), ...input });
    const km = logged.entry.kmEquivalent;
    toast({
      message: `${input.label} · ${input.isEstimate ? formatKmApprox(-km) : formatKm(-km)}`,
      actionLabel: 'Ångra',
      onAction: logged.undo,
    });
    onClose();
  }

  function pick(item: FoodItem, quantity: number) {
    setSelected({ item, quantity });
    setText(item.name);
    setKcalText('');
  }

  function stepQty(delta: number) {
    setSelected((cur) =>
      cur ? { ...cur, quantity: Math.min(MAX_QTY, Math.max(MIN_QTY, cur.quantity + delta)) } : cur,
    );
  }

  const quickLog = (item: FoodItem) =>
    commit({
      label: item.name,
      kcal: Math.round(item.kcalPerUnit),
      isEstimate: item.source === 'builtin',
      item,
      quantity: 1,
    });

  const preview = draft && (
    <div className={s.preview}>
      <span className={s.previewMain}>
        {draft.isEstimate
          ? `${formatKcal(draft.kcal, { approx: true })} → ${formatKmApprox(kmFromKcal(draft.kcal, perKm))}`
          : `${formatKcal(draft.kcal)} → ${formatKm(kmFromKcal(draft.kcal, perKm))}`}
      </span>
      <span className={s.previewSub}>
        Saldo blir {formatKm(balanceKm - kmFromKcal(draft.kcal, perKm), { sign: true })}
      </span>
    </div>
  );

  const footer = (
    <>
      {preview}
      <div className={s.actions}>
        <button className={s.primary} disabled={!draft || busy} onClick={() => draft && commit(draft)}>
          Logga
        </button>
      </div>
    </>
  );

  return (
    <BottomSheet title="Jag åt något" onClose={onClose} footer={footer}>
      <div className={s.pad}>
        <label className={s.field} style={{ marginTop: 4 }}>
          <span className={s.label}>Vad hände?</span>
          <input
            ref={inputRef}
            className={s.input}
            type="text"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            placeholder="2 kanelbullar, liten pizza, 3 öl"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSelected(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (!selected && suggestions[0]) pick(suggestions[0].item, suggestions[0].quantity);
              else if (draft) void commit(draft);
            }}
          />
        </label>

        {selected && (
          <div className={s.selected}>
            <div className={s.selectedTop}>
              <div>
                <div className={s.suggestionName}>{selected.item.name}</div>
                <div className={s.suggestionMeta}>
                  {formatKcal(selected.item.kcalPerUnit)} / {selected.item.unitLabel}
                  {selected.item.source === 'builtin' && ' · riktvärde'}
                </div>
              </div>
              <button
                className={s.star}
                aria-pressed={selected.item.isFavorite}
                aria-label={selected.item.isFavorite ? 'Ta bort favorit' : 'Markera som favorit'}
                onClick={async () => {
                  await toggleFavorite(selected.item);
                  setSelected({ ...selected, item: { ...selected.item, isFavorite: !selected.item.isFavorite } });
                }}
              >
                <Star size={22} strokeWidth={1.75} fill={selected.item.isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
            <div className={s.stepper}>
              <button className={s.stepBtn} aria-label="Minska" disabled={selected.quantity <= MIN_QTY} onClick={() => stepQty(-0.5)}>
                <Minus size={18} strokeWidth={1.75} />
              </button>
              <span className={s.qty}>{formatQty(selected.quantity)}</span>
              <button className={s.stepBtn} aria-label="Öka" disabled={selected.quantity >= MAX_QTY} onClick={() => stepQty(0.5)}>
                <Plus size={18} strokeWidth={1.75} />
              </button>
              <span className={s.unit}>{selected.item.unitLabel}</span>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <ul className={s.suggestions}>
            {suggestions.map((sug) => (
              <li className={s.suggestion} key={sug.item.id}>
                <button className={s.suggestionMain} onClick={() => pick(sug.item, sug.quantity)}>
                  <span className={s.suggestionName}>
                    {sug.quantity !== 1 ? `${formatQty(sug.quantity)} × ` : ''}
                    {sug.item.name}
                  </span>
                  <span className={s.suggestionMeta}>
                    {formatKcal(sug.kcal, { approx: sug.item.source === 'builtin' })} ·{' '}
                    {formatKcal(sug.item.kcalPerUnit)} / {sug.item.unitLabel}
                  </span>
                </button>
                <button
                  className={s.star}
                  aria-pressed={sug.item.isFavorite}
                  aria-label={sug.item.isFavorite ? 'Ta bort favorit' : 'Markera som favorit'}
                  onClick={() => toggleFavorite(sug.item)}
                >
                  <Star size={20} strokeWidth={1.75} fill={sug.item.isFavorite ? 'currentColor' : 'none'} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className={s.field}>
          <span className={s.label}>kcal (exakt)</span>
          <input
            className={s.input}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Valfritt"
            aria-invalid={kcalInvalid}
            value={kcalText}
            onChange={(e) => setKcalText(e.target.value)}
          />
        </label>
        {kcalInvalid && <p className={s.error}>Ange kcal som ett helt tal mellan 1 och 20 000.</p>}
        {noMatch && !kcalText && <p className={s.hint}>Hittade inget. Ange kcal själv.</p>}

        {!selected && draft?.newItem && (
          <label className={s.check}>
            <input type="checkbox" checked={saveAsCustom} onChange={(e) => setSaveAsCustom(e.target.checked)} />
            Spara som egen sak
          </label>
        )}

        <TimeField value={at} onChange={setAt} />
      </div>

      {!typed && !selected && (favorites.length > 0 || recents.length > 0) && (
        <>
          {favorites.length > 0 && (
            <div className={s.section}>
              <h3 className={s.sectionTitle} style={{ paddingLeft: 'calc(18px + var(--sal))' }}>Favoriter</h3>
              <div className={s.chips}>
                {favorites.map((i) => (
                  <Chip key={i.id} item={i} onTap={() => quickLog(i)} onHold={() => pick(i, 1)} />
                ))}
              </div>
            </div>
          )}
          {recents.length > 0 && (
            <div className={s.section}>
              <h3 className={s.sectionTitle} style={{ paddingLeft: 'calc(18px + var(--sal))' }}>Senaste</h3>
              <div className={s.chips}>
                {recents.map((i) => (
                  <Chip key={i.id} item={i} onTap={() => quickLog(i)} onHold={() => pick(i, 1)} />
                ))}
              </div>
            </div>
          )}
          <p className={s.hint} style={{ paddingLeft: 'calc(18px + var(--sal))' }}>
            Tryck för att logga direkt. Håll inne för att ändra antal.
          </p>
        </>
      )}
    </BottomSheet>
  );
}
