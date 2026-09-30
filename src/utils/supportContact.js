import { Alert, Linking } from 'react-native'
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_MESSAGE, SUPPORT_WHATSAPP_NUMBER } from '../constants/supportContact'

export function openSupportWhatsApp(message) {
  // Used directly as onPress, so `message` may be the press event — only accept strings.
  if (typeof message !== 'string' || !message.trim()) message = SUPPORT_WHATSAPP_MESSAGE
  const url = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
  Linking.openURL(url).catch(() => {
    Alert.alert('Could not open WhatsApp', `Please contact us at +91 ${SUPPORT_PHONE_DISPLAY}.`)
  })
}
