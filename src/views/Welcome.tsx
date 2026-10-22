import { useState } from 'react';
import { createSettings } from '../lib/actions';
import { DEFAULT_SETTINGS, parseNumber, validateWeight } from '../lib/calc';
import { requestPersistence } from '../lib/db';
import s from './Welcome.module.css';

export function Welcome() {
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const kg = parseNumber(text);
  const error = validateWeight(kg);

  async function submit() {
    setTouched(true);
    if (error || kg === undefined) return;
    await createSettings({ ...DEFAULT_SETTINGS, weightKg: kg });
    void requestPersistence();
  }

  return (
    <main className={s.root}>
      <div className={s.top}>
        <h1 className={s.brand}>Kvitt</h1>
        <p className={s.lead}>Väger det du äter mot det du springer.</p>
      </div>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className={s.label} htmlFor="weight">
          Din vikt
        </label>
        <div className={s.inputWrap}>
          <input
            id="weight"
            className={s.input}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="80"
            value={text}
            aria-invalid={touched && Boolean(error)}
            onChange={(e) => setText(e.target.value)}
          />
          <span className={s.unit}>kg</span>
        </div>
        {touched && error ? (
          <p className={s.error}>{error}</p>
        ) : (
          <p className={s.note}>
            Används för att räkna om mat till kilometer. Sparas bara på den här enheten. Går att ändra senare.
          </p>
        )}
        <button className={s.button} type="submit">
          Fortsätt
        </button>
      </form>
    </main>
  );
}
