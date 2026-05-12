import TopNavHeader from './ui/TopNavHeader'
import { useAuth } from '../context/AuthContext'
import { usePhysioWorkspaceOptional } from '../context/PhysioWorkspaceContext'

export default function PhysioTopNavHeader({ navigation }) {
  const { logout } = useAuth()
  const ws = usePhysioWorkspaceOptional()
  const physioName = String(ws?.me?.name || 'Physiotherapist').trim()

  const menuItems = [{ label: `Signed in as ${physioName}`, route: '__noop' }, { label: 'Profile', route: 'ProfileGlobal' }, { label: 'Hub', route: 'PhysioHubTab' }]
  const sideItems = [
    { label: 'Bookings', route: 'PhysioDashboard' },
    { label: 'Wallet', route: 'PhysioWalletTab' },
  ]

  const onNavigate = (route) => {
    if (route === '__noop') return
    if (route === 'ProfileGlobal') return navigation.getParent()?.getParent()?.navigate('ProfileGlobal')
    if (route === 'PhysioDashboard') return navigation.navigate('PhysioDashboard', { screen: 'PhysioBookingsList' })
    return navigation.navigate(route)
  }

  const rootNav = navigation.getParent()?.getParent() || navigation

  return (
    <TopNavHeader
      title="Workspace"
      subtitle="Sessions & availability"
      menuItems={menuItems}
      sideItems={sideItems}
      onNavigate={onNavigate}
      onLogout={() => logout(rootNav)}
    />
  )
}
