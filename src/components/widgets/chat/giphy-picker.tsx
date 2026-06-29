import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Icons } from '@/components/icons'

type GiphyGif = {
  id: string
  title: string
  url: string
  previewUrl: string
}

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined

const fetchGifs = async (query: string): Promise<GiphyGif[]> => {
  const base = query
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=24&rating=g`
  const res = await fetch(base)
  const json = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json.data.map((g: any) => ({
    id: g.id,
    title: g.title,
    url: g.images.original.url,
    previewUrl: g.images.fixed_width_small.url,
  }))
}

type Props = {
  onSelect: (gif: { url: string; title: string }) => void
  onClose: () => void
}

export const GiphyPicker = ({ onSelect, onClose }: Props) => {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!GIPHY_KEY) return
    const delay = query ? 400 : 0
    const timer = setTimeout(() => {
      setLoading(true)
      fetchGifs(query).then(setGifs).finally(() => setLoading(false))
    }, delay)
    return () => clearTimeout(timer)
  }, [query])

  if (!GIPHY_KEY) {
    return (
      <div className="rounded-lg border bg-popover p-4 text-sm text-muted-foreground text-center">
        Add <code className="font-mono text-xs bg-muted px-1 rounded">VITE_GIPHY_API_KEY</code> to{' '}
        <code className="font-mono text-xs bg-muted px-1 rounded">.env</code> to enable GIFs
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-popover p-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search GIFs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Close GIF picker"
        >
          <Icons.X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 max-h-72 overflow-y-auto">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => onSelect({ url: gif.url, title: gif.title })}
              className="aspect-square overflow-hidden rounded hover:opacity-80 transition-opacity"
              title={gif.title}
            >
              <img src={gif.previewUrl} alt={gif.title} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
