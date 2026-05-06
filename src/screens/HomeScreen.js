import { Pressable, ScrollView, StyleSheet, Text, View, Platform, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../context/AuthContext'
import { getDefaultDashboardScreen } from '../auth/navigationTargets'
import AppHeader from '../components/AppHeader'
import Button from '../components/ui/Button'
import { colors } from '../theme/colors'
import { ISSUE_OPTIONS } from '../constants/issues'

const HOME_DESCRIPTION =
  'PhysioKhom connects patients with verified home visit physiotherapists in Assam for back pain, knee pain, post-surgery rehab, and stroke recovery.'

const shadowCard = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
  },
  android: { elevation: 4 },
  default: {},
})

const shadowSm = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: {},
})

function issueInitial(label) {
  return String(label || '')
    .trim()
    .charAt(0)
    .toUpperCase() || '•'
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { token } = useAuth()
  const horizontalPad = 20
  const gap = 10
  const useTwoCols = width >= 360
  const conditionColWidth = useTwoCols ? (width - horizontalPad * 2 - gap) / 2 : width - horizontalPad * 2

  function goDashboard() {
    navigation.navigate(getDefaultDashboardScreen())
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        right={
          token ? (
            <Button title="Dashboard" variant="outline" onPress={goDashboard} />
          ) : (
            <Pressable onPress={() => navigation.navigate('Login')} hitSlop={12} style={styles.headerSignInHit}>
              <Text style={styles.headerSignIn}>Sign in</Text>
            </Pressable>
          )
        }
      />
      <ScrollView
        contentContainerStyle={[styles.scrollPad, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={[styles.heroCard, shadowCard]}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Verified home care</Text>
          </View>
          <Text style={styles.h1}>Physio near you</Text>
          <Text style={styles.lead}>{HOME_DESCRIPTION}</Text>
          <View style={styles.heroDivider} />
          {!token ? (
            <View style={styles.heroActions}>
              <Button title="Create account" onPress={() => navigation.navigate('Register')} />
              <Pressable onPress={() => navigation.navigate('Login')} style={styles.signInPrompt} hitSlop={8}>
                <Text style={styles.signInPromptText}>
                  Already have an account? <Text style={styles.signInPromptBold}>Sign in</Text>
                </Text>
              </Pressable>
            </View>
          ) : (
            <Button title="Book session" onPress={() => navigation.navigate('PhysioList')} />
          )}
        </View>

        <Pressable
          onPress={() => navigation.navigate('RegisterPhysio')}
          style={({ pressed }) => [styles.secondaryCta, shadowSm, pressed && styles.secondaryCtaPressed]}
        >
          <View style={styles.secondaryAccent} />
          <Text style={styles.secondaryCtaText}>For physiotherapists — join PhysioKhom</Text>
          <Text style={styles.secondaryCtaHint}>List your practice · flexible visits</Text>
        </Pressable>

        {/* Conditions */}
        <View style={styles.sectionHead}>
          <View style={styles.sectionAccent} />
          <View>
            <Text style={styles.sectionLabel}>Conditions we help with</Text>
            <Text style={styles.sectionLead}>
              Share what you&apos;re dealing with when you book — we&apos;ll match care to your goals.
            </Text>
          </View>
        </View>

        <View style={styles.conditionGrid}>
          {ISSUE_OPTIONS.map((t) => (
            <View key={t} style={[styles.conditionCell, { width: conditionColWidth }]}>
              <View style={[styles.conditionCard, shadowSm]}>
                <View style={styles.conditionIcon}>
                  <Text style={styles.conditionIconText}>{issueInitial(t)}</Text>
                </View>
                <Text style={styles.cardTitle}>{t}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <Text style={styles.faqSectionLabel}>FAQ</Text>
        <View style={[styles.faqCard, shadowCard]}>
          <View style={styles.faqStripe} />
          <View style={styles.faqBody}>
            <Text style={styles.q}>How do I book?</Text>
            <Text style={styles.a}>
              Create an account, choose date and slot, pay online, and track everything in your dashboard.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('NearMeHub')}
          style={({ pressed }) => [styles.linkPill, pressed && styles.linkPillPressed]}
        >
          <Text style={styles.linkPillText}>Find physios near me</Text>
          <Text style={styles.linkPillArrow}>→</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollPad: { paddingHorizontal: 20, paddingTop: 12 },
  headerSignInHit: { paddingVertical: 4, paddingHorizontal: 4 },
  headerSignIn: { fontSize: 15, fontWeight: '700', color: colors.brand },

  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.brandHover,
    textTransform: 'uppercase',
  },
  h1: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.slate900,
    letterSpacing: -1,
    lineHeight: 36,
  },
  lead: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: colors.slate500,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginTop: 20,
    marginBottom: 18,
  },
  heroActions: { gap: 14 },

  signInPrompt: { alignSelf: 'center', paddingVertical: 4 },
  signInPromptText: { fontSize: 14, color: colors.slate500, textAlign: 'center' },
  signInPromptBold: { fontWeight: '700', color: colors.brand },

  secondaryCta: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingLeft: 20,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    overflow: 'hidden',
  },
  secondaryCtaPressed: { opacity: 0.92 },
  secondaryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.brand,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  secondaryCtaText: { fontSize: 15, fontWeight: '700', color: colors.slate800, paddingLeft: 6 },
  secondaryCtaHint: { marginTop: 4, fontSize: 12, color: colors.slate500, paddingLeft: 6 },

  sectionHead: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  sectionAccent: {
    width: 4,
    height: 40,
    borderRadius: 4,
    backgroundColor: colors.brand,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionLead: { marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.slate500, maxWidth: 340 },

  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  conditionCell: {},
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    minHeight: 56,
  },
  conditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionIconText: { fontSize: 16, fontWeight: '800', color: colors.brand },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.slate900, lineHeight: 20 },

  faqSectionLabel: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    color: colors.slate700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  faqCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  faqStripe: { width: 5, backgroundColor: colors.brand },
  faqBody: { flex: 1, padding: 18 },
  q: { fontSize: 16, fontWeight: '700', color: colors.slate900, marginBottom: 8 },
  a: { fontSize: 14, color: colors.slate600, lineHeight: 22 },

  linkPill: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.35)',
  },
  linkPillPressed: { backgroundColor: colors.brandSoft },
  linkPillText: { fontSize: 15, fontWeight: '700', color: colors.brand },
  linkPillArrow: { fontSize: 16, fontWeight: '700', color: colors.brand },
})
