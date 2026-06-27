import { cn } from "@/lib/utils";

export const Image = ({ src, alt, className, fallback = '/logo.png' }: { src: string; alt: string; className?: string; fallback?: string }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'rounded-md object-cover',
        className,
      )}
      onError={(e) => { e.currentTarget.src = fallback; }}
    />
  )
}