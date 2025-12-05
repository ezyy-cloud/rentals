import type { Device } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ShoppingCart } from 'lucide-react'

interface DeviceCardProps {
  device: Device
  onAddToCart: (device: Device) => void
}

export function DeviceCard({ device, onAddToCart }: DeviceCardProps) {
  const deviceType = device.device_type

  return (
    <Card className="flex flex-col">
      <div className="flex-1">
        <h3 className="text-lg font-bold text-black mb-2">{device.name}</h3>
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Type:</span> {deviceType?.name ?? 'N/A'}
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Model:</span> {deviceType?.model ?? 'N/A'}
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Condition:</span> {device.condition}
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">State:</span> {device.working_state}
        </p>
        {device.scratches && (
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Notes:</span> {device.scratches}
          </p>
        )}
      </div>
      <div className="border-t-2 border-black pt-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Rate:</span> ${deviceType?.rental_rate.toFixed(2) ?? '0.00'}/day
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Deposit:</span> ${deviceType?.deposit.toFixed(2) ?? '0.00'}
            </p>
          </div>
        </div>
        <Button
          onClick={() => onAddToCart(device)}
          className="w-full bg-black text-white hover:bg-gray-800"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </Card>
  )
}

