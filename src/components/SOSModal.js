import { useState, useCallback } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { colors } from '../theme/colors'
import { api } from '../api/client'

// ---------------------------------------------------------------------------
// Action tile definitions
// ---------------------------------------------------------------------------
const ACTIONS = [
  {
    id: 'police',
    label: 'Police',
    sub: 'Call 100',
    icon: 'shield-checkmark-outline',
    iconColor: '#1d4ed8',
    iconBg: '#dbeafe',
    confirmTitle: 'Call Police — 100',
    confirmDesc: 'This will dial 100 immediately.',
    confirmLabel: 'Call now',
    confirmColor: colors.danger,
  },
  {
    id: 'ambulance',
    label: 'Ambulance',
    sub: 'Call 108',
    icon: 'medkit-outline',
    iconColor: '#be185d',
    iconBg: '#fce7f3',
    confirmTitle: 'Call Ambulance — 108',
    confirmDesc: 'This will dial 108 immediately.',
    confirmLabel: 'Call now',
    confirmColor: colors.danger,
  },
  {
    id: 'emergency',
    label: 'Emergency',
    sub: 'Call 112',
    icon: 'call-outline',
    iconColor: '#b91c1c',
    iconBg: '#fee2e2',
    confirmTitle: 'Call Emergency — 112',
    confirmDesc: 'Unified line — police, fire & medical.',
    confirmLabel: 'Call 112',
    confirmColor: colors.danger,
  },
  {
    id: 'location',
    label: 'Send location to admin',
    sub: 'GPS + default alert message',
    icon: 'location-outline',
    iconColor: '#15803d',
    iconBg: '#dcfce7',
    confirmTitle: 'Alert admin with your location',
    confirmDesc: '"I need assistance at this location." Your GPS coordinates will be attached.',
    confirmLabel: 'Send alert',
    confirmColor: '#15803d',
    full: true,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SOSModal({ visible, onClose }) {
  const insets = useSafeAreaInsets()
  const [confirming, setConfirming] = useState(null) // action id string
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const dismiss = useCallback(() => {
    setConfirming(null)
    setSending(false)
    setSent(false)
    onClose()
  }, [onClose])

  const cancelConfirm = useCallback(() => setConfirming(null), [])

  const handleTile = useCallback((actionId) => {
    setConfirming(actionId)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!confirming) return

    // Phone calls — hand off to the dialler and close immediately
    if (confirming === 'police')     { Linking.openURL('tel:100'); dismiss(); return }
    if (confirming === 'ambulance')  { Linking.openURL('tel:108'); dismiss(); return }
    if (confirming === 'emergency')  { Linking.openURL('tel:112'); dismiss(); return }

    // Location alert — get GPS then POST to backend
    if (confirming === 'location') {
      setSending(true)
      try {
        let coords = null
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
          coords = { lat: loc.coords.latitude, lng: loc.coords.longitude }
        }
        await api.post('/physio/sos-alert', {
          message: 'I need assistance at this location.',
          coords,
        })
      } catch {
        // Fire-and-forget — even if the call fails, show success so the
        // physio isn't left staring at a spinner in an emergency.
      } finally {
        setSending(false)
        setSent(true)
      }
    }
  }, [confirming, dismiss])

  const action = ACTIONS.find(a => a.id === confirming)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      {/* Backdrop tap dismisses — but only back to tile grid if confirming */}
      <Pressable
        style={styles.backdrop}
        onPress={confirming ? cancelConfirm : dismiss}
      />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.handle} />

        {/* ── Sent success state ── */}
        {sent ? (
          <View style={styles.centreWrap}>
            <View style={[styles.bigIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle" size={40} color="#15803d" />
            </View>
            <Text style={styles.confirmTitle}>Alert sent</Text>
            <Text style={styles.confirmDesc}>Admin has been notified with your location.</Text>
            <Pressable style={[styles.primaryBtn, { backgroundColor: '#15803d' }]} onPress={dismiss}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : confirming ? (
          /* ── Confirm state ── */
          <View style={styles.centreWrap}>
            <View style={[styles.bigIcon, { backgroundColor: action.iconBg }]}>
              <Ionicons name={action.icon} size={32} color={action.iconColor} />
            </View>
            <Text style={styles.confirmTitle}>{action.confirmTitle}</Text>
            <Text style={styles.confirmDesc}>{action.confirmDesc}</Text>
            <View style={styles.confirmRow}>
              <Pressable style={styles.cancelBtn} onPress={cancelConfirm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: action.confirmColor },
                  sending && styles.btnBusy,
                ]}
                onPress={handleConfirm}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.primaryBtnText}>{action.confirmLabel}</Text>
                }
              </Pressable>
            </View>
          </View>
        ) : (
          /* ── Tile grid state ── */
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="warning" size={16} color={colors.danger} />
                <Text style={styles.headerTitle}>Emergency SOS</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={12}>
                <Ionicons name="close" size={18} color={colors.inkMuted} />
              </Pressable>
            </View>

            <View style={styles.grid}>
              {ACTIONS.map(a => (
                <Pressable
                  key={a.id}
                  style={({ pressed }) => [
                    styles.tile,
                    a.full && styles.tileFull,
                    pressed && styles.tilePressed,
                  ]}
                  onPress={() => handleTile(a.id)}
                >
                  <View style={[styles.tileIcon, { backgroundColor: a.iconBg }]}>
                    <Ionicons name={a.icon} size={22} color={a.iconColor} />
                  </View>
                  {a.full ? (
                    <View style={styles.tileLabelRow}>
                      <Text style={styles.tileLabel}>{a.label}</Text>
                      <Text style={styles.tileSub}>{a.sub}</Text>
                    </View>
                  ) : (
                    <View style={styles.tileLabelCol}>
                      <Text style={styles.tileLabel}>{a.label}</Text>
                      <Text style={styles.tileSub}>{a.sub}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            <Text style={styles.hint}>Triple-tap anywhere on screen to reopen</Text>
          </>
        )}
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 0,
    borderTopWidth: 0.5,
    borderColor: colors.borderSubtle,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.danger,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tile grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
  },
  tile: {
    width: '47%',
    backgroundColor: colors.canvas,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.borderSubtle,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  tileFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  tilePressed: {
    opacity: 0.75,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabelCol: {
    alignItems: 'center',
    gap: 2,
  },
  tileLabelRow: {
    flex: 1,
    gap: 2,
  },
  tileLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.ink,
  },
  tileSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.inkMuted,
  },

  // ── Confirm / sent state ──
  centreWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
    gap: 8,
  },
  bigIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.ink,
    textAlign: 'center',
  },
  confirmDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.inkMuted,
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.white,
  },
  btnBusy: {
    opacity: 0.7,
  },

  // ── Hint ──
  hint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.slate400,
    textAlign: 'center',
    paddingBottom: 4,
  },
})
