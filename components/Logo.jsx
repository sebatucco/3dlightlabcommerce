export default function Logo({ compact = false }) {
  return (
    <div className="group flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-elevated))] shadow-sm">
        <span className="font-display text-sm tracking-[0.16em] text-[hsl(var(--foreground))]">
          3D
        </span>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,214,153,0.22),transparent_60%)]" />
      </div>

      <div className="flex flex-col leading-none">
        <span className="font-display text-lg tracking-[0.12em] text-[hsl(var(--foreground))] sm:text-xl">
          3DLightLab
        </span>
        {!compact && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
            Commerce
          </span>
        )}
      </div>
    </div>
  )
}