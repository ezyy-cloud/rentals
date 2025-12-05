import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: (e?: React.MouseEvent) => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  // Check if className contains padding classes
  const hasPadding = /p-\d+|px-\d+|py-\d+|pt-\d+|pb-\d+|pl-\d+|pr-\d+|p-0|px-0|py-0|pt-0|pb-0|pl-0|pr-0/.test(className)
  
  // Only apply default padding if no padding classes are provided
  const defaultPadding = hasPadding ? '' : 'p-4 sm:p-6'
  
  return (
    <div
      className={`bg-white border-2 border-black rounded-lg ${defaultPadding} ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      {children}
    </div>
  )
}

