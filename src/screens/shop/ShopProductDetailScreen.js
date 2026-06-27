import { useState } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useShopProduct } from '../../api/queries'
import { assetUrl } from '../../utils/assetUrl'
import { formatInr } from '../../utils/shopDisplay'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

export default function ShopProductDetailScreen({ route, navigation }) {
  const { id } = route.params || {}
  const { data: product, isLoading } = useShopProduct(id)
  const [qty, setQty] = useState(1)
  const [imageIdx, setImageIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const queryClient = useQueryClient()

  if (isLoading) return <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
  if (!product?._id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Product not found</Text>
      </View>
    )
  }

  const images = product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : []
  const outOfStock = (product.stock ?? 0) <= 0
  const maxQty = Math.max(0, product.stock ?? 0)

  async function addToCart() {
    setBusy(true)
    try {
      await api.put('/shop/cart/items', { productId: product._id, quantity: qty })
      queryClient.invalidateQueries({ queryKey: ['shopCart'] })
      navigation.navigate('ShopCart')
    } catch (err) {
      Alert.alert('Could not add', err.response?.data?.message || 'Try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.hero}>
        {images[imageIdx] ? (
          <Image source={{ uri: assetUrl(images[imageIdx]) }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
      </View>
      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs}>
          {images.map((url, i) => (
            <Pressable key={url} onPress={() => setImageIdx(i)} style={[styles.thumb, i === imageIdx && styles.thumbActive]}>
              <Image source={{ uri: assetUrl(url) }} style={styles.thumbImage} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.price}>{formatInr(product.price)}</Text>
      <Text style={[styles.stock, outOfStock && styles.outOfStock]}>{outOfStock ? 'Out of stock' : `${product.stock} available`}</Text>
      {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}

      {!outOfStock ? (
        <View style={styles.row}>
          <View style={styles.qtyRow}>
            <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.qtyBtn}>
              <Text>−</Text>
            </Pressable>
            <Text style={styles.qty}>{qty}</Text>
            <Pressable onPress={() => setQty((q) => Math.min(maxQty, q + 1))} style={styles.qtyBtn}>
              <Text>+</Text>
            </Pressable>
          </View>
          <Pressable style={styles.cta} disabled={busy} onPress={addToCart}>
            <Text style={styles.ctaText}>{busy ? 'Adding…' : 'Add to cart'}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textSecondary },
  hero: { aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.slate100 },
  heroImage: { width: '100%', height: '100%' },
  thumbs: { marginTop: 8 },
  thumb: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: colors.brand },
  thumbImage: { width: '100%', height: '100%' },
  title: { marginTop: 16, fontFamily: font.bold, fontSize: 22, color: colors.textPrimary },
  price: { marginTop: 8, fontFamily: font.bold, fontSize: 20, color: colors.textPrimary },
  stock: { marginTop: 4, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  outOfStock: { color: colors.danger },
  desc: { marginTop: 12, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary, lineHeight: 22 },
  row: { marginTop: 20, gap: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: font.semiBold, fontSize: 16, minWidth: 24, textAlign: 'center' },
  cta: { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },
})
