import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { colors } from '../theme/colors'

/** Route parity: map screen name → web source file for incremental porting. */
const WEB_SOURCE = {
  CityLanding: 'client/src/pages/CityLandingPage.jsx',
  NearMeHub: 'client/src/pages/NearMeHubPage.jsx',
  PublicPhysician: 'client/src/pages/PublicPhysicianPage.jsx',
  PhysioList: 'client/src/pages/PhysioListPage.jsx',
  MapView: 'client/src/pages/MapView.jsx',
  BookingLegacy: 'client/src/pages/BookingPage.jsx',
  RegisterPhysio: 'client/src/pages/RegisterPhysioPage.jsx',
  PhysioAvailability: 'client/src/pages/physio/PhysioAvailabilityPage.jsx',
  PhysioNotes: 'client/src/pages/physio/PhysioNotesPage.jsx',
  PhysioDisputes: 'client/src/pages/physio/PhysioDisputesPage.jsx',
  PhysioOnboarding: 'client/src/pages/physio/PhysioOnboardingPage.jsx',
  PhysioVerification: 'client/src/pages/physio/PhysioVerificationPage.jsx',
  PhysioWallet: 'client/src/pages/physio/PhysioWalletPage.jsx',
}

export default function PlaceholderScreen({ navigation, route }) {
  const name = route.name
  const web = WEB_SOURCE[name] || 'client/src/App.jsx (see route list)'

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.title}>{name}</Text>
      <Card>
        <Text style={styles.p}>
          Mobile shell route. Match layout, tokens, and API calls from the web app file:
        </Text>
        <Text style={styles.code}>{web}</Text>
        <View style={{ height: 16 }} />
        <Button title="Back" variant="outline" onPress={() => navigation.goBack()} />
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 17, fontWeight: '700', color: colors.slate900, marginBottom: 10 },
  p: { fontSize: 13, color: colors.slate600, lineHeight: 19 },
  code: { marginTop: 8, fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), color: colors.slate900 },
})
