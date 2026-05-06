import 'react-native-gesture-handler'
import { configureNotificationPresentation } from './src/push/expoPushRegistration'
configureNotificationPresentation()
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { AuthProvider } from './src/context/AuthContext'
import { View } from 'react-native'
import RootNavigator from './src/navigation/RootNavigator'
import { colors } from './src/theme/colors'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <NavigationContainer>
            <View style={{ flex: 1, backgroundColor: colors.slate50 }}>
              <RootNavigator />
            </View>
          </NavigationContainer>
          <Toast />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
