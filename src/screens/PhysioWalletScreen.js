import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import PaginationBar from '../components/ui/PaginationBar'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { formatInr } from '../utils/currency'

// ── Helpers ──────────────────────────────────────────────────────────────────

function typeLabel(row) {
  const t = row?.type
  const direction = row?.direction
  const leg = row?.meta?.leg

  if (t === 'online') {
    if (leg === 'refund') return 'Refund (reversed)'
    if (direction === 'credit') return 'Online Booking Earned'
    return 'Online payment'
  }
  if (t === 'offline') {
    if (leg === 'gross') return 'Cash Collected'
    if (leg === 'commission') return 'Platform Fee (Cash)'
    return 'Offline payment'
  }
  if (t === 'settlement') {
    return 'Fee Remitted to Platform'
  }
  if (t === 'withdrawal') {
    return 'Withdrawal Paid Out'
  }
  return t || '—'
}

function typePalette(t) {
  switch (t) {
    case 'online': return { bg: colors.emerald50, fg: colors.emerald700, bd: '#a7f3d0' }
    case 'offline': return { bg: colors.amber50, fg: colors.amber800, bd: colors.amber200 }
    case 'settlement': return { bg: colors.blue50, fg: colors.blue700, bd: '#bae6fd' }
    case 'withdrawal': return { bg: colors.rose50, fg: colors.rose900, bd: '#fecdd3' }
    default: return { bg: 'rgba(241, 245, 249, 0.6)', fg: colors.slate700, bd: 'rgba(13, 148, 136, 0.15)' }
  }
}

function typeIcon(t) {
  switch (t) {
    case 'online': return 'card-outline'
    case 'offline': return 'cash-outline'
    case 'settlement': return 'swap-horizontal-outline'
    case 'withdrawal': return 'arrow-up-circle-outline'
    default: return 'receipt-outline'
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TypeTag = memo(function TypeTag({ type: t, row }) {
  const p = typePalette(t)
  return (
    <View style={[styles.typeTag, { backgroundColor: p.bg, borderColor: p.bd }]}>
      <Text style={[styles.typeTagTxt, { color: p.fg }]}>{typeLabel(row)}</Text>
    </View>
  )
})

const TransactionRow = memo(function TransactionRow({ row }) {
  const p = typePalette(row.type)
  const icon = typeIcon(row.type)
  const isCredit = row.direction === 'credit'
  const isDebit = row.direction === 'debit'

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIconWrap, { backgroundColor: p.bg }]}>
        <Ionicons name={icon} size={16} color={p.fg} />
      </View>
      <View style={styles.txBody}>
        <View style={styles.txTopRow}>
          <TypeTag type={row.type} row={row} />
          <Text style={[styles.txDir, isCredit ? styles.txCredit : isDebit ? styles.txDebit : null]}>
            {isCredit ? '+ Credit' : isDebit ? '− Debit' : ''}
          </Text>
        </View>
        <Text style={styles.txAmount}>{formatInr(row.totalAmount)}</Text>
        <TxNote row={row} />
        {row.createdAt && (
          <Text style={styles.txDate}>{new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        )}
      </View>
    </View>
  )
})

const TxNote = memo(function TxNote({ row }) {
  let note = null
  if (row.bookingId?.date) {
    note = `Booking ${row.bookingId.date}${row.bookingId.timeSlot ? ' · ' + row.bookingId.timeSlot : ''}`
  } else if (row.type === 'settlement' && row.meta?.note) {
    note = row.meta.note
  } else if (row.type === 'online' && row.meta?.gross != null && row.direction === 'credit') {
    note = `Gross ${formatInr(row.meta.gross)} · Platform fee ${formatInr(row.commission)}`
  } else if (row.type === 'offline' && row.meta?.leg === 'gross') {
    note = `Gross collection · Share ${formatInr(row.physioEarning)}`
  } else if (row.type === 'offline' && row.meta?.leg === 'commission') {
    note = 'Platform fee owed (reduces withdrawable balance)'
  } else if (row.type === 'withdrawal' && row.meta?.note) {
    note = row.meta.note
  }
  if (!note) return null
  return <Text style={styles.txNote}>{note}</Text>
})

