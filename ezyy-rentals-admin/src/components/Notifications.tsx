import { useState, useEffect, useRef } from 'react'
import { notificationsService } from '@/lib/notifications-service'
import type { Notification } from '@/lib/supabase-types'
import { Bell, X, Check } from 'lucide-react'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  // Subscribe to real-time updates for notifications
  useRealtimeSubscription({
    table: 'notifications',
    event: '*',
    onInsert: (payload) => {
      const newNotification = payload.new as Notification
      // Only add if it's unread (since we're showing unread notifications)
      if (!newNotification.is_read) {
        setNotifications((prev) => [newNotification, ...prev])
        setUnreadCount((prev) => prev + 1)
      }
    },
    onUpdate: (payload) => {
      const updatedNotification = payload.new as Notification
      // If notification was marked as read, remove it from the list
      if (updatedNotification.is_read) {
        setNotifications((prev) => prev.filter((n) => n.id !== updatedNotification.id))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } else {
        // Update the notification in the list
        setNotifications((prev) =>
          prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
        )
      }
    },
    onDelete: (payload) => {
      const deletedNotification = payload.old as Notification
      setNotifications((prev) => prev.filter((n) => n.id !== deletedNotification.id))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
  })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const loadNotifications = async () => {
    setLoading(true)
    const { data } = await notificationsService.getUnreadNotifications()
    if (data) setNotifications(data)
    setLoading(false)
  }

  const loadUnreadCount = async () => {
    const { count } = await notificationsService.getUnreadCount()
    setUnreadCount(count)
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationsService.markAsRead(notificationId)
    // Real-time update will handle the UI update automatically
    // But we still need to refresh to ensure consistency
    loadNotifications()
    loadUnreadCount()
  }

  const handleMarkAllAsRead = async () => {
    await notificationsService.markAllAsRead()
    // Real-time updates will handle the UI updates automatically
    // But we still need to refresh to ensure consistency
    loadNotifications()
    loadUnreadCount()
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'subscription_due':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'rental_due':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'rental_overdue':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'rental_pending_shipment':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-black" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-white border-2 border-black rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-4 border-b-2 border-black">
            <h3 className="font-bold text-black">Notifications</h3>
            <div className="flex gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-black hover:text-gray-600 flex items-center gap-1"
                  title="Mark all as read"
                >
                  <Check className="w-4 h-4" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-black hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification.type)} hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-black">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-gray-500 hover:text-black"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

