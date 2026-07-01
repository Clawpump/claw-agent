import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getMcpServers = vi.hoisted(() => vi.fn())

vi.mock('@/hermes', () => ({
  getMcpServers
}))

async function renderMcpView() {
  const { McpView } = await import('./index')

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return render(
    <QueryClientProvider client={client}>
      <McpView />
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('McpView', () => {
  it('shows a ClawPump API-key connection action for stdio installs that are not authenticated', async () => {
    getMcpServers.mockResolvedValue({
      servers: [
        {
          authenticated: null,
          command: 'npx',
          enabled: true,
          name: 'clawpump-stdio',
          transport: 'stdio'
        }
      ]
    })

    await renderMcpView()

    expect(await screen.findByText('ClawPump MCP')).toBeTruthy()
    expect(screen.getByText('Not connected')).toBeTruthy()
    expect(screen.getByRole('button', { name: /connect with api key/i })).toBeTruthy()
    expect(screen.getByText('claw clawpump setup')).toBeTruthy()
  })

  it('does not show a connect action when ClawPump credentials are present', async () => {
    getMcpServers.mockResolvedValue({
      servers: [
        {
          authenticated: true,
          command: 'npx',
          enabled: true,
          name: 'clawpump-stdio',
          transport: 'stdio'
        }
      ]
    })

    await renderMcpView()

    expect(await screen.findByText('Connected')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /connect with api key/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /connect at the gateway/i })).toBeNull()
  })

  it('recognizes custom clawpump-prefixed server names as the ClawPump MCP', async () => {
    getMcpServers.mockResolvedValue({
      servers: [
        {
          authenticated: false,
          enabled: true,
          name: 'clawpump-agents-local',
          transport: 'http',
          url: 'https://agents.clawpump.tech/mcp'
        }
      ]
    })

    await renderMcpView()

    expect(await screen.findByText('ClawPump MCP')).toBeTruthy()
    expect(screen.getByText('clawpump-agents-local')).toBeTruthy()
    expect(screen.queryByText('Other servers')).toBeNull()
  })

  it('shows disabled ClawPump servers as disabled without auth actions', async () => {
    getMcpServers.mockResolvedValue({
      servers: [
        {
          authenticated: true,
          command: 'npx',
          enabled: false,
          name: 'clawpump-stdio',
          transport: 'stdio'
        }
      ]
    })

    await renderMcpView()

    expect(await screen.findByText('Disabled')).toBeTruthy()
    expect(screen.getByText(/installed but disabled/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /connect/i })).toBeNull()
  })
})
