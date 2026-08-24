import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProfileCompletionPoller } from '../hooks/useProfileCompletionPoller'
import { usePatientTourGate } from '../tour/patientTourGate'
import ProfileCompletionModal from './ui/ProfileCompletionModal'

/** Root-level profile completion reminder (60s poll while incomplete). */
export default function ProfileCompletionHost() {
  const { token, ready } = useAuth()
  const { setProfileModalBlocking } = usePatientTourGate()
  const { profile, isComplete, missingFields, showPrompt, dismissPrompt, refresh } = useProfileCompletionPoller(
    token,
    ready,
  )

  const modalVisible = Boolean(showPrompt && token && !isComplete && profile)

  useEffect(() => {
    setProfileModalBlocking(modalVisible)
  }, [modalVisible, setProfileModalBlocking])

  return (
    <ProfileCompletionModal
      visible={modalVisible}
      onDismiss={dismissPrompt}
      profile={profile}
      missingFields={missingFields}
      refresh={refresh}
    />
  )
}
