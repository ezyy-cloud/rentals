import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeSubscriptionOptions {
  table: string
  event?: EventType
  filter?: string
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void
  enabled?: boolean
}

/**
 * Custom hook for subscribing to Supabase real-time changes
 * 
 * @param options Configuration options for the subscription
 * @returns void - Updates are handled via callbacks
 * 
 * @example
 * useRealtimeSubscription({
 *   table: 'notifications',
 *   event: '*',
 *   onInsert: (payload) => {
 *     setNotifications(prev => [payload.new, ...prev])
 *   },
 *   onUpdate: (payload) => {
 *     setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
 *   },
 *   onDelete: (payload) => {
 *     setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
 *   }
 * })
 */
export function useRealtimeSubscription({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Create a unique channel name for this subscription
    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: event === '*' ? '*' : (event as 'INSERT' | 'UPDATE' | 'DELETE'),
          schema: 'public',
          table,
          filter: filter as string | undefined,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            if (payload.eventType === 'INSERT' && onInsert) {
              onInsert(payload)
            } else if (payload.eventType === 'UPDATE' && onUpdate) {
              onUpdate(payload)
            } else if (payload.eventType === 'DELETE' && onDelete) {
              onDelete(payload)
            }
          } catch (error) {
            console.error(`Error handling real-time event for ${table}:`, error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to real-time updates for ${table}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to real-time updates for ${table}`)
        }
      })

    channelRef.current = channel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, event, filter, enabled, onInsert, onUpdate, onDelete])

  return channelRef.current
}

