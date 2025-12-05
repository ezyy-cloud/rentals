import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'outline'
  className?: string
}

export function Button({ children, variant = 'default', className = '', ...props }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
  
  const variantClasses = {
    default: 'bg-black text-white hover:bg-gray-800',
    outline: 'border-2 border-black text-black hover:bg-gray-100',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
      aria-label={props['aria-label'] ?? (typeof children === 'string' ? children : undefined)}
    >
      {children}
    </button>
  )
}

