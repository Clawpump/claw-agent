import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getMcpServers = vi.hoisted(() => vi.fn())
const mcpLogin = vi.hoisted(() => vi.fn())

vi.mock('@/hermes', () => ({
  getMcpServers,
  mcpLogin
}))

vi.mock('@/store/updates', () => ({
  openUpdatesWindow: vi.fn()
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

  it('starts the browser OAuth login (not a static gateway URL) for a remote entry', async () => {
    getMcpServers.mockResolvedValue({
      servers: [
        {
          auth: 'oauth',
          authenticated: false,
          enabled: true,
          name: 'clawpump',
          transport: 'http',
          url: 'https://clawpump-mcp-production.up.railway.app/mcp'
        }
      ]
    })
    mcpLogin.mockResolvedValue({ authenticated: true, ok: true })
    const openExternal = vi.fn()
    vi.stubGlobal('hermesDesktop', { openExternal })

    await renderMcpView()

    const button = await screen.findByRole('button', { name: /connect at the gateway/i })
    fireEvent.click(button)

    await waitFor(() => expect(mcpLogin).toHaveBeenCalledWith('clawpump'))
    expect(openExternal).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('tells the user to update when a stale backend 405s the login endpoint', async () => {
    getMcpServers.mockResolvedValue({
      servers: [
        {
          auth: 'oauth',
          authenticated: false,
          enabled: true,
          name: 'clawpump',
          transport: 'http',
          url: 'https://clawpump-mcp-production.up.railway.app/mcp'
        }
      ]
    })
    mcpLogin.mockRejectedValue(
      new Error(`Error invoking remote method 'hermes:api': Error: 405: {"detail":"Method Not Allowed"}`)
    )

    await renderMcpView()

    fireEvent.click(await screen.findByRole('button', { name: /connect at the gateway/i }))

    expect(await screen.findByText(/backend is out of date/i)).toBeTruthy()
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

  it('reveals the ClawPump feature groups when "What can it do?" is clicked', async () => {
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

    // Collapsed by default.
    expect(screen.queryByText('Token launch')).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: /what can it do/i }))
    expect(await screen.findByText('Token launch')).toBeTruthy()
    expect(screen.getByText('Agent mail')).toBeTruthy()
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
