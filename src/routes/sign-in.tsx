import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons'
import { useSiteSettings } from '@/lib/use-site-settings'

const SignInPage = () => {
  const settings = useSiteSettings();

  return (
    <div className="flex justify-center py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back to {settings.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialAuthButtons action="Sign in" />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-6">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to="/sign-up" className="underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/sign-in')({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: '/' })
  },
  component: SignInPage,
})
