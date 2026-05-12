import { CommonActions, useNavigation } from '@react-navigation/native'
import { useEffect } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { PhysioWorkspaceProvider, usePhysioWorkspace } from '../context/PhysioWorkspaceContext'
import PhysioBookingsScreen from '../screens/PhysioBookingsScreen'
import PhysioBookingDetailScreen from '../screens/PhysioBookingDetailScreen'
import PhysioWalletScreen from '../screens/PhysioWalletScreen'
import PhysioAvailabilityScreen from '../screens/PhysioAvailabilityScreen'
import PhysioNotesScreen from '../screens/PhysioNotesScreen'
import PhysioMoreScreen from '../screens/PhysioMoreScreen'
import PhysioTopNavHeader from '../components/PhysioTopNavHeader'
import CustomTabBar from './CustomTabBar'
import { defaultNativeStackScreenOptions, defaultTabScreenOptions } from './navLayout'
import { getRoleSync, getTokenSync } from '../auth/tokenStore'
import { useAuth } from '../context/AuthContext'

const Tab = createBottomTabNavigator()
const BookingsStack = createNativeStackNavigator()

function PhysioBookingsStackInner() {
  return (
    <BookingsStack.Navigator
      screenOptions={{
        ...defaultNativeStackScreenOptions,
        header: ({ navigation }) => <PhysioTopNavHeader navigation={navigation} />,
      }}
    >
      <BookingsStack.Screen name="PhysioBookingsList" component={PhysioBookingsScreen} />
      <BookingsStack.Screen
        name="PhysioBookingDetail"
        component={PhysioBookingDetailScreen}
        options={{
          title: 'Booking',
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </BookingsStack.Navigator>
  )
}

function TabsWithBadges() {
  const nav = useNavigation()
  const { authEpoch } = useAuth()
  const { bookingBadge } = usePhysioWorkspace()

  useEffect(() => {
    const root = nav.getParent() || nav
    if (!getTokenSync()) {
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }))
      return
    }
    const r = getRoleSync()
    if (r !== 'physio') {
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Unauthorized' }] }))
    }
  }, [nav, authEpoch])

  return (
    <Tab.Navigator
      detachInactiveScreens
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        ...defaultTabScreenOptions,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="PhysioDashboard"
        component={PhysioBookingsStackInner}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault()
            navigation.navigate('PhysioDashboard', { screen: 'PhysioBookingsList' })
          },
        })}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
          tabBarBadge: bookingBadge > 0 ? (bookingBadge > 99 ? '99+' : bookingBadge) : undefined,
        }}
      />
      <Tab.Screen
        name="PhysioWalletTab"
        component={PhysioWalletScreen}
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
          ),
          headerShown: true,
          header: ({ navigation }) => <PhysioTopNavHeader navigation={navigation} />,
        }}
      />
      <Tab.Screen
        name="PhysioAvailabilityTab"
        component={PhysioAvailabilityScreen}
        options={{
          title: 'Hours',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={22} color={color} />
          ),
          headerShown: true,
          header: ({ navigation }) => <PhysioTopNavHeader navigation={navigation} />,
        }}
      />
      <Tab.Screen
        name="PhysioNotesTab"
        component={PhysioNotesScreen}
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={22} color={color} />
          ),
          headerShown: true,
          header: ({ navigation }) => <PhysioTopNavHeader navigation={navigation} />,
        }}
      />
      <Tab.Screen
        name="PhysioHubTab"
        component={PhysioMoreScreen}
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
          headerShown: true,
          header: ({ navigation }) => <PhysioTopNavHeader navigation={navigation} />,
        }}
      />
    </Tab.Navigator>
  )
}

export default function PhysioTabNavigator() {
  return (
    <PhysioWorkspaceProvider>
      <TabsWithBadges />
    </PhysioWorkspaceProvider>
  )
}
