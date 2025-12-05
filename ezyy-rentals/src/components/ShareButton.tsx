import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'

interface ShareButtonProps {
  url?: string
  title?: string
  text?: string
  className?: string
}

export function ShareButton({ url, title, text, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const { showSuccess } = useToast()

  const shareUrl = url ?? window.location.href
  const shareTitle = title ?? 'Check out this device on Ezyy Rentals'
  const shareText = text ?? shareTitle

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        showSuccess('Shared successfully!')
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard()
        }
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      showSuccess('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      showSuccess('Unable to copy link')
    }
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      className={`border-black text-black hover:bg-gray-100 ${className}`}
      aria-label="Share"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </>
      )}
    </Button>
  )
}

