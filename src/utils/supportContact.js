import { Alert, Linking } from 'react-native'
import { SUPPORT_WHATSAPP_MESSAGE, SUPPORT_WHATSAPP_NUMBER } from '../constants/supportContact'

export function openSupportWhatsApp(message = SUPPORT_WHATSAPP_MESSAGE) {
  const url = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  Linking.openURL(url).catch(() => {
    Alert.alert('Could not open WhatsApp', 'Please contact us at +91 84535 80556.')
  })
}
