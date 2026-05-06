import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { api } from '../api/client'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

function formatInr(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return inrFormatter.format(v)
}

function typeLabel(row) {
  if (row?.isSynthetic && row?.syntheticKind === 'net_available') return 'Withdrawable balance'
  const t = row?.type
  const leg = row?.meta?.leg
  if (t === 'online' && leg === 'refund') return 'Refund (online)'
  switch (t) {
    case 'online':
      return 'Online payment'
    case 'offline':
      return 'Offline payment'
    case 'settlement':
      return 'Settlement'
    case 'withdrawal':
      return 'Withdrawal'
    default:
      return t || '—'
  }
}

function typeBadgePalettes(t, row) {
  if (row?.isSynthetic && row?.syntheticKind === 'net_available') {
    return { bg: '#f1f5f9', fg: '#0f172a', bd: '#e2e8f0' }
  }
  switch (t) {
    case 'online':
      return { bg: colors.emerald50, fg: colors.emerald900, bd: '#a7f3d0' }
    case 'offline':
      return { bg: colors.amber50, fg: colors.amber950, bd: colors.amber200 }
    case 'settlement':
      return { bg: colors.blue50, fg: '#0c4a6e', bd: '#bae6fd' }
    case 'withdrawal':
      return { bg: colors.rose50, fg: colors.rose900, bd: '#fecdd3' }
    default:
      return { bg: '#f8fafc', fg: colors.slate900, bd: colors.borderSubtle }
  }
}

const TypeBadge = memo(function TypeBadge({ type: t, row, label }) {
  const p = typeBadgePalettes(t, row)
  return (
    <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.bd }]}>
      <Text style={[styles.badgeTxt, { color: p.fg }]}>{label}</Text>
    </View>
  )
})

