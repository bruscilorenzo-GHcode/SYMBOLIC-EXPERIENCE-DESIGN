import { useEffect, useRef } from 'react'
import {
  HEALING_STORAGE_KEY,
  parseHealingSession,
  serializeHealingSession,
} from '@aura-spec/healing-room'
import {
  PLAY_STORAGE_KEY,
  parsePlayProgress,
  serializePlayProgress,
} from '@aura-spec/play-engine'
import { SpecLabView } from './spec/SpecLabView'
import { SiteView } from './site/SiteView'
import { StudioView } from './play/StudioView'
import { HealingRoomView } from './healing/HealingRoomView'
import { MetaplaceView } from './metaplace/MetaplaceView'
import { useStudioStore } from './state/store'
import { parseRoute, routePath } from './router'

export function App() {
  const appView = useStudioStore((state) => state.appView)
  const lang = useStudioStore((state) => state.lang)
  const setLang = useStudioStore((state) => state.setLang)
  const setAppView = useStudioStore((state) => state.setAppView)
  const firstRoute = useRef(true)

  useEffect(() => {
    const apply = (): void => {
      const route = parseRoute(window.location.pathname)
      setLang(route.lang)
      setAppView(route.view)
    }
    apply()
    window.addEventListener('popstate', apply)
    return () => window.removeEventListener('popstate', apply)
  }, [setAppView, setLang])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title =
      appView === 'healing'
        ? lang === 'en'
          ? 'Healing Room · Lorenzo Brusci & Greg Wilk · MED.IA Architecture Studio'
          : 'Healing Room · Lorenzo Brusci e Greg Wilk · MED.IA Architecture Studio'
        : appView === 'metaplace'
          ? lang === 'en'
            ? 'Metaplace · Improvement plans · Lorenzo Brusci · MUSI-CO'
            : 'Metaplace · Piani di Improvement · Lorenzo Brusci · MUSI-CO'
          : lang === 'en'
            ? 'MED.IA Architecture Studio · The Experimental Immersive Space'
            : 'MED.IA Architecture Studio · Lo Spazio Immersivo Sperimentale'
    const description = document.querySelector('meta[name="description"]')
    if (description) {
      description.setAttribute(
        'content',
        lang === 'en'
          ? 'The experimental immersive space, explored through and with a living score. Architecture, landscape, sound and code in one process.'
          : 'Lo spazio immersivo sperimentale, esplorato attraverso e con una partitura viva. Architettura, paesaggio, suono e codice in un unico processo.',
      )
    }
  }, [lang, appView])

  useEffect(() => {
    const path = routePath(lang, appView)
    if (window.location.pathname === path) {
      firstRoute.current = false
      return
    }
    const keepHash = appView === 'site' ? window.location.hash : ''
    const url = `${path}${window.location.search}${keepHash}`
    if (firstRoute.current) window.history.replaceState({}, '', url)
    else window.history.pushState({}, '', url)
    firstRoute.current = false
  }, [appView, lang])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PLAY_STORAGE_KEY)
      if (stored) useStudioStore.getState().setPlayProgress(parsePlayProgress(stored))
      const healing = window.localStorage.getItem(HEALING_STORAGE_KEY)
      if (healing) {
        const parsed = parseHealingSession(healing)
        if (parsed) useStudioStore.getState().setHealing(parsed)
      }
    } catch {
      // Local-only persistence.
    }
    return useStudioStore.subscribe((state, previous) => {
      try {
        if (state.play !== previous.play) {
          window.localStorage.setItem(PLAY_STORAGE_KEY, serializePlayProgress(state.play))
        }
        if (state.healing !== previous.healing) {
          window.localStorage.setItem(HEALING_STORAGE_KEY, serializeHealingSession(state.healing))
        }
      } catch {
        // Never block the interface.
      }
    })
  }, [])

  if (appView === 'site') return <SiteView />
  if (appView === 'play') return <StudioView />
  if (appView === 'healing') return <HealingRoomView />
  if (appView === 'metaplace') return <MetaplaceView />
  return <SpecLabView />
}
