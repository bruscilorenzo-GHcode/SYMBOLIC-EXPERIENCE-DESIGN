import { StudioCanvas } from '../scene/StudioCanvas'
import { useStudioStore } from '../state/store'
import { ArchitecturePalette } from './ArchitecturePalette'
import { DesignBriefPanel } from './DesignBriefPanel'
import { DesignItemInspector } from './DesignItemInspector'
import { DirectionSwitch } from './DirectionSwitch'
import { ImportPanel } from './ImportPanel'
import { MusicAnalysisPanel } from './MusicAnalysisPanel'
import { PlanEditor } from './PlanEditor'
import { SitePanel } from './SitePanel'
import { SoundscapePanel } from './SoundscapePanel'

export function DesignStudio() {
  const direction = useStudioStore((state) => state.designDirection)
  const designView = useStudioStore((state) => state.designView)
  const setDesignView = useStudioStore((state) => state.setDesignView)
  const items = useStudioStore((state) => state.designItems)
  const site = useStudioStore((state) => state.site)

  return (
    <main className="design-workspace">
      <aside className="panel design-left">
        <DirectionSwitch />
        <SitePanel />
        <ArchitecturePalette />
        <ImportPanel />
      </aside>

      <section className="design-center">
        <div className="design-toolbar">
          <div>
            <strong>Design canvas</strong>
            <span>{items.length} items · {site.siteKind} · {site.widthM} × {site.depthM} m</span>
          </div>
          <div className="segmented">
            <button type="button" className={designView === 'plan' ? 'is-active' : ''} onClick={() => setDesignView('plan')}>2D Plan</button>
            <button type="button" className={designView === '3d' ? 'is-active' : ''} onClick={() => setDesignView('3d')}>3D Preview</button>
          </div>
        </div>
        <div className="design-viewport">
          {designView === 'plan' ? <PlanEditor /> : <StudioCanvas />}
          <div className="design-hud">
            <span>{designView === 'plan' ? 'Plan: metres · drag to move · click palette then plan to place' : '3D preview: orbit to inspect the generated space'}</span>
            <span>{direction === 'music-to-space' ? 'Music-first workflow' : 'Architecture-first workflow'}</span>
          </div>
        </div>
      </section>

      <aside className="panel design-right">
        {direction === 'music-to-space' ? (
          <>
            <MusicAnalysisPanel />
            <SoundscapePanel />
          </>
        ) : (
          <>
            <SoundscapePanel />
            <MusicAnalysisPanel />
          </>
        )}
        <DesignBriefPanel />
        <DesignItemInspector />
      </aside>
    </main>
  )
}
