interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({ className = '', variant = 'rectangular', width, height, lines }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'
  
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

