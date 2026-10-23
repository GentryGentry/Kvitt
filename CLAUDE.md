# Kvitt

Personlig PWA för en enda användare. Väger onyttigheter (kcal) mot löpning (km) och visar ett löpande saldo i km. Allt är på svenska med decimalkomma. Ingen backend, inget konto: all data ligger i IndexedDB på enheten.

## Kommandon
```
npm run dev        # utveckling (nås från telefonen via LAN)
npm test           # Vitest, ca 150 tester, ska alltid vara gröna
npm run build      # typkontroll + produktionsbygge (PWA)
npm run icons      # ritar om ikonerna i public/ (scripts/make-icons.mjs)
```
Publicering: varje push till `main` kör `.github/workflows/pages.yml` (test, bygge, GitHub Pages). Pusha inte sönder `main`.

## Struktur
- `src/lib` – ren logik utan UI: saldo, formatering, tolkning av fritext, historik, statistik, diagramgeometri, export/import, databas. Allt här ska ha tester.
- `src/components`, `src/views` – React. Inget komponentbibliotek, ingen Tailwind.
- `src/styles/kvitt.css` – **sanningen för utseende** (tokens + komponenter, ur designöverlämningen). Ändra inga tokenvärden utan att fråga användaren.
- `src/styles/app.css` – appens egna tillägg (responsiv skärm, fasta överlägg, tangentbordsanpassning, drag-för-att-stänga).

## Datamodell (viktigt)
- `kmEquivalent` och `kcalPerKmUsed` på en matpost **fryses vid loggning**. Ändrad vikt eller faktor skriver aldrig om historiken. Redigerad kcal räknas om med postens egen frysta faktor.
- Saldo = löpning − mat för poster efter senaste nollställning (`ResetMarker`). Nollställning raderar ingenting.
- `isEstimate` är sant bara för oredigerade värden från en **inbyggd** sak. Uppskattningar visas med "ca". Allt du skriver in själv är exakt.
- Inbyggda saker seedas med id (`b-<namn>`). Byt aldrig namn på en inbyggd sak (id härleds ur namnet) och lägg nya sist. `meta`-tabellen minns vad som redan lagts in, så raderade eller ändrade inbyggda saker kommer inte tillbaka.
- Export/import är versionerat (`BACKUP_VERSION`), strikt validerat och allt-eller-inget. Ändrar du modellen: höj versionen och skriv en migrering.

## Utseenderegler
- Ett typsnitt (systemfont), tabulära siffror, inga fontfiler.
- Tap-ytor ≥ 44 px, safe-area via `env()`, AA-kontrast, `prefers-reduced-motion`.
- Radie 14 px (söm 4 px, piller 999). 1 px linjer. Skugga bara på bottom sheet.
- Färg bär bara tecknet: röd = ond (mat, skuld), grön = god (löpning, tillgodo). **Fel och destruktiva åtgärder är aldrig röda** (text + ikon + en mening).
- Rak, torr ton. Aldrig kroppsfixerat eller skambelagt. Inga utropstecken, ingen emoji, inga gradienter, ingen glassmorphism, inga platshållartexter.
- Minustecken är `−` (U+2212). Km visas med en decimal, uppskattade värden med "ca".

## Arbetssätt
1. Läs koden och kartlägg skillnader innan större ändringar. Fråga vid osäkerhet.
2. Logik först, med tester. Ändra UI sedan.
3. Provkör flödena i en mobilviewport (390×844, ljust och mörkt) innan du säger att något fungerar.
4. Rapportera avvikelser från specen öppet, inte bara fixar.
5. Datan finns bara på användarens telefon. Ändra aldrig något som kan förlora data utan att lägga en migrering och ett test.

## Kända begränsningar
- Historiklistan renderar alla poster (ingen virtualisering). Mät om den blir trög över ca 2 000 poster.
- Hemskärmsikonen är statisk (kan inte följa saldots färg, till skillnad från ordmärkets punkt i appen).
- Export använder delningsbladet när det finns, annars nedladdning. Nedladdning är opålitlig på iPhone i hemskärmsläge.
