import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, RotateCcw } from 'lucide-react'
import { useToast, type Toast } from '@/contexts/ToastContext'
import { Button } from './ui/button'

interface ToastWithUndo extends Toast {
  onUndo?: () => void
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast as ToastWithUndo} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: ToastWithUndo; onClose: () => void }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.duration, onClose])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-500'
      case 'error':
        return 'bg-red-50 border-red-500'
      case 'warning':
        return 'bg-yellow-50 border-yellow-500'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-500'
    }
  }

  return (
    <div
      className={`${getBgColor()} border-2 rounded-lg p-4 shadow-lg animate-fade-in flex items-start gap-3`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black">{toast.message}</p>
        {toast.onUndo && (
          <Button
            onClick={() => {
              toast.onUndo?.()
              onClose()
            }}
            variant="outline"
            size="sm"
            className="mt-2 border-black text-black hover:bg-gray-100 text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Undo
          </Button>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-black" />
      </button>
    </div>
  )
}

