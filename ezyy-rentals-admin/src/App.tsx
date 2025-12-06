import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Login } from '@/components/Login'
import { Dashboard } from '@/components/Dashboard'
import { Overview } from '@/pages/Overview'
import { Users } from '@/pages/Users'
import { UserDetail } from '@/pages/UserDetail'
import { DeviceTypes } from '@/pages/DeviceTypes'
import { DeviceTypeDetail } from '@/pages/DeviceTypeDetail'
import { Devices } from '@/pages/Devices'
import { DeviceDetail } from '@/pages/DeviceDetail'
import { Accessories } from '@/pages/Accessories'
import { AccessoryDetail } from '@/pages/AccessoryDetail'
import { Rentals } from '@/pages/Rentals'
import { RentalDetail } from '@/pages/RentalDetail'
import { SubscriptionPayments } from '@/pages/SubscriptionPayments'
import { SubscriptionPaymentDetail } from '@/pages/SubscriptionPaymentDetail'
import { Settings } from '@/pages/Settings'

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

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg text-black">Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Auth route - redirect if already logged in */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/overview" replace />
          ) : (
            <Login />
          )
        }
      />

      {/* Protected routes */}
      <Route
        path="/overview"
        element={
          <ProtectedRoute>
            <Dashboard>
              <Overview />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Dashboard>
              <Users />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:id"
        element={
          <ProtectedRoute>
            <Dashboard>
              <UserDetail />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/device-types"
        element={
          <ProtectedRoute>
            <Dashboard>
              <DeviceTypes />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/device-types/:id"
        element={
          <ProtectedRoute>
            <Dashboard>
              <DeviceTypeDetail />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices"
        element={
          <ProtectedRoute>
            <Dashboard>
              <Devices />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices/:id"
        element={
          <ProtectedRoute>
            <Dashboard>
              <DeviceDetail />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/accessories"
        element={
          <ProtectedRoute>
            <Dashboard>
              <Accessories />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/accessories/:id"
        element={
          <ProtectedRoute>
            <Dashboard>
              <AccessoryDetail />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rentals"
        element={
          <ProtectedRoute>
            <Dashboard>
              <Rentals />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rentals/:id"
        element={
          <ProtectedRoute>
            <Dashboard>
              <RentalDetail />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription-payments"
        element={
          <ProtectedRoute>
            <Dashboard>
              <SubscriptionPayments />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription-payments/:id"
        element={
          <ProtectedRoute>
            <Dashboard>
              <SubscriptionPaymentDetail />
            </Dashboard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Dashboard>
              <Settings />
            </Dashboard>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/overview" replace />} />

      {/* Catch all - redirect to overview */}
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  )
}

function App() {
  return <AppRoutes />
}

export default App
