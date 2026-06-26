import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export const Route = createFileRoute('/sign-up')({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: '/' })
  },
  component: SignUpPage,
})

function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: '/',
    })
    if (error) {
      setError(error.message ?? 'Sign up failed')
      setPending(false)
    } else {
      void navigate({ to: '/' })
    }
  }

  return (
    <div className="flex justify-center py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Join radio-pod today</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pb-6">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/sign-in" className="underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
