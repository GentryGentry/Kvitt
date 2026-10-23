import { useEffect, useState } from 'react';
import { Field, Stepper, TextInput } from '../components/Fields';
import { Icon } from '../components/Icon';
import { Segment, SetRow } from '../components/Controls';
import { useToast } from '../components/Toast';
import { saveSettings, undoReset } from '../lib/actions';
import { deliverBackup, readBackup } from '../lib/backup';
import { formatDecimal, formatKm, kcalPerKm, latestReset, parseNumber, validateWeight } from '../lib/calc';
import { navigate } from '../lib/route';
import { dayKey, daysBetween, shortFromKey } from '../lib/time';
import type { FoodItem, ResetMarker, Settings as SettingsT, ThemeChoice } from '../lib/types';
import { Page } from './Page';

interface Props {
  settings: SettingsT;
  resets: ResetMarker[];
  items: FoodItem[];
  onReset: () => void;
  onImportClick: () => void;
}

const FACTOR_MIN = 0.8;
const FACTOR_MAX = 1.2;
const WEIGHT_STEP = 0.5;
const FACTOR_STEP = 0.05;
export const WEIGHT_TEXT = (kg: number) => kg.toFixed(1).replace('.', ',');
const FACTOR_TEXT = (f: number) => f.toFixed(2).replace('.', ',');
const FACTOR_ERROR = 'Ange mellan 0,80 och 1,20.';

export function exportStatus(lastExportAt: string | undefined, now: Date = new Date()) {
  if (!lastExportAt) return { alert: true, text: 'Aldrig exporterad. Gör en export nu.' };
  const key = dayKey(lastExportAt);
  const days = daysBetween(dayKey(now), key);
  if (days > 30) return { alert: true, text: `Senaste export ${shortFromKey(key)}, för ${days} dagar sedan.` };
  return { alert: false, text: `Senast exporterad ${shortFromKey(key)}.` };
}

