import { useState, useEffect } from 'react'

function detect(w) {
  if (w < 768)  return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export default function useDevice() {
  const [device, setDevice] = useState(
    () => typeof window !== 'undefined' ? detect(window.innerWidth) : 'desktop'
  )

  useEffect(() => {
    const fn = () => setDevice(detect(window.innerWidth))
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  return {
    device,
    isMobile:  device === 'mobile',
    isTablet:  device === 'tablet',
    isDesktop: device === 'desktop',
  }
}
