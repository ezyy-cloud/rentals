import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Package, Bell, User } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'

export function MobileBottomNav() {
  const location = useLocation()
  const { getItemCount } = useCart()
  const { user } = useAuth()

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/cart', icon: ShoppingBag, label: 'Cart', badge: getItemCount() },
    ...(user
      ? [
          { path: '/rentals', icon: Package, label: 'Rentals' },
          { path: '/notifications', icon: Bell, label: 'Notifications' },
          { path: '/profile', icon: User, label: 'Profile' },
        ]
      : []),
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive ? 'text-black' : 'text-gray-600'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

