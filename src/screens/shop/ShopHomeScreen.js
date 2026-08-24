import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useShopCart, useShopProducts } from '../../api/queries'
import { ShopCartButton, ShopMyOrdersButton } from '../../components/shop/ShopNavButtons'
import { CardSkeleton } from '../../components/ui/skeletons'
import { assetUrl } from '../../utils/assetUrl'
import { formatInr } from '../../utils/shopDisplay'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

function ProductCard({ item, onPress, onAdd, busy }) {
  const outOfStock = (item.stock ?? 0) <= 0
  const image = item.imageUrl || item.imageUrls?.[0]
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: assetUrl(image) }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.price}>{formatInr(item.price)}</Text>
      <Text style={[styles.stock, outOfStock && styles.outOfStock]}>{outOfStock ? 'Out of stock' : `${item.stock} in stock`}</Text>
      <Pressable
        style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
        disabled={outOfStock || busy}
        onPress={onAdd}
      >
        <Text style={styles.addBtnText}>{busy ? 'Adding…' : 'Add to cart'}</Text>
      </Pressable>
    </Pressable>
  )
}

export default function ShopHomeScreen({ navigation }) {
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useShopProducts()
  const { data: cart } = useShopCart()
  const [busyId, setBusyId] = useState(null)

  useFocusEffect(
    useCallback(() => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ['shopCart'] })
    }, [refetch, queryClient]),
  )

  async function addToCart(product) {
    setBusyId(product._id)
    try {
      await api.put('/shop/cart/items', { productId: product._id, quantity: 1 })
      queryClient.invalidateQueries({ queryKey: ['shopCart'] })
    } catch (err) {
      Alert.alert('Could not add', err.response?.data?.message || 'Try again')
    } finally {
      setBusyId(null)
    }
  }

  const rows = data?.rows || []

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sub}>
          Recovery products with cash on delivery. Browse, add to cart, and place your order.
        </Text>
        <View style={styles.actions}>
          <ShopMyOrdersButton navigation={navigation} />
          <ShopCartButton navigation={navigation} itemCount={cart?.itemCount || 0} />
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          <CardSkeleton count={4} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No products available.</Text>}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              busy={busyId === item._id}
              onPress={() => navigation.navigate('ShopProductDetail', { id: item._id })}
              onAdd={() => addToCart(item)}
            />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  headerRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  sub: { fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  list: { padding: 12, paddingBottom: 24 },
  row: { gap: 12 },
  card: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 8,
    marginBottom: 12,
  },
  imageWrap: { aspectRatio: 4 / 3, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.slate100 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, backgroundColor: colors.slate100 },
  cardTitle: { marginTop: 8, fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  price: { marginTop: 4, fontFamily: font.bold, fontSize: type.sm, color: colors.textPrimary },
  stock: { marginTop: 2, fontFamily: font.regular, fontSize: 11, color: colors.textSecondary },
  outOfStock: { color: colors.danger },
  addBtn: { marginTop: 8, backgroundColor: colors.brand, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },
  empty: { textAlign: 'center', marginTop: 24, color: colors.textSecondary },
})
