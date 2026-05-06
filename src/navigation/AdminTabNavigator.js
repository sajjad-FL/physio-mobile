import { useEffect } from 'react'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { getTokenSync, getRoleSync } from '../auth/tokenStore'
import PlaceholderScreen from '../screens/PlaceholderScreen'
import { colors } from '../theme/colors'
import { defaultNativeStackScreenOptions, defaultTabScreenOptions } from './navLayout'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function AdminBookingDetailStack() {
  return (
    <Stack.Navigator screenOptions={defaultNativeStackScreenOptions}>
      <Stack.Screen name="AdminBookings" component={PlaceholderScreen} options={{ title: 'Bookings' }} />
      <Stack.Screen name="AdminBookingDetail" component={PlaceholderScreen} options={{ title: 'Booking' }} />
    </Stack.Navigator>
  )
}

export default function AdminTabNavigator() {
  const navigation = useNavigation()
  const { authEpoch } = useAuth()

  useEffect(() => {
    const root = navigation.getParent() || navigation
    if (!getTokenSync()) {
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }))
      return
    }
    if (getRoleSync() !== 'admin') {
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Unauthorized' }] }))
    }
  }, [navigation, authEpoch])

  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={{
        ...defaultTabScreenOptions,
        headerShown: true,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.slate500,
        tabBarStyle: { borderTopColor: colors.borderSubtle },
      }}
    >
      <Tab.Screen name="AdminBookingsTab" component={AdminBookingDetailStack} options={{ tabBarLabel: 'Bookings', headerShown: false }} />
      <Tab.Screen name="AdminPhysios" component={PlaceholderScreen} options={{ tabBarLabel: 'Physios', title: 'Physios' }} />
      <Tab.Screen name="AdminPayments" component={PlaceholderScreen} options={{ tabBarLabel: 'Payments', title: 'Payments' }} />
      <Tab.Screen name="AdminFinance" component={PlaceholderScreen} options={{ tabBarLabel: 'Finance', title: 'Finance' }} />
      <Tab.Screen name="AdminPlatform" component={PlaceholderScreen} options={{ tabBarLabel: 'Platform', title: 'Platform' }} />
    </Tab.Navigator>
  )
}
