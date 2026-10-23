import { useState } from 'react';
import { Field, Stepper, TextInput, TimeField } from '../components/Fields';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { deleteFood, deleteRun, updateFood, updateRun } from '../lib/actions';
import { KCAL_ERROR, KCAL_STEP, exactKcal } from '../lib/draft';
import type { FoodEntry, RunEntry } from '../lib/types';
import { FoodPreview, stepKcal } from './FoodSheet';
import { RUN_ERROR, RunPreview, kmText, stepKm, validKm } from './RunSheet';

export function EditFoodSheet({ entry, baseKm, onClose }: { entry: FoodEntry; baseKm: number; onClose: () => void }) {
  const toast = useToast();
  const [label, setLabel] = useState(entry.label);
  const [kcalText, setKcalText] = useState(String(entry.kcal));
  const [at, setAt] = useState<string | null>(entry.at);

  const kcal = exactKcal(kcalText);
  const error = kcal === undefined ? KCAL_ERROR : undefined;
  const valid = kcal !== undefined && label.trim() !== '';
  const unchanged = kcal === entry.kcal;

  const footer = (
    <>
      <FoodPreview
        draft={kcal === undefined ? undefined : { kcal, isEstimate: entry.isEstimate && unchanged }}
        baseKm={baseKm}
        perKm={entry.kcalPerKmUsed}
      />
      <button
        className="btn"
        type="button"
        disabled={!valid}
        onClick={async () => {
          await updateFood(entry, { label: label.trim(), kcal: kcal!, at: at ?? entry.at });
          onClose();
        }}
      >
        Spara
      </button>
    </>
  );

  return (
    <Sheet
      kind="ate"
      title="Ändra post"
      onClose={onClose}
      onDelete={async () => {
        const undo = await deleteFood(entry);
        toast({ title: entry.label, message: 'borttagen', actionLabel: 'Ångra', onAction: undo });
        onClose();
      }}
      footer={footer}
    >
      <Field id="e-name" label="Vad?">
        <TextInput id="e-name" value={label} onChange={setLabel} />
      </Field>
      <Field id="e-val" label="Energi" error={error}>
        <TextInput id="e-val" num value={kcalText} onChange={setKcalText} inputMode="numeric" invalid={Boolean(error)} />
        <span className="field__unit">kcal</span>
        <Stepper
          step={`${KCAL_STEP} kcal`}
          onDec={() => setKcalText(stepKcal(kcalText, -KCAL_STEP))}
          onInc={() => setKcalText(stepKcal(kcalText, KCAL_STEP))}
        />
      </Field>
      <TimeField value={at} onChange={setAt} startOpen />
    </Sheet>
  );
}

export function EditRunSheet({ entry, baseKm, onClose }: { entry: RunEntry; baseKm: number; onClose: () => void }) {
  const toast = useToast();
  const [text, setText] = useState(kmText(entry.km));
  const [at, setAt] = useState<string | null>(entry.at);
  const km = validKm(text);
  const error = km === undefined ? RUN_ERROR : undefined;

  const footer = (
    <>
      <RunPreview km={km} baseKm={baseKm} />
      <button
        className="btn"
        type="button"
        disabled={km === undefined}
        onClick={async () => {
          await updateRun(entry, { km: km!, at: at ?? entry.at });
          onClose();
        }}
      >
        Spara
      </button>
    </>
  );

  return (
    <Sheet
      kind="ran"
      title="Ändra löpning"
      onClose={onClose}
      onDelete={async () => {
        const undo = await deleteRun(entry);
        toast({ title: kmText(entry.km) + ' km', message: 'borttagen', actionLabel: 'Ångra', onAction: undo });
        onClose();
      }}
      footer={footer}
    >
      <Field id="e-km" label="Sträcka" hero error={error}>
        <TextInput id="e-km" hero value={text} onChange={setText} inputMode="decimal" invalid={Boolean(error)} />
        <span className="field__unit">km</span>
        <Stepper step="0,5 km" onDec={() => setText(stepKm(text, -0.5))} onInc={() => setText(stepKm(text, 0.5))} />
      </Field>
      <TimeField value={at} onChange={setAt} startOpen />
    </Sheet>
  );
}
