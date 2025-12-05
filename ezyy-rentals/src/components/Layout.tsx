import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { Button } from '@/components/ui/Button'
import { Menu, X, User, ShoppingBag, Bell, LogOut, Home } from 'lucide-react'
import ezyyLogo from '@/assets/ezyy.svg'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, appUser, signOut } = useAuth()
  const { getItemCount } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const currentPage = location.pathname

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setMobileMenuOpen(false)
    setUserMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b-2 border-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-black hover:text-gray-700"
              >
                <img
                  src={ezyyLogo}
                  alt="Ezyy"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                />
                <span>Rentals</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded font-medium ${
                  currentPage === '/' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                }`}
              >
                <Home className="w-4 h-4 inline mr-2" />
                Browse
              </Link>

              {user ? (
                <>
                  <Link
                    to="/cart"
                    className={`relative px-4 py-2 rounded font-medium transition-all ${
                      currentPage === '/cart'
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-black hover:bg-gray-200 border-2 border-black'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5 inline mr-2" />
                    <span className="font-semibold">Cart</span>
                    {getItemCount() > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                        {getItemCount()}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/rentals"
                    className={`px-3 py-2 rounded font-medium ${
                      currentPage === '/rentals' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    My Rentals
                  </Link>

                  <Link
                    to="/notifications"
                    className={`px-3 py-2 rounded font-medium ${
                      currentPage === '/notifications' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    <Bell className="w-4 h-4 inline mr-2" />
                    Notifications
                  </Link>

                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded font-medium text-black hover:bg-gray-100"
                    >
                      <User className="w-4 h-4" />
                      {appUser ? `${appUser.first_name} ${appUser.last_name}` : 'Account'}
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black rounded-lg shadow-lg z-50">
                        <Link
                          to="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full text-left px-4 py-2 text-black hover:bg-gray-100 rounded-t-lg block"
                        >
                          <User className="w-4 h-4 inline mr-2" />
                          Profile
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-black hover:bg-gray-100 rounded-b-lg"
                        >
                          <LogOut className="w-4 h-4 inline mr-2" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/cart"
                    className="relative px-4 py-2 rounded font-medium bg-gray-100 text-black hover:bg-gray-200 border-2 border-black transition-all"
                  >
                    <ShoppingBag className="w-5 h-5 inline mr-2" />
                    <span className="font-semibold">View Cart</span>
                    {getItemCount() > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                        {getItemCount()}
                      </span>
                    )}
                  </Link>
                  <Button
                    onClick={() => handleNavigate('/login')}
                    variant="outline"
                    className="border-black text-black hover:bg-gray-100"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => handleNavigate('/signup')}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-black"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-black bg-white">
            <div className="px-4 py-2 space-y-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full text-left px-3 py-2 rounded block ${
                  currentPage === '/' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                }`}
              >
                <Home className="w-4 h-4 inline mr-2" />
                Browse
              </Link>

              {user ? (
                <>
                  <Link
                    to="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full text-left px-3 py-2 rounded flex items-center justify-between block ${
                      currentPage === '/cart'
                        ? 'bg-black text-white'
                        : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    <span>
                      <ShoppingBag className="w-4 h-4 inline mr-2" />
                      <span className="font-semibold">Cart</span>
                    </span>
                    {getItemCount() > 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {getItemCount()}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/rentals"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full text-left px-3 py-2 rounded block ${
                      currentPage === '/rentals' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    My Rentals
                  </Link>

                  <Link
                    to="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full text-left px-3 py-2 rounded block ${
                      currentPage === '/notifications' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    <Bell className="w-4 h-4 inline mr-2" />
                    Notifications
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`w-full text-left px-3 py-2 rounded block ${
                      currentPage === '/profile' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
                    }`}
                  >
                    <User className="w-4 h-4 inline mr-2" />
                    Profile
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 rounded text-black hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 inline mr-2" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-left px-3 py-2 rounded text-black hover:bg-gray-100 flex items-center justify-between border-2 border-black block"
                  >
                    <span>
                      <ShoppingBag className="w-4 h-4 inline mr-2" />
                      <span className="font-semibold">View Cart</span>
                    </span>
                    {getItemCount() > 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {getItemCount()}
                      </span>
                    )}
                  </Link>
                  <Button
                    onClick={() => handleNavigate('/login')}
                    variant="outline"
                    className="w-full border-black text-black hover:bg-gray-100"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => handleNavigate('/signup')}
                    className="w-full bg-black text-white hover:bg-gray-800"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Footer */}
      <footer className="bg-black text-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
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

      {/* Close user menu when clicking outside */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  )
}

