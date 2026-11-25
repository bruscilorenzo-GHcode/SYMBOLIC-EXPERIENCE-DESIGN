# Healing Room · Domande di design (verso la configurazione finale)

Stato: **bozza di lavoro MAS** — da rispondere con Greg Wilk e Lorenzo Brusci.
Riferimenti: `01_HealingRoom_communication_GREG_Lorenzo_0808.pdf` (concept + comunicazione),
`02_PHAS_healingRoom_2408.pdf` (stazioni tipologiche), motore `packages/healing-room`
(deterministico) ed esperienza `/healing` in `apps/studio-web`.

## Cosa è già fissato dal brief (non si ridiscute)

- Tre zone: **Vestibolo → Stimolo-Esposizione (Osservazione) → Focus/Terapia**, con due
  variazioni di relazione spaziale: *lineare* (corridoio) e *concentrata* (stanza nella stanza).
- **Struttura nera riflettente** (cubo nero lucido con porta d'ingresso) dentro lo **spazio
  espositivo bianco** con pareti a pannelli cellula/neurone; soffitto minimal scuro.
- **Sistema modulare a parete**: intelaiatura in acciaio + printout, light box, schermi LED
  modulari, display. La modularità di **oggetti, luce e suono** è il principio costitutivo.
- Stazioni: **kiosk 4 m²** (tubo di isolamento, schermo sferico, doccia sonora, "VR analogica"),
  **capsula 16 m²** (dome appesi/in piedi, poltrone bioshape), **evento 255 m²**
  (Osservazione 151,52 m², 4 spazi diagnostici ≈ 18 m², Focus 41,05 m²; 265,64 m² misurati).
- Doppelgänger digitale deterministico dai campioni diagnostici; healing goal che si
  materializza al centro dell'area focus; mente quotidiana → osservante → focalizzata → vuota.

## A · Spazi e percorso

- **A1** — Vestibolo: quali funzioni reali entro la prima apertura? (reception, guardaroba,
  info,marketplace di procedure?) che superficie minima assumiamo, visto che il brief non la misura?
- **A2** — La sequenza lineare o concentrata è **scelta del committente per site** o scelta
  fissa per prototipo? Quali siti pilota (fiera, museum, clinica, retail) vincolano quale delle due?
- **A3** — I 4 spazi diagnostici A–D sono specializzati (uno per canale di comunicazione:
  Sé / Gemello / Altri / Artefatti) o intercambiabili? Il motore attuale li tiene generici.
- **A4** — L'accesso all'area focus resta sorvegliato da una *guide persona* ( psicologo/coach
  con AI bot)? Con che criterio la "porta si apre" oltre a dati raccolti + concentrazione?

## B · Modulo di parete (oggetti)

- **B1** — Griglia modulare: il prototype usa moduli ~1,1 m (quasi-quadrati). Dimensione reale
  del *structural wall module* (es. 0,6 × 1,2 m? 1,2 × 1,2 m?) e corso/altezza dei pannelli?
- **B2** — Mix dei tipi: il prototipo genera ~38% cellule, 20% printout, 16% light box,
  18% LED, 8% display. Che **rapporto** vuole la progettazione? C'è un pattern firmato
  (es. cellule ai bordi, LED al centro) da fissare come regola deterministica?
- **B3** — I printout mostrano cosa? (opere, ritratti di doppiegänger, mappe di dati, fotografie
  dei visitatori anonimizzati). Chi cura la selezione e il refresh?
- **B4** — I display "custom shape" (sferico, back-projection) dove si collocano: dentro le
  capsula, sul vestibolo, o solo nelle stazioni kiosk?

## C · Luce

- **C1** — Scena luce per zona: il prototipo usa vestibolo pieno (0,6), galleria controllata
  (0,3), focus quasi buio (0,1). Confermare o correggere i livelli (in lux equivalenti)?
- **C2** — I light box respirano con lo stato mentale (periodo legato al respiro del
  doppelgänger)? O restano costanti e solo i LED fanno data?
- **C3** — C'è un **ciclo circadiano** del soffitto (alba → giorno → tramonto) durante la
  giornata di apertura, o luce disciplinata solo dalla dramaturgia della sessione?
- **C4** — La porta del cubo nero si "annuncia" con un laveluce? Colore/durata?

## D · Suono

- **D1** — Doccia sonora kiosk: quanti transducer per la doccia (es. 4/6/8 piccoli) e quale
  formato fisico (anello sospeso, parabola, shower a soffitto)?
- **D2** — Mappa stato mentale → soundbed: il motore usa 66/58/50/44 BPM con respiro 4→8 s.
  Confermare o fornire i riferimenti terapeutici da rispettare?
- **D3** — Il suono nelle 4 capsule diagnostiche è **per canale** (Sé/Gemello/Altri/Artefatti
  hanno un timbro proprio) o per stazione? Il prototipo today tinge solo la luce.
- **D4** — Routing: il bridge OSC esistente (pacchetto `osc-bridge`) esporta la sessione
  verso il venue renderer: quale address space serve a Greg (elenco canali/timbre)?

## E · Diagnostica

- **E1** — Nella prima versione i "campioni" sono **self-report** (slider 0–1 per canale).
  Quali dispositivi reali entrano poi (HRV, GSR, respirazione, pupil, tempo di reazione)?
  Quale canale mappa quale dispositivo?
- **E2** — Ogni quanto la stanza chiede un campione (es. ogni 30 s nel vestibolo, continuo nel
  focus)? Il motore tiene una finestra di 24 campioni: dimensione giusta?
- **E3** — Le soglie di accesso al focus (4+ campioni, concentrazione ≥ 55%) sono terapeutiche
  o anti-abuso? Chi le calibra?

## F · Doppelgänger

- **F1** — Quanto **personificare**: entità astratta (attuale: corpo + satelliti) o volto/figura?
  A che punto della scala 0–1 di "personificazione" sta il prototipo accettabile?
- **F2** — Persiste tra sessioni (memoria del visitatore) o si ricrea a ogni sessione?
  Se persiste, chi possiede i dati e come si cancella (consenso, GDPR)?
- **F3** — Il doppelgänger può parlare (voce del Cicerone AI) o resta muto e-only visivo?

## G · Stazioni e roll-out

- **G1** — Cosa costruiamo per primo: kiosk (più economico, self-service), capsula (evento),
  o l'evento 255 m² come flagship? La scelta cambia il design di dettaglio del modulo parete?
- **G2** — I gusci (dome/tubo) sono fisica reale da produzione o momento cinematico 1:1 nel
  game engine? Chi produce (PHAS brief → design team del cliente)?
- **G3** — L'evento station ha una capienza dichiarata? (flusso massimo di agenti in
  osservazione + turni in focus).

## H · Contenuti e modello

- **H1** — Il "marketplace di cure procedures" (brief) entra nell'app come catalogo nel
  vestibolo (esplorabile prima della diagnostica) o solo dopo la sessione?
- **H2** — I contenuti del focus area ("central artifact": prodotto fisico o opera virtuale)
  sono curati da chi? (gallerista, terapeuta, designer del cliente)
- **H3** — Lingue di lancio: IT/EN confermate; serve FR o altre prima del primo evento?
- **H4** — Criterio di successo del prototipo: tempo in focus raggiunto? goal materializzato?
  questionario post-sessione? (Serve per misurare il go/no-go.)

---

**Come rispondere**: indicare il codice domanda (es. "B1: 0,6 × 1,2 m; C2: light box costanti")
in un unico passaggio. Le risposte diventano costanti deterministiche del motore
(`packages/healing-room/src/…`) e regole della scena (`apps/studio-web/src/healing/…`).
