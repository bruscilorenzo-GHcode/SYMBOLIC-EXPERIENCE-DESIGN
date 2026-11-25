import { useEffect, useRef, useState } from 'react'
import {
  MAS_BRIEF_STORAGE_KEY,
  budgetLabel,
  buildSeedBriefText,
  buildSeedSummary,
  defaultSeedBrief,
  kindLabel,
  masMailtoHref,
  timelineLabel,
  type PlayComposition,
  type PlayProgression,
  type PlaySeedBrief,
} from '@aura-spec/play-engine'

interface PlaySeedDialogProps {
  composition: PlayComposition
  progression: PlayProgression
  objectMode: 'landscape' | 'indoor'
  lang?: 'it' | 'en'
  onClose: () => void
}

export function PlaySeedDialog({ composition, progression, objectMode, lang = 'it', onClose }: PlaySeedDialogProps) {
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  const [brief, setBrief] = useState<PlaySeedBrief>(() => defaultSeedBrief())
  const [saved, setSaved] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const seed = buildSeedSummary(composition, progression, objectMode, lang)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = shellRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [onClose])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MAS_BRIEF_STORAGE_KEY)
      if (raw) setBrief({ ...defaultSeedBrief(), ...(JSON.parse(raw) as Partial<PlaySeedBrief>) })
    } catch {
      // Local-only brief; storage may be unavailable.
    }
  }, [])

  useEffect(() => {
    if (!saved) return
    try {
      window.localStorage.setItem(MAS_BRIEF_STORAGE_KEY, JSON.stringify(brief))
    } catch {
      // Never block the visitor on persistence.
    }
  }, [brief, saved])

  const update = <K extends keyof PlaySeedBrief>(key: K, value: PlaySeedBrief[K]): void => {
    setBrief((current) => ({ ...current, [key]: value }))
    setSaved(true)
  }

  const copyBrief = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildSeedBriefText(seed, brief, composition, lang))
      alert(t('Seme copiato. Puoi incollarlo in una email o in un messaggio.', 'Seed copied. You can paste it into an email or message.'))
    } catch {
      alert(t('Il browser ha bloccato la copia. Puoi comunque scaricare o stampare il seme.', 'The browser blocked copying. You can still download or print the seed.'))
    }
  }

  const downloadBrief = (): void => {
    const blob = new Blob([buildSeedBriefText(seed, brief, composition, lang)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = t('mas-richiesta-progetto.txt', 'mas-project-request.txt')
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1200)
  }

  const mailto = masMailtoHref(brief, seed, composition, '', lang)
  const configuredMailto = import.meta.env.VITE_MAS_REQUEST_MAILTO

  return (
    <div className="seed-dialog" role="dialog" aria-modal="true" aria-label={t('Seme spaziale e richiesta MAS', 'Spatial seed and MAS request')}>
      <div className="seed-shell" ref={shellRef}>
        <header>
          <span className="seed-eyebrow">MED.IA ARCHITECTURE STUDIO</span>
          <h2>{seed.title}</h2>
          <p className="seed-narrative">{seed.narrative}</p>
        </header>

        <section className="seed-panel">
          <h3>{t('Il seme', 'The seed')}</h3>
          <p className="seed-atmosphere">
            <strong>{seed.atmosphere}</strong>
            <span>{seed.materials.join(' · ')}</span>
          </p>
          <div className="seed-process">
            {seed.process.map((step, index) => (
              <span key={step} className={index === 0 ? 'is-active' : ''}>
                {step}
              </span>
            ))}
          </div>
          <div className="seed-archetypes">
            {seed.projectArchetypes.map((archetype) => (
              <span key={archetype}>{archetype}</span>
            ))}
          </div>
          <p className="seed-manifesto">{seed.manifesto}</p>
        </section>

        <section className="seed-form">
          <h3>{t('Porta questo spazio alla vita', 'Bring this space to life')}</h3>
          <p className="seed-lede">
            {t('MAS legge il tuo seme come un punto di partenza, non come una specifica chiusa.', 'MAS reads your seed as a starting point, not a closed specification.')}
          </p>
          <div className="field-grid">
            <label>
              <span>{t('Nome', 'Name')}</span>
              <input value={brief.name} onChange={(event) => update('name', event.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={brief.email} onChange={(event) => update('email', event.target.value)} />
            </label>
            <label>
              <span>{t('Luogo', 'Site')}</span>
              <input value={brief.site} onChange={(event) => update('site', event.target.value)} />
            </label>
            <label>
              <span>{t('Tipo', 'Type')}</span>
              <select value={brief.kind} onChange={(event) => update('kind', event.target.value as PlaySeedBrief['kind'])}>
                {(['landscape', 'indoor', 'phygital'] as const).map((kind) => (
                  <option key={kind} value={kind}>{kindLabel(kind, lang)}</option>
                ))}
              </select>
            </label>
            <label className="span-2">
              <span>{t('Atmosfera', 'Atmosphere')}</span>
              <input
                placeholder={seed.atmosphere}
                value={brief.atmosphere}
                onChange={(event) => update('atmosphere', event.target.value)}
              />
            </label>
            <label>
              <span>Budget</span>
              <select value={brief.budget} onChange={(event) => update('budget', event.target.value as PlaySeedBrief['budget'])}>
                {(['essenziale', 'consapevole', 'completo', 'signature'] as const).map((budget) => (
                  <option key={budget} value={budget}>{budgetLabel(budget, lang)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('Tempo', 'Timeline')}</span>
              <select value={brief.timeline} onChange={(event) => update('timeline', event.target.value as PlaySeedBrief['timeline'])}>
                {(['esplorazione', '6-12 mesi', '12-24 mesi', 'flessibile'] as const).map((timeline) => (
                  <option key={timeline} value={timeline}>{timelineLabel(timeline, lang)}</option>
                ))}
              </select>
            </label>
            <label className="span-2">
              <span>{t('Note', 'Notes')}</span>
              <textarea rows={3} value={brief.notes} onChange={(event) => update('notes', event.target.value)} />
            </label>
          </div>
          <div className="seed-actions">
            <button type="button" className="primary" onClick={() => window.print()}>{t('Stampa il seme', 'Print the seed')}</button>
            <button type="button" onClick={downloadBrief}>{t('Scarica richiesta', 'Download request')}</button>
            <button type="button" onClick={() => void copyBrief()}>{t('Copia', 'Copy')}</button>
            {configuredMailto ? (
              <a className="seed-send" href={mailto}>{t('Invia a MAS', 'Send to MAS')}</a>
            ) : (
              <span className="seed-pending">{t('Invio diretto in arrivo · usa stampa, copia o download', 'Direct sending coming soon · use print, copy or download')}</span>
            )}
          </div>
          <p className="seed-note">
            {t('Nessun dato lascia il browser. La richiesta può essere inviata manualmente o collegata a un hook di progetto.', 'No data leaves the browser. The request can be sent manually or connected to a project hook.')}
          </p>
        </section>

        <footer className="seed-footer">
          <span>{seed.manifesto}</span>
          <span>{seed.projectArchetypes.join(' · ')}</span>
          <span>{seed.process.join(' → ')}</span>
        </footer>
      </div>
      <button ref={closeRef} type="button" className="seed-close" onClick={onClose} aria-label={t('Chiudi', 'Close')}>
        ×
      </button>
    </div>
  )
}
