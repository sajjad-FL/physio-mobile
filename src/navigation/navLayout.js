import { colors } from '../theme/colors'

/** Use on every native stack `screenOptions` so scenes fill the tab/root frame (avoids scroll/chrome drift). */
export const nativeStackContentFlex = {
  flex: 1,
  backgroundColor: colors.canvas,
}

export const defaultNativeStackScreenOptions = {
  contentStyle: nativeStackContentFlex,
  headerShadowVisible: false,
  fullScreenGestureEnabled: false,
}

/** Bottom tabs: each scene should fill the area above the tab bar. */
export const defaultTabScreenOptions = {
  sceneStyle: { flex: 1 },
}
