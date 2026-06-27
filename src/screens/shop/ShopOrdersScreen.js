import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useShopOrders } from '../../api/queries'
import { ShopContinueShoppingButton } from '../../components/shop/ShopNavButtons'
import { assetUrl } from '../../utils/assetUrl'
import { formatInr, shopOrderStatusColor, shopOrderStatusLabel } from '../../utils/shopDisplay'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

function itemSummary(items = []) {
  const names = items.map((i) => i.name).filter(Boolean)
  if (!names.length) return 'No items'
  if (names.length === 1) return names[0]
  return `${names[0]} + ${names.length - 1} more`
}

function OrderCard({ item, onPress }) {
  const items = item.items || []
  const preview = items.slice(0, 3)
  const extra = items.length - preview.length
  const address = item.shippingAddress?.text?.trim()

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.number}>{item.orderNumber}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${shopOrderStatusColor(item.status)}18` }]}>
          <Text style={[styles.statusText, { color: shopOrderStatusColor(item.status) }]}>
            {shopOrderStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      {preview.length > 0 ? (
        <View style={styles.itemsRow}>
          <View style={styles.thumbs}>
            {preview.map((line, idx) => (
              <View key={`${line.productId}-${idx}`} style={[styles.thumb, idx > 0 && styles.thumbOverlap]}>
                {line.imageUrl ? (
                  <Image source={{ uri: assetUrl(line.imageUrl) }} style={styles.thumbImg} />
                ) : (
                  <View style={styles.thumbPlaceholder} />
                )}
              </View>
            ))}
            {extra > 0 ? (
              <View style={[styles.thumb, styles.thumbOverlap, styles.thumbMore]}>
                <Text style={styles.thumbMoreText}>+{extra}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.itemsBody}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {itemSummary(items)}
            </Text>
            {items.slice(0, 2).map((line) => (
              <Text key={`${line.productId}-detail`} style={styles.itemLine} numberOfLines={1}>
                {line.name} × {line.quantity} · {formatInr(line.price * line.quantity)}
              </Text>
            ))}
            {items.length > 2 ? (
              <Text style={styles.itemLine}>+ {items.length - 2} more item(s)</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {address ? (
        <View style={styles.addressBox}>
          <Text style={styles.addressLabel}>DELIVERY</Text>
          <Text style={styles.addressText} numberOfLines={2}>
            {address}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.total}>{formatInr(item.total)}</Text>
          <View style={styles.codPill}>
            <Text style={styles.codText}>Cash on delivery</Text>
          </View>
        </View>
        <View style={styles.viewRow}>
          <Text style={styles.viewText}>View details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand} />
        </View>
      </View>
    </Pressable>
  )
}

function ListHeader({ navigation }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerSub}>Track your shop orders and delivery status.</Text>
      <ShopContinueShoppingButton navigation={navigation} />
    </View>
  )
}

export default function ShopOrdersScreen({ navigation }) {
  const [page] = useState(1)
  const { data, isLoading, refetch } = useShopOrders({ page, limit: 20 })

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  const rows = data?.rows || []

  if (isLoading) return <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<ListHeader navigation={navigation} />}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>No orders yet.</Text>
          <Pressable onPress={() => navigation.navigate('ShopHome')}>
            <Text style={styles.emptyLink}>Browse shop</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <OrderCard item={item} onPress={() => navigation.navigate('ShopOrderDetail', { id: item._id })} />
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 24 },
  header: { marginBottom: 16, gap: 12 },
  headerSub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: 20 },
  emptyWrap: { paddingTop: 16, alignItems: 'center', gap: 12 },
  empty: { textAlign: 'center', color: colors.textSecondary },
  emptyLink: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: { opacity: 0.92 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.slate50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  number: { fontFamily: font.semiBold, fontSize: type.md, color: colors.textPrimary },
  date: { marginTop: 2, fontFamily: font.regular, fontSize: 11, color: colors.textSecondary },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: font.semiBold, fontSize: 11 },
  itemsRow: { flexDirection: 'row', gap: 12, padding: 14, paddingBottom: 10 },
  thumbs: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.slate100,
  },
  thumbOverlap: { marginLeft: -10 },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, backgroundColor: colors.slate100 },
  thumbMore: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate100 },
  thumbMoreText: { fontFamily: font.semiBold, fontSize: 10, color: colors.textSecondary },
  itemsBody: { flex: 1 },
  itemTitle: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  itemLine: { marginTop: 4, fontFamily: font.regular, fontSize: 11, color: colors.textSecondary },
  addressBox: {
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.slate50,
  },
  addressLabel: { fontFamily: font.bold, fontSize: 9, letterSpacing: 0.5, color: colors.textSecondary },
  addressText: { marginTop: 2, fontFamily: font.regular, fontSize: 11, color: colors.textPrimary, lineHeight: 16 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  total: { fontFamily: font.bold, fontSize: type.md, color: colors.textPrimary },
  codPill: { backgroundColor: colors.slate100, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  codText: { fontFamily: font.semiBold, fontSize: 9, color: colors.textSecondary, letterSpacing: 0.3 },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewText: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.brand },
})
