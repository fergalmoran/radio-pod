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

const SignUpPage = () => {
  const settings = useSiteSettings();

  return (
    <div className="flex justify-center py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Join {settings.name} today</CardDescription>
        </CardHeader>
        <CardContent>
          <SocialAuthButtons action="Sign up" />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/sign-in" className="underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/sign-up')({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: '/' })
  },
  component: SignUpPage,
})
