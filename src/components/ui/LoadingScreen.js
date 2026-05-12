import { memo } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { colors } from '../../theme/colors'

export const LoadingIndicator = memo(function LoadingIndicator() {
  return <ActivityIndicator size="large" color={colors.brand} />
})

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <LoadingIndicator />
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})

export default memo(LoadingScreen)
