import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { siteSettingsQueryOptions } from '@/lib/queries/admin'
import { saveSiteSettings } from '@/server/fns/admin-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSiteSettings } from '@/lib/use-site-settings'

const schema = z.object({
  name: z.string().min(1, 'Station name is required'),
  tagline: z.string(),
  description: z.string(),
  logoUrl: z.string(),
  faviconUrl: z.string(),
  social: z.object({
    twitter: z.string(),
    facebook: z.string(),
    instagram: z.string(),
  }),
})

type FormValues = z.infer<typeof schema>

export function SiteSettingsTab() {
  const { data: settings } = useSuspenseQuery(siteSettingsQueryOptions)
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: settings.name,
      tagline: settings.tagline,
      description: settings.description,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      social: {
        twitter: settings.social.twitter,
        facebook: settings.social.facebook,
        instagram: settings.social.instagram,
      },
    },
  })
  const saveMutation = useMutation({
    mutationFn: (data: FormValues) => saveSiteSettings({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] }),
  })

  return (
    <form
      onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}
      className="max-w-lg space-y-6"
    >
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Station</h3>

        <div className="space-y-1.5">
          <Label htmlFor="name">Station Name</Label>
          <Input id="name" placeholder={settings.name} {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" placeholder="Robot Powered Radio" {...form.register('tagline')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} placeholder="About the station…" {...form.register('description')} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Assets</h3>

        <div className="space-y-1.5">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input id="logoUrl" placeholder="https://…" {...form.register('logoUrl')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="faviconUrl">Favicon URL</Label>
          <Input id="faviconUrl" placeholder="https://…" {...form.register('faviconUrl')} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Social</h3>

        <div className="space-y-1.5">
          <Label htmlFor="twitter">Twitter / X</Label>
          <Input id="twitter" placeholder="@surgefm" {...form.register('social.twitter')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="facebook">Facebook</Label>
          <Input id="facebook" placeholder="surgefm" {...form.register('social.facebook')} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="instagram">Instagram</Label>
          <Input id="instagram" placeholder="surgefm" {...form.register('social.instagram')} />
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save settings'}
        </Button>
        {saveMutation.isSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">Settings saved.</p>
        )}
        {saveMutation.isError && (
          <p className="text-sm text-destructive">
            {saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save'}
          </p>
        )}
      </div>
    </form>
  )
}
