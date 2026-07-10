import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'

const signInWithSocial = async (provider: 'google' | 'github') => {
  await authClient.signIn.social({ provider, callbackURL: '/' })
}

interface SocialAuthButtonsProps {
  action?: 'Sign in' | 'Sign up'
}

export const SocialAuthButtons = ({ action = 'Sign in' }: SocialAuthButtonsProps) => {
  return (
    <div className="grid grid-cols-2 gap-2">
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
    </div>
  )
}
