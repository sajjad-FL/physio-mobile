import { memo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import { getDefaultDashboardScreen } from '../auth/navigationTargets'
import { ISSUE_OPTIONS } from '../constants/issues'
import { StitchHeader } from '../components/home/StitchHeader'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'

const HOME_DESCRIPTION =
  'PhysioKhom connects patients with verified home-visit physiotherapists in Assam for back pain, knee pain, post-surgery rehab, and stroke recovery.'

const HOW_STEPS = [
  { icon: 'search-outline', title: 'Book online', desc: 'Choose a time and share your concerns from the app.' },
  { icon: 'person-add-outline', title: 'Get matched', desc: 'We connect you with a verified home-visit physiotherapist.' },
  { icon: 'home-outline', title: 'Recover at home', desc: 'Get care at home on a schedule that works for you.' },
]

const CONDITION_ICONS = {
  'Back Pain': { icon: 'body-outline', bg: colors.teal50, color: colors.brand },
  'Neck Pain': { icon: 'fitness-outline', bg: colors.blue50, color: colors.blue600 },
  'Knee Pain': { icon: 'walk-outline', bg: colors.violet50, color: colors.violet800 },
  'Post Surgery Rehab': { icon: 'medkit-outline', bg: colors.emerald50, color: colors.emerald700 },
  'Stroke/Paralysis': { icon: 'heart-outline', bg: colors.rose50, color: colors.red600 },
  'Many More': { icon: 'ellipsis-horizontal-circle-outline', bg: colors.amber50, color: colors.warning },
}

const DISPLAY_CONDITIONS = [...ISSUE_OPTIONS, 'Many More']

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={13} color={colors.brand} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

function PrimaryCta({ title, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
    >
      <Text style={styles.ctaTxt}>{title}</Text>
      <Ionicons name="arrow-forward" size={14} color={colors.white} />
    </Pressable>
  )
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { token } = useAuth()
  const gap = 10
  const cols = width >= 360 ? 2 : 1
  const cellW = cols === 2 ? (width - 32 - gap) / 2 : width - 32

  function goDashboard() {
    if (!token) return navigation.navigate('Login')
    navigation.navigate(getDefaultDashboardScreen())
  }

  return (
    <View style={styles.flex}>
      <StitchHeader
        token={token}
        onSignIn={() => navigation.navigate('Login')}
        onDashboard={goDashboard}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 20) + 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Hero card ──────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBand}>
            <View style={styles.heroGlow1} pointerEvents="none" />
            <View style={styles.heroGlow2} pointerEvents="none" />
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={10} color={colors.white} />
              <Text style={styles.heroBadgeTxt}>Verified home care · Assam</Text>
            </View>
            <Text style={styles.h1}>Physio{'\n'}near you</Text>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.lead}>{HOME_DESCRIPTION}</Text>
            <View style={styles.divider} />
            {!token ? (
              <View style={styles.heroActions}>
                <PrimaryCta title="Create account" onPress={() => navigation.navigate('Register')} />
                <Pressable onPress={() => navigation.navigate('Login')} style={styles.signInPrompt} hitSlop={8}>
                  <Text style={styles.signInTxt}>
                    Already have an account?{'  '}
                    <Text style={styles.signInBold}>Sign in →</Text>
                  </Text>
                </Pressable>
              </View>
            ) : (
              <PrimaryCta title="Book a session" onPress={() => navigation.navigate('PhysioList')} />
            )}
          </View>
        </View>

        {/* ── How it works ───────────────────────── */}
        <SectionHeader icon="information-circle-outline" title="How it works" />
        <View style={styles.howCard}>
          {HOW_STEPS.map((step, i) => (
            <View key={step.title} style={[styles.stepRow, i < HOW_STEPS.length - 1 && styles.stepRowSpaced]}>
              <View style={styles.stepRail}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
                {i < HOW_STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
              </View>
              <View style={styles.stepBody}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name={step.icon} size={13} color={colors.brand} />
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Physio CTA ─────────────────────────── */}
        <Pressable
          onPress={() => navigation.navigate('RegisterPhysio')}
          style={({ pressed }) => [styles.physioCta, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.physioCtaIconWrap}>
            <Ionicons name="medical-outline" size={20} color={colors.brand} />
          </View>
          <View style={styles.physioCtaBody}>
            <Text style={styles.physioCtaTitle}>Join as a physiotherapist</Text>
            <Text style={styles.physioCtaSub}>List your practice · flexible home visits</Text>
          </View>
          <View style={styles.physioCtaChevron}>
            <Ionicons name="chevron-forward" size={13} color={colors.brand} />
          </View>
        </Pressable>

        {/* ── Conditions grid ────────────────────── */}
        <SectionHeader icon="medical-outline" title="Common conditions" />
        <View style={styles.grid}>
          {DISPLAY_CONDITIONS.map((label) => (
            <ConditionCard key={label} label={label} width={cellW} />
          ))}
        </View>

        {/* ── FAQ ────────────────────────────────── */}
        <SectionHeader icon="help-circle-outline" title="FAQ" />
        <View style={styles.faqCard}>
          <View style={styles.faqRow}>
            <View style={styles.faqIconWrap}>
              <Ionicons name="chatbubble-outline" size={13} color={colors.brand} />
            </View>
            <View style={styles.faqBody}>
              <Text style={styles.q}>How do I book?</Text>
              <Text style={styles.a}>
                Create an account, choose a date and time slot, pay online, and track everything in your dashboard.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Bottom CTA ─────────────────────────── */}
        <Pressable
          onPress={() => navigation.navigate('NearMeHub')}
          style={({ pressed }) => [styles.bottomCta, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="location-outline" size={15} color={colors.white} />
          <Text style={styles.bottomCtaTxt}>Find physios near me</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.white} />
        </Pressable>

      </ScrollView>
    </View>
  )
}

const ConditionCard = memo(function ConditionCard({ label, width }) {
  const cfg = CONDITION_ICONS[label] || { icon: 'medical-outline', bg: colors.teal50, color: colors.brand }
  return (
    <View style={[styles.conditionCard, { width }]}>
      <View style={[styles.conditionIcon, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <Text style={styles.conditionTxt}>{label}</Text>
    </View>
  )
})

const CARD_SHADOW = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingHorizontal: 16, paddingTop: 14 },

  // Hero card
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heroBand: {
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    position: 'relative',
  },
  heroGlow1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlow2: {
    position: 'absolute',
    bottom: 0,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  heroBadgeTxt: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    letterSpacing: 0.4,
    color: colors.white,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: font.bold,
    fontSize: type['3xl'],
    lineHeight: 30,
    color: colors.white,
    letterSpacing: -0.6,
  },
  heroBody: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  lead: {
    fontFamily: font.regular,
    fontSize: type.base,
    lineHeight: leading.base,
    color: colors.textSecondary,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginVertical: 14 },
  heroActions: { gap: 10 },
  signInPrompt: { alignSelf: 'center', paddingVertical: 2 },
  signInTxt: {
    fontFamily: font.regular,
    fontSize: type.base,
    lineHeight: leading.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  signInBold: { fontFamily: font.semiBold, color: colors.brand },

  // Primary CTA button
  ctaBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnPressed: { backgroundColor: colors.brandHover },
  ctaTxt: { fontFamily: font.bold, fontSize: type.md, color: colors.white, letterSpacing: 0.1 },

  // Section header row
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },

  // How it works card
  howCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...CARD_SHADOW,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepRowSpaced: { marginBottom: 4 },
  stepRail: { width: 28, alignItems: 'center', marginRight: 12 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  stepNum: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },
  stepLine: { width: 2, height: 24, marginTop: 4, backgroundColor: colors.brandSoft, borderRadius: 1 },
  stepBody: { flex: 1, paddingBottom: 14 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  stepIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { fontFamily: font.semiBold, fontSize: type.md, color: colors.textPrimary },
  stepDesc: { fontFamily: font.regular, fontSize: type.base, lineHeight: leading.base, color: colors.textSecondary },

  // Physio CTA banner
  physioCta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    padding: 14,
    gap: 14,
    ...CARD_SHADOW,
  },
  physioCtaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  physioCtaBody: { flex: 1, minWidth: 0 },
  physioCtaTitle: { fontFamily: font.semiBold, fontSize: type.md, color: colors.textPrimary },
  physioCtaSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  physioCtaChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Conditions grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  conditionCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 90,
    ...CARD_SHADOW,
  },
  conditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionTxt: {
    marginTop: 8,
    fontFamily: font.medium,
    fontSize: type.sm,
    lineHeight: leading.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // FAQ card
  faqCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  faqRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  faqIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  faqBody: { flex: 1 },
  q: { fontFamily: font.semiBold, fontSize: type.md, lineHeight: leading.md, color: colors.textPrimary, marginBottom: 6 },
  a: { fontFamily: font.regular, fontSize: type.base, lineHeight: leading.base, color: colors.textSecondary },

  // Bottom CTA
  bottomCta: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  bottomCtaTxt: { fontFamily: font.bold, fontSize: type.md, color: colors.white, letterSpacing: 0.1 },
})
