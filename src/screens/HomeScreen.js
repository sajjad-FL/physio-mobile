import { memo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
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

const WHY_FEATURES = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Certified Physiotherapists',
    desc: 'Every physio is a licensed BPT/MPT graduate, background-verified before joining.',
    bg: colors.emerald50,
    color: colors.emerald700,
  },
  {
    icon: 'home-outline',
    title: 'Home Visits Only',
    desc: 'Sessions happen at your home — no travel, no waiting rooms.',
    bg: colors.blue50,
    color: colors.blue600,
  },
  {
    icon: 'wallet-outline',
    title: 'Flexible Payment',
    desc: 'Pay per session or in packages. Easy online payment via Razorpay.',
    bg: colors.amber50,
    color: colors.amber800,
  },
]

const FAQ_ITEMS = [
  {
    q: 'How do I book a session?',
    a: 'Create an account, choose a date and time slot, pay online, and track everything in your dashboard.',
  },
  {
    q: 'Are your physiotherapists certified?',
    a: 'Yes — every physiotherapist on PhysioKhom is a licensed BPT/MPT graduate who has completed our verification process.',
  },
  {
    q: 'What if I need to reschedule?',
    a: 'You can reschedule or cancel up to 4 hours before your session from the My Bookings section.',
  },
  {
    q: 'Do you serve areas outside Guwahati?',
    a: 'We currently serve Guwahati and nearby areas across Assam. Type your locality when booking to confirm availability.',
  },
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

function StatPill({ icon, label }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={10} color="rgba(255,255,255,0.9)" />
      <Text style={styles.statPillTxt}>{label}</Text>
    </View>
  )
}

