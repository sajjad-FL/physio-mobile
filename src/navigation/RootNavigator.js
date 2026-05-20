import { ActivityIndicator, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import HomeScreen from '../screens/HomeScreen'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen'
import UnauthorizedScreen from '../screens/UnauthorizedScreen'
import ProfileScreen from '../screens/ProfileScreen'
import PlaceholderScreen from '../screens/PlaceholderScreen'
import PhysioAvailabilityScreen from '../screens/PhysioAvailabilityScreen'
import PhysioNotesScreen from '../screens/PhysioNotesScreen'
import PhysioDisputesScreen from '../screens/PhysioDisputesScreen'
import PhysioOnboardingScreen from '../screens/PhysioOnboardingScreen'
import PhysioVerificationRedirectScreen from '../screens/PhysioVerificationRedirectScreen'
import RegisterPhysioScreen from '../screens/RegisterPhysioScreen'
import PhysioListScreen from '../screens/PhysioListScreen'
import ReferEarnScreen from '../screens/ReferEarnScreen'
import UserTabNavigator from './UserTabNavigator'
import PhysioTabNavigator from './PhysioTabNavigator'
import { defaultNativeStackScreenOptions } from './navLayout'

const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  const { ready } = useAuth()

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.slate50 }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        ...defaultNativeStackScreenOptions,
        headerBackTitleVisible: false,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CityLanding" component={PlaceholderScreen} options={{ title: 'Physio in your city' }} />
      <Stack.Screen name="NearMeHub" component={PlaceholderScreen} options={{ title: 'Near me' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RegisterPhysio" component={RegisterPhysioScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Unauthorized" component={UnauthorizedScreen} options={{ title: 'Unauthorized' }} />
      <Stack.Screen name="PublicPhysician" component={PlaceholderScreen} options={{ title: 'Physician' }} />
      {/**
       * Register role dashboards on the root stack so CommonActions.reset targets
       * (e.g. PhysioTabs after login) always resolve. UserTabNavigator / PhysioTabNavigator
       * guard token + role and redirect to Login or Unauthorized.
       */}
      <Stack.Screen name="UserTabs" component={UserTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="PhysioTabs" component={PhysioTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ProfileGlobal" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="PhysioList" component={PhysioListScreen} options={{ title: 'Book' }} />
      <Stack.Screen name="ReferEarn" component={ReferEarnScreen} options={{ title: 'Refer & Earn' }} />
      <Stack.Screen name="MapView" component={PlaceholderScreen} options={{ title: 'Map' }} />
      <Stack.Screen name="BookingLegacy" component={PlaceholderScreen} options={{ title: 'Book (legacy)' }} />
      <Stack.Screen name="PhysioAvailability" component={PhysioAvailabilityScreen} options={{ title: 'Availability' }} />
      <Stack.Screen name="PhysioNotes" component={PhysioNotesScreen} options={{ title: 'Clinical notes' }} />
      <Stack.Screen name="PhysioDisputes" component={PhysioDisputesScreen} options={{ title: 'Disputes' }} />
      <Stack.Screen name="PhysioOnboarding" component={PhysioOnboardingScreen} options={{ title: 'Onboarding' }} />
      <Stack.Screen name="PhysioVerification" component={PhysioVerificationRedirectScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  )
}
