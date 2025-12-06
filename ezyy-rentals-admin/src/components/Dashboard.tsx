import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Menu, X, LayoutDashboard, Users, Smartphone, Calendar, Package, Tag, CreditCard, Settings as SettingsIcon } from 'lucide-react'
import { Notifications } from './Notifications'
import ezyyLogo from '@/assets/ezyy.svg'

interface DashboardProps {
  children: ReactNode
}

export function Dashboard({ children }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(true)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate sidebar width for main content margin
  let sidebarWidth = 0
  if (isMobile) {
    sidebarWidth = sidebarOpen ? 256 : 0
  } else {
    sidebarWidth = sidebarOpen ? 256 : 64
  }

  // Close sidebar when clicking outside on mobile
  const handleSidebarClose = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  // Close sidebar when navigating on mobile
  const handleNavigation = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { path: '/overview', label: 'Overview', icon: LayoutDashboard },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/device-types', label: 'Device Types', icon: Tag },
    { path: '/devices', label: 'Devices', icon: Smartphone },
    { path: '/accessories', label: 'Accessories', icon: Package },
    { path: '/rentals', label: 'Rentals', icon: Calendar },
    { path: '/subscription-payments', label: 'Subscription Payments', icon: CreditCard },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ]

  // Get current page title from location
  const getPageTitle = () => {
    const currentItem = navItems.find(item => item.path === location.pathname)
    return currentItem ? currentItem.label : location.pathname.replace('/', '').replace('-', ' ')
  }

  return (
    <div className="min-h-screen bg-white text-black flex relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleSidebarClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-black text-white transition-all duration-300 ease-in-out fixed top-0 bottom-0 left-0 z-50 ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16'
        } ${sidebarOpen ? 'flex' : 'hidden lg:flex'} flex-col border-r border-gray-800 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <img
                src={ezyyLogo}
                alt="Ezyy"
                className="h-8 w-8"
              />
              <h1 className="text-xl font-bold text-white truncate">Rentals</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-900 rounded transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleNavigation}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white text-black'
                        : 'text-white hover:bg-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out" 
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Top Navigation */}
        <header 
          className="fixed top-0 right-0 h-16 bg-white border-b border-black flex items-center justify-between px-3 sm:px-6 z-30 transition-all duration-300 ease-in-out" 
          style={{ left: `${sidebarWidth}px` }}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded transition-colors lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-black" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-black capitalize truncate">
              {getPageTitle()}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Notifications />
            <span className="text-xs sm:text-sm text-black hidden sm:inline truncate max-w-[120px] sm:max-w-none">
              {user?.email}
            </span>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-black text-black hover:bg-black hover:text-white text-xs sm:text-sm px-2 sm:px-4"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-white p-3 sm:p-4 md:p-6 mt-16">{children}</main>

        {/* Footer */}
        <footer className="bg-black text-white py-4 mt-auto">
          <div className="px-3 sm:px-6 text-center text-sm">
            Another{' '}
            <a
              href="https://ezyy.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 underline"
            >
              Ezyy Cloud
            </a>
            {' '}- {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  )
}

