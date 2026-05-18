import { useAuth } from '../context/AuthContext'
import { useProfileCompletionPoller } from '../hooks/useProfileCompletionPoller'
import ProfileCompletionModal from './ui/ProfileCompletionModal'

/** Root-level profile completion reminder (60s poll while incomplete). */
export default function ProfileCompletionHost() {
  const { token, ready } = useAuth()
  const { profile, isComplete, missingFields, showPrompt, dismissPrompt, refresh } = useProfileCompletionPoller(
    token,
    ready,
  )

  return (
    <ProfileCompletionModal
      visible={Boolean(showPrompt && token && !isComplete && profile)}
      onDismiss={dismissPrompt}
      profile={profile}
      missingFields={missingFields}
      refresh={refresh}
    />
  )
}
