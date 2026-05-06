import { StyleSheet, Text, View } from 'react-native'
import Button from '../components/ui/Button'
import { colors } from '../theme/colors'

export default function UnauthorizedScreen({ navigation }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Unauthorized</Text>
      <Text style={styles.sub}>You don&apos;t have access to that area.</Text>
      <Button title="Go home" onPress={() => navigation.replace('Home')} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.slate50 },
  title: { fontSize: 22, fontWeight: '700', color: colors.slate900 },
  sub: { marginTop: 8, marginBottom: 20, fontSize: 14, color: colors.slate500 },
})
