import { SpotlightTourProvider } from 'react-native-spotlight-tour'
import { colors } from '../theme/colors'
import { buildPatientTourSteps } from './patientTourSteps'
import { setPatientTourCompleted } from './tourStorage'

const PATIENT_TOUR_STEPS = buildPatientTourSteps()

export default function PatientAppTourProvider({ children }) {
  return (
    <SpotlightTourProvider
        steps={PATIENT_TOUR_STEPS}
        overlayColor={colors.ink}
        overlayOpacity={0.75}
        onBackdropPress="stop"
        onStop={() => {
          setPatientTourCompleted().catch(() => {})
        }}
        shape={{ type: 'rectangle', padding: 10 }}
        motion="fade"
      >
        {children}
      </SpotlightTourProvider>
  )
}
