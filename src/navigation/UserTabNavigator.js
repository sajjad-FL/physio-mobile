import { useEffect } from 'react'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import { getTokenSync, getRoleSync } from '../auth/tokenStore'
import DashboardHomeScreen from '../screens/DashboardHomeScreen'
import DashboardBookingsScreen from '../screens/DashboardBookingsScreen'
import UserBookingDetailScreen from '../screens/UserBookingDetailScreen'
import DashboardWalletScreen from '../screens/DashboardWalletScreen'
import DashboardDisputesScreen from '../screens/DashboardDisputesScreen'
import ShopStackNavigator from './ShopStackNavigator'
import ProfileScreen from '../screens/ProfileScreen'
import UserTopNavHeader from '../components/UserTopNavHeader'
import CustomTabBar from './CustomTabBar'
import PatientAppTourProvider from '../tour/PatientAppTourProvider'
import { defaultNativeStackScreenOptions, defaultTabScreenOptions } from './navLayout'

const Tab = createBottomTabNavigator()
const BookStack = createNativeStackNavigator()

function BookingsStackNav() {
  return (
    <BookStack.Navigator
      screenOptions={{
        ...defaultNativeStackScreenOptions,
        header: ({ navigation, options }) => <UserTopNavHeader navigation={navigation} title={options.title || 'Session'} />,
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
    <PatientAppTourProvider>
      <Tab.Navigator
      detachInactiveScreens
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        ...defaultTabScreenOptions,
        header: ({ navigation, options }) => <UserTopNavHeader navigation={navigation} title={options.title || 'Session'} />,
      }}
    >
      <Tab.Screen
        name="DashboardHome"
        component={DashboardHomeScreen}
        options={{
          tabBarLabel: 'Home',
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsStackNav}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault()
            navigation.navigate('Bookings', { screen: 'BookingsList' })
          },
        })}
        options={{
          tabBarLabel: 'Bookings',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={DashboardWalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault()
            navigation.navigate('Shop', { screen: 'ShopHome' })
          },
        })}
        options={{
          tabBarLabel: 'Shop',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bag' : 'bag-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Disputes"
        component={DashboardDisputesScreen}
        options={{
          tabBarLabel: 'Disputes',
          title: 'Disputes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'alert-circle' : 'alert-circle-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    </PatientAppTourProvider>
  )
}
