import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import type { CartItem, DeviceType } from '@/lib/types'

interface CartContextType {
  items: CartItem[]
  savedForLater: CartItem[]
  lastRemovedItem: CartItem | null
  addItem: (deviceTypeId: string, deviceType: DeviceType, quantity: number, startDate: string, endDate: string, accessories?: { accessory_id: string; quantity: number }[]) => void
  removeItem: (deviceTypeId: string) => void
  updateItem: (deviceTypeId: string, updates: Partial<Pick<CartItem, 'start_date' | 'end_date' | 'quantity' | 'accessories'>>) => void
  clearCart: () => void
  getTotalCost: () => number
  getItemCount: () => number
  saveForLater: (deviceTypeId: string) => void
  moveToCart: (deviceTypeId: string) => void
  undoRemove: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'ezyy-rentals-cart'

const SAVED_FOR_LATER_KEY = 'ezyy-rentals-saved-for-later'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [savedForLater, setSavedForLater] = useState<CartItem[]>([])
  const [lastRemovedItem, setLastRemovedItem] = useState<CartItem | null>(null)
  const isInitialLoad = useRef(true)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart)
          // Migrate old cart format if needed
          if (parsed.length > 0 && 'device_id' in parsed[0]) {
            // Old format - clear it
            localStorage.removeItem(CART_STORAGE_KEY)
            setItems([])
          } else if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed)
          }
        } catch (error) {
          console.error('Failed to parse cart from localStorage:', error)
          // Clear corrupted data
          localStorage.removeItem(CART_STORAGE_KEY)
        }
      }

      const saved = localStorage.getItem(SAVED_FOR_LATER_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedForLater(parsed)
          }
        } catch (error) {
          console.error('Failed to parse saved items from localStorage:', error)
          // Clear corrupted data
          localStorage.removeItem(SAVED_FOR_LATER_KEY)
        }
      }
    } catch (error) {
      console.error('Failed to access localStorage:', error)
    } finally {
      // Mark initial load as complete after a short delay to ensure state is set
      setTimeout(() => {
        isInitialLoad.current = false
      }, 100)
    }
  }, [])

  // Save cart to localStorage whenever it changes (but not during initial load)
  useEffect(() => {
    if (isInitialLoad.current) return
    
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  }, [items])

  // Save savedForLater to localStorage whenever it changes (but not during initial load)
  useEffect(() => {
    if (isInitialLoad.current) return
    
    try {
      localStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(savedForLater))
    } catch (error) {
      console.error('Failed to save saved items to localStorage:', error)
    }
  }, [savedForLater])

  const addItem = (deviceTypeId: string, deviceType: DeviceType, quantity: number, startDate: string, endDate: string, accessories: { accessory_id: string; quantity: number }[] = []) => {
    setItems((prev) => {
      // Check if device type is already in cart with same dates
      const existingIndex = prev.findIndex(
        (item) => item.device_type_id === deviceTypeId && 
                  item.start_date === startDate && 
                  item.end_date === endDate
      )
      
      if (existingIndex >= 0) {
        // Merge quantities for same device type and dates
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          // Merge accessories (add quantities for same accessories)
          accessories: [...(updated[existingIndex].accessories || []), ...accessories].reduce((acc, accItem) => {
            const existing = acc.find(a => a.accessory_id === accItem.accessory_id)
            if (existing) {
              existing.quantity += accItem.quantity
            } else {
              acc.push(accItem)
            }
            return acc
          }, [] as { accessory_id: string; quantity: number }[]),
        }
        return updated
      } else {
        // Add new item
        return [
          ...prev,
          {
            device_type_id: deviceTypeId,
            device_type: deviceType,
            quantity,
            start_date: startDate,
            end_date: endDate,
            accessories: accessories ?? [],
          },
        ]
      }
    })
  }

  const removeItem = (deviceTypeId: string) => {
    setItems((prev) => {
      const itemToRemove = prev.find((item) => item.device_type_id === deviceTypeId)
      if (itemToRemove) {
        setLastRemovedItem(itemToRemove)
        // Clear undo after 5 seconds
        setTimeout(() => setLastRemovedItem(null), 5000)
      }
      return prev.filter((item) => item.device_type_id !== deviceTypeId)
    })
  }

  const undoRemove = () => {
    if (lastRemovedItem) {
      setItems((prev) => [...prev, lastRemovedItem])
      setLastRemovedItem(null)
    }
  }

  const saveForLater = (deviceTypeId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.device_type_id === deviceTypeId)
      if (item) {
        setSavedForLater((saved) => {
          // Check if item already exists in saved list
          const exists = saved.some((i) => i.device_type_id === deviceTypeId)
          if (exists) {
            return saved // Don't add duplicate
          }
          return [...saved, item]
        })
      }
      return prev.filter((i) => i.device_type_id !== deviceTypeId)
    })
  }

  const moveToCart = (deviceTypeId: string) => {
    setSavedForLater((saved) => {
      const item = saved.find((i) => i.device_type_id === deviceTypeId)
      if (item) {
        setItems((prev) => {
          // Check if item already exists in cart
          const exists = prev.some((i) => i.device_type_id === deviceTypeId)
          if (exists) {
            return prev // Don't add duplicate
          }
          return [...prev, item]
        })
      }
      return saved.filter((i) => i.device_type_id !== deviceTypeId)
    })
  }

  const updateItem = (deviceTypeId: string, updates: Partial<Pick<CartItem, 'start_date' | 'end_date' | 'quantity' | 'accessories'>>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.device_type_id === deviceTypeId ? { ...item, ...updates } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
    localStorage.removeItem(CART_STORAGE_KEY)
  }

  const getTotalCost = () => {
    return items.reduce((total, item) => {
      const deviceType = item.device_type
      if (!deviceType) return total

      const startDate = new Date(item.start_date)
      const endDate = new Date(item.end_date)
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      // Calculate cost per unit
      const deviceRentalCostPerUnit = deviceType.rental_rate * days
      const depositPerUnit = deviceType.deposit

      // Multiply by quantity
      const deviceRentalCost = deviceRentalCostPerUnit * item.quantity
      const deposit = depositPerUnit * item.quantity

      // Calculate accessory costs (rental_rate × days × quantity for each accessory)
      // Note: Accessories need to be loaded with their rental_rate
      // For now, we'll calculate this in the checkout/display components where we have accessory data
      
      return total + deviceRentalCost + deposit
    }, 0)
  }

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const value = {
    items,
    savedForLater,
    lastRemovedItem,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    getTotalCost,
    getItemCount,
    saveForLater,
    moveToCart,
    undoRemove,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

