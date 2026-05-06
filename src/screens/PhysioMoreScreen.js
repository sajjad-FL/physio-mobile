import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { usePhysioWorkspaceOptional } from '../context/PhysioWorkspaceContext'
import { colors } from '../theme/colors'

const LINKS = [
  { label: 'Disputes', screen: 'PhysioDisputes', badgeKey: 'disputes' },
  { label: 'Onboarding', screen: 'PhysioOnboarding' },
  { label: 'Verification', screen: 'PhysioVerification', sub: 'Opens onboarding wizard' },
  { label: 'Profile', screen: 'ProfileGlobal', sub: 'Shared profile' },
]

function Badge({ count }) {
  const n = Number(count) || 0
  if (n <= 0) return null
  const label = n > 99 ? '99+' : String(n)
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeTxt}>{label}</Text>
    </View>
  )
}

export default function PhysioMoreScreen({ navigation }) {
  const ws = usePhysioWorkspaceOptional()

  function go(screen) {
    const root = navigation.getParent()?.getParent()
    if (root) root.navigate(screen)
    else navigation.navigate(screen)
  }

  const disputeN = ws?.disputeBadge ?? 0

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Text style={styles.logoHeart}>❤</Text>
        </View>
        <View>
          <Text style={styles.brand}>PhysioKhom</Text>
          <Text style={styles.workspace}>Workspace hub</Text>
        </View>
        <View style={styles.roleChip}>
          <Text style={styles.roleChipTxt}>Physio</Text>
        </View>
      </View>
      <Text style={styles.title}>Hub</Text>
      <Text style={styles.lead}>Disputes, onboarding, verification, and profile (matches web sidebar items grouped for mobile).</Text>
      <View style={{ height: 12 }} />
      {LINKS.map((l) => (
        <Pressable key={l.screen} style={styles.row} onPress={() => go(l.screen)}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.rowText}>{l.label}</Text>
              {l.badgeKey === 'disputes' ? <Badge count={disputeN} /> : null}
            </View>
            {l.sub ? <Text style={styles.sub}>{l.sub}</Text> : null}
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHeart: { color: colors.white, fontSize: 18 },
  brand: { fontSize: 16, fontWeight: '800', color: colors.slate900 },
  workspace: { fontSize: 12, fontWeight: '600', color: colors.brandHover, marginTop: 2 },
  roleChip: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.slate50 },
  roleChipTxt: { fontSize: 10, fontWeight: '800', color: colors.slate500, letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.slate900 },
  lead: { marginTop: 8, fontSize: 13, color: colors.slate500, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
  },
  rowText: { fontSize: 16, fontWeight: '600', color: colors.slate900 },
  sub: { marginTop: 4, fontSize: 12, color: colors.slate500 },
  chev: { fontSize: 22, color: colors.slate400 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: colors.white },
})
