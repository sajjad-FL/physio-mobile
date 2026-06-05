import { useCallback } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import {
  DEFAULT_REFERRAL_REWARD_AMOUNT,
  DEFAULT_REFERRAL_SIGNUP_BONUS_AMOUNT,
  useReferralMyCode,
  useReferralStats,
} from '../api/queries'
import { colors } from '../theme/colors'
import { surfaceCardShadow, surfaceSectionCard } from '../theme/surfaceCard'
import { font, type, leading } from '../theme/typography'

const REGISTER_BASE = 'https://app.physiokhom.com/register'

function statusLabel(s) {
  if (s === 'credited') return { text: 'Credited', color: colors.success }
  if (s === 'pending') return { text: 'Pending', color: colors.warning }
  return { text: 'Not yet', color: colors.textTertiary }
}

export default function ReferEarnScreen() {
  const { data: myCode, isLoading: codeLoading, isRefetching: codeRefetching, refetch: refetchCode } = useReferralMyCode()
  const { data: referrals = [], isLoading: statsLoading, isRefetching: statsRefetching, refetch: refetchStats } = useReferralStats()

  const refreshing = codeRefetching || statsRefetching

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchCode(), refetchStats()])
  }, [refetchCode, refetchStats])

  const referralCode = myCode?.referralCode || ''
  const walletBalance = Number(myCode?.walletBalance) || 0
  const earnAmount = myCode?.referralRewardAmount || DEFAULT_REFERRAL_REWARD_AMOUNT
  const friendBonus = myCode?.referralSignupBonusAmount ?? DEFAULT_REFERRAL_SIGNUP_BONUS_AMOUNT
  const shareUrl = referralCode ? `${REGISTER_BASE}?ref=${encodeURIComponent(referralCode)}` : ''

  const copyCode = useCallback(async () => {
    if (!referralCode) return
    try {
      await Share.share({ message: referralCode })
    } catch {
      Toast.show({ type: 'info', text1: referralCode })
    }
  }, [referralCode])

  const shareInvite = useCallback(async () => {
    if (!referralCode) return
    const friendPart = friendBonus > 0 ? `They get ₹${friendBonus} on signup. ` : ''
    const message = `Join PhysiOkhom! Use my code ${referralCode} to get started. ${friendPart}You'll earn ₹${earnAmount} when they complete their first session. ${shareUrl}`
    try {
      await Share.share({ message })
    } catch {
      // user cancelled
    }
  }, [referralCode, shareUrl, earnAmount, friendBonus])

  const loading = codeLoading || statsLoading

  return (
    <View style={styles.container}>
      {/* Ambient Top Background Halo Glow */}
      <View style={styles.ambientHeaderGlow} pointerEvents="none" />
      <View style={styles.ambientHeaderGlow2} pointerEvents="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
      >
        <Text style={styles.title}>Refer &amp; Earn</Text>
        <Text style={styles.sub}>
          Share your code.
          {friendBonus > 0 ? ` Friends get ₹${friendBonus} when they sign up.` : ''} You earn ₹{earnAmount} when
          they complete their first session.
        </Text>

        <View style={styles.card}>
          {codeLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <>
              <Text style={styles.label}>Your referral code</Text>
              <Text style={styles.code}>{referralCode || '—'}</Text>
              <View style={styles.badgeRow}>
                {friendBonus > 0 ? (
                  <View style={styles.badgeFriend}>
                    <Text style={styles.badgeFriendTxt}>Friends get ₹{friendBonus} on signup</Text>
                  </View>
                ) : null}
                <View style={styles.badgeEarn}>
                  <Text style={styles.badgeEarnTxt}>You earn ₹{earnAmount} per friend</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>Wallet: ₹{walletBalance.toFixed(0)}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <Pressable style={styles.btnOutline} onPress={copyCode}>
                  <Text style={styles.btnOutlineTxt}>Copy code</Text>
                </Pressable>
                <Pressable style={styles.btnPrimary} onPress={shareInvite}>
                  <Text style={styles.btnPrimaryTxt}>Share</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Friends you referred</Text>
            <Pressable
              onPress={() => {
                refetchCode()
                refetchStats()
              }}
            >
              <Text style={styles.refresh}>Refresh</Text>
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 12 }} />
          ) : referrals.length === 0 ? (
            <Text style={styles.empty}>No referrals yet. Share your code to get started.</Text>
          ) : (
            referrals.map((r) => {
              const st = statusLabel(r.rewardStatus)
              return (
                <View key={String(r.userId)} style={styles.refRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refName}>{r.name}</Text>
                    <Text style={styles.refPhone}>{r.phone}</Text>
                    {r.rewardStatus === 'credited' && r.amount != null ? (
                      <Text style={styles.refCredited}>+₹{r.amount} credited</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.refStatus, { color: st.color }]}>{st.text}</Text>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, position: 'relative' },
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
  scroll: { flex: 1, zIndex: 2 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontFamily: font.bold, fontSize: type['3xl'], color: colors.textPrimary, letterSpacing: -0.5 },
  sub: {
    marginTop: 8,
    fontFamily: font.regular,
    fontSize: type.sm,
    lineHeight: leading.sm,
    color: colors.textSecondary,
  },
  card: {
    marginTop: 20,
    ...surfaceSectionCard,
    padding: 20,
    zIndex: 1,
  },
  label: {
    fontFamily: font.semiBold,
    fontSize: type.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  code: {
    marginTop: 8,
    fontFamily: font.bold,
    fontSize: 32,
    letterSpacing: 4,
    color: colors.brand,
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(13, 148, 136, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    overflow: 'hidden',
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badgeFriend: {
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  badgeFriendTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: '#6d28d9' },
  badgeEarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeEarnTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: '#b45309' },
  badge: {
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  badgeTxt: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.brand },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.white,
    alignItems: 'center',
    ...surfaceCardShadow,
  },
  btnOutlineTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPrimaryTxt: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textPrimary },
  refresh: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
  empty: { marginTop: 12, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13, 148, 136, 0.06)',
  },
  refName: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  refPhone: { fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary, marginTop: 2 },
  refCredited: {
    fontFamily: font.regular,
    fontSize: type.xs,
    color: colors.success,
    marginTop: 2,
  },
  refStatus: { fontFamily: font.semiBold, fontSize: type.xs },
})
