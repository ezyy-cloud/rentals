import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { UserPlus, ChevronRight, ChevronLeft } from 'lucide-react'

const SIGNUP_STORAGE_KEY = 'ezyy-signup-partial-data'

export function SignUp() {
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    telephone: '',
    address: '',
    city: '',
    country: '',
    id_number: '',
    date_of_birth: '',
    next_of_kin_first_name: '',
    next_of_kin_last_name: '',
    next_of_kin_phone_number: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  // Load partial data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SIGNUP_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...parsed }))
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  // Save partial data to localStorage
  useEffect(() => {
    if (formData.email || formData.first_name) {
      localStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(formData))
    }
  }, [formData])

  const validateStep = (step: number): boolean => {
    setError(null)
    
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword || !formData.first_name || !formData.last_name) {
        const errorMsg = 'Please fill in all required fields'
        setError(errorMsg)
        showError(errorMsg)
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        const errorMsg = 'Passwords do not match'
        setError(errorMsg)
        showError(errorMsg)
        return false
      }
      if (formData.password.length < 6) {
        const errorMsg = 'Password must be at least 6 characters'
        setError(errorMsg)
        showError(errorMsg)
        return false
      }
    }
    
    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateStep(3)) {
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(formData.email, formData.password, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        telephone: formData.telephone || '',
        address: formData.address || '',
        city: formData.city || null,
        country: formData.country || null,
        id_number: formData.id_number || '',
        date_of_birth: formData.date_of_birth || '',
        profile_picture: null,
        next_of_kin_first_name: formData.next_of_kin_first_name || '',
        next_of_kin_last_name: formData.next_of_kin_last_name || '',
        next_of_kin_phone_number: formData.next_of_kin_phone_number || '',
      })

      if (error) {
        const errorMsg = error.message
        setError(errorMsg)
        showError(errorMsg)
      } else {
        localStorage.removeItem(SIGNUP_STORAGE_KEY)
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          showSuccess('Account created successfully!')
        } else {
          showSuccess('Account created! Please check your email to confirm.')
        }
        navigate('/')
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Allow skipping to create account with minimal info
    if (currentStep === 1 && validateStep(1)) {
      handleSubmit(new Event('submit') as any)
    } else {
      handleNext()
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
      <div className="max-w-2xl w-full space-y-6 bg-white border-2 border-black p-6 sm:p-8 rounded-lg">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Create Account</h1>
          <p className="text-sm sm:text-base text-gray-600">Sign up to start renting devices</p>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-black mb-4">Basic Information</h2>
              <p className="text-sm text-gray-600 mb-4">Create your account to get started</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-black mb-1">
                First Name *
              </label>
              <input
                id="first_name"
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-black mb-1">
                Last Name *
              </label>
              <input
                id="last_name"
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

                <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
                Email *
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black mb-1">
                    Password *
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-1">
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                    minLength={6}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Personal Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-black mb-4">Personal Details</h2>
              <p className="text-sm text-gray-600 mb-4">You can complete this later if needed</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="telephone" className="block text-sm font-medium text-black mb-1">
                    Phone Number
              </label>
              <input
                id="telephone"
                type="tel"
                value={formData.telephone}
                onChange={(e) => updateField('telephone', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="id_number" className="block text-sm font-medium text-black mb-1">
                    ID Number
              </label>
              <input
                id="id_number"
                type="text"
                value={formData.id_number}
                onChange={(e) => updateField('id_number', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-black mb-1">
                    Date of Birth
              </label>
              <input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-black mb-1">
                    Address
              </label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-black mb-1">
                City
              </label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-black mb-1">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => updateField('country', e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            </div>
            </div>
          )}

          {/* Step 3: Next of Kin */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-black mb-4">Next of Kin Information</h2>
              <p className="text-sm text-gray-600 mb-4">You can complete this later if needed</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="next_of_kin_first_name" className="block text-sm font-medium text-black mb-1">
                    First Name
                </label>
                <input
                  id="next_of_kin_first_name"
                  type="text"
                  value={formData.next_of_kin_first_name}
                  onChange={(e) => updateField('next_of_kin_first_name', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label htmlFor="next_of_kin_last_name" className="block text-sm font-medium text-black mb-1">
                    Last Name
                </label>
                <input
                  id="next_of_kin_last_name"
                  type="text"
                  value={formData.next_of_kin_last_name}
                  onChange={(e) => updateField('next_of_kin_last_name', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="next_of_kin_phone_number" className="block text-sm font-medium text-black mb-1">
                    Phone Number
                </label>
                <input
                  id="next_of_kin_phone_number"
                  type="tel"
                  value={formData.next_of_kin_phone_number}
                  onChange={(e) => updateField('next_of_kin_phone_number', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-4">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={handleBack}
                variant="outline"
                className="flex-1 border-black text-black hover:bg-gray-100"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {currentStep < totalSteps ? (
              <>
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-black text-white hover:bg-gray-800"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  type="button"
                  onClick={handleSkip}
                  variant="outline"
                  className="border-black text-black hover:bg-gray-100"
                >
                  Skip
                </Button>
              </>
            ) : (
          <Button
            type="submit"
            disabled={loading}
                className="flex-1 bg-black text-white hover:bg-gray-800"
          >
            {loading ? (
              'Creating account...'
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </>
            )}
          </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

