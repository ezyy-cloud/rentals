import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Shield, Clock, Star } from 'lucide-react'

export function HeroSection() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBrowseDevices = () => {
    if (location.pathname === '/') {
      // If already on home page, scroll to devices section
      const devicesSection = document.getElementById('devices-section')
      if (devicesSection) {
        devicesSection.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // Navigate to home page
      navigate('/')
      // Wait for navigation, then scroll
      setTimeout(() => {
        const devicesSection = document.getElementById('devices-section')
        if (devicesSection) {
          devicesSection.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }

  return (
    <div className="bg-gradient-to-br from-black to-gray-900 text-white py-16 sm:py-24 rounded-lg mb-8">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
          Rent Premium Devices
          <br />
          <span className="text-gray-300">Without the Commitment</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Access the latest technology on your terms. Flexible rentals, transparent pricing, and hassle-free returns.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={handleBrowseDevices}
            className="!bg-white !text-black hover:!bg-gray-100 text-lg px-8 py-3 rounded font-medium transition-colors flex items-center justify-center"
          >
            Browse Devices
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <Link
            to="/signup"
            className="border-2 border-white text-white hover:bg-white hover:text-black text-lg px-8 py-3 rounded font-medium transition-colors flex items-center justify-center"
          >
            Get Started
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 pt-12 border-t border-gray-700">
          <div className="flex flex-col items-center">
            <Shield className="w-8 h-8 mb-2 text-gray-300" />
            <h3 className="font-semibold mb-1">Secure & Safe</h3>
            <p className="text-sm text-gray-400">Fully insured devices</p>
          </div>
          <div className="flex flex-col items-center">
            <Clock className="w-8 h-8 mb-2 text-gray-300" />
            <h3 className="font-semibold mb-1">Flexible Terms</h3>
            <p className="text-sm text-gray-400">Rent for any duration</p>
          </div>
          <div className="flex flex-col items-center">
            <Star className="w-8 h-8 mb-2 text-gray-300" />
            <h3 className="font-semibold mb-1">Premium Quality</h3>
            <p className="text-sm text-gray-400">Top-tier devices only</p>
          </div>
        </div>
      </div>
    </div>
  )
}

