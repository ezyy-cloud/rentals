import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationsService } from '@/lib/services'
import type { Notification } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/SkeletonLoader'
import { Bell, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export function Notifications() {
  const { appUser } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (appUser) {
      loadNotifications()
    }
  }, [appUser])

  const loadNotifications = async () => {
    if (!appUser) return

    setLoading(true)
    const { data, error } = await notificationsService.getUserNotifications(appUser.id)
    if (data) setNotifications(data)
    if (error) console.error('Error loading notifications:', error)
    setLoading(false)
  }

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await notificationsService.markAsRead(notificationId)
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!appUser) return
    const { error } = await notificationsService.markAllAsRead(appUser.id)
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'rental_due':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'rental_overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'subscription_due':
        return <Bell className="w-5 h-5 text-yellow-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'rental_due':
        return 'border-blue-500 bg-blue-50'
      case 'rental_overdue':
        return 'border-red-500 bg-red-50'
      case 'subscription_due':
        return 'border-yellow-500 bg-yellow-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') {
      return !notification.is_read
    }
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (!appUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">You must be logged in to view notifications</p>
        <Button onClick={() => window.location.reload()} className="bg-black text-white hover:bg-gray-800">
          Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            className="border-black text-black hover:bg-gray-100"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-black text-white' : 'border-black text-black'}
        >
          All
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          onClick={() => setFilter('unread')}
          className={filter === 'unread' ? 'bg-black text-white' : 'border-black text-black'}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="p-4 space-y-2">
                <Skeleton variant="text" width="30%" height="20px" />
                <Skeleton variant="text" width="80%" height="16px" />
                <Skeleton variant="text" width="40%" height="14px" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black mb-2">No notifications</h2>
          <p className="text-gray-600">
            {filter === 'all'
              ? "You don't have any notifications yet"
              : 'You have no unread notifications'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${getNotificationColor(notification.type)} ${
                !notification.is_read ? 'border-2' : 'border'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-black capitalize">
                        {notification.type.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                    {!notification.is_read && (
                      <span className="ml-4 bg-black text-white text-xs font-bold px-2 py-1 rounded">
                        New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                    {!notification.is_read && (
                      <Button
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs border-black text-black hover:bg-gray-100"
                      >
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

