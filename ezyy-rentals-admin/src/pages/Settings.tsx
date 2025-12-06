import { useState, useEffect } from 'react'
import { settingsService } from '@/lib/settings-service'
import type { SystemSettings } from '@/lib/settings-service'
import { Button } from '@/components/ui/button'
import { useToast } from '@/contexts/ToastContext'

export function Settings() {
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'>>({
    company_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await settingsService.getSettings()
      if (error) {
        showError('Failed to load settings')
        console.error('Error loading settings:', error)
      } else if (data) {
        setSettings({
          company_name: data.company_name ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          website: data.website ?? '',
          address: data.address ?? '',
        })
      }
    } catch (err) {
      showError('An unexpected error occurred while loading settings')
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Validate website format
      let websiteValue = settings.website.trim()
      if (websiteValue && !websiteValue.startsWith('http://') && !websiteValue.startsWith('https://')) {
        websiteValue = `https://${websiteValue}`
      }

      const { error } = await settingsService.saveSettings({
        ...settings,
        website: websiteValue,
      })

      if (error) {
        showError('Failed to save settings')
        console.error('Error saving settings:', error)
      } else {
        showSuccess('Settings saved successfully!')
      }
    } catch (err) {
      showError('An unexpected error occurred while saving settings')
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof typeof settings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Settings</h1>
          <p className="text-sm sm:text-base text-gray-600">Configure system information</p>
        </div>
        <div className="bg-white border-2 border-black rounded-lg p-6">
          <div className="text-center text-gray-500">Loading settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Configure system information used in rental agreements and documents
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border-2 border-black rounded-lg p-4 sm:p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-4">Company Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Company Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Ezyy Rentals"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="info@ezyyrentals.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={settings.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Website <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="www.ezyyrentals.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter with or without https:// (will be added automatically)
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-black mb-1">Address</label>
                <textarea
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  rows={3}
                  placeholder="Company address (optional)"
                />
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black pt-4">
            <p className="text-sm text-gray-600 mb-4">
              This information will be used in rental agreement PDFs and other documents generated by the system.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

