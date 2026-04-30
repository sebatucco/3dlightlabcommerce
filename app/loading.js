import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5efe3]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#143047]" />
        <p className="text-sm font-medium text-[#4e6475]">Cargando...</p>
      </div>
    </div>
  )
}
