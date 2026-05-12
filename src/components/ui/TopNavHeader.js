import { memo, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'
import { r } from '../../theme/radius'
import { useBottomTabBarHeight } from '../../navigation/tabBarMetrics'

const ROUTE_ICONS = {
  PhysioDashboard: 'calendar-outline',
  PhysioBookingsList: 'calendar-outline',
  PhysioWalletTab: 'wallet-outline',
  DashboardHome: 'home-outline',
  Bookings: 'calendar-outline',
  BookingsList: 'calendar-outline',
  Wallet: 'wallet-outline',
  Profile: 'person-circle-outline',
  ProfileGlobal: 'person-circle-outline',
  Disputes: 'shield-checkmark-outline',
  PhysioList: 'search-outline',
  PhysioHubTab: 'grid-outline',
  __noop: 'person-outline',
}

function TopNavHeader({
  title,
  subtitle,
  menuItems = [],
  sideItems = [],
  onNavigate,
  onLogout,
  showBookCta = false,
}) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const bottomTabBarHeight = useBottomTabBarHeight()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sideOpen, setSideOpen] = useState(false)
  const topPad = useMemo(() => Math.max(insets.top, 8) + 4, [insets.top])
  const drawerTop = topPad + 6
  const drawerBottomGap = bottomTabBarHeight + 12
  const drawerHeight = Math.max(280, height - drawerTop - drawerBottomGap)

  function nav(route) {
    setMenuOpen(false)
    setSideOpen(false)
    onNavigate?.(route)
  }

  return (
    <View style={[styles.wrap, { paddingTop: topPad }]}>
      <View style={styles.inner}>
        {/* Brand menu button */}
        <Pressable
          style={styles.brandBtn}
          onPress={() => setSideOpen((v) => !v)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Menu"
        >
          <Ionicons name="menu" size={18} color={colors.white} />
        </Pressable>

        {/* Title area */}
        <View style={styles.titleArea}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {/* Right actions */}
        <View style={styles.rightGroup}>
          {showBookCta ? (
            <Pressable style={styles.bookBtn} onPress={() => nav('PhysioList')}>
              <Ionicons name="add" size={14} color={colors.white} />
              <Text style={styles.bookTxt}>Book</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.avatarWrap}
            onPress={() => setMenuOpen((v) => !v)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Account menu"
          >
            <View style={styles.avatarBtn}>
              <Ionicons name="person" size={15} color={colors.white} />
            </View>
            <Ionicons
              name={menuOpen ? 'chevron-up' : 'chevron-down'}
              size={10}
              color={colors.slate400}
            />
          </Pressable>
        </View>
      </View>

      {/* Profile dropdown */}
      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.profileOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.dropCard}>
            <View style={styles.dropHead}>
              <View style={styles.dropHeadIconWrap}>
                <Ionicons name="person-circle-outline" size={17} color={colors.brand} />
              </View>
              <Text style={styles.dropHeadTxt}>Account</Text>
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={10} style={styles.dropClose}>
                <Ionicons name="close" size={15} color={colors.slate400} />
              </Pressable>
            </View>
            <View style={styles.dropDivider} />
            {menuItems.map((it) => (
              <Pressable
                key={it.label}
                style={[styles.dropItem, it.route === '__noop' && styles.dropItemNoop]}
                onPress={() => it.route !== '__noop' && nav(it.route)}
                disabled={it.route === '__noop'}
              >
                <View style={[styles.dropIconWrap, it.route === '__noop' && styles.dropIconWrapNoop]}>
                  <Ionicons
                    name={ROUTE_ICONS[it.route] || 'chevron-forward-outline'}
                    size={13}
                    color={it.route === '__noop' ? colors.textTertiary : colors.brand}
                  />
                </View>
                <Text style={[styles.dropTxt, it.route === '__noop' && styles.dropNoopTxt]}>
                  {it.label}
                </Text>
              </Pressable>
            ))}
            <View style={styles.dropDivider} />
            <Pressable
              style={styles.dropItem}
              onPress={() => {
                setMenuOpen(false)
                setSideOpen(false)
                onLogout?.()
              }}
            >
              <View style={[styles.dropIconWrap, styles.dropIconWrapDanger]}>
                <Ionicons name="log-out-outline" size={13} color={colors.danger} />
              </View>
              <Text style={styles.logoutTxt}>Logout</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Side drawer */}
      <Modal
        transparent
        visible={sideOpen}
        animationType="fade"
        onRequestClose={() => setSideOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <View style={[styles.sideDrawer, { marginTop: drawerTop, height: drawerHeight }]}>
            {/* Brand header */}
            <View style={styles.drawerHead}>
              <View style={styles.drawerLogoRow}>
                <View style={styles.drawerLogoMark}>
                  <Ionicons name="pulse" size={16} color={colors.white} />
                </View>
                <Text style={styles.drawerLogoTxt}>PhysioKhom</Text>
              </View>
              {subtitle ? (
                <Text style={styles.drawerSubTxt}>{subtitle}</Text>
              ) : null}
            </View>

            {/* Nav items */}
            <View style={styles.drawerNav}>
              {sideItems.map((it) => (
                <Pressable key={it.label} style={styles.drawerItem} onPress={() => nav(it.route)}>
                  <View style={styles.drawerItemIconWrap}>
                    <Ionicons
                      name={ROUTE_ICONS[it.route] || 'chevron-forward-outline'}
                      size={15}
                      color={colors.brand}
                    />
                  </View>
                  <Text style={styles.drawerItemTxt}>{it.label}</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.slate300} />
                </Pressable>
              ))}
            </View>

            {/* Drawer footer */}
            <View style={styles.drawerFooter}>
              <Pressable
                style={styles.drawerLogoutBtn}
                onPress={() => {
                  setSideOpen(false)
                  onLogout?.()
                }}
              >
                <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                <Text style={styles.drawerLogoutTxt}>Sign out</Text>
              </Pressable>
              <Text style={styles.drawerBrand}>physiokhom.com</Text>
            </View>
          </View>

          {/* Tap outside to close */}
          <Pressable style={{ flex: 1 }} onPress={() => setSideOpen(false)} />
        </View>
      </Modal>
    </View>
  )
}

