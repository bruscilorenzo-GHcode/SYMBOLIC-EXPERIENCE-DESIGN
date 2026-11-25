import { useState } from 'react'
import { useStudioStore } from '../state/store'

export function LayerPanel({ lang = 'it' }: { lang?: 'it' | 'en' }) {
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  const session = useStudioStore((state) => state.session)
  const profiles = useStudioStore((state) => state.profiles)
  const selectedSpeakerId = useStudioStore((state) => state.selectedSpeakerId)
  const selectedSourceId = useStudioStore((state) => state.selectedSourceId)
  const selectSpeaker = useStudioStore((state) => state.selectSpeaker)
  const selectSource = useStudioStore((state) => state.selectSource)
  const addSpeaker = useStudioStore((state) => state.addSpeaker)
  const showPolar = useStudioStore((state) => state.showPolar)
  const showHeatmap = useStudioStore((state) => state.showHeatmap)
  const togglePolar = useStudioStore((state) => state.togglePolar)
  const toggleHeatmap = useStudioStore((state) => state.toggleHeatmap)
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? '')

  return (
    <aside className="panel left-panel">
      <section>
        <h2>{t('Livelli della scena', 'Scene layers')}</h2>
        <label className="toggle-row">
          <input type="checkbox" checked={showPolar} onChange={togglePolar} />
          <span>{t('Palloni polari', 'Polar balloons')}</span>
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={showHeatmap} onChange={toggleHeatmap} />
          <span>{t('Mappa di copertura', 'Coverage heatmap')}</span>
        </label>
      </section>

      <section>
        <h2>{t('Diffusori', 'Loudspeakers')} · {session.speakerPlacements.length}</h2>
        <ul className="entity-list">
          {session.speakerPlacements.map((placement) => {
            const profile = profiles.find((item) => item.id === placement.profileId)
            return (
              <li key={placement.id}>
                <button
                  type="button"
                  className={selectedSpeakerId === placement.id ? 'is-active' : ''}
                  onClick={() => selectSpeaker(placement.id)}
                >
                  <span className="swatch speaker" />
                  <span>
                    <strong>{placement.label}</strong>
                    <small>{profile?.model.code ?? placement.profileId}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="add-row">
          <select
            aria-label={t('Profilo del diffusore', 'Loudspeaker profile')}
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.manufacturer.name} · {profile.model.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => addSpeaker(profileId)}>
            {t('Aggiungi', 'Add')}
          </button>
        </div>
      </section>

      <section>
        <h2>{t('Sorgenti', 'Sources')} · {session.sources.length}</h2>
        <ul className="entity-list">
          {session.sources.map((source) => (
            <li key={source.id}>
              <button
                type="button"
                className={selectedSourceId === source.id ? 'is-active' : ''}
                onClick={() => selectSource(source.id)}
              >
                <span className="swatch source" style={{ background: source.color }} />
                <span>
                  <strong>{source.name}</strong>
                  <small>
                    {source.spatialization.toUpperCase()} · {source.kind}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="catalog-note">
        <h2>{t('Catalogo', 'Catalog')}</h2>
        <p>
          {t(
            'I profili Architettura Sonora e K-ARRAY sono segnaposto illustrativi. Importa GLL/CLF o palloni misurati prima della specifica.',
            'Architettura Sonora and K-ARRAY reference profiles are illustrative placeholders. Import GLL/CLF or measured balloons before specification.',
          )}
        </p>
      </section>

    </aside>
  )
}
