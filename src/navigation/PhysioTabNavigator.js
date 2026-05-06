import { Text } from 'react-native'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useEffect } from 'react'
import { PhysioWorkspaceProvider, usePhysioWorkspace } from '../context/PhysioWorkspaceContext'
import PhysioBookingsScreen from '../screens/PhysioBookingsScreen'
import PhysioBookingDetailScreen from '../screens/PhysioBookingDetailScreen'
import PhysioWalletScreen from '../screens/PhysioWalletScreen'
import PhysioAvailabilityScreen from '../screens/PhysioAvailabilityScreen'
import PhysioNotesScreen from '../screens/PhysioNotesScreen'
import PhysioMoreScreen from '../screens/PhysioMoreScreen'
import { colors } from '../theme/colors'
import { defaultNativeStackScreenOptions, defaultTabScreenOptions } from './navLayout'
import { getRoleSync, getTokenSync } from '../auth/tokenStore'
import { useAuth } from '../context/AuthContext'

const Tab = createBottomTabNavigator()
const BookingsStack = createNativeStackNavigator()

function TabGlyph({ glyph, focused }) {
  return (
    <Text style={{ fontSize: 16, opacity: focused ? 1 : 0.55, color: focused ? colors.brand : colors.slate500 }}>
      {glyph}
    </Text>
  )
}

function PhysioBookingsStackInner() {
  return (
    <BookingsStack.Navigator
      screenOptions={{
        ...defaultNativeStackScreenOptions,
        headerTitleStyle: { fontWeight: '700' },
        headerTintColor: colors.brand,
      }}
    >
      <BookingsStack.Screen name="PhysioBookingsList" component={PhysioBookingsScreen} options={{ title: 'Workspace' }} />
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
    if (r !== 'physio' && r !== 'admin') {
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Unauthorized' }] }))
    }
  }, [nav, authEpoch])

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
      <Tab.Screen
        name="PhysioDashboard"
        component={PhysioBookingsStackInner}
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="▦" focused={focused} />,
          tabBarBadge: bookingBadge > 0 ? (bookingBadge > 99 ? '99+' : bookingBadge) : undefined,
        }}
      />
      <Tab.Screen
        name="PhysioWalletTab"
        component={PhysioWalletScreen}
        options={{
          title: 'Wallet',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="◇" focused={focused} />,
          headerShown: true,
          headerTitle: 'Wallet',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Tab.Screen
        name="PhysioAvailabilityTab"
        component={PhysioAvailabilityScreen}
        options={{
          title: 'Hours',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="◷" focused={focused} />,
          headerShown: true,
          headerTitle: 'Availability',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Tab.Screen
        name="PhysioNotesTab"
        component={PhysioNotesScreen}
        options={{
          title: 'Notes',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="✎" focused={focused} />,
          headerShown: true,
          headerTitle: 'Clinical notes',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <Tab.Screen
        name="PhysioHubTab"
        component={PhysioMoreScreen}
        options={{
          title: 'Hub',
          tabBarIcon: ({ focused }) => <TabGlyph glyph="⚙" focused={focused} />,
          headerShown: true,
          headerTitle: 'Hub',
          headerTitleStyle: { fontWeight: '700' },
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
