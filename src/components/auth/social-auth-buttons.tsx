import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Icons } from '@/components/ui/icons'

async function signInWithSocial(provider: 'google' | 'github' | 'discord') {
  await authClient.signIn.social({ provider, callbackURL: '/' })
}

interface SocialAuthButtonsProps {
  action?: 'Sign in' | 'Sign up'
}

export function SocialAuthButtons({ action = 'Sign in' }: SocialAuthButtonsProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          aria-label={`${action} with GitHub`}
          onClick={() => signInWithSocial('github')}
        >
          <Icons.GitHub className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label={`${action} with Google`}
          onClick={() => signInWithSocial('google')}
        >
          <Icons.Google className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label={`${action} with Discord`}
          onClick={() => signInWithSocial('discord')}
        >
          <Icons.Discord className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
    </>
  )
}
