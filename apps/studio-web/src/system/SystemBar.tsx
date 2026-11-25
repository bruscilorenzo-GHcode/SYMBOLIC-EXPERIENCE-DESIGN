import type { ReactNode } from 'react'
import { useStudioStore } from '../state/store'
import { ROOM_STEPS, useRoomDesign, type RoomStep } from '../healing/roomDesign'
import './system.css'

export type Place = 'mas' | 'healing' | 'metaplace'

/**
 * The MUSI-CO cross-ontological bar: one app, two sections, one path.
 * SED (Symbolic Experience Design) holds two sections: Healing and Desire (Metaplace). The path runs across them:
 * space → sound modules → character → session → improvement.
 */
export function SystemBar({ place, actions }: { place: Place; actions?: ReactNode }) {
  const lang = useStudioStore((s) => s.lang)
  const setLang = useStudioStore((s) => s.setLang)
  const setAppView = useStudioStore((s) => s.setAppView)
  const step = useRoomDesign((s) => s.step)
  const setStep = useRoomDesign((s) => s.setStep)
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)

  const places: Array<{ id: Place; name: string; sub: string; go: () => void }> = [
    { id: 'mas', name: 'SED', sub: 'a sensorial renaissance', go: () => setAppView('site') },
    { id: 'healing', name: 'Healing Room', sub: t('Diagnosi e cura', 'Diagnosis and care'), go: () => setAppView('healing') },
    { id: 'metaplace', name: 'Desire', sub: 'Metaplace', go: () => setAppView('metaplace') },
  ]

  const goStep = (value: RoomStep | 5): void => {
    if (value === 5) {
      setAppView('metaplace')
      return
    }
    setStep(value)
    setAppView('healing')
  }

  const activeStep: number = place === 'metaplace' ? 5 : place === 'healing' ? step : 0

  return (
    <header className={`sys-bar sys-bar--${place}`}>
      <div className="sys-bar-row">
        <button type="button" className="sys-mark" onClick={() => setAppView('site')} aria-label="Symbolic Experience Design">
          <span className="sys-mark-box">S</span>
          <span className="sys-mark-text">
            <strong>SED</strong>
            <small>MUSI-CO</small>
          </span>
        </button>
        <nav className="sys-places" aria-label={t('Luoghi del sistema', 'Places of the system')}>
          {places.map((item, index) => (
            <span key={item.id} className="sys-place-wrap">
              {index > 0 ? <span className="sys-arrow" aria-hidden="true">→</span> : null}
              <button
                type="button"
                className={`sys-place sys-place--${item.id}${place === item.id ? ' is-active' : ''}`}
                aria-current={place === item.id ? 'page' : undefined}
                onClick={item.go}
              >
                <i className="sys-glyph" aria-hidden="true" />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.sub}</small>
                </span>
              </button>
            </span>
          ))}
        </nav>
        <div className="sys-actions">
          {actions}
          <div className="sys-lang" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === 'it'} onClick={() => setLang('it')}>IT</button>
            <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
      </div>
      <ol className="sys-path" aria-label={t('Percorso di progetto', 'Design path')}>
        {ROOM_STEPS.map((item) => (
          <li key={item.step}>
            <button
              type="button"
              className={activeStep === item.step ? 'is-active' : activeStep > item.step ? 'is-done' : ''}
              aria-current={activeStep === item.step ? 'step' : undefined}
              onClick={() => goStep(item.step)}
            >
              <span>0{item.step}</span>
              {t(item.label.it, item.label.en)}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={`sys-path-meta${activeStep === 5 ? ' is-active' : ''}`}
            aria-current={activeStep === 5 ? 'step' : undefined}
            onClick={() => goStep(5)}
          >
            <span>05</span>
            {t('Piani di Improvement', 'Improvement plans')}
          </button>
        </li>
      </ol>
    </header>
  )
}
