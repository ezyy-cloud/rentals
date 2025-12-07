interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({ className = '', variant = 'rectangular', width, height, lines }: SkeletonProps) {
  const baseClasses = 'bg-gray-200 rounded relative overflow-hidden skeleton-shimmer'
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: '',
  }

  if (variant === 'text' && lines && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]} mb-2`}
            style={{
              width: i === lines - 1 ? '80%' : '100%',
              height: height ?? undefined,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        width: width ?? undefined,
        height: height ?? undefined,
      }}
    />
  )
}

export function DeviceCardSkeleton() {
  return (
    <div className="border-2 border-black rounded-lg overflow-hidden">
      <Skeleton variant="rectangular" height="288px" className="w-full" />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" width="60%" height="24px" />
        <Skeleton variant="text" width="40%" height="16px" />
        <Skeleton variant="text" width="50%" height="16px" />
        <div className="flex justify-between items-center pt-4">
          <Skeleton variant="text" width="80px" height="32px" />
          <Skeleton variant="rectangular" width="120px" height="40px" />
        </div>
      </div>
    </div>
  )
}

export function CartItemSkeleton() {
  return (
    <div className="border-2 border-black rounded-lg p-4">
      <div className="flex gap-4">
        <Skeleton variant="rectangular" width="120px" height="120px" />
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" width="60%" height="24px" />
          <Skeleton variant="text" width="40%" height="16px" />
          <div className="flex gap-2">
            <Skeleton variant="rectangular" width="100px" height="36px" />
            <Skeleton variant="rectangular" width="100px" height="36px" />
          </div>
        </div>
        <Skeleton variant="rectangular" width="80px" height="80px" />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton variant="rectangular" width="200px" height="36px" className="mb-2" />
          <Skeleton variant="rectangular" width="300px" height="20px" />
        </div>
        <Skeleton variant="rectangular" width="140px" height="40px" />
      </div>

      <div className="border-2 border-black rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton variant="circular" width="64px" height="64px" />
          <div className="space-y-2">
            <Skeleton variant="rectangular" width="200px" height="24px" />
            <Skeleton variant="rectangular" width="180px" height="20px" />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <Skeleton variant="rectangular" width="180px" height="24px" className="mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Skeleton variant="rectangular" width="100px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div>
                <Skeleton variant="rectangular" width="100px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div>
                <Skeleton variant="rectangular" width="120px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div>
                <Skeleton variant="rectangular" width="100px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div>
                <Skeleton variant="rectangular" width="120px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div className="sm:col-span-2">
                <Skeleton variant="rectangular" width="80px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div>
                <Skeleton variant="rectangular" width="60px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div>
                <Skeleton variant="rectangular" width="80px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black pt-6">
            <Skeleton variant="rectangular" width="200px" height="24px" className="mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Skeleton variant="rectangular" width="100px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div>
                <Skeleton variant="rectangular" width="100px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
              <div className="sm:col-span-2">
                <Skeleton variant="rectangular" width="120px" height="16px" className="mb-1" />
                <Skeleton variant="rectangular" width="100%" height="20px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MyRentalsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton variant="rectangular" width="200px" height="36px" className="mb-2" />
        <Skeleton variant="rectangular" width="300px" height="20px" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-2 border-black rounded-lg p-4">
            <Skeleton variant="rectangular" width="80px" height="16px" className="mb-2" />
            <Skeleton variant="rectangular" width="100%" height="32px" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-2 border-black rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton variant="rectangular" width="120px" height="120px" className="sm:w-32 sm:h-32" />
              <div className="flex-1 space-y-3">
                <Skeleton variant="rectangular" width="60%" height="24px" />
                <Skeleton variant="rectangular" width="40%" height="20px" />
                <Skeleton variant="rectangular" width="50%" height="20px" />
                <div className="flex gap-2">
                  <Skeleton variant="rectangular" width="100px" height="32px" />
                  <Skeleton variant="rectangular" width="100px" height="32px" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton variant="rectangular" width="200px" height="36px" className="mb-2" />
          <Skeleton variant="rectangular" width="250px" height="20px" />
        </div>
        <Skeleton variant="rectangular" width="120px" height="40px" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-2 border-black rounded-lg p-4">
            <div className="flex items-start gap-4">
              <Skeleton variant="circular" width="40px" height="40px" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="rectangular" width="60%" height="20px" />
                <Skeleton variant="rectangular" width="100%" height="16px" />
                <Skeleton variant="rectangular" width="40%" height="14px" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

