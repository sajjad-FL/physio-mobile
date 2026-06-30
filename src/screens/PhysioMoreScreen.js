import { Ionicons } from '@expo/vector-icons'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { usePhysioWorkspaceOptional } from '../context/PhysioWorkspaceContext'
import { colors } from '../theme/colors'
import { font, type } from '../theme/typography'

const LINKS = [
  {
    label: 'Disputes',
    sub: 'Raise and track disputes',
    screen: 'PhysioDisputes',
    badgeKey: 'disputes',
    icon: 'alert-circle-outline',
    iconBg: colors.amber50,
    iconColor: colors.warning,
  },
  {
    label: 'Onboarding',
    sub: 'Complete your practice profile',
    screen: 'PhysioOnboarding',
    icon: 'document-text-outline',
    iconBg: colors.blue50,
    iconColor: colors.blue600,
  },
  {
    label: 'Verification',
    sub: 'Platform approval status',
    screen: 'PhysioVerification',
    icon: 'shield-checkmark-outline',
    iconBg: colors.teal50,
    iconColor: colors.brand,
  },
  {
    label: 'Profile',
    sub: 'Personal and practice details',
    screen: 'ProfileGlobal',
    icon: 'person-outline',
    iconBg: colors.violet50,
    iconColor: colors.violet800,
  },
]

function Badge({ count }) {
  const n = Number(count) || 0
  if (n <= 0) return null
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeTxt}>{n > 99 ? '99+' : String(n)}</Text>
    </View>
  )
}

function StatCard({ icon, iconBg, iconColor, value, label }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function PhysioMoreScreen({ navigation }) {
  const ws = usePhysioWorkspaceOptional()
  const disputeN = ws?.disputeBadge ?? 0
  const bookingN = ws?.bookingBadge ?? 0
  const physioName = String(ws?.me?.name || '').trim()
  const firstName = physioName.split(' ')[0] || 'Doctor'

  function go(screen) {
    const root = navigation.getParent()?.getParent()
    if (root) root.navigate(screen)
    else navigation.navigate(screen)
  }

  return (
    <View style={styles.container}>
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Brand hero card ──────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroLogoWrap}>
              <Ionicons name="pulse" size={20} color={colors.white} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroGreeting}>Hello, {firstName} 👋</Text>
              <Text style={styles.heroSub}>PhysiOkhom workspace</Text>
            </View>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagTxt}>PHYSIO</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{bookingN}</Text>
              <Text style={styles.heroStatLabel}>Pending</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{disputeN}</Text>
              <Text style={styles.heroStatLabel}>Disputes</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Ionicons name="checkmark-circle" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroStatLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* ── Quick stats row ──────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="calendar-outline"
            iconBg={colors.teal50}
            iconColor={colors.brand}
            value={bookingN}
            label="New bookings"
          />
          <StatCard
            icon="alert-circle-outline"
            iconBg={colors.warningBg}
            iconColor={colors.warning}
            value={disputeN}
            label="Open disputes"
          />
          <StatCard
            icon="wallet-outline"
            iconBg={colors.blue50}
            iconColor={colors.blue600}
            value="—"
            label="Wallet"
          />
        </View>

        {/* ── Section label ────────────────────────── */}
        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>

        {/* ── Navigation rows ──────────────────────── */}
        <View style={styles.navList}>
          {LINKS.map((link, index) => (
            <Pressable
              key={link.screen}
              style={({ pressed }) => [
                styles.navRow,
                index < LINKS.length - 1 && styles.navRowDivider,
                pressed && styles.navRowPressed,
              ]}
              onPress={() => go(link.screen)}
            >
              <View style={[styles.navIcon, { backgroundColor: link.iconBg }]}>
                <Ionicons name={link.icon} size={18} color={link.iconColor} />
              </View>
              <View style={styles.navBody}>
                <View style={styles.navTitleRow}>
                  <Text style={styles.navTitle}>{link.label}</Text>
                  {link.badgeKey === 'disputes' && <Badge count={disputeN} />}
                </View>
                <Text style={styles.navSub}>{link.sub}</Text>
              </View>
              <View style={styles.navChevronWrap}>
                <Ionicons name="chevron-forward" size={14} color={colors.slate400} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Footer ───────────────────────────────── */}
        <Text style={styles.appVersion}>physiokhom.com · Physio App</Text>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f8f6',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientHeaderGlow: {
    position: 'absolute',
    top: -120,
    left: -60,
    right: -60,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(162, 240, 239, 0.15)',
    zIndex: 0,
  },
  ambientHeaderGlow2: {
    position: 'absolute',
    top: -50,
    left: '20%',
    width: '60%',
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(13, 107, 107, 0.04)',
    zIndex: 0,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 36, backgroundColor: 'transparent' },

  // Hero card
  heroCard: {
    borderRadius: 20,
    backgroundColor: colors.brand,
    marginBottom: 14,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  heroLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroText: { flex: 1, minWidth: 0 },
  heroGreeting: { fontFamily: font.bold, fontSize: type.lg, color: colors.white },
  heroSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: 'rgba(255,255,255,0.7)' },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleTagTxt: { fontFamily: font.bold, fontSize: 9, color: colors.white, letterSpacing: 0.8 },

  // Hero stats row inside hero card
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  heroStatItem: { flex: 1, alignItems: 'center', gap: 4 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroStatValue: { fontFamily: font.bold, fontSize: type.xl, color: colors.white },
  heroStatLabel: { fontFamily: font.regular, fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Quick stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(240, 253, 250, 0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    padding: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary },
  statLabel: { fontFamily: font.regular, fontSize: 9, color: colors.textSecondary, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Section label
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  // Nav list
  navList: {
    backgroundColor: 'rgba(240, 253, 250, 0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  navRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(13, 148, 136, 0.1)' },
  navRowPressed: { backgroundColor: 'rgba(13, 148, 136, 0.06)' },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navBody: { flex: 1, minWidth: 0 },
  navTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  navSub: { marginTop: 2, fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  navChevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(13, 148, 136, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.danger,
  },
  badgeTxt: { fontFamily: font.bold, fontSize: 10, color: colors.white },

  appVersion: {
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textTertiary,
  },
})
