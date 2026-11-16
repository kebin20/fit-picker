import { useLayoutEffect, type RefObject } from 'react'

export function useAppViewport(navRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const nav = navRef.current
    const set = (name: string, value: number) => {
      const next = `${Math.max(0,Math.round(value))}px`
      if (root.style.getPropertyValue(name) !== next) root.style.setProperty(name,next)
    }
    const measureNav = () => set('--mobile-nav-height',nav?.getBoundingClientRect().height || 0)
    const measureViewport = () => {
      set('--app-viewport-height',window.visualViewport?.height || window.innerHeight)
      set('--app-viewport-top',window.visualViewport?.offsetTop || 0)
      measureNav()
    }
    const observer = new ResizeObserver(measureNav)
    if (nav) observer.observe(nav,{box:'border-box'})
    window.addEventListener('resize',measureViewport)
    window.visualViewport?.addEventListener('resize',measureViewport)
    window.visualViewport?.addEventListener('scroll',measureViewport)
    measureViewport()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize',measureViewport)
      window.visualViewport?.removeEventListener('resize',measureViewport)
      window.visualViewport?.removeEventListener('scroll',measureViewport)
      for (const name of ['--mobile-nav-height','--app-viewport-height','--app-viewport-top']) root.style.removeProperty(name)
    }
  },[navRef])
}
