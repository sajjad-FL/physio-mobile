import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { font, type } from '../../theme/typography'

export const shopActionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  outlineText: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.textPrimary },
  primaryText: { fontFamily: font.semiBold, fontSize: type.sm, color: colors.white },
  badge: {
    marginLeft: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontFamily: font.bold, fontSize: 10, color: colors.white },
})

export function ShopMyOrdersButton({ navigation, label = 'My orders' }) {
  return (
    <Pressable
      style={({ pressed }) => [shopActionStyles.outlineBtn, pressed && shopActionStyles.pressed]}
      onPress={() => navigation.navigate('ShopOrders')}
    >
      <Ionicons name="receipt-outline" size={16} color={colors.brand} />
      <Text style={shopActionStyles.outlineText}>{label}</Text>
    </Pressable>
  )
}

export function ShopCartButton({ navigation, itemCount = 0, label = 'Cart' }) {
  return (
    <Pressable
      style={({ pressed }) => [shopActionStyles.primaryBtn, pressed && shopActionStyles.pressed]}
      onPress={() => navigation.navigate('ShopCart')}
    >
      <Ionicons name="bag-outline" size={16} color={colors.white} />
      <Text style={shopActionStyles.primaryText}>{label}</Text>
      {itemCount > 0 ? (
        <View style={shopActionStyles.badge}>
          <Text style={shopActionStyles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

export function ShopContinueShoppingButton({ navigation, label = 'Continue shopping' }) {
  return (
    <Pressable
      style={({ pressed }) => [shopActionStyles.outlineBtn, pressed && shopActionStyles.pressed, { alignSelf: 'flex-start' }]}
      onPress={() => navigation.navigate('ShopHome')}
    >
      <Ionicons name="bag-outline" size={16} color={colors.brand} />
      <Text style={shopActionStyles.outlineText}>{label}</Text>
    </Pressable>
  )
}

export function ShopHeaderCartButton({ navigation, itemCount = 0 }) {
  return (
    <Pressable
      onPress={() => navigation.navigate('ShopCart')}
      style={headerCartStyles.wrap}
      accessibilityLabel="Cart"
    >
      <Ionicons name="bag-outline" size={20} color={colors.ink} />
      {itemCount > 0 ? (
        <View style={headerCartStyles.badge}>
          <Text style={headerCartStyles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const headerCartStyles = StyleSheet.create({
  wrap: { padding: 8, marginRight: 4 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: font.bold, fontSize: 9, color: colors.white },
})