function FeatureCard({ icon, title, desc, bg, color, last }) {
  return (
    <>
      <View style={styles.whyRow}>
        <View style={[styles.whyIconWrap, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.whyBody}>
          <Text style={styles.whyTitle}>{title}</Text>
          <Text style={styles.whyDesc}>{desc}</Text>
        </View>
      </View>
      {!last && <View style={styles.whyDivider} />}
    </>
  )
}

function FaqRow({ q, a, last }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.faqRow, pressed && styles.faqRowPressed]}
        accessibilityRole="button"
      >
        <View style={styles.faqIconWrap}>
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={12} color={colors.brand} />
        </View>
        <View style={styles.faqBody}>
          <Text style={styles.q}>{q}</Text>
          {open ? <Text style={styles.a}>{a}</Text> : null}
        </View>
      </Pressable>
      {!last && <View style={styles.faqDivider} />}
    </>
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
        keyboardShouldPersistTaps="always"
      >

        {/* ── Hero card ──────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBand}>
            <View style={styles.heroGlow1} pointerEvents="none" />
            <View style={styles.heroGlow2} pointerEvents="none" />
            <View style={styles.heroGlow3} pointerEvents="none" />
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={10} color={colors.white} />
              <Text style={styles.heroBadgeTxt}>Verified home care · Assam</Text>
            </View>
            <Text style={styles.h1}>Physio{'\n'}near you</Text>
            <View style={styles.heroStats}>
              <StatPill icon="checkmark-circle" label="500+ Sessions" />
              <StatPill icon="people-outline" label="Verified Physios" />
              <StatPill icon="location-outline" label="Across Assam" />
            </View>
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

        {/* ── Why PhysioKhom ─────────────────────── */}
        <SectionHeader icon="star-outline" title="Why PhysioKhom" />
        <View style={styles.whyCard}>
          {WHY_FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} last={i === WHY_FEATURES.length - 1} />
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

        {/* ── Testimonial ────────────────────────── */}
        <SectionHeader icon="chatbubbles-outline" title="What patients say" />
        <View style={styles.testimonialCard}>
          <View style={styles.testimonialHeader}>
            <View style={styles.testimonialAvatar}>
              <Text style={styles.testimonialAvatarTxt}>P</Text>
            </View>
            <View style={styles.testimonialMeta}>
              <Text style={styles.testimonialName}>Priya Bora</Text>
              <Text style={styles.testimonialLoc}>Guwahati, Assam</Text>
            </View>
            <View style={styles.testimonialStars}>
              {[...Array(5)].map((_, i) => (
                <Ionicons key={i} name="star" size={11} color={colors.warning} />
              ))}
            </View>
          </View>
          <Text style={styles.testimonialTxt}>
            "My recovery after knee surgery was much faster thanks to regular home physio sessions. The physiotherapist was professional, punctual, and very caring. Highly recommended!"
          </Text>
          <View style={styles.testimonialBadge}>
            <Ionicons name="checkmark-circle" size={11} color={colors.success} />
            <Text style={styles.testimonialBadgeTxt}>Verified patient</Text>
          </View>
        </View>

        {/* ── FAQ ────────────────────────────────── */}
        <SectionHeader icon="help-circle-outline" title="FAQ" />
        <View style={styles.faqCard}>
          {FAQ_ITEMS.map((item, i) => (
            <FaqRow key={item.q} q={item.q} a={item.a} last={i === FAQ_ITEMS.length - 1} />
          ))}
        </View>

        {/* ── Bottom CTA ─────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('PhysioList')}
          style={styles.bottomCta}
          accessibilityRole="button"
          accessibilityLabel="Find physios near me"
        >
          <View style={styles.bottomCtaIcon}>
            <Ionicons name="location-outline" size={18} color={colors.white} />
          </View>
          <View style={styles.bottomCtaBody}>
            <Text style={styles.bottomCtaTxt}>Find physios near me</Text>
            <Text style={styles.bottomCtaSub}>Available today · Free first consult</Text>
          </View>
          <View style={styles.bottomCtaChevron}>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </View>
        </TouchableOpacity>

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
    paddingBottom: 24,
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
  heroGlow3: {
    position: 'absolute',
    top: 30,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
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
    fontSize: 26,
    lineHeight: 32,
    color: colors.white,
    letterSpacing: -0.8,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  statPillTxt: { fontFamily: font.medium, fontSize: type.xs, color: 'rgba(255,255,255,0.92)' },
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

  // Why PhysioKhom card
  whyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  whyRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 14 },
  whyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  whyBody: { flex: 1 },
  whyTitle: { fontFamily: font.semiBold, fontSize: type.md, color: colors.textPrimary, marginBottom: 3 },
  whyDesc: { fontFamily: font.regular, fontSize: type.sm, lineHeight: leading.base, color: colors.textSecondary },
  whyDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginHorizontal: 16 },

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

  // Testimonial card
  testimonialCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    ...CARD_SHADOW,
  },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  testimonialAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  testimonialAvatarTxt: { fontFamily: font.bold, fontSize: type.md, color: colors.white },
  testimonialMeta: { flex: 1 },
  testimonialName: { fontFamily: font.semiBold, fontSize: type.md, color: colors.textPrimary },
  testimonialLoc: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, marginTop: 1 },
  testimonialStars: { flexDirection: 'row', gap: 2 },
  testimonialTxt: {
    fontFamily: font.regular,
    fontSize: type.base,
    lineHeight: leading.base,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  testimonialBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  testimonialBadgeTxt: { fontFamily: font.medium, fontSize: type.xs, color: colors.success },

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
  faqRowPressed: { backgroundColor: colors.slate50 },
  faqIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  faqBody: { flex: 1 },
  faqDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
  q: { fontFamily: font.semiBold, fontSize: type.md, lineHeight: leading.md, color: colors.textPrimary },
  a: { fontFamily: font.regular, fontSize: type.base, lineHeight: leading.base, color: colors.textSecondary, marginTop: 6 },

  // Bottom CTA
  bottomCta: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  bottomCtaIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bottomCtaBody: { flex: 1 },
  bottomCtaTxt: { fontFamily: font.bold, fontSize: type.md, color: colors.white, letterSpacing: 0.1 },
  bottomCtaSub: { fontFamily: font.regular, fontSize: type.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bottomCtaChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
})
