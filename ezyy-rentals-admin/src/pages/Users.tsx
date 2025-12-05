import { useState, useEffect, useMemo } from 'react'
import { usersService } from '@/lib/supabase-service'
import type { User } from '@/lib/supabase-types'
import { Button } from '@/components/ui/button'
import { X, Edit, Trash2, Search, ArrowUpDown } from 'lucide-react'
import { TableSkeleton } from '@/components/SkeletonLoader'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useToast } from '@/contexts/ToastContext'

type SortField = 'name' | 'email' | 'created_at'
type SortOrder = 'asc' | 'desc'

export function Users() {
  const { showSuccess, showError, showUndo } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    telephone: '',
    address: '',
    city: '',
    country: '',
    id_number: '',
    email: '',
    date_of_birth: '',
    profile_picture: '',
    next_of_kin_first_name: '',
    next_of_kin_last_name: '',
    next_of_kin_phone_number: '',
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await usersService.getAll()
      if (data) {
        setUsers(data)
      } else if (error) {
        const errorMsg = `Failed to load users: ${error.message}`
        setError(errorMsg)
        showError(errorMsg)
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred while loading users'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        const { error } = await usersService.update(editingUser.id, formData)
        if (error) {
          showError(`Failed to update user: ${error.message}`)
        } else {
          showSuccess('User updated successfully!')
          setShowForm(false)
          setEditingUser(null)
          resetForm()
          loadUsers()
        }
      } else {
        const { error } = await usersService.create(formData)
        if (error) {
          showError(`Failed to create user: ${error.message}`)
        } else {
          showSuccess('User created successfully!')
          setShowForm(false)
          resetForm()
          loadUsers()
        }
      }
    } catch (err) {
      showError('An unexpected error occurred')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      telephone: user.telephone,
      address: user.address,
      city: user.city ?? '',
      country: user.country ?? '',
      id_number: user.id_number,
      email: user.email,
      date_of_birth: user.date_of_birth,
      profile_picture: user.profile_picture ?? '',
      next_of_kin_first_name: user.next_of_kin_first_name,
      next_of_kin_last_name: user.next_of_kin_last_name,
      next_of_kin_phone_number: user.next_of_kin_phone_number,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const user = users.find(u => u.id === id)
    if (user && confirm('Are you sure you want to delete this user?')) {
      try {
        const { error } = await usersService.delete(id)
        if (error) {
          showError(`Failed to delete user: ${error.message}`)
        } else {
          showUndo(`User ${user.first_name} ${user.last_name} deleted.`, () => {
            // Restore user - would need to recreate
            loadUsers()
          })
          loadUsers()
        }
      } catch {
        showError('An unexpected error occurred')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      telephone: '',
      address: '',
      city: '',
      country: '',
      id_number: '',
      email: '',
      date_of_birth: '',
      profile_picture: '',
      next_of_kin_first_name: '',
      next_of_kin_last_name: '',
      next_of_kin_phone_number: '',
    })
    setEditingUser(null)
  }

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.first_name.toLowerCase().includes(searchLower) ||
          user.last_name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.telephone.includes(searchTerm) ||
          user.id_number.includes(searchTerm)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name': {
          const nameA = `${a.first_name} ${a.last_name}`
          const nameB = `${b.first_name} ${b.last_name}`
          comparison = nameA.localeCompare(nameB)
          break
        }
        case 'email':
          comparison = a.email.localeCompare(b.email)
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [users, searchTerm, sortField, sortOrder])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Users</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage user accounts</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto"
        >
          Add User
        </Button>
      </div>

      {error && (
        <ErrorMessage message={error} onRetry={loadUsers} />
      )}

      {/* Search and Filter */}
      <div className="bg-white border-2 border-black rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name, email, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
              aria-label="Search users"
            />
          </div>
          <div className="sm:w-48 relative">
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black appearance-none bg-white"
              aria-label="Sort by"
            >
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="created_at">Sort by Created Date</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
              aria-label={`Sort order: ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              <ArrowUpDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredAndSortedUsers.length} of {users.length} users
          </p>
        )}
      </div>

      {showForm && (
        <div className="bg-white border-2 border-black rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-black">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            <button onClick={() => {
              setShowForm(false)
              resetForm()
            }} className="text-black hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Telephone</label>
                <input
                  type="tel"
                  required
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">ID Number</label>
                <input
                  type="text"
                  required
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-black mb-1">Address</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Profile Picture URL</label>
                <input
                  type="url"
                  value={formData.profile_picture}
                  onChange={(e) => setFormData({ ...formData, profile_picture: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <div className="border-t-2 border-black pt-4 mt-4">
              <h3 className="text-lg font-semibold text-black mb-4">Next of Kin</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.next_of_kin_first_name}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_first_name: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.next_of_kin_last_name}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_last_name: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.next_of_kin_phone_number}
                    onChange={(e) => setFormData({ ...formData, next_of_kin_phone_number: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="border-black text-black hover:bg-gray-100 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-black text-white hover:bg-gray-800 w-full sm:w-auto">
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Telephone</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">ID Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8">
                  <TableSkeleton rows={5} columns={5} />
                </td>
              </tr>
            ) : filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {users.length === 0 ? 'No users found' : 'No users match your search criteria'}
                </td>
              </tr>
            ) : (
              filteredAndSortedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.telephone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.id_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-black" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 hover:bg-gray-200 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
