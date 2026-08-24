import { Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { openSupportWhatsApp } from '../utils/supportContact'
import { useBottomTabBarHeight } from '../navigation/tabBarMetrics'

/** Floating WhatsApp button for patient support chat. */
export default function WhatsAppSupportFab({ bottomExtra = 12 }) {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const bottom = (tabBarHeight || bottomExtra) + (insets.bottom || 0) + bottomExtra

  return (
    <Pressable
      style={[styles.fab, { bottom }]}
      onPress={openSupportWhatsApp}
      accessibilityRole="button"
      accessibilityLabel="Chat with us on WhatsApp"
    >
      <Ionicons name="logo-whatsapp" size={28} color="#fff" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
})
