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

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={colIndex === 0 ? '20%' : colIndex === columns - 1 ? '15%' : '25%'}
              height="40px"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="border-2 border-black rounded-lg p-4 sm:p-6">
      <Skeleton variant="text" width="40%" height="24px" className="mb-4" />
      <Skeleton variant="text" width="60%" height="16px" className="mb-2" />
      <Skeleton variant="text" width="80%" height="16px" />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border-2 border-black p-4 sm:p-6 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <Skeleton variant="text" width="120px" height="16px" />
        <Skeleton variant="circular" width="20px" height="20px" />
      </div>
      <Skeleton variant="text" width="60px" height="32px" className="mb-1" />
      <Skeleton variant="text" width="100px" height="12px" />
    </div>
  )
}

