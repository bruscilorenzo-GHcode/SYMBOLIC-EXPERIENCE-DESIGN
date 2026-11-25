import { useState } from 'react'
import { ArchitecturePalette } from '../design/ArchitecturePalette'
import { DesignBriefPanel } from '../design/DesignBriefPanel'
import { DesignItemInspector } from '../design/DesignItemInspector'
import { ImportPanel } from '../design/ImportPanel'
import { PlanEditor } from '../design/PlanEditor'
import { SitePanel } from '../design/SitePanel'
import { StudioCanvas } from '../scene/StudioCanvas'
import { useStudioStore } from '../state/store'

export function SpecGeometry() {
  const lang = useStudioStore((state) => state.lang)
  const [view, setView] = useState<'plan' | '3d'>('plan')
  const t = (it: string, en: string): string => (lang === 'it' ? it : en)

  return (
    <div className="spec-geometry-workspace">
      <aside className="spec-geometry-left">
        <SitePanel />
        <ArchitecturePalette />
        <ImportPanel />
      </aside>

      <section className="spec-geometry-center">
        <div className="spec-geometry-toolbar">
          <div>
            <strong>{t('Geometria e import', 'Geometry & import')}</strong>
            <span>{t('Disegna la pianta, importa un disegno tecnico, poi verifica il campo.', 'Draw the plan, import a technical drawing, then verify the field.')}</span>
          </div>
          <div className="spec-geometry-switch">
            <button type="button" className={view === 'plan' ? 'is-active' : ''} onClick={() => setView('plan')}>
              {t('Piano 2D', '2D Plan')}
            </button>
            <button type="button" className={view === '3d' ? 'is-active' : ''} onClick={() => setView('3d')}>
              {t('Vista 3D', '3D View')}
            </button>
          </div>
        </div>
        <div className="spec-geometry-canvas">
          {view === 'plan' ? <PlanEditor /> : <StudioCanvas />}
        </div>
      </section>

      <aside className="spec-geometry-right">
        <DesignItemInspector />
        <DesignBriefPanel />
      </aside>
    </div>
  )
}
