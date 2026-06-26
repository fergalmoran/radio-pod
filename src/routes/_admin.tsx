import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/sign-in' })
    }
    const role = (context.session.user as { role?: string }).role
    if (role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: () => <Outlet />,
})
