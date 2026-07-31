import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { stopShow } from '@/server/fns/schedule-fns'

export const PlayoutTab = () => {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const forceDeadAirMutation = useMutation({
    mutationFn: () => stopShow(),
    onSuccess: () => {
      toast.success('Switched to dead air')
      setConfirmOpen(false)
    },
    onError: () => toast.error('Failed to switch to dead air'),
  })

  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div>
          <p className="font-medium text-sm">Force dead air</p>
          <p className="text-xs text-muted-foreground">
            Immediately cuts whatever's currently on air — a scheduled show or live stream — and
            falls back to station rotation. Use this if something needs to come off air right away.
          </p>
        </div>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Icons.Square className="h-3.5 w-3.5" />
              Force dead air
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Force dead air now?</AlertDialogTitle>
              <AlertDialogDescription>
                This immediately stops whatever's currently airing and falls back to station
                rotation. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={forceDeadAirMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={forceDeadAirMutation.isPending}
                onClick={(e) => {
                  e.preventDefault()
                  forceDeadAirMutation.mutate()
                }}
              >
                {forceDeadAirMutation.isPending ? 'Switching…' : 'Force dead air'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
