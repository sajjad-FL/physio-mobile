import 'react-native-gesture-handler'
import { useEffect } from 'react'
import { configureNotificationPresentation, setupNotificationTapHandler } from './src/push/expoPushRegistration'
configureNotificationPresentation()
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider } from './src/context/AuthContext'
import ProfileCompletionHost from './src/components/ProfileCompletionHost'
import RootNavigator from './src/navigation/RootNavigator'
import { PatientTourGateProvider } from './src/tour/patientTourGate'
import { colors } from './src/theme/colors'
import { queryClient } from './src/api/queryClient'

export default function App() {
  const navigationRef = useNavigationContainerRef()
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    if (!navigationRef) return undefined
    const sub = setupNotificationTapHandler(navigationRef)
    return () => sub.remove()
  }, [navigationRef])

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <PatientTourGateProvider>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer ref={navigationRef}>
                <View style={{ flex: 1, backgroundColor: colors.canvas }}>
                  <RootNavigator />
                </View>
              </NavigationContainer>
              <ProfileCompletionHost />
            </QueryClientProvider>
            <Toast />
          </PatientTourGateProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
