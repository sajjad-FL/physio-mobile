import { useState } from 'react'
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useShopCart } from '../../api/queries'
import { ShopContinueShoppingButton } from '../../components/shop/ShopNavButtons'
import { DetailSkeleton } from '../../components/ui/skeletons'
import { assetUrl } from '../../utils/assetUrl'
import { formatInr } from '../../utils/shopDisplay'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

export default function ShopCartScreen({ navigation }) {
  const queryClient = useQueryClient()
  const { data: cart, isLoading, refetch } = useShopCart()
  const [busyId, setBusyId] = useState(null)

  async function changeQty(productId, quantity) {
    setBusyId(productId)
    try {
      await api.put('/shop/cart/items', { productId, quantity: Math.max(0, quantity) })
      await refetch()
      queryClient.invalidateQueries({ queryKey: ['shopCart'] })
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update cart')
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <DetailSkeleton />
      </View>
    )
  }

  if (!cart?.items?.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Your cart is empty.</Text>
        <ShopContinueShoppingButton navigation={navigation} label="Browse shop" />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.headerRow}>
        <Text style={styles.headerHint}>Review items before checkout</Text>
        <ShopContinueShoppingButton navigation={navigation} />
      </View>

      <View style={styles.card}>
        {cart.items.map((line, index) => {
          const img = line.product?.imageUrl || line.product?.imageUrls?.[0]
          const isLast = index === cart.items.length - 1
          return (
            <View key={line.productId} style={[styles.line, !isLast && styles.lineBorder]}>
              <View style={styles.thumb}>{img ? <Image source={{ uri: assetUrl(img) }} style={styles.thumbImg} /> : null}</View>
              <View style={styles.lineBody}>
                <Text style={styles.name}>{line.product?.name}</Text>
                <Text style={styles.meta}>{formatInr(line.product?.price)} each</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    disabled={busyId === line.productId}
                    onPress={() => changeQty(line.productId, line.quantity - 1)}
                    style={styles.qtyBtn}
                  >
                    <Text>−</Text>
                  </Pressable>
                  <Text style={styles.qty}>{line.quantity}</Text>
                  <Pressable
                    disabled={busyId === line.productId || line.quantity >= (line.product?.stock ?? 0)}
                    onPress={() => changeQty(line.productId, line.quantity + 1)}
                    style={styles.qtyBtn}
                  >
                    <Text>+</Text>
                  </Pressable>
                  <Pressable onPress={() => changeQty(line.productId, 0)} style={styles.remove}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.lineTotal}>{formatInr(line.lineTotal)}</Text>
            </View>
          )
        })}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Subtotal</Text>
        <Text style={styles.totalValue}>{formatInr(cart.subtotal)}</Text>
      </View>

      <Pressable style={styles.checkout} onPress={() => navigation.navigate('ShopCheckout')}>
        <Text style={styles.checkoutText}>Proceed to checkout</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  emptyTitle: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  headerRow: { marginBottom: 16, gap: 12 },
  headerHint: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  line: { flexDirection: 'row', gap: 12, padding: 16 },
  lineBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  thumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.slate100 },
  thumbImg: { width: '100%', height: '100%' },
  lineBody: { flex: 1 },
  name: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: font.semiBold, minWidth: 20, textAlign: 'center' },
  remove: { marginLeft: 'auto' },
  removeText: { fontFamily: font.semiBold, fontSize: 11, color: colors.danger },
  lineTotal: { fontFamily: font.bold, fontSize: type.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, padding: 16, backgroundColor: colors.slate50, borderRadius: 12 },
  totalLabel: { fontFamily: font.semiBold },
  totalValue: { fontFamily: font.bold, fontSize: 18 },
  checkout: { marginTop: 16, backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  checkoutText: { fontFamily: font.semiBold, color: colors.white },
})
