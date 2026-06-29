import { Pressable, StyleSheet, Text, View } from 'react-native'
import { TourBox } from 'react-native-spotlight-tour'
import { colors } from '../theme/colors'
import { figmaTokens } from '../theme/figmaTokens'
import { font, type, leading } from '../theme/typography'
import { setPatientTourCompleted } from './tourStorage'

/** Set before tour start so step 1 copy matches the highlighted target. */
let step1HasUpcomingBooking = false

export function setPatientTourStep1Context(hasUpcomingBooking) {
  step1HasUpcomingBooking = hasUpcomingBooking
}

function PatientTourTooltip({ title, body, ...renderProps }) {
  const { isLast, next, stop } = renderProps

  const handleSkip = () => {
    setPatientTourCompleted().catch(() => {})
    stop()
  }

  const handleNext = () => {
    if (isLast) {
      setPatientTourCompleted().catch(() => {})
    }
    next()
  }

  return (
    <View style={tooltipStyles.wrap}>
      <TourBox
        {...renderProps}
        title={title}
        hideBack
        nextText={isLast ? 'Done' : 'Next'}
        onNext={handleNext}
        style={tooltipStyles.box}
        titleStyle={tooltipStyles.title}
        nextStyle={tooltipStyles.nextBtn}
      >
        <Text style={tooltipStyles.body}>{body}</Text>
        <Pressable onPress={handleSkip} hitSlop={8} style={tooltipStyles.skipBtn}>
          <Text style={tooltipStyles.skipTxt}>Skip tour</Text>
        </Pressable>
      </TourBox>
    </View>
  )
}

function step1Title() {
  return step1HasUpcomingBooking ? 'Your upcoming session' : 'Book an appointment'
}

function step1Body() {
  return step1HasUpcomingBooking
    ? 'Your next session appears here. Tap to view details and manage your care plan.'
    : 'Book a verified physio for a home visit or online session.'
}

export function buildPatientTourSteps() {
  return [
    {
      placement: 'bottom',
      shape: { type: 'rectangle', padding: 12 },
      render: (props) => (
        <PatientTourTooltip
          {...props}
          title="Welcome to PhysiOkhom"
          body="Your home for physiotherapy at home — book appointments, track care, and manage payments."
        />
      ),
    },
    {
      placement: 'bottom',
      shape: { type: 'rectangle', padding: 10 },
      render: (props) => (
        <PatientTourTooltip {...props} title={step1Title()} body={step1Body()} />
      ),
    },
    {
      placement: 'top',
      shape: { type: 'rectangle', padding: 6 },
      render: (props) => (
        <PatientTourTooltip
          {...props}
          title="Navigate the app"
          body="Use the tabs for Home, Bookings, Wallet, Shop, Profile, and Disputes if you need help."
        />
      ),
    },
    {
      placement: 'bottom',
      shape: { type: 'circle', padding: 8 },
      render: (props) => (
        <PatientTourTooltip
          {...props}
          title="Quick menu"
          body="Open the menu for quick jumps to any section."
        />
      ),
    },
    {
      placement: 'bottom',
      shape: { type: 'rectangle', padding: 8 },
      render: (props) => (
        <PatientTourTooltip
          {...props}
          title="Book anytime"
          body="Start a new booking anytime from here."
        />
      ),
    },
  ]
}

const tooltipStyles = StyleSheet.create({
  wrap: { maxWidth: 320 },
  box: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontFamily: font.bold,
    fontSize: type.md,
    lineHeight: leading.md,
    color: colors.ink,
    marginBottom: 6,
  },
  body: {
    fontFamily: font.regular,
    fontSize: type.sm,
    lineHeight: leading.sm,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  nextBtn: {
    backgroundColor: figmaTokens.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  skipTxt: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.slate400,
  },
})