const TxBookingNote = memo(function TxBookingNote({ row }) {
  if (row.isSynthetic && row.syntheticKind === 'net_available' && row.meta) {
    return (
      <Text style={styles.txNote}>
        Online wallet balance {formatInr(row.meta.onlineAvailableBalance)} minus offline commission due{' '}
        {formatInr(row.meta.commissionDue)}. This is the amount you can request to withdraw (same as Available balance).
        Individual commission lines below are the ledger entries that build that due.
      </Text>
    )
  }
  if (!row.isSynthetic && row.bookingId?.date) {
    return (
      <Text style={styles.txNote}>
        Booking {row.bookingId.date} {row.bookingId.timeSlot || ''}
      </Text>
    )
  }
  if (!row.isSynthetic && row.type === 'settlement' && row.meta?.note) {
    return <Text style={styles.txNote}>{row.meta.note}</Text>
  }
  if (
    !row.isSynthetic &&
    row.type === 'online' &&
    row.meta?.gross != null &&
    row.direction === 'credit'
  ) {
    return (
      <Text style={styles.txNote}>
        Gross {formatInr(row.meta.gross)} · Commission {formatInr(row.commission)}
      </Text>
    )
  }
  if (!row.isSynthetic && row.type === 'offline' && row.meta?.leg === 'gross') {
    return (
      <Text style={styles.txNote}>Gross collection · Share {formatInr(row.physioEarning)}</Text>
    )
  }
  if (!row.isSynthetic && row.type === 'offline' && row.meta?.leg === 'commission') {
    return (
      <Text style={styles.txNote}>Platform commission owed (reduces withdrawable balance)</Text>
    )
  }
  if (!row.isSynthetic && row.type === 'withdrawal' && row.meta?.note) {
    return <Text style={styles.txNote}>{row.meta.note}</Text>
  }
  return null
})

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
    } catch {
      setPendingWithdraw(null)
    }
  }, [])

  const loadDash = useCallback(async () => {
    try {
      const res = await api.get('/physio/wallet')
      setDash(res.data)
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load wallet' })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTx = useCallback(async () => {
    setTxLoading(true)
    try {
      const res = await api.get('/physio/wallet/transactions', { params: { page, limit: 15 } })
      setTx(res.data?.data || [])
      setTotalPages(res.data?.totalPages || 1)
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load transactions' })
    } finally {
      setTxLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadDash()
  }, [loadDash])

  useEffect(() => {
    loadPendingWithdraw()
  }, [loadPendingWithdraw])

  useEffect(() => {
    loadTx()
  }, [loadTx])

  const walletValues = useMemo(() => {
    const w = dash?.wallet
    const available = Number(w?.availableBalance)
    const onlineAvail = Number(w?.onlineAvailableBalance ?? w?.onlineEarning)
    const commissionDue = Number(w?.commissionDue)
    return {
      w,
      b: dash?.breakdown,
      available,
      onlineAvail,
      commissionDue,
      showNetExplainer: Number.isFinite(commissionDue) && commissionDue > 0.009,
    }
  }, [dash])

  const { w, b, available, onlineAvail, commissionDue, showNetExplainer } = walletValues
  const hasPending = Boolean(pendingWithdraw)

  async function submitWithdraw() {
    const raw = withdrawAmount.trim()
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' })
      return
    }
    if (n > available + 1e-6) {
      Toast.show({ type: 'error', text1: 'Amount cannot exceed available balance' })
      return
    }
    setWithdrawSubmitting(true)
    try {
      await api.post('/withdraw', { amount: n })
      Toast.show({ type: 'success', text1: 'Withdrawal request submitted' })
      setWithdrawOpen(false)
      setWithdrawAmount('')
      await Promise.all([loadDash(), loadPendingWithdraw(), loadTx()])
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Request failed' })
    } finally {
      setWithdrawSubmitting(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.pad} style={styles.flex}>
      <Text style={styles.h1}>Wallet</Text>
      <Text style={styles.sub}>Earnings, commission due, and transaction history.</Text>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <View style={styles.grid}>
          <Card style={[styles.stat, { borderColor: '#a7f3d0' }]}>
            <Text style={styles.statL}>Available balance</Text>
            <Text style={styles.statBig}>{formatInr(w?.availableBalance)}</Text>
            {showNetExplainer ? (
              <Text style={styles.statHint}>
                Online balance {formatInr(onlineAvail)} − Commission due {formatInr(commissionDue)} ={' '}
                <Text style={styles.statHintStrong}>withdrawable {formatInr(available)}</Text>
              </Text>
            ) : (
              <Text style={styles.statHint}>
                Withdrawable from online collections (no commission offset)
              </Text>
            )}
            {hasPending ? (
              <View style={styles.pendingBanner}>
                <Text style={styles.pendingTxt}>
                  Pending withdrawal {formatInr(pendingWithdraw.amount)} — awaiting admin review.
                </Text>
              </View>
            ) : null}
            <Button
              title="Withdraw money"
              variant="outline"
              style={{ marginTop: 12 }}
              disabled={loading || hasPending || !Number.isFinite(available) || available <= 0}
              onPress={() => {
                setWithdrawAmount('')
                setWithdrawOpen(true)
              }}
            />
          </Card>
          <Card style={[styles.stat, { borderColor: colors.amber200 }]}>
            <Text style={styles.statL}>Commission due</Text>
            <Text style={[styles.statBig, { color: colors.amber950 }]}>{formatInr(w?.commissionDue)}</Text>
            <Text style={styles.statHint}>
              Owed to platform from offline cash visits — already subtracted from Available balance above.
            </Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statL}>Total earnings</Text>
            <Text style={styles.statBig}>{formatInr(w?.totalEarned)}</Text>
            <Text style={styles.statHint}>Lifetime physio share recorded</Text>
          </Card>
        </View>
      )}

      {!loading && b ? (
        <Card style={styles.breakdownCard}>
          <View style={styles.breakdownHead}>
            <Text style={styles.h2}>Earnings breakdown</Text>
            <Text style={styles.muted}>By payment channel (recorded sessions)</Text>
          </View>
          <BreakdownRow
            type="online"
            label="Online"
            count={b.online_payment?.count}
            vol={b.online_payment?.volume}
            detail="Online wallet (withdrawals use this minus commission due)"
          />
          <BreakdownRow
            type="offline"
            label="Offline"
            count={b.offline_payment?.count}
            vol={b.offline_payment?.volume}
            detail={`Commission accrued ${formatInr(b.offline_payment?.commissionAccrued)} · Share ${formatInr(
              b.offline_payment?.physioShare,
            )}`}
            last={false}
          />
          <BreakdownRow
            type="settlement"
            label="Settlements"
            count={b.settlement?.count}
            vol={b.settlement?.volume}
            detail="Remitted to platform"
            last
          />
        </Card>
      ) : null}

      <Card style={styles.txCard}>
        <View style={styles.breakdownHead}>
          <Text style={styles.h2}>Transaction history</Text>
          <Text style={styles.muted}>
            Ledger lines plus a summary row when commission due reduces your withdrawable balance
          </Text>
        </View>
        {txLoading ? (
          <Text style={[styles.muted, { marginTop: 12 }]}>Loading…</Text>
        ) : tx.length === 0 ? (
          <Text style={[styles.muted, { marginTop: 12 }]}>No transactions yet.</Text>
        ) : (
          tx.map((row) => (
            <View
              key={String(row._id)}
              style={[styles.txBlock, row.isSynthetic ? styles.txBlockSynth : null]}
            >
              <Text style={styles.txDate}>
                {row.isSynthetic ? (
                  <Text style={styles.summaryLbl}>Summary</Text>
                ) : row.createdAt ? (
                  new Date(row.createdAt).toLocaleString()
                ) : (
                  '—'
                )}
              </Text>
              <View style={styles.txTypeRow}>
                <TypeBadge type={row.type} row={row} label={typeLabel(row)} />
                <Text style={styles.txDir}>
                  {row.isSynthetic ? '—' : row.direction === 'debit' ? 'Debit' : 'Credit'}
                </Text>
              </View>
              <Text style={styles.txAmt}>{formatInr(row.totalAmount)}</Text>
              <TxBookingNote row={row} />
            </View>
          ))
        )}
        {totalPages > 1 ? (
          <View style={styles.pager}>
            <Button
              title="Prev"
              variant="outline"
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            />
            <Text style={styles.muted}>
              {page} / {totalPages}
            </Text>
            <Button
              title="Next"
              variant="outline"
              disabled={page >= totalPages}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        ) : null}
      </Card>

      <Modal transparent visible={withdrawOpen} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.h2}>Request withdrawal</Text>
            <Text style={styles.modalLead}>
              Max request: {formatInr(w?.availableBalance)} (after commission due). Minimum ₹1. One pending request at a
              time.
            </Text>
            <Text style={[styles.statL, { marginTop: 12 }]}>Amount (INR)</Text>
            <TextInput
              style={styles.inp}
              keyboardType="decimal-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="e.g. 5000"
            />
            <View style={styles.modalBtns}>
              <Button variant="outline" title="Cancel" onPress={() => setWithdrawOpen(false)} />
              <Button
                title={withdrawSubmitting ? 'Submitting…' : 'Submit request'}
                loading={withdrawSubmitting}
                onPress={submitWithdraw}
              />
            </View>
          </View>
        </View>
      </Modal>
      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

