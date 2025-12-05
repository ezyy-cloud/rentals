import { useAuth } from '@/contexts/AuthContext'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Login } from '@/components/Login'
import { SignUp } from '@/components/SignUp'
import { Home } from '@/pages/Home'
import { DeviceDetail } from '@/pages/DeviceDetail'
import { Cart } from '@/pages/Cart'
import { Checkout } from '@/pages/Checkout'
import { MyRentals } from '@/pages/MyRentals'
import { Profile } from '@/pages/Profile'
import { Notifications } from '@/pages/Notifications'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function DeviceDetailWrapper() {
  const { deviceId } = useParams<{ deviceId: string }>()
  return <DeviceDetail deviceId={deviceId ?? ''} />
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
          <div className="text-lg text-black">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/device/:deviceId" element={<Layout><DeviceDetailWrapper /></Layout>} />
      <Route path="/cart" element={<Layout><Cart /></Layout>} />
      
      {/* Auth routes - redirect if already logged in */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <>
        <div className="mb-4 p-4 bg-white border-b-2 border-black">
          <div className="max-w-7xl mx-auto px-4">
                  <a
                    href="/"
              className="text-xl font-bold text-black hover:text-gray-700"
            >
              Ezyy Rentals
                  </a>
          </div>
        </div>
        <Login />
        <div className="text-center mt-4 pb-8">
          <p className="text-gray-600">
            Don't have an account?{' '}
                  <a
                    href="/signup"
              className="text-black font-semibold hover:underline"
            >
              Sign up
                  </a>
          </p>
        </div>
            </>
    )
  }
      />
      <Route
        path="/signup"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <>
        <div className="mb-4 p-4 bg-white border-b-2 border-black">
          <div className="max-w-7xl mx-auto px-4">
                  <a
                    href="/"
              className="text-xl font-bold text-black hover:text-gray-700"
            >
              Ezyy Rentals
                  </a>
          </div>
        </div>
        <SignUp />
        <div className="text-center mt-4 pb-8">
          <p className="text-gray-600">
            Already have an account?{' '}
                  <a
                    href="/login"
              className="text-black font-semibold hover:underline"
            >
              Sign in
                  </a>
          </p>
        </div>
            </>
    )
  }
      />

      {/* Protected routes */}
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Layout><Checkout /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rentals"
        element={
          <ProtectedRoute>
            <Layout><MyRentals /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout><Profile /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout><Notifications /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
