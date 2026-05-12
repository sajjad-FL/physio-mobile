import TopNavHeader from './ui/TopNavHeader'
import { useAuth } from '../context/AuthContext'

const MENU_ITEMS = [
  { label: 'Dashboard', route: 'DashboardHome' },
  { label: 'Book a session', route: 'PhysioList' },
  { label: 'Profile', route: 'Profile' },
]

const SIDE_ITEMS = [
  { label: 'Dashboard', route: 'DashboardHome' },
  { label: 'Bookings', route: 'Bookings' },
  { label: 'Wallet', route: 'Wallet' },
  { label: 'Profile', route: 'Profile' },
  { label: 'Disputes', route: 'Disputes' },
]

export default function UserTopNavHeader({ navigation, title = 'Session' }) {
  const { logout } = useAuth()
  const onNavigate = (route) => {
    if (route === 'Profile') return navigation.navigate('Profile')
    if (route === 'PhysioList') return navigation.navigate('PhysioList')
    if (route === 'Bookings') {
      const state = navigation.getState?.()
      // If already inside bookings stack/detail, always go back to list.
      if (state?.routeNames?.includes('BookingsList')) {
        return navigation.navigate('BookingsList')
      }
      return navigation.navigate('Bookings', { screen: 'BookingsList' })
    }
    return navigation.navigate(route)
  }
  return <TopNavHeader title={title} showBookCta menuItems={MENU_ITEMS} sideItems={SIDE_ITEMS} onNavigate={onNavigate} onLogout={() => logout(navigation)} />
}

