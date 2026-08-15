import { NavLink } from 'react-router-dom'
import { House, Search, Plus, Mail, User } from 'lucide-react'
import './BottomNav.css'

const items = [
  { to: '/home', label: 'Home', icon: House, end: true },
  { to: '/discover', label: 'Discover', icon: Search, end: false },
  { to: '/sell', label: 'Sell', icon: Plus, end: false },
  { to: '/inbox', label: 'Inbox', icon: Mail, end: false },
  { to: '/profile', label: 'My Spotted', icon: User, end: false },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
        >
          <Icon size={24} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
