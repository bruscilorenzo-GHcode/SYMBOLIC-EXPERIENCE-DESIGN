export type RouteLang = 'it' | 'en'
export type RouteView = 'site' | 'play' | 'spec' | 'healing'

export interface AppRoute {
  lang: RouteLang
  view: RouteView
}

export function parseRoute(pathname: string): AppRoute {
  const parts = pathname.split('/').filter(Boolean)
  let lang: RouteLang = 'it'
  if (parts[0] === 'en') {
    lang = 'en'
    parts.shift()
  } else if (parts[0] === 'it') {
    parts.shift()
  }
  const head = parts[0]
  const view: RouteView =
    head === 'studio' || head === 'play'
      ? 'play'
      : head === 'spec' || head === 'lab'
        ? 'spec'
        : head === 'healing' || head === 'healing-room'
          ? 'healing'
          : 'site'
  return { lang, view }
}

export function routePath(lang: RouteLang, view: RouteView): string {
  const prefix = lang === 'en' ? '/en' : ''
  if (view === 'play') return `${prefix}/studio` || '/studio'
  if (view === 'spec') return `${prefix}/spec`
  if (view === 'healing') return `${prefix}/healing`
  return prefix || '/'
}
