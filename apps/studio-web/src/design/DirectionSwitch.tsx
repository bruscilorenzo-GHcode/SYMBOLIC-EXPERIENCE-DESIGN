import { useStudioStore } from '../state/store'

export function DirectionSwitch() {
  const direction = useStudioStore((state) => state.designDirection)
  const setDirection = useStudioStore((state) => state.setDesignDirection)

  return (
    <section className="direction-section">
      <h2>Design approach</h2>
      <div className="direction-cards">
        <button
          type="button"
          className={`direction-card${direction === 'music-to-space' ? ' is-active' : ''}`}
          onClick={() => setDirection('music-to-space')}
        >
          <span className="direction-index">01</span>
          <strong>Music → Space</strong>
          <small>Read a track or live performance, then derive geometry, materials and speaker layout.</small>
        </button>
        <button
          type="button"
          className={`direction-card${direction === 'space-to-music' ? ' is-active' : ''}`}
          onClick={() => setDirection('space-to-music')}
        >
          <span className="direction-index">02</span>
          <strong>Space → Music</strong>
          <small>Read the architecture, materials and zones, then derive a multichannel soundscape.</small>
        </button>
      </div>
    </section>
  )
}
