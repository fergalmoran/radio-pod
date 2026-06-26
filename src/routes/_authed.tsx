import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/sign-in' })
    }
  },
  component: () => <Outlet />,
})
