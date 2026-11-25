import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MAS_ARCHETYPES,
  PLAY_RENDER_MODES,
  composeFromProgress,
  getPlayProgression,
} from '@aura-spec/play-engine'
import { getHabitatArchetype } from '@aura-spec/inhabiting-model'
import { useRoomDesign } from '../healing/roomDesign'
import { PlayScene } from '../play/scene/PlayScene'
import { PlaySeedDialog } from '../play/PlaySeedDialog'
import { useStudioStore } from '../state/store'
import { SiteScore } from './SiteScore'
import { DaylightControl } from './DaylightControl'
import { SITE_COPY } from './copy'
import './site.css'

export function SiteView() {
  const play = useStudioStore((state) => state.play)
  const setPlayHabitat = useStudioStore((state) => state.setPlayHabitat)
  const setPlayParameter = useStudioStore((state) => state.setPlayParameter)
  const setAppView = useStudioStore((state) => state.setAppView)
  const lang = useStudioStore((state) => state.lang)
  const setLang = useStudioStore((state) => state.setLang)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [briefOpen, setBriefOpen] = useState(false)
  const methodRef = useRef<HTMLDivElement>(null)
  const methodSvgRef = useRef<SVGSVGElement>(null)

  const copy = SITE_COPY[lang]
  const composition = useMemo(() => composeFromProgress(play), [play])
  const progression = getPlayProgression(play.completedMissionIds)
  const currentHabitat = getHabitatArchetype(play.habitatId) ?? getHabitatArchetype('outdoor-mediterranean-garden')!
  const renderMode =
    PLAY_RENDER_MODES.find(
      (mode) => mode.id === play.renderMode && progression.unlockedRenderModeIds.includes(mode.id),
    ) ?? PLAY_RENDER_MODES[0]!
  const archetypes = lang === 'it' ? MAS_ARCHETYPES : ['Mediterranean courtyard', 'Sonic garden', 'Coastal refuge']

  useEffect(() => {
    const wrap = methodRef.current
    const svg = methodSvgRef.current
    if (!wrap || !svg) return
    const paths = Array.from(svg.querySelectorAll<SVGGeometryElement>('[data-draw]'))
    const scroller = wrap.closest('.site-shell') as HTMLElement | null
    const update = (): void => {
      const rect = wrap.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, (window.innerHeight * 0.84 - rect.top) / (window.innerHeight * 0.72)))
      paths.forEach((path, index) => {
        const length = path.getTotalLength()
        const local = Math.max(0, Math.min(1, progress * 1.35 - index * 0.07))
        path.style.strokeDasharray = `${length}`
        path.style.strokeDashoffset = `${length * (1 - local)}`
      })
    }
    update()
    scroller?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      scroller?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const goScore = (habitatId?: string): void => {
    if (habitatId) setPlayHabitat(habitatId)
    document.getElementById('score')?.scrollIntoView({ behavior: 'smooth' })
  }

  const openStudio = (): void => setAppView('play')
  const openHealing = (): void => setAppView('healing')
  const habitatName = lang === 'it' ? currentHabitat.italian : currentHabitat.name

  return (
    <div className="site-shell" lang={lang}>
      <header className="site-header">
        <a className="site-brand" href="#top" onClick={() => setMenuOpen(false)}>
          <span className="site-brand-mark">S</span>
          <span className="site-brand-type">
            <strong>SED</strong>
            <small>Symbolic Experience Design · a sensorial renaissance</small>
          </span>
        </a>
        <nav className="site-nav" aria-label="Navigation">
          <a href="#manifesto">{copy.nav.manifesto}</a>
          <a href="#metodo">{copy.nav.method}</a>
          <a href="#score">{copy.nav.score}</a>
          <a href="#ambienti">{copy.nav.environments}</a>
          <button type="button" className="site-nav-place site-nav-place--healing" onClick={openHealing}>{copy.nav.healing}</button>
          <button type="button" className="site-nav-place site-nav-place--metaplace" onClick={() => setAppView('metaplace')}>{copy.nav.metaplace}</button>
          <a href="#studio">{copy.nav.studio}</a>
        </nav>
        <div className="site-header-actions">
          <div className="site-lang-toggle" role="group" aria-label="Language">
            <button type="button" aria-pressed={lang === 'it'} className={lang === 'it' ? 'is-active' : ''} onClick={() => setLang('it')}>IT</button>
            <button type="button" aria-pressed={lang === 'en'} className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <button type="button" className="site-header-cta" onClick={openStudio}>
            {copy.nav.openStudio} <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="site-menu-toggle"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? copy.nav.closeMenu : copy.nav.menu}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? '×' : '☰'}
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="site-mobile-menu">
          {(['manifesto', 'metodo', 'score', 'ambienti', 'sistema', 'studio'] as const).map((id) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
              {id === 'metodo'
                ? copy.nav.method
                : id === 'score'
                  ? copy.nav.score
                  : id === 'ambienti'
                    ? copy.nav.environments
                    : id === 'sistema'
                      ? `${copy.nav.healing} · ${copy.nav.metaplace}`
                      : id === 'studio'
                        ? copy.nav.studio
                        : copy.nav.manifesto}
            </a>
          ))}
          <div className="site-mobile-lang">
            <button type="button" aria-pressed={lang === 'it'} className={lang === 'it' ? 'is-active' : ''} onClick={() => setLang('it')}>IT</button>
            <button type="button" aria-pressed={lang === 'en'} className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
          </div>
          <button type="button" onClick={() => { setMenuOpen(false); openStudio() }}>
            {copy.nav.openStudio}
          </button>
        </div>
      ) : null}

      <main>
        <section className="site-hero" id="top">
          <div className="site-hero-copy">
            <p className="site-eyebrow">{copy.hero.eyebrow}</p>
            <h1>
              {copy.hero.title[0]}
              <em>{copy.hero.title[1]}</em>
              {copy.hero.title[2]}
            </h1>
            <p className="site-hero-en">{copy.hero.translation}</p>
            <p className="site-hero-intro">{copy.hero.intro}</p>
            <div className="site-hero-actions">
              <button type="button" className="site-button site-button--dark" onClick={() => goScore()}>
                {copy.hero.primary} <span aria-hidden="true">→</span>
              </button>
              <a className="site-text-link" href="#metodo">
                {copy.hero.secondary} <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="site-alliance">{copy.hero.forWhom}</p>
            <div className="site-hero-footnote">
              <span>{copy.hero.footnote[0]}</span>
              <span>{copy.hero.footnote[1]}</span>
            </div>
          </div>

          <div className="site-hero-visual">
            <PlayScene
              composition={composition}
              palette={renderMode.palette}
              mode={renderMode}
              objects={play.objects}
              interactive={false}
              cameraPosition={[18, 12, 22]}
              cameraTarget={[0, 1.6, 0]}
              exposure={1.02}
              autoRotate={false}
            />
            <div className="site-hero-visual-top">
              <span>{copy.hero.live}</span>
              <span>{habitatName}</span>
            </div>
            <div className="site-hero-daylight">
              <DaylightControl
                light={play.parameters.light}
                onChange={(value) => setPlayParameter('light', value)}
                label={SITE_COPY[lang].score.daylight}
                night={SITE_COPY[lang].score.night}
                day={SITE_COPY[lang].score.day}
                variant="overlay"
              />
            </div>
            <div className="site-hero-visual-bottom">
              <span>{copy.hero.field}</span>
              <span>{composition.music.descriptorLabel}</span>
              <span>{currentHabitat.site.widthM} × {currentHabitat.site.depthM} m</span>
            </div>
          </div>
        </section>

        <section className="site-manifesto" id="manifesto">
          <div className="site-manifesto-index">
            <span>{copy.manifesto.index[0]}</span>
            <span>{copy.manifesto.index[1]}</span>
          </div>
          <div className="site-manifesto-body">
            <p className="site-manifesto-lead">{copy.manifesto.lead}</p>
            {copy.manifesto.paragraphs.map((line) => (
              <p key={line} className="site-manifesto-line">{line}</p>
            ))}
            <div className="site-manifesto-roots">
              <span>{copy.manifesto.rootsLabel}</span>
              {copy.manifesto.roots.map((root) => (
                <a key={root.name} href={root.href} target="_blank" rel="noreferrer">
                  <strong>{root.name}</strong>
                  <em>{root.body}</em>
                  <small>{root.link} ↗</small>
                </a>
              ))}
            </div>
          </div>
          <div className="site-manifesto-aside">
            <p>{copy.manifesto.aside}</p>
            <span className="site-sound-rule" aria-hidden="true">
              {Array.from({ length: 24 }, (_, index) => (
                <i key={index} style={{ height: `${12 + ((index * 17) % 46)}px` }} />
              ))}
            </span>
          </div>
        </section>

        <section className="site-method section-pad" id="metodo">
          <div className="site-section-heading">
            <p className="site-eyebrow">{copy.method.eyebrow}</p>
            <h2>
              {copy.method.title[0]}<br />
              <em>{copy.method.title[1]}</em>
            </h2>
          </div>
          <div className="site-method-layout">
            <div className="site-method-visual" ref={methodRef}>
              <svg viewBox="0 0 620 620" aria-hidden="true" ref={methodSvgRef}>
                <defs>
                  <pattern id="site-method-grid" width="31" height="31" patternUnits="userSpaceOnUse">
                    <path d="M31 0H0V31" fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth=".7" />
                  </pattern>
                </defs>
                <rect x="30" y="30" width="560" height="560" fill="url(#site-method-grid)" stroke="currentColor" strokeOpacity=".35" />
                <ellipse data-draw cx="310" cy="310" rx="190" ry="134" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".8" />
                <ellipse data-draw cx="310" cy="310" rx="126" ry="88" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
                <path data-draw d="M92 478C196 390 170 204 310 192s180 138 220 42" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 7" opacity=".55" />
                {[0, 1, 2, 3, 4].map((index) => {
                  const angle = (index / 5) * Math.PI * 2 - Math.PI / 2
                  return (
                    <g key={index} transform={`translate(${310 + Math.cos(angle) * 160} ${310 + Math.sin(angle) * 118})`}>
                      <circle r="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      <circle r="2.5" fill="currentColor" />
                      <text x="13" y="-10" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="currentColor">S.0{index + 1}</text>
                    </g>
                  )
                })}
                <text x="310" y="300" textAnchor="middle" fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="currentColor" letterSpacing="2">{copy.hero.field}</text>
                <text x="310" y="318" textAnchor="middle" fontSize="8" fontFamily="IBM Plex Mono, monospace" fill="currentColor" opacity=".72">XYZ / 0.00 · 1.20 · 0.00</text>
                <text x="58" y="560" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="currentColor" opacity=".65">{copy.method.caption[0]} / SED</text>
                <text x="562" y="560" textAnchor="end" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="currentColor" opacity=".65">02 — {copy.method.steps[1]!.title.toUpperCase()}</text>
              </svg>
              <span className="site-method-caption">
                {copy.method.caption[0]} / {copy.method.steps[activeStep]!.id}
                <br />
                {copy.method.caption[1]}
              </span>
            </div>
            <div className="site-method-steps">
              {copy.method.steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={`site-method-step${activeStep === index ? ' is-active' : ''}`}
                  aria-expanded={activeStep === index}
                  onClick={() => setActiveStep(index)}
                >
                  <span className="site-method-number">{step.id}</span>
                  <span className="site-method-content">
                    <strong>{step.title}</strong>
                    <small>{step.subtitle}</small>
                    <span className="site-method-details">
                      <span>{step.body}</span>
                      <span className="site-method-tags">
                        {step.tags.map((tag) => <i key={tag}>{tag}</i>)}
                      </span>
                    </span>
                  </span>
                  <span className="site-method-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <SiteScore lang={lang} />

        <section className="site-environments section-pad" id="ambienti">
          <div className="site-section-heading site-section-heading--row">
            <div>
              <p className="site-eyebrow">{copy.environments.eyebrow}</p>
              <h2>
                {copy.environments.title[0]}<br />
                <em>{copy.environments.title[1]}</em>
              </h2>
            </div>
            <p>{copy.environments.intro}</p>
          </div>
          <div className="site-environment-grid">
            {copy.environments.items.map((environment, index) => (
              <button
                key={environment.habitatId}
                type="button"
                className={`site-environment site-environment--${index + 1}`}
                onClick={() => goScore(environment.habitatId)}
              >
                <img src={environment.image} alt="" loading="lazy" />
                <span className="site-environment-shade" />
                <span className="site-environment-copy">
                  <span className="site-environment-number">A.0{index + 1}</span>
                  <span className="site-environment-type">{environment.type}</span>
                  <strong>{environment.title}</strong>
                  <span>{environment.description}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="site-imagery-note">{copy.environments.note}</p>
        </section>

        <section className="site-system section-pad" id="sistema">
          <div className="site-section-heading site-section-heading--row">
            <div>
              <p className="site-eyebrow">{copy.system.eyebrow}</p>
              <h2>
                {copy.system.title[0]}<br />
                <em>{copy.system.title[1]}</em>
              </h2>
            </div>
            <p>{copy.system.intro}</p>
          </div>
          <div className="site-system-places">
            {copy.system.places.map((place, index) => (
              <article key={place.name} className={`site-place site-place--${index === 0 ? 'healing' : 'metaplace'}`}>
                <div className="site-place-visual" aria-hidden="true">
                  {index === 0 ? (
                    <svg viewBox="-16 -16 32 32">
                      <rect x={-13.5} y={-13.5} width={27} height={27} fill="#fcf0cd" stroke="#111" strokeWidth={0.9} />
                      <rect x={-3.3} y={-15.6} width={6.6} height={2.1} fill="#6cb34f" stroke="#111" strokeWidth={0.5} />
                      <rect x={-15.6} y={-3.4} width={2.1} height={6.8} fill="#6cb34f" stroke="#111" strokeWidth={0.5} />
                      <rect x={13.5} y={-3.4} width={2.1} height={6.8} fill="#6cb34f" stroke="#111" strokeWidth={0.5} />
                      <circle r={9.25} fill="#9a98e0" stroke="#111" strokeWidth={0.8} />
                      {Array.from({ length: 12 }, (_, i) => {
                        const a = ((15 + i * 30) * Math.PI) / 180
                        return <line key={i} x1={4 * Math.cos(a)} y1={4 * Math.sin(a)} x2={9.25 * Math.cos(a)} y2={9.25 * Math.sin(a)} stroke="#111" strokeWidth={0.18} />
                      })}
                      <circle r={4} fill="#e8a59c" stroke="#111" strokeWidth={0.6} />
                      <rect x={-6} y={9.6} width={12} height={3.9} fill="#eaa3bd" stroke="#111" strokeWidth={0.6} />
                    </svg>
                  ) : null}
                  {index === 1 ? <span className="site-place-meta" /> : null}
                </div>
                <p className="site-eyebrow">{String(index + 1).padStart(2, '0')} · {place.role}</p>
                <h3>{place.name}</h3>
                <p>{place.body}</p>
                <small>{place.credit}</small>
                <button
                  type="button"
                  className="site-place-cta"
                  onClick={() => {
                    if (index === 0) {
                      useRoomDesign.getState().setStep(1)
                      openHealing()
                    } else setAppView('metaplace')
                  }}
                >
                  {place.cta} <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
          <ol className="site-system-path">
            {copy.system.path.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  className={index === 4 ? 'is-meta' : ''}
                  onClick={() => {
                    if (index === 4) setAppView('metaplace')
                    else {
                      useRoomDesign.getState().setStep((index + 1) as 1 | 2 | 3 | 4)
                      openHealing()
                    }
                  }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{label}</strong>
                  <small>{copy.system.pathPlace[index]}</small>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className="site-principles section-pad" id="principi">
          <div className="site-principles-intro">
            <p className="site-eyebrow">{copy.principles.eyebrow}</p>
            <h2>
              {copy.principles.title[0]}<br />
              <em>{copy.principles.title[1]}</em>
            </h2>
          </div>
          <div className="site-principles-list">
            {copy.principles.items.map((principle) => (
              <article key={principle.number}>
                <span>{principle.number}</span>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="site-studio section-pad" id="studio">
          <div className="site-studio-top">
            <p className="site-eyebrow">{copy.studio.eyebrow}</p>
            <span>{copy.studio.location}</span>
          </div>
          <div className="site-studio-statement">
            <p className="site-eyebrow">{copy.studio.kicker}</p>
            <h2>
              {copy.studio.title[0]}<br />
              <em>{copy.studio.title[1]}</em>
            </h2>
          </div>
          <div className="site-studio-details">
            <p>{copy.studio.body}</p>
            <ol>
              {copy.studio.process.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="site-studio-actions">
              <button type="button" className="site-button site-button--light" onClick={openStudio}>
                {copy.studio.openStudio} <span aria-hidden="true">↗</span>
              </button>
              <button type="button" className="site-text-link site-text-link--light" onClick={() => setBriefOpen(true)}>
                {copy.studio.request} <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div className="site-studio-archetypes">
              {archetypes.map((archetype) => <span key={archetype}>{archetype}</span>)}
            </div>
          </div>
          <div className="site-studio-audiences">
            {copy.studio.audiences.map((audience, index) => (
              <article key={audience.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{audience.title}</h3>
                <p>{audience.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="site-closing" id="contatto">
          <p className="site-eyebrow">{copy.closing.eyebrow}</p>
          <h2>
            {copy.closing.title[0]}<br />
            <em>{copy.closing.title[1]}</em>
          </h2>
          <div className="site-closing-actions">
            <button type="button" className="site-button site-button--light" onClick={() => setBriefOpen(true)}>
              {copy.closing.brief} <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className="site-text-link site-text-link--light" onClick={() => goScore()}>
              {copy.closing.back} <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </main>

      <section className="site-partners" aria-labelledby="site-partners-title">
        <p className="site-eyebrow" id="site-partners-title">{copy.partners}</p>
        <nav className="site-partner-links" aria-label={copy.partners}>
          <a href="https://www.musi-co.com" target="_blank" rel="noopener noreferrer">www.musi-co.com ↗</a>
          <a href="https://www.lorenzobrusci.com" target="_blank" rel="noopener noreferrer">www.lorenzobrusci.com ↗</a>
          <a href="https://www.giardinosonoro.com" target="_blank" rel="noopener noreferrer">www.giardinosonoro.com ↗</a>
          <a href="https://www.musstdesign.com" target="_blank" rel="noopener noreferrer">www.musstdesign.com ↗</a>
        </nav>
      </section>

      <footer className="site-footer">
        <span className="site-brand-mark">S</span>
        <span>{copy.footer}</span>
        <span>© 2026 SED</span>
      </footer>

      {briefOpen ? (
        <PlaySeedDialog
          composition={composition}
          progression={progression}
          objectMode={play.objectMode}
          lang={lang}
          onClose={() => setBriefOpen(false)}
        />
      ) : null}
    </div>
  )
}
