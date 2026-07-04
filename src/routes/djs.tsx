import { createFileRoute } from '@tanstack/react-router'

const DjsComponent = () => {
  return <div>Hello "/djs"!</div>
}

export const Route = createFileRoute('/djs')({
  component: DjsComponent,
})