const BreakdownRow = memo(function BreakdownRow({ type, label, count, vol, detail, last }) {
  const p = typePalette(type, {})
  return (
    <View style={[styles.bdRow, last && styles.bdRowLast]}>
      <View style={styles.bdLeft}>
        <View style={[styles.bdTag, { backgroundColor: p.bg, borderColor: p.bd }]}>
          <Text style={[styles.bdTagTxt, { color: p.fg }]}>{label}</Text>
        </View>
      </View>
      <View style={styles.bdRight}>
        <View style={styles.bdMetaRow}>
          <View style={styles.bdMeta}>
            <Text style={styles.bdMetaLabel}>Events</Text>
            <Text style={styles.bdMetaValue}>{count ?? 0}</Text>
          </View>
          <View style={styles.bdMeta}>
            <Text style={styles.bdMetaLabel}>Volume</Text>
            <Text style={styles.bdMetaValue}>{formatInr(vol)}</Text>
          </View>
        </View>
        {detail ? <Text style={styles.bdDetail}>{detail}</Text> : null}
      </View>
    </View>
  )
})

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PhysioWalletScreen() {
  const [dash, setDash] = useState(null)
  const [tx, setTx] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [txLoading, setTxLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pendingWithdraw, setPendingWithdraw] = useState(null)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)
  const [withdrawInputFocused, setWithdrawInputFocused] = useState(false)

  const loadPendingWithdraw = useCallback(async () => {
    try {
      const res = await api.get('/withdraw/pending')
      setPendingWithdraw(res.data?.pending || null)
    } catch { setPendingWithdraw(null) }
  }, [])

  const loadDash = useCallback(async () => {
    try {
      const res = await api.get('/physio/wallet')
      setDash(res.data)
    } catch { Toast.show({ type: 'error', text1: 'Failed to load wallet' }) }
    finally { setLoading(false) }
  }, [])

  const loadTx = useCallback(async () => {
    setTxLoading(true)
    try {
      const res = await api.get('/physio/wallet/transactions', { params: { page, limit: 15 } })
      setTx(res.data?.data || [])
      setTotalPages(res.data?.totalPages || 1)
    } catch { Toast.show({ type: 'error', text1: 'Failed to load transactions' }) }
    finally { setTxLoading(false) }
  }, [page])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadDash(), loadTx(), loadPendingWithdraw()])
    setRefreshing(false)
  }, [loadDash, loadTx, loadPendingWithdraw])

  useEffect(() => { loadDash(); loadPendingWithdraw() }, [loadDash, loadPendingWithdraw])
  useEffect(() => { loadTx() }, [loadTx])

  const { w, b, available, onlineAvail, commissionDue, showNetExplainer } = useMemo(() => {
    const w = dash?.wallet
    const available = Number(w?.availableBalance)
    const onlineAvail = Number(w?.onlineAvailableBalance ?? w?.onlineEarning)
    const commissionDue = Number(w?.commissionDue)
    return { w, b: dash?.breakdown, available, onlineAvail, commissionDue, showNetExplainer: Number.isFinite(commissionDue) && commissionDue > 0.009 }
  }, [dash])

  const hasPending = Boolean(pendingWithdraw)

  async function submitWithdraw() {
    const n = Number(withdrawAmount.trim())
    if (!Number.isFinite(n) || n <= 0) { Toast.show({ type: 'error', text1: 'Enter a valid amount' }); return }
    if (n > available + 1e-6) { Toast.show({ type: 'error', text1: 'Exceeds available balance' }); return }
    setWithdrawSubmitting(true)
    try {
      await api.post('/withdraw', { amount: n })
      Toast.show({ type: 'success', text1: 'Withdrawal request submitted' })
      setWithdrawOpen(false)
      setWithdrawAmount('')
      await Promise.all([loadDash(), loadPendingWithdraw(), loadTx()])
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Request failed' })
    } finally { setWithdrawSubmitting(false) }
  }

  const header = (
    <>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <>
          {/* ── Hero: available balance ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroLabel}>WITHDRAWABLE BALANCE</Text>
                <Text style={styles.heroAmount}>{formatInr(w?.availableBalance)}</Text>
                {showNetExplainer && (
                  <Text style={styles.heroSub}>
                    {formatInr(onlineAvail)} online − {formatInr(commissionDue)} platform fee
                  </Text>
                )}
              </View>
              <View style={styles.heroIconWrap}>
                <Ionicons name="wallet-outline" size={22} color="rgba(255,255,255,0.7)" />
              </View>
            </View>

            {hasPending && (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={14} color={colors.amber800} />
                <Text style={styles.pendingTxt}>
                  Withdrawal of {formatInr(pendingWithdraw?.amount)} pending review
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.withdrawBtn,
                (loading || hasPending || !Number.isFinite(available) || available <= 0) && styles.withdrawBtnDisabled,
                pressed && styles.withdrawBtnPressed,
              ]}
              onPress={() => { setWithdrawAmount(''); setWithdrawOpen(true) }}
              disabled={loading || hasPending || !Number.isFinite(available) || available <= 0}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color={colors.brand} />
              <Text style={styles.withdrawBtnTxt}>Withdraw money</Text>
            </Pressable>
          </View>

          {/* ── Stat tiles ── */}
          <View style={styles.statsRow}>
            <View style={[styles.statTile, { borderLeftColor: colors.warning }]}>
              <Text style={styles.statTileLabel}>PLATFORM FEE OWED</Text>
              <Text style={[styles.statTileValue, { color: colors.amber800 }]}>{formatInr(w?.commissionDue)}</Text>
              <Text style={styles.statTileSub}>Owed from offline cash</Text>
            </View>
            <View style={[styles.statTile, { borderLeftColor: colors.brand }]}>
              <Text style={styles.statTileLabel}>TOTAL EARNED</Text>
              <Text style={styles.statTileValue}>{formatInr(w?.totalEarned)}</Text>
              <Text style={styles.statTileSub}>Lifetime earnings share</Text>
            </View>
          </View>

          {/* ── Breakdown ── */}
          {b && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Earnings breakdown</Text>
                <Text style={styles.sectionSub}>By payment channel</Text>
              </View>
              <View style={styles.breakdownCard}>
                <BreakdownRow type="online" label="Online" count={b.online_payment?.count} vol={b.online_payment?.volume} detail={`Online wallet (withdrawable minus platform fee)`} />
                <BreakdownRow type="offline" label="Offline" count={b.offline_payment?.count} vol={b.offline_payment?.volume} detail={`Platform fee ${formatInr(b.offline_payment?.commissionAccrued)} · Share ${formatInr(b.offline_payment?.physioShare)}`} />
                <BreakdownRow type="settlement" label="Fee collections" count={b.settlement?.count} vol={b.settlement?.volume} detail="Remitted to platform" last />
              </View>
            </View>
          )}

          {/* ── Transaction history header ── */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Transactions</Text>
              {txLoading && <ActivityIndicator size="small" color={colors.brand} />}
            </View>
          </View>
        </>
      )}
    </>
  )

  return (
    <View style={styles.container}>
      <View style={styles.ambientHeaderGlow} />
      <View style={styles.ambientHeaderGlow2} />
      <FlatList
        data={txLoading ? [] : tx}
        keyExtractor={(row, i) => String(row?._id || row?.syntheticKind || i)}
        renderItem={({ item }) => <TransactionRow row={item} />}
        ListHeaderComponent={header}
        ListFooterComponent={
          <View style={styles.footer}>
            <PaginationBar page={page} totalPages={totalPages} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
            <View style={{ height: 32 }} />
          </View>
        }
        contentContainerStyle={styles.listPad}
        style={styles.root}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand]}
            tintColor={colors.brand}
          />
        }
      />

      {/* ── Withdrawal modal ── */}
      <Modal transparent visible={withdrawOpen} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request withdrawal</Text>
              <Pressable onPress={() => setWithdrawOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.slate500} />
              </Pressable>
            </View>
            <Text style={styles.modalSub}>
              Max: {formatInr(w?.availableBalance)} · Minimum ₹1 · One request at a time
            </Text>
            <Text style={styles.modalLabel}>Amount (INR)</Text>
            <TextInput
              style={[
                styles.modalInput,
                withdrawInputFocused && styles.modalInputFocused
              ]}
              keyboardType="decimal-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="e.g. 5000"
              placeholderTextColor={colors.slate300}
              onFocus={() => setWithdrawInputFocused(true)}
              onBlur={() => setWithdrawInputFocused(false)}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setWithdrawOpen(false)}>
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSubmit, withdrawSubmitting && styles.modalSubmitBusy]}
                onPress={submitWithdraw}
                disabled={withdrawSubmitting}
              >
                {withdrawSubmitting
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.modalSubmitTxt}>Submit request</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  listPad: { padding: 16, paddingBottom: 20 },
  loaderWrap: { paddingVertical: 60, alignItems: 'center' },

  // Hero
  heroCard: {
    borderRadius: 20,
    backgroundColor: colors.brand,
    padding: 22,
    gap: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifycontent: 'space-between' },
  heroLeft: { flex: 1 },
  heroLabel: { fontFamily: font.bold, fontSize: type.xs, letterSpacing: 1, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 8 },
  heroAmount: { fontFamily: font.bold, fontSize: 32, color: '#fff', letterSpacing: -1, lineHeight: 36 },
  heroSub: { marginTop: 5, fontFamily: font.regular, fontSize: type.sm, color: 'rgba(255,255,255,0.65)' },
  heroIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.amber50,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  pendingTxt: { fontFamily: font.medium, fontSize: type.sm, color: colors.amber800, flex: 1 },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
  },
  withdrawBtnDisabled: { opacity: 0.5 },
  withdrawBtnPressed: { opacity: 0.85 },
  withdrawBtnTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.brand },

  // Stat tiles
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statTile: {
    flex: 1,
    backgroundColor: 'rgba(240, 253, 250, 0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    borderLeftWidth: 3,
    padding: 14,
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statTileLabel: { fontFamily: font.bold, fontSize: 9, letterSpacing: 0.7, color: colors.textSecondary, textTransform: 'uppercase' },
  statTileValue: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary, letterSpacing: -0.3, marginTop: 6 },
  statTileSub: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },

  // Section
  section: { marginBottom: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  sectionSub: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },

  // Breakdown
  breakdownCard: {
    backgroundColor: 'rgba(240, 253, 250, 0.88)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    overflow: 'hidden',
  },
  bdRow: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(13, 148, 136, 0.08)',
  },
  bdRowLast: { borderBottomWidth: 0 },
  bdLeft: { flexShrink: 0, paddingTop: 2 },
  bdTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  bdTagTxt: { fontFamily: font.bold, fontSize: 10 },
  bdRight: { flex: 1, gap: 8 },
  bdMetaRow: { flexDirection: 'row', gap: 20 },
  bdMeta: { gap: 2 },
  bdMetaLabel: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  bdMetaValue: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  bdDetail: { fontFamily: font.regular, fontSize: type.xs, color: colors.slate500, lineHeight: leading.xs },

  // Transactions
  txRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(13, 148, 136, 0.12)',
  },
  txRowSynth: {
    backgroundColor: 'rgba(240, 253, 250, 0.88)',
    borderColor: 'rgba(13, 148, 136, 0.15)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 0,
    marginBottom: 8,
  },
  txIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txBody: { flex: 1, gap: 5 },
  txTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, borderWidth: 1, alignSelf: 'flex-start' },
  typeTagTxt: { fontFamily: font.bold, fontSize: 10 },
  txDir: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary },
  txCredit: { color: colors.success },
  txDebit: { color: colors.danger },
  txAmount: { fontFamily: font.bold, fontSize: type.base, color: colors.textPrimary },
  txNote: { fontFamily: font.regular, fontSize: type.xs, color: colors.textSecondary, lineHeight: leading.xs },
  txDate: { fontFamily: font.regular, fontSize: type.xs, color: colors.textTertiary },

  footer: { marginTop: 8 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(13, 50, 50, 0.3)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    gap: 14,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary },
  modalSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: leading.sm },
  modalLabel: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
    borderRadius: 12,
    padding: 14,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
  },
  modalInputFocused: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  modalActions: { flexDirection: 'row', gap: 10, justifycontent: 'flex-end' },
  modalCancel: {
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 11,
    borderWidth: 1, borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  modalCancelTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  modalSubmit: {
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 11,
    backgroundColor: colors.brand,
  },
  modalSubmitBusy: { opacity: 0.7 },
  modalSubmitTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.white },

  // New backgrounds/glows
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
})
