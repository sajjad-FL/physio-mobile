import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import PaginationBar from '../components/ui/PaginationBar'
import { colors } from '../theme/colors'
import { font, type, leading } from '../theme/typography'
import { formatInr } from '../utils/currency'

// ── Helpers ──────────────────────────────────────────────────────────────────

function typeLabel(row) {
  if (row?.isSynthetic && row?.syntheticKind === 'net_available') return 'Withdrawable balance'
  const t = row?.type
  const leg = row?.meta?.leg
  if (t === 'online' && leg === 'refund') return 'Refund (online)'
  switch (t) {
    case 'online': return 'Online payment'
    case 'offline': return 'Offline payment'
    case 'settlement': return 'Settlement'
    case 'withdrawal': return 'Withdrawal'
    default: return t || '—'
  }
}

function typePalette(t, row) {
  if (row?.isSynthetic) return { bg: colors.slate50, fg: colors.slate700, bd: colors.borderSubtle }
  switch (t) {
    case 'online': return { bg: colors.emerald50, fg: colors.emerald700, bd: '#a7f3d0' }
    case 'offline': return { bg: colors.amber50, fg: colors.amber800, bd: colors.amber200 }
    case 'settlement': return { bg: colors.blue50, fg: colors.blue700, bd: '#bae6fd' }
    case 'withdrawal': return { bg: colors.rose50, fg: colors.rose900, bd: '#fecdd3' }
    default: return { bg: colors.slate50, fg: colors.slate700, bd: colors.borderSubtle }
  }
}

function typeIcon(t, row) {
  if (row?.isSynthetic) return 'analytics-outline'
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
  const p = typePalette(t, row)
  return (
    <View style={[styles.typeTag, { backgroundColor: p.bg, borderColor: p.bd }]}>
      <Text style={[styles.typeTagTxt, { color: p.fg }]}>{typeLabel(row)}</Text>
    </View>
  )
})

const TransactionRow = memo(function TransactionRow({ row }) {
  const p = typePalette(row.type, row)
  const icon = typeIcon(row.type, row)
  const isCredit = !row.isSynthetic && row.direction === 'credit'
  const isDebit = !row.isSynthetic && row.direction === 'debit'

  return (
    <View style={[styles.txRow, row.isSynthetic && styles.txRowSynth]}>
      <View style={[styles.txIconWrap, { backgroundColor: p.bg }]}>
        <Ionicons name={icon} size={16} color={p.fg} />
      </View>
      <View style={styles.txBody}>
        <View style={styles.txTopRow}>
          <TypeTag type={row.type} row={row} />
          {!row.isSynthetic && (
            <Text style={[styles.txDir, isCredit ? styles.txCredit : isDebit ? styles.txDebit : null]}>
              {isCredit ? '+ Credit' : isDebit ? '− Debit' : ''}
            </Text>
          )}
        </View>
        <Text style={styles.txAmount}>{formatInr(row.totalAmount)}</Text>
        <TxNote row={row} />
        {!row.isSynthetic && row.createdAt && (
          <Text style={styles.txDate}>{new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        )}
      </View>
    </View>
  )
})

const TxNote = memo(function TxNote({ row }) {
  let note = null
  if (row.isSynthetic && row.meta) {
    note = `Online balance ${formatInr(row.meta.onlineAvailableBalance)} − Commission ${formatInr(row.meta.commissionDue)} = withdrawable ${formatInr(row.meta.onlineAvailableBalance - row.meta.commissionDue)}`
  } else if (row.bookingId?.date) {
    note = `Booking ${row.bookingId.date}${row.bookingId.timeSlot ? ' · ' + row.bookingId.timeSlot : ''}`
  } else if (row.type === 'settlement' && row.meta?.note) {
    note = row.meta.note
  } else if (row.type === 'online' && row.meta?.gross != null && row.direction === 'credit') {
    note = `Gross ${formatInr(row.meta.gross)} · Commission ${formatInr(row.commission)}`
  } else if (row.type === 'offline' && row.meta?.leg === 'gross') {
    note = `Gross collection · Share ${formatInr(row.physioEarning)}`
  } else if (row.type === 'offline' && row.meta?.leg === 'commission') {
    note = 'Platform commission owed'
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
  const [txLoading, setTxLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pendingWithdraw, setPendingWithdraw] = useState(null)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)

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
                <Text style={styles.heroLabel}>AVAILABLE BALANCE</Text>
                <Text style={styles.heroAmount}>{formatInr(w?.availableBalance)}</Text>
                {showNetExplainer && (
                  <Text style={styles.heroSub}>
                    {formatInr(onlineAvail)} online − {formatInr(commissionDue)} commission
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
            <View style={[styles.statTile, { borderLeftColor: colors.amber400 }]}>
              <Text style={styles.statTileLabel}>COMMISSION DUE</Text>
              <Text style={[styles.statTileValue, { color: colors.amber800 }]}>{formatInr(w?.commissionDue)}</Text>
              <Text style={styles.statTileSub}>Owed from offline visits</Text>
            </View>
            <View style={[styles.statTile, { borderLeftColor: colors.brand }]}>
              <Text style={styles.statTileLabel}>TOTAL EARNED</Text>
              <Text style={styles.statTileValue}>{formatInr(w?.totalEarned)}</Text>
              <Text style={styles.statTileSub}>Lifetime physio share</Text>
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
                <BreakdownRow type="online" label="Online" count={b.online_payment?.count} vol={b.online_payment?.volume} detail={`Online wallet (withdrawable minus commission)`} />
                <BreakdownRow type="offline" label="Offline" count={b.offline_payment?.count} vol={b.offline_payment?.volume} detail={`Commission ${formatInr(b.offline_payment?.commissionAccrued)} · Share ${formatInr(b.offline_payment?.physioShare)}`} />
                <BreakdownRow type="settlement" label="Settlements" count={b.settlement?.count} vol={b.settlement?.volume} detail="Remitted to platform" last />
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
    <>
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
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="e.g. 5000"
              placeholderTextColor={colors.slate300}
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
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  listPad: { padding: 16, paddingBottom: 20 },
  loaderWrap: { paddingVertical: 60, alignItems: 'center' },

  // Hero
  heroCard: {
    borderRadius: 20,
    backgroundColor: colors.brand,
    padding: 22,
    gap: 14,
    marginBottom: 12,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
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
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  bdRow: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
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
    borderTopColor: colors.borderSubtle,
  },
  txRowSynth: {
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 0,
    marginBottom: 4,
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
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.textPrimary },
  modalSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: leading.sm },
  modalLabel: { fontFamily: font.semiBold, fontSize: type.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 14,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.textPrimary,
    backgroundColor: colors.canvas,
  },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalCancel: {
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 11,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  modalCancelTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.textSecondary },
  modalSubmit: {
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 11,
    backgroundColor: colors.brand,
  },
  modalSubmitBusy: { opacity: 0.7 },
  modalSubmitTxt: { fontFamily: font.semiBold, fontSize: type.base, color: colors.white },
})
