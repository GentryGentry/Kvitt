# Kvitt

Personlig PWA som väger onyttigheter mot löpning. All data ligger lokalt på enheten (IndexedDB). Inget konto, ingen backend.

```
npm install
npm run dev        # utveckling, nås från telefonen via LAN-adressen
npm test           # enhetstester för beräkning och tolkning
npm run build      # produktionsbygge i dist/ (PWA, offline)
npm run preview    # servera dist/
npm run icons      # rita om ikonerna i public/
```

Logiken ligger i `src/lib` utan UI-beroenden. Gränssnittet ligger i `src/views` och `src/components`.

Status: modell, beräkning, tolkning, start/våg och loggning av mat och löpning. Historik, statistik och inställningar återstår.
