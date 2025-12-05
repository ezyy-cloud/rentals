import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

export function CartIcon() {
  const { items } = useCart()
  const itemCount = items.length

  return (
    <div className="relative">
      <ShoppingCart className="w-6 h-6 text-black" />
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </div>
  )
}

