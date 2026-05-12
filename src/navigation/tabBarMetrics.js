import { useEffect, useState } from 'react'

let bottomTabBarHeight = 0
const listeners = new Set()

export function setBottomTabBarHeight(height) {
  const nextHeight = Math.max(0, Math.round(Number(height) || 0))
  if (nextHeight === bottomTabBarHeight) return

  bottomTabBarHeight = nextHeight
  listeners.forEach((listener) => listener(bottomTabBarHeight))
}

export function useBottomTabBarHeight() {
  const [height, setHeight] = useState(bottomTabBarHeight)

  useEffect(() => {
    listeners.add(setHeight)
    return () => listeners.delete(setHeight)
  }, [])

  return height
}