const SHADOW = {
  shadowColor: '#0f172a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 8,
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleArea: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.bold, fontSize: type.lg, color: colors.textPrimary },
  sub: { marginTop: 1, fontFamily: font.medium, fontSize: type.xs, color: colors.brand },

  // Brand hamburger button
  brandBtn: {
    height: 36,
    width: 36,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    flexShrink: 0,
  },

  // Avatar + chevron cluster
  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  avatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 2,
    flexShrink: 0,
  },
  avatarBtn: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },

  // Book CTA
  bookBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: r.lg,
    backgroundColor: colors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookTxt: { fontFamily: font.bold, fontSize: type.sm, color: colors.white },

  // Dropdown shared
  backdrop: { ...StyleSheet.absoluteFillObject },

  // Profile dropdown
  profileOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 76,
    paddingRight: 16,
  },
  dropCard: {
    width: 220,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...SHADOW,
  },
  dropHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  dropHeadIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropHeadTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary, flex: 1 },
  dropClose: { padding: 2 },
  dropDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
  dropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  dropItemNoop: { opacity: 1 },
  dropIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropIconWrapNoop: { backgroundColor: colors.slate100 },
  dropIconWrapDanger: { backgroundColor: '#fef2f2' },
  dropTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.slate700, flex: 1 },
  dropNoopTxt: { color: colors.textTertiary, fontSize: type.xs },
  logoutTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.danger, flex: 1 },

  // Side drawer
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  sideDrawer: {
    width: 264,
    marginBottom: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#0f172a',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  drawerHead: {
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,
  },
  drawerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerLogoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLogoTxt: { fontFamily: font.bold, fontSize: type.xl, color: colors.white },
  drawerSubTxt: {
    marginTop: 6,
    fontFamily: font.medium,
    fontSize: type.xs,
    color: 'rgba(255,255,255,0.65)',
  },
  drawerNav: { flex: 1, paddingTop: 10, paddingHorizontal: 12 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  drawerItemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.teal50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  drawerItemTxt: {
    fontFamily: font.semiBold,
    fontSize: type.base,
    color: colors.textPrimary,
    flex: 1,
  },
  drawerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  drawerLogoutTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.danger },
  drawerBrand: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.textTertiary,
    paddingHorizontal: 10,
  },
})

export default memo(TopNavHeader)
