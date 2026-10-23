import { useEffect, useRef, useState } from 'react';
import { Brand } from '../components/Brand';
import { Field, TextInput } from '../components/Fields';
import { createSettings } from '../lib/actions';
import { DEFAULT_SETTINGS, parseNumber, validateWeight } from '../lib/calc';
import { requestPersistence } from '../lib/db';

export function Welcome() {
  const [text, setText] = useState('80');
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const kg = parseNumber(text);
  const error = validateWeight(kg);
  const showError = Boolean(error) && (text.trim() !== '' || touched);

  useEffect(() => {
    if (matchMedia('(pointer:fine)').matches) ref.current?.focus();
  }, []);

  async function submit() {
    setTouched(true);
    if (error || kg === undefined) return;
    await createSettings({ ...DEFAULT_SETTINGS, weightKg: kg });
    void requestPersistence();
  }

  return (
    <main className="screen welcome">
      <header className="welcome__head">
        <Brand />
      </header>
      <section className="welcome__body">
        <h2 className="welcome__title">
          Hur mycket
          <br />
          väger du?
        </h2>
        <p className="welcome__lead">
          Vikten används bara för att räkna om kcal till kilometer. Den stannar i telefonen.
        </p>
        <Field id="w-kg" label="Vikt" hero error={showError ? error : undefined}>
          <TextInput
            ref={ref}
            id="w-kg"
            hero
            value={text}
            onChange={setText}
            onBlur={() => setTouched(true)}
            onEnter={submit}
            inputMode="decimal"
            enterKeyHint="go"
            invalid={showError}
          />
          <span className="field__unit">kg</span>
        </Field>
      </section>
      <footer className="welcome__foot">
        <button className="btn btn--ink" type="button" disabled={Boolean(error)} onClick={submit}>
          Börja
        </button>
      </footer>
    </main>
  );
}
