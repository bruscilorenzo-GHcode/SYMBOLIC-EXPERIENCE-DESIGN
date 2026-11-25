import type { ChangeEvent } from 'react'
import { useStudioStore } from '../state/store'

export function Inspector({ lang = 'it' }: { lang?: 'it' | 'en' }) {
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)
  const session = useStudioStore((state) => state.session)
  const environment = useStudioStore((state) => state.environment)
  const profiles = useStudioStore((state) => state.profiles)
  const selectedSpeakerId = useStudioStore((state) => state.selectedSpeakerId)
  const selectedSourceId = useStudioStore((state) => state.selectedSourceId)
  const updateSpeaker = useStudioStore((state) => state.updateSpeaker)
  const updateSourceGain = useStudioStore((state) => state.updateSourceGain)
  const updateSourceSpread = useStudioStore((state) => state.updateSourceSpread)
  const updateSourcePosition = useStudioStore((state) => state.updateSourcePosition)
  const removeSpeaker = useStudioStore((state) => state.removeSpeaker)

  const speaker = session.speakerPlacements.find((placement) => placement.id === selectedSpeakerId)
  const profile = profiles.find((item) => item.id === speaker?.profileId)
  const source = session.sources.find((item) => item.id === selectedSourceId)
  const plane = environment.listenerPlanes[0]

  return (
    <aside className="panel right-panel">
      <section>
        <h2>{t('Sessione', 'Session')}</h2>
        <dl className="facts">
          <div><dt>{t('Renderer', 'Renderer')}</dt><dd>{session.renderer.primary.toUpperCase()} · order {session.renderer.hoaOrder}</dd></div>
          <div><dt>{t('Frequenza di campionamento', 'Sample rate')}</dt><dd>{session.renderer.sampleRateHz} Hz</dd></div>
          <div><dt>{t('Uscite', 'Outputs')}</dt><dd>{session.outputs.length} channels</dd></div>
          <div><dt>{t('Piano di ascolto', 'Listener plane')}</dt><dd>{plane ? `${plane.name} @ ${plane.heightM} m` : '—'}</dd></div>
          <div><dt>OSC</dt><dd>{session.osc.targets[0]?.host}:{session.osc.targets[0]?.port}</dd></div>
        </dl>
      </section>

      {speaker && profile ? (
        <section>
          <h2>{speaker.label}</h2>
          <p className="muted">{profile.manufacturer.name} · {profile.model.code}</p>
          <div className="field-grid">
            <NumberField label="X (m)" value={speaker.positionM[0]} step={0.1} onChange={(value) => updateSpeaker(speaker.id, { positionM: [value, speaker.positionM[1], speaker.positionM[2]] })} />
            <NumberField label="Y (m)" value={speaker.positionM[1]} step={0.1} onChange={(value) => updateSpeaker(speaker.id, { positionM: [speaker.positionM[0], value, speaker.positionM[2]] })} />
            <NumberField label="Z (m)" value={speaker.positionM[2]} step={0.1} onChange={(value) => updateSpeaker(speaker.id, { positionM: [speaker.positionM[0], speaker.positionM[1], value] })} />
            <NumberField label={t('Imbardata', 'Yaw')} value={speaker.orientationDeg[0]} step={1} onChange={(value) => updateSpeaker(speaker.id, { orientationDeg: [value, speaker.orientationDeg[1], speaker.orientationDeg[2]] })} />
            <NumberField label={t('Beccheggio', 'Pitch')} value={speaker.orientationDeg[1]} step={1} onChange={(value) => updateSpeaker(speaker.id, { orientationDeg: [speaker.orientationDeg[0], value, speaker.orientationDeg[2]] })} />
            <NumberField label={t('Rollio', 'Roll')} value={speaker.orientationDeg[2]} step={1} onChange={(value) => updateSpeaker(speaker.id, { orientationDeg: [speaker.orientationDeg[0], speaker.orientationDeg[1], value] })} />
            <NumberField label={t('Guadagno dB', 'Gain dB')} value={speaker.gainDb} step={0.5} onChange={(value) => updateSpeaker(speaker.id, { gainDb: value })} />
            <NumberField label={t('Ritardo ms', 'Delay ms')} value={speaker.delayMs} step={0.1} onChange={(value) => updateSpeaker(speaker.id, { delayMs: value })} />
          </div>
          <div className="button-row">
            <button type="button" className="danger" onClick={() => removeSpeaker(speaker.id)}>{t('Rimuovi', 'Remove')}</button>
          </div>
          <p className="muted small">
            {t('Direttività', 'Directivity')}: {profile.acoustics.directivity.kind} · {t('dispersione', 'dispersion')} {profile.acoustics.nominalDispersionDeg?.horizontal ?? '—'}° × {profile.acoustics.nominalDispersionDeg?.vertical ?? '—'}°
          </p>
        </section>
      ) : null}

      {source ? (
        <section>
          <h2>{source.name}</h2>
          <p className="muted">{source.kind} · {source.spatialization.toUpperCase()}</p>
          <div className="field-grid">
            <NumberField label="X (m)" value={source.positionM[0]} step={0.1} onChange={(value) => updateSourcePosition(source.id, [value, source.positionM[1], source.positionM[2]])} />
            <NumberField label="Y (m)" value={source.positionM[1]} step={0.1} onChange={(value) => updateSourcePosition(source.id, [source.positionM[0], value, source.positionM[2]])} />
            <NumberField label="Z (m)" value={source.positionM[2]} step={0.1} onChange={(value) => updateSourcePosition(source.id, [source.positionM[0], source.positionM[1], value])} />
            <NumberField label={t('Guadagno dB', 'Gain dB')} value={source.gainDb} step={0.5} onChange={(value) => updateSourceGain(source.id, value)} />
            <NumberField label={t('Ampiezza°', 'Spread°')} value={source.spreadDeg} step={1} onChange={(value) => updateSourceSpread(source.id, value)} />
          </div>
          <p className="muted small">
            {t('Traiettoria', 'Trajectory')} {source.trajectory.enabled ? `${t('attiva', 'active')} · ${source.trajectory.keyframes.length} keys` : t('spenta', 'off')} · bus {source.busId}
          </p>
        </section>
      ) : null}

      <section>
        <h2>{t('Infrastruttura', 'Infrastructure')}</h2>
        <p className="muted small">
          {t(
            'BOM, impedenza, flussi Dante e verifiche meteo sono disponibili in @aura-spec/core-acoustics. Collega l’azione “Genera BOM” quando il catalogo amplificatori è caricato.',
            'BOM, impedance, Dante flows and weather checks are available in @aura-spec/core-acoustics. Wire “Generate BOM” once the amplifier catalogue is loaded.',
          )}
        </p>
      </section>
    </aside>
  )
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
        step={step}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const parsed = Number(event.target.value)
          if (Number.isFinite(parsed)) onChange(parsed)
        }}
      />
    </label>
  )
}
