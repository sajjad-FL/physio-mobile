import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../theme/colors'

export default function PhysioApprovalBanner({ rejected, onPressOnboarding, onPressProfile }) {
  return (
    <View
      style={[
        styles.wrap,
        rejected ? { borderColor: '#fecaca', backgroundColor: '#fef2f2' } : { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconBox,
            rejected ? { backgroundColor: '#fee2e2' } : { backgroundColor: colors.amber100 },
          ]}
        >
          <Text style={styles.iconTxt}>{rejected ? '⚠' : '⏳'}</Text>
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, rejected ? { color: '#7f1d1d' } : { color: colors.amber950 }]}>
            {rejected ? 'Profile not approved' : 'Your profile is under approval'}
          </Text>
          {rejected ? (
            <>
              <Text style={styles.p}>
                Your application was rejected. Update documents from onboarding or edit your profile.
              </Text>
              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.btnPri]} onPress={onPressOnboarding}>
                  <Text style={styles.btnPriTxt}>Review & resubmit</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnOut]} onPress={onPressProfile}>
                  <Text style={styles.btnOutTxt}>Edit profile</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.p}>
                Bookings, wallet, and availability stay locked until you&apos;re approved. You can still update profile
                and onboarding.
              </Text>
              <Text style={styles.tip}>Tip: complete every onboarding step to speed up review.</Text>
            </>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTxt: { fontSize: 18 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  p: { marginTop: 8, fontSize: 13, lineHeight: 19, color: colors.slate900 },
  tip: { marginTop: 10, fontSize: 11, fontWeight: '600', color: colors.amber800 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  btnPri: { backgroundColor: '#b91c1c' },
  btnPriTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnOut: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  btnOutTxt: { color: '#7f1d1d', fontWeight: '700', fontSize: 13 },
})
