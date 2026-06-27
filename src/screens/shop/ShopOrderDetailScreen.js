import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useShopOrder } from '../../api/queries'
import { assetUrl } from '../../utils/assetUrl'
import { formatInr, shopOrderStatusColor, shopOrderStatusLabel } from '../../utils/shopDisplay'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

const STEPS = ['placed', 'confirmed', 'shipped', 'delivered']

export default function ShopOrderDetailScreen({ route, navigation }) {
  const { id } = route.params || {}
  const { data: order, isLoading } = useShopOrder(id)

  if (isLoading) return <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
  if (!order?._id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Order not found.</Text>
        <Pressable onPress={() => navigation.navigate('ShopOrders')}>
          <Text style={styles.backLink}>Back to orders</Text>
        </Pressable>
      </View>
    )
  }

  const activeIdx = STEPS.indexOf(order.status)

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Pressable onPress={() => navigation.navigate('ShopOrders')}>
        <Text style={styles.backLink}>← My orders</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.number}>{order.orderNumber}</Text>
        <Text style={[styles.status, { color: shopOrderStatusColor(order.status) }]}>{shopOrderStatusLabel(order.status)}</Text>
      </View>
      <Text style={styles.date}>{new Date(order.createdAt).toLocaleString()}</Text>

      {order.status === 'cancelled' ? (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelTitle}>Order cancelled</Text>
          {order.cancelReason ? <Text style={styles.cancelReason}>{order.cancelReason}</Text> : null}
        </View>
      ) : (
        <View style={styles.timeline}>
          {STEPS.map((step, idx) => (
            <View key={step} style={styles.step}>
              <View style={[styles.dot, activeIdx >= idx && styles.dotDone]} />
              <Text style={[styles.stepLabel, activeIdx >= idx && styles.stepLabelDone]}>{shopOrderStatusLabel(step)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>Items</Text>
      <View style={styles.itemsCard}>
        {order.items?.map((item, index) => (
          <View
            key={`${item.productId}-${item.name}`}
            style={[styles.line, index < (order.items?.length || 0) - 1 && styles.lineBorder]}
          >
            <View style={styles.thumb}>
              {item.imageUrl ? <Image source={{ uri: assetUrl(item.imageUrl) }} style={styles.thumbImg} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {formatInr(item.price)} × {item.quantity}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatInr(item.price * item.quantity)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total (COD)</Text>
        <Text style={styles.totalValue}>{formatInr(order.total)}</Text>
      </View>

      <Text style={styles.section}>Delivery address</Text>
      <View style={styles.addressBox}>
        <Text style={styles.address}>{order.shippingAddress?.text || '—'}</Text>
        {order.patientNote ? <Text style={styles.note}>Note: {order.patientNote}</Text> : null}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: colors.textSecondary },
  backLink: { fontFamily: font.semiBold, fontSize: 12, color: colors.brand, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontFamily: font.bold, fontSize: 20, color: colors.textPrimary },
  status: { fontFamily: font.semiBold, fontSize: type.sm },
  date: { marginTop: 4, fontFamily: font.regular, fontSize: 12, color: colors.textSecondary },
  timeline: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' },
  step: { alignItems: 'center', flex: 1 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.slate200 },
  dotDone: { backgroundColor: colors.brand },
  stepLabel: { marginTop: 6, fontFamily: font.regular, fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  stepLabelDone: { color: colors.textPrimary, fontFamily: font.semiBold },
  cancelBox: { marginTop: 16, padding: 12, backgroundColor: colors.dangerBg, borderRadius: 10, borderWidth: 1, borderColor: colors.dangerBorder },
  cancelTitle: { fontFamily: font.semiBold, color: colors.danger },
  cancelReason: { marginTop: 4, fontFamily: font.regular, fontSize: type.sm, color: colors.danger },
  section: { marginTop: 20, marginBottom: 8, fontFamily: font.semiBold, fontSize: type.sm },
  itemsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  line: { flexDirection: 'row', gap: 10, padding: 12 },
  lineBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  thumb: { width: 52, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.slate100 },
  thumbImg: { width: '100%', height: '100%' },
  itemName: { fontFamily: font.semiBold, fontSize: type.sm },
  itemMeta: { fontFamily: font.regular, fontSize: 12, color: colors.textSecondary },
  itemTotal: { fontFamily: font.bold, fontSize: type.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12 },
  totalLabel: { fontFamily: font.semiBold },
  totalValue: { fontFamily: font.bold, fontSize: 18 },
  addressBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
  },
  address: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: 22 },
  note: { marginTop: 8, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
})
