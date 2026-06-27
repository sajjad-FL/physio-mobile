import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useQueryClient } from '@tanstack/react-query'
import UserTopNavHeader from '../components/UserTopNavHeader'
import { ShopHeaderCartButton } from '../components/shop/ShopNavButtons'
import { useShopCart } from '../api/queries'
import ShopHomeScreen from '../screens/shop/ShopHomeScreen'
import ShopProductDetailScreen from '../screens/shop/ShopProductDetailScreen'
import ShopCartScreen from '../screens/shop/ShopCartScreen'
import ShopCheckoutScreen from '../screens/shop/ShopCheckoutScreen'
import ShopOrdersScreen from '../screens/shop/ShopOrdersScreen'
import ShopOrderDetailScreen from '../screens/shop/ShopOrderDetailScreen'
import { defaultNativeStackScreenOptions } from './navLayout'

const Stack = createNativeStackNavigator()

function ShopStackHeader({ navigation, options, route }) {
  const { data: cart } = useShopCart()
  const hideCart = route.name === 'ShopCart' || route.name === 'ShopCheckout'
  const accessory = hideCart ? null : <ShopHeaderCartButton navigation={navigation} itemCount={cart?.itemCount || 0} />

  return <UserTopNavHeader navigation={navigation} title={options.title || 'Shop'} headerAccessory={accessory} />
}

export default function ShopStackNavigator() {
  const queryClient = useQueryClient()

  return (
    <Stack.Navigator
      screenOptions={{
        ...defaultNativeStackScreenOptions,
        header: (props) => <ShopStackHeader {...props} />,
      }}
      screenListeners={{
        focus: () => {
          queryClient.invalidateQueries({ queryKey: ['shopCart'] })
        },
      }}
    >
      <Stack.Screen name="ShopHome" component={ShopHomeScreen} options={{ title: 'Shop' }} />
      <Stack.Screen name="ShopProductDetail" component={ShopProductDetailScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="ShopCart" component={ShopCartScreen} options={{ title: 'Cart' }} />
      <Stack.Screen name="ShopCheckout" component={ShopCheckoutScreen} options={{ title: 'Checkout' }} />
      <Stack.Screen name="ShopOrders" component={ShopOrdersScreen} options={{ title: 'My orders' }} />
      <Stack.Screen name="ShopOrderDetail" component={ShopOrderDetailScreen} options={{ title: 'Order' }} />
    </Stack.Navigator>
  )
}
