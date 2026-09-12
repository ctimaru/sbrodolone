# Sbrodolone

Sito statico per Pizzeria Kebab Sbrodolone a Carmagnola. HTML, CSS e JavaScript senza framework, build o dipendenze di produzione.

## Struttura

- `index.html`: contenuti, metadati e pulsanti di ordinazione.
- `styles.css`: layout responsive, barra inferiore fissa, safe area e animazioni ridotte quando richiesto dal dispositivo.
- `app.js`: apertura GloriaFood, caricamento, gestione del focus e prevenzione dei doppi clic.
- `assets/`: favicon e fotografia generata a scopo illustrativo, ottimizzata in WebP con una versione mobile. Non rappresenta un prodotto effettivamente fotografato nel locale.

## Ordinazione

Si usa lo script ufficiale `https://www.fbgcdn.com/embedder/js/ewm2.js` con gli identificativi originali:

- CUID: `671be21d-504f-4a54-bc45-8f9c8567171b`
- RUID: `af5399bf-9d5e-4481-9478-f7eadf473ca8`

Tutti e tre i pulsanti aprono direttamente il servizio. La chiamata `glfOpenWidget` usa `forceMode: 'desktop'` per mantenere il pannello sovrapposto anche sui dispositivi Android. Il contenuto interno, il carrello, i pagamenti e i tempi di caricamento restano gestiti da GloriaFood; il sito non può modificarli.

I link contengono anche l'URL ufficiale `api/widget_redirect`, utilizzabile senza il JavaScript del sito. Il pannello di caricamento offre sempre l'apertura in una nuova scheda. Dopo 12 secondi compare una spiegazione del ritardo; se lo script non è disponibile, il controllo si interrompe dopo 8 secondi. «Torna al sito» annulla senza ricaricare finché lo script non è partito; dopo l'avvio del trasporto del fornitore ricarica la pagina per annullare in sicurezza eventuali risposte tardive.

Il pannello di caricamento gestisce Tab ed Escape; alla chiusura del menu tornano focus e scorrimento della pagina. I link modificati (Ctrl/Cmd/Shift + clic) mantengono il comportamento nativo. Non vengono letti o modificati i dati nel frame cross-origin.

Con i cookie di terze parti bloccati, il servizio può mostrare il proprio avviso e il pulsante «Open in a new tab». Non disabilitare le protezioni del browser: usare l'alternativa in una nuova scheda. Verificare questo caso su Safari/iPhone e Chrome/Android prima della pubblicazione in produzione.

## Controlli locali

Richiede Node.js 18 o successivo soltanto per i test:

```sh
npm ci
npm test
```

I test simulano il DOM e il servizio esterno: non inviano ordini reali e non sostituiscono i controlli su browser e dispositivi reali. Per un'anteprima usare un server statico nella cartella, ad esempio `python3 -m http.server 8000`.

Checklist manuale: larghezze 320, 390, 768 e 1440 px; zoom 200%; navigazione da tastiera; tutte le CTA; doppi clic; apertura/chiusura ripetuta; rete lenta o script bloccato; preferenza movimento ridotto; collegamento Google; footer non coperto dalla barra fissa. Non completare ordini o pagamenti durante il test.

## Pubblicazione

La repository conserva il workflow GitHub Pages e il file `CNAME` esistenti. Un commit su `main` attiva il workflow già configurato; questa revisione non cambia DNS, dominio o impostazioni Vercel.

Per Vercel pubblicare i file statici dalla radice della repository, senza comando di build. Un caricamento manuale precedente non implica sincronizzazione automatica con GitHub. Collegamento Git e deploy in produzione vanno verificati separatamente: un commit GitHub, da solo, non prova che il dominio mostri la nuova versione.

Indirizzo, recapiti e orari non verificati non sono duplicati nel sito: il collegamento alla scheda Google originale resta il riferimento per i contatti, mentre disponibilità e prezzi sono nel menu GloriaFood.
