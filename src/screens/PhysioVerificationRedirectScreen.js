import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'

/** Legacy path; onboarding lives at PhysioOnboarding (same as web `/physio/verification` redirect). */
export default function PhysioVerificationRedirectScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('PhysioOnboarding'), 0)
    return () => clearTimeout(t)
  }, [navigation])
  return (
    <View style={styles.c}>
      <ActivityIndicator color={colors.brand} />
    </View>
  )
}

const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas },
})
