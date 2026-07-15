import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { useProfile, useShopCart } from '../../api/queries'
import { formatInr } from '../../utils/shopDisplay'
import RequiredMark from '../../components/ui/RequiredMark'
import { DetailSkeleton } from '../../components/ui/skeletons'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

export default function ShopCheckoutScreen({ navigation }) {
  const { data: cart, isLoading } = useShopCart()
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const [address, setAddress] = useState('')
  const [patientNote, setPatientNote] = useState('')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (profile?.address?.text || profile?.location) {
      setAddress(profile.address?.text || profile.location || '')
    }
  }, [profile])

  useEffect(() => {
    if (!isLoading && !cart?.items?.length) {
      navigation.replace('ShopCart')
    }
  }, [isLoading, cart?.items, navigation])

  async function placeOrder() {
    if (!address.trim()) {
      Alert.alert('Address required', 'Enter your delivery address')
      return
    }
    setPlacing(true)
    try {
      const { data } = await api.post('/shop/orders', {
        shippingAddress: { text: address.trim() },
        patientNote: patientNote.trim(),
      })
      queryClient.invalidateQueries({ queryKey: ['shopCart'] })
      queryClient.invalidateQueries({ queryKey: ['shopOrders'] })
      navigation.replace('ShopOrderDetail', { id: data._id })
    } catch (err) {
      Alert.alert('Could not place order', err.response?.data?.message || 'Try again')
    } finally {
      setPlacing(false)
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <DetailSkeleton />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery address<RequiredMark /></Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          multiline
          style={styles.input}
          placeholder="Full delivery address"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order note (optional)</Text>
        <TextInput
          value={patientNote}
          onChangeText={setPatientNote}
          multiline
          style={styles.input}
          placeholder="Any instructions for delivery"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <Text style={styles.boxText}>Cash on Delivery (COD) — pay when your order arrives.</Text>
        <Text style={styles.total}>Total: {formatInr(cart.subtotal)}</Text>
        <Text style={styles.meta}>{cart.itemCount} item(s)</Text>
      </View>

      <Pressable style={styles.cta} disabled={placing} onPress={placeOrder}>
        <Text style={styles.ctaText}>{placing ? 'Placing order…' : 'Place order'}</Text>
      </Pressable>

      <Pressable style={styles.backLink} onPress={() => navigation.navigate('ShopCart')}>
        <Text style={styles.backLinkText}>Back to cart</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    padding: 12,
    fontFamily: font.regular,
    fontSize: type.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  boxText: { marginTop: 6, fontFamily: font.regular, fontSize: type.sm, color: colors.textSecondary },
  total: { marginTop: 12, fontFamily: font.bold, fontSize: 18, color: colors.textPrimary },
  meta: { marginTop: 4, fontFamily: font.regular, fontSize: 12, color: colors.textSecondary },
  cta: { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontFamily: font.semiBold, color: colors.white },
  backLink: { marginTop: 12, alignItems: 'center' },
  backLinkText: { fontFamily: font.semiBold, fontSize: 12, color: colors.brand },
})
