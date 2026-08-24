import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useRef } from 'react'
import { InteractionManager } from 'react-native'
import { useSpotlightTour } from 'react-native-spotlight-tour'
import { getRoleSync } from '../auth/tokenStore'
import { usePatientTourGate } from './patientTourGate'
import { setPatientTourStep1Context } from './patientTourSteps'
import { getPatientTourCompleted } from './tourStorage'

const START_DELAY_MS = 300

/**
 * Auto-starts the patient spotlight tour once on first Home focus after login.
 * @param {{ hasUpcomingBooking?: boolean }} options
 */
export function usePatientAppTour({ hasUpcomingBooking = false } = {}) {
  const { start } = useSpotlightTour()
  const { profileModalBlocking } = usePatientTourGate()
  const sessionStartedRef = useRef(false)

  useFocusEffect(
    useCallback(() => {
      if (sessionStartedRef.current) return undefined
      if (getRoleSync() !== 'user') return undefined

      let cancelled = false
      let timeoutId

      async function tryStart() {
        if (sessionStartedRef.current || cancelled) return
        const completed = await getPatientTourCompleted()
        if (cancelled || completed) return
        if (profileModalBlocking) return

        setPatientTourStep1Context(hasUpcomingBooking)

        timeoutId = setTimeout(() => {
          if (cancelled || profileModalBlocking || sessionStartedRef.current) return
          sessionStartedRef.current = true
          start()
        }, START_DELAY_MS)
      }

      const interactionTask = InteractionManager.runAfterInteractions(() => {
        tryStart().catch(() => {})
      })

      return () => {
        cancelled = true
        if (timeoutId) clearTimeout(timeoutId)
        interactionTask.cancel?.()
      }
    }, [hasUpcomingBooking, profileModalBlocking, start]),
  )
}
