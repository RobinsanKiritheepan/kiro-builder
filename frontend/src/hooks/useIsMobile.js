import { useState, useEffect } from 'react'

/**
 * Returns true when the viewport width is below `breakpoint` (default 900px).
 * Updates reactively on window resize.
 */
export function useIsMobile(breakpoint = 900) {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  )

  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [breakpoint])

  return mobile
}
