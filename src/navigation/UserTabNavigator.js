import { useEffect } from 'react'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { getTokenSync, getRoleSync } from '../auth/tokenStore'
import DashboardHomeScreen from '../screens/DashboardHomeScreen'
import DashboardBookingsScreen from '../screens/DashboardBookingsScreen'
import UserBookingDetailScreen from '../screens/UserBookingDetailScreen'
import DashboardWalletScreen from '../screens/DashboardWalletScreen'
import DashboardDisputesScreen from '../screens/DashboardDisputesScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { colors } from '../theme/colors'
import { defaultNativeStackScreenOptions, defaultTabScreenOptions } from './navLayout'

const Tab = createBottomTabNavigator()
const BookStack = createNativeStackNavigator()

function BookingsStackNav() {
  return (
    <BookStack.Navigator
      screenOptions={{
        ...defaultNativeStackScreenOptions,
        headerShown: true,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <BookStack.Screen name="BookingsList" component={DashboardBookingsScreen} options={{ title: 'Bookings' }} />
      <BookStack.Screen name="BookingDetail" component={UserBookingDetailScreen} options={{ title: 'Session' }} />
    </BookStack.Navigator>
  )
}

export default function UserTabNavigator() {
  const navigation = useNavigation()
  const { authEpoch } = useAuth()

  useEffect(() => {
    const root = navigation.getParent() || navigation
    if (!getTokenSync()) {
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }))
      return
    }
    if (getRoleSync() !== 'user') {
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Unauthorized' }] }))
    }
  }, [navigation, authEpoch])

  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={{
        ...defaultTabScreenOptions,
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.slate500,
        tabBarStyle: { borderTopColor: colors.borderSubtle },
      }}
    >
      <Tab.Screen name="DashboardHome" component={DashboardHomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Bookings" component={BookingsStackNav} options={{ tabBarLabel: 'Bookings', headerShown: false }} />
      <Tab.Screen name="Wallet" component={DashboardWalletScreen} options={{ tabBarLabel: 'Wallet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
      <Tab.Screen name="Disputes" component={DashboardDisputesScreen} options={{ tabBarLabel: 'Disputes' }} />
    </Tab.Navigator>
  )
}
