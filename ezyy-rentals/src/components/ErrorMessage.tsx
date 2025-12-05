import { Button } from '@/components/ui/Button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
  return (
    <div className={`bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="mt-3 border-red-500 text-red-700 hover:bg-red-100"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

