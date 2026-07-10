import { useEffect, useState } from 'react'
import { Icons } from '@/components/icons'

export const LiveClock = () => {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) return null

  return (
    <div className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-muted-foreground tabular-nums">
      <Icons.Clock className="h-4 w-4" />
      {now.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </div>
  )
}