const BreakdownRow = memo(function BreakdownRow({ type, label, count, vol, detail, last }) {
  return (
    <View style={[styles.bdRow, last ? { borderBottomWidth: 0 } : null]}>
      <TypeBadge type={type} row={{}} label={label} />
      <View style={styles.bdGrid}>
        <Text style={styles.bdLbl}>Events</Text>
        <Text style={styles.bdVal}>{count ?? 0}</Text>
        <Text style={styles.bdLbl}>Volume</Text>
        <Text style={styles.bdVal}>{formatInr(vol)}</Text>
        <Text style={styles.bdLbl}>Details</Text>
        <Text style={[styles.bdVal, styles.bdDetail]}>{detail}</Text>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.slate50 },
  pad: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 24, fontWeight: '700', color: colors.slate900 },
  h2: { fontSize: 15, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 6, fontSize: 14, color: colors.slate500 },
  muted: { fontSize: 12, color: colors.slate500, lineHeight: 17 },
  loaderWrap: { marginTop: 24, alignItems: 'center', paddingVertical: 24 },
  grid: { marginTop: 16, gap: 12 },
  stat: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statL: { fontSize: 11, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase', letterSpacing: 0.3 },
  statBig: { marginTop: 8, fontSize: 24, fontWeight: '700', color: colors.emerald900 },
  statHint: { marginTop: 8, fontSize: 12, color: colors.slate600, lineHeight: 18 },
  statHintStrong: { fontWeight: '700', color: colors.emerald900 },
  pendingBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: colors.amber200,
  },
  pendingTxt: { fontSize: 12, color: colors.amber950 },
  breakdownCard: { marginTop: 16 },
  breakdownHead: { paddingBottom: 12, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  bdRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  bdGrid: { marginTop: 10 },
  bdLbl: { fontSize: 10, fontWeight: '700', color: colors.slate500, textTransform: 'uppercase', marginTop: 8 },
  bdVal: { fontSize: 14, fontWeight: '600', color: colors.slate900, marginTop: 2 },
  bdDetail: { fontWeight: '400', fontSize: 12, color: colors.slate600, lineHeight: 18 },
  txCard: { marginTop: 16 },
  txBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  txBlockSynth: {
    padding: 12,
    marginHorizontal: -4,
    backgroundColor: 'rgba(241,245,249,0.95)',
    borderRadius: 10,
    borderTopWidth: 0,
    marginTop: 14,
  },
  txDate: { fontSize: 12, color: colors.slate600 },
  summaryLbl: { fontSize: 11, fontWeight: '700', color: '#475569' },
  txTypeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  txDir: { fontSize: 11, color: colors.slate500 },
  txAmt: { marginTop: 6, fontSize: 16, fontWeight: '700', color: colors.slate900 },
  txNote: { marginTop: 8, fontSize: 11, color: colors.slate600, lineHeight: 16 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 12,
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    maxHeight: '90%',
  },
  modalLead: { marginTop: 6, fontSize: 13, color: colors.slate600, lineHeight: 19 },
  inp: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
})
