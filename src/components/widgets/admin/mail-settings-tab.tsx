import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mailSettingsQueryOptions } from '@/lib/queries/admin'
import { saveMailSettings, testMailSettings, verifyMailSettings } from '@/server/fns/admin-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const schema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535),
  username: z.string(),
  password: z.string(),
  fromAddress: z.email('Invalid email address'),
  fromName: z.string(),
  secure: z.boolean(),
})

type FormValues = z.infer<typeof schema>

type AsyncStatus = 'idle' | 'pending' | 'ok' | 'error'

export function MailSettingsTab() {
  const { data: settings } = useSuspenseQuery(mailSettingsQueryOptions)
  const queryClient = useQueryClient()

  const [testOpen, setTestOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testStatus, setTestStatus] = useState<AsyncStatus>('idle')
  const [testError, setTestError] = useState('')

  const [verifyStatus, setVerifyStatus] = useState<AsyncStatus>('idle')
  const [verifyError, setVerifyError] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      host: settings?.host ?? '',
      port: settings?.port ?? 587,
      username: settings?.username ?? '',
      password: settings?.password ?? '',
      fromAddress: settings?.fromAddress ?? '',
      fromName: settings?.fromName ?? '',
      secure: settings?.secure ?? false,
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: FormValues) => saveMailSettings({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'mail-settings'] }),
  })

  async function handleVerify() {
    setVerifyStatus('pending')
    setVerifyError('')
    try {
      await verifyMailSettings()
      setVerifyStatus('ok')
    } catch (err) {
      setVerifyStatus('error')
      setVerifyError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  async function handleTest() {
    setTestStatus('pending')
    setTestError('')
    try {
      await testMailSettings({ data: { to: testEmail } })
      setTestStatus('ok')
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <form
        onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}
        className="space-y-4"
      >
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="host">SMTP Host</Label>
            <Input id="host" placeholder="smtp.example.com" {...form.register('host')} />
            {form.formState.errors.host && (
              <p className="text-xs text-destructive">{form.formState.errors.host.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="port">Port</Label>
            <Input id="port" type="number" placeholder="587" {...form.register('port', { valueAsNumber: true })} />
            {form.formState.errors.port && (
              <p className="text-xs text-destructive">{form.formState.errors.port.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="off" {...form.register('username')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fromAddress">From Address</Label>
            <Input id="fromAddress" type="email" placeholder="no-reply@example.com" {...form.register('fromAddress')} />
            {form.formState.errors.fromAddress && (
              <p className="text-xs text-destructive">{form.formState.errors.fromAddress.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fromName">From Name</Label>
            <Input id="fromName" placeholder="Radio Pod" {...form.register('fromName')} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="secure"
            checked={form.watch('secure')}
            onCheckedChange={(v) => form.setValue('secure', v)}
          />
          <Label htmlFor="secure">Use direct SSL/TLS (SMTPS — enable for port 465 or servers that wrap TLS from the start)</Label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={verifyStatus === 'pending'}
            onClick={handleVerify}
          >
            {verifyStatus === 'pending' ? 'Connecting…' : 'Test connection'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setTestOpen(true); setTestStatus('idle'); setTestEmail('') }}
          >
            Send test email
          </Button>
        </div>

        <div className="space-y-1">
          {saveMutation.isSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">Settings saved.</p>
          )}
          {saveMutation.isError && (
            <p className="text-sm text-destructive">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save'}
            </p>
          )}
          {verifyStatus === 'ok' && (
            <p className="text-sm text-green-600 dark:text-green-400">Connection successful.</p>
          )}
          {verifyStatus === 'error' && (
            <p className="text-sm text-destructive">{verifyError}</p>
          )}
        </div>
      </form>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send test email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="testEmail">Recipient</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            {testStatus === 'ok' && (
              <p className="text-sm text-green-600 dark:text-green-400">Test email sent successfully.</p>
            )}
            {testStatus === 'error' && (
              <p className="text-sm text-destructive">{testError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button
              onClick={handleTest}
              disabled={!testEmail || testStatus === 'pending'}
            >
              {testStatus === 'pending' ? 'Sending…' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
