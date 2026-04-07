'use client'

import { MessageCircle } from 'lucide-react'
import { siteConfig } from '@/lib/site'

export default function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${siteConfig.whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="whatsapp-float"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </a>
  )
}