export function Settings({ settings, resets, items, onReset, onImportClick }: Props) {
  const toast = useToast();
  const [wText, setWText] = useState(WEIGHT_TEXT(settings.weightKg));
  const [fText, setFText] = useState(FACTOR_TEXT(settings.kcalPerKmPerKg));
  const [advanced, setAdvanced] = useState(false);

  // Utifrån ändrad vikt eller faktor (till exempel efter import) följer fälten med.
  useEffect(() => {
    if (parseNumber(wText) !== settings.weightKg) setWText(WEIGHT_TEXT(settings.weightKg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.weightKg]);
  useEffect(() => {
    const f = parseNumber(fText);
    if (f === undefined || Math.abs(f - settings.kcalPerKmPerKg) > 1e-9) setFText(FACTOR_TEXT(settings.kcalPerKmPerKg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.kcalPerKmPerKg]);

  const weight = parseNumber(wText);
  const weightError = validateWeight(weight) && wText.trim() !== '' ? validateWeight(weight) : wText.trim() === '' ? validateWeight(undefined) : undefined;
  const factor = parseNumber(fText.replace(',', '.'));
  const factorValid = factor !== undefined && factor >= FACTOR_MIN - 1e-9 && factor <= FACTOR_MAX + 1e-9;

  function onWeight(v: string) {
    setWText(v);
    const n = parseNumber(v);
    if (n !== undefined && !validateWeight(n) && n !== settings.weightKg) void saveSettings({ weightKg: n });
  }
  function stepWeight(delta: number) {
    const cur = weight ?? settings.weightKg;
    const next = Math.min(250, Math.max(30, Math.round((cur + delta) * 10) / 10));
    setWText(WEIGHT_TEXT(next));
    void saveSettings({ weightKg: next });
  }
  function onFactor(v: string) {
    setFText(v);
    const n = parseNumber(v);
    if (n !== undefined && n >= FACTOR_MIN - 1e-9 && n <= FACTOR_MAX + 1e-9) void saveSettings({ kcalPerKmPerKg: Math.round(n * 100) / 100 });
  }
  function stepFactor(delta: number) {
    const cur = factor ?? settings.kcalPerKmPerKg;
    const next = Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, Math.round((cur + delta) * 100) / 100));
    setFText(FACTOR_TEXT(next));
    void saveSettings({ kcalPerKmPerKg: next });
  }

  const marker = latestReset(resets);
  const undoable = marker?.undoable ? marker : undefined;
  const status = exportStatus(settings.lastExportAt);
  const favorites = items.filter((i) => i.isFavorite).length;

  async function doExport() {
    const backup = await readBackup();
    if (!backup) return;
    if (await deliverBackup(backup)) await saveSettings({ lastExportAt: backup.exportedAt });
  }


  return (
    <Page route="settings" title="Inställningar" back="start">
      <div className="set-sect">Kroppsvikt</div>
      <div className="setbox">
        <Field id="s-weight" label="Kroppsvikt i kilo" hero hideLabel error={weightError}>
          <TextInput id="s-weight" hero value={wText} onChange={onWeight} inputMode="decimal" invalid={Boolean(weightError)} />
          <span className="field__unit">kg</span>
          <Stepper step="0,5 kg" onDec={() => stepWeight(-WEIGHT_STEP)} onInc={() => stepWeight(WEIGHT_STEP)} />
        </Field>
        <p className="help">Mellan 30 och 250 kg. Gäller bara nya poster, det som redan är loggat ändras inte.</p>
      </div>
      <SetRow
        label="Avancerat"
        sub={`kcal/km-faktor ${FACTOR_TEXT(settings.kcalPerKmPerKg)}`}
        expanded={advanced}
        onClick={() => setAdvanced(!advanced)}
      />
      {advanced && (
        <div className="setbox">
          <Field id="s-factor" label="Faktor" error={factorValid || fText.trim() === '' ? undefined : FACTOR_ERROR}>
            <TextInput id="s-factor" num value={fText} onChange={onFactor} inputMode="decimal" invalid={!factorValid} />
            <Stepper step="0,05" onDec={() => stepFactor(-FACTOR_STEP)} onInc={() => stepFactor(FACTOR_STEP)} />
          </Field>
          <p className="help">
            Mellan 0,80 och 1,20, standard 1,00. Nu {formatDecimal(kcalPerKm(settings), 0)} kcal per km. Högre faktor gör varje kcal billigare i km, lägre gör den dyrare. Ändras bara för nya poster.
          </p>
        </div>
      )}

      <div className="set-sect">Tema</div>
      <div style={{ padding: '0 var(--gutter)' }}>
        <Segment<ThemeChoice>
          label="Tema"
          value={settings.theme}
          onChange={(theme) => void saveSettings({ theme })}
          options={[['auto', 'Auto'], ['light', 'Ljust'], ['dark', 'Mörkt']]}
        />
      </div>

      <div className="set-sect">Saldo</div>
      <SetRow label="Nollställ saldot" sub="Inget raderas. Startpunkten flyttas." meta="" onClick={onReset} />
      {undoable && (
        <SetRow
          label="Ångra nollställning"
          sub={`Nollställd ${shortFromKey(dayKey(undoable.at))}, saldot var ${formatKm(undoable.balanceBeforeKm, { sign: true })}. Kvar tills du loggar nästa post.`}
          chevron={false}
          onClick={async () => {
            if (await undoReset()) toast({ message: 'Nollställningen ångrad' });
          }}
        />
      )}

      <div className="set-sect">Sparade saker</div>
      <SetRow
        label="Hantera sparade saker"
        sub={`${favorites} ${favorites === 1 ? 'favorit' : 'favoriter'}`}
        meta={items.length}
        onClick={() => navigate('saved')}
      />

      <div className="set-sect">Data</div>
      <SetRow label="Exportera all data" sub="JSON-fil" lead="export" chevron={false} onClick={doExport} />
      <SetRow label="Importera data" sub="Ersätter allt som finns nu" lead="import" chevron={false} onClick={onImportClick} />
      <p className={`note-line${status.alert ? ' is-alert' : ''}`}>
        {status.alert && <Icon name="alert" />}
        <span>{status.text}</span>
      </p>
      <p className="help" style={{ padding: 'var(--s-2) var(--gutter) 0' }}>
        Allt ligger bara i den här webbläsaren. Exportfilen är det enda skyddet om telefonen byts eller webbläsardata rensas.
      </p>

      <div className="set-sect">Så räknas det</div>
      <div className="prose">
        <p>
          Varje post blir kilometer: <b>kcal ÷ (vikt × faktor)</b>. Med 80 kg och faktor 1,0 är 600 kcal ca 7,5 km.
        </p>
        <p>
          Kcal för inbyggda saker är riktvärden och märks ”ca”. Siffror du skriver in själv räknas som exakta. Löpning är exakta km, men verklig förbrukning varierar med tempo, underlag och kropp.
        </p>
        <p>Varje post får sitt km-värde när den loggas. Ändrar du vikt eller faktor ändras inget bakåt.</p>
        <p>Saldot är löpning minus mat. Nollställning flyttar bara startpunkten, ingenting raderas.</p>
      </div>
    </Page>
  );
}
