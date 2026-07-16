/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Terminal } from '@xterm/xterm';

const capturedTerminalInstances: any[] = [];

jest.mock('@xterm/xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => {
    const instance = {
      loadAddon: jest.fn(),
      open: jest.fn(),
      write: jest.fn(),
      resize: jest.fn(),
      onData: jest.fn(() => ({ dispose: jest.fn() })),
      dispose: jest.fn(),
      cols: 80,
      rows: 24,
    };
    capturedTerminalInstances.push(instance);
    return instance;
  }),
}));

// Mock ResizeObserver which is not available in jsdom
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// jsdom doesn't implement these; Chakra's Menu calls them when it opens.
window.HTMLElement.prototype.scrollTo = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

const mockUpdateState = jest.fn();
const mockUpdate = jest.fn();
const mockUseCredentials = jest.fn();

const mockUIState = {
  scale: 1,
  zIndex: 0,
  boardDragging: false,
  appDragging: false,
  setAppDragging: jest.fn(),
  incZ: jest.fn(),
  viewport: { position: { x: 0, y: 0 }, size: { width: 1000, height: 1000 } },
  selectedTag: null,
  deltaLocalMove: {},
  setDeltaLocalMove: jest.fn(),
  setSelectedApp: jest.fn(),
  clearSelectedApps: jest.fn(),
  addSelectedApp: jest.fn(),
  removeSelectedApp: jest.fn(),
  selectedAppId: null,
  selectedAppsIds: [],
  lassoMode: false,
  focusedAppId: null,
  subscribe: jest.fn(),
};
const mockUseUIStore = jest.fn((selector: any) => {
  return selector ? selector(mockUIState) : mockUIState;
}) as any;
mockUseUIStore.getState = () => mockUIState;
mockUseUIStore.subscribe = jest.fn();

jest.mock(
  '@sage3/frontend',
  () => ({
    useAppStore: (selector: any) => selector({ updateState: mockUpdateState, update: mockUpdate, bringForward: jest.fn() }),
    useCredentials: mockUseCredentials,
    useUser: jest.fn(() => ({ user: { _id: 'app-1-current-user' } })),
    useUserSettings: () => ({ settings: { uiVisible: true }, toggleShowUI: jest.fn() }),
    useAbility: () => true,
    useUIStore: mockUseUIStore,
    useInsightStore: (selector?: any) => {
      const state = { showInsight: false, insights: [] };
      return selector ? selector(state) : state;
    },
    useHexColor: () => '#fff',
    useCursorBoardPosition: () => ({ x: 0, y: 0 }),
  }),
  { virtual: true }
);

import SSHTerminal from './SSHTerminal';

function buildApp(
  stateOverrides: Partial<{
    host: string;
    port: number;
    credentialId: string;
    ownerId: string;
    controllerId: string;
    connected: boolean;
    sessionName: string;
    shareByDefault: boolean;
    sizeLock: { width: number; height: number } | null;
  }> = {},
  sizeOverride: { width: number; height: number } = { width: 400, height: 300 }
) {
  return {
    _id: 'app-1',
    _createdAt: 0,
    _updatedAt: 0,
    _updatedBy: 'user-1',
    _createdBy: 'user-1',
    data: {
      title: 'SSH Terminal',
      roomId: 'room-1',
      boardId: 'board-1',
      position: { x: 0, y: 0, z: 0 },
      size: { width: sizeOverride.width, height: sizeOverride.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'SSHTerminal',
      state: { host: '', port: 22, credentialId: '', ownerId: '', connected: false, ...stateOverrides },
      raised: false,
      dragging: false,
      pinned: false,
    },
  } as any;
}

describe('SSHTerminal setup form', () => {
  beforeEach(() => {
    mockUseCredentials.mockReturnValue({
      credentials: [{ id: 'cred-1', name: 'my-key', type: 'sshPrivateKey', ownerId: 'u1', createdAt: 1, updatedAt: 1 }],
      loading: false,
      refetch: jest.fn(),
    });
    global.fetch = jest.fn();
  });

  it('shows the setup form when no host is configured yet', () => {
    render(<SSHTerminal.AppComponent {...buildApp()} />);
    expect(screen.getByPlaceholderText(/host/i)).toBeInTheDocument();
  });

  it('lists existing sshPrivateKey credentials in the picker', () => {
    render(<SSHTerminal.AppComponent {...buildApp()} />);
    expect(screen.getByText('my-key')).toBeInTheDocument();
  });

  it('offers the "allow collaborators" and "lock size" options', () => {
    render(<SSHTerminal.AppComponent {...buildApp()} />);
    expect(screen.getByRole('checkbox', { name: /allow collaborators to take control/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /lock size/i })).toBeInTheDocument();
  });

  it('persists shareByDefault when "allow collaborators" is checked on connect', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, credentialId: 'cred-1' }) });
    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('checkbox', { name: /allow collaborators to take control/i }));
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    await waitFor(() => expect(mockUpdateState).toHaveBeenCalledWith('app-1', expect.objectContaining({ shareByDefault: true })));
  });

  it('persists sizeLock (the current board size) when "lock size" is checked on connect', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, credentialId: 'cred-1' }) });
    render(<SSHTerminal.AppComponent {...buildApp()} />); // default board size 400x300
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('checkbox', { name: /lock size/i }));
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    await waitFor(() =>
      expect(mockUpdateState).toHaveBeenCalledWith('app-1', expect.objectContaining({ sizeLock: { width: 400, height: 300 } }))
    );
  });

  it('calls POST /api/integrations/ssh/connect with the picked credential on submit, then persists credentialId and ownerId', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, credentialId: 'cred-1' }) });

    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/integrations/ssh/connect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ appId: 'app-1', host: 'example.com', port: 22, credentialId: 'cred-1' }),
        })
      )
    );
    // Both fields have to land in the app's own persisted state — not just
    // this component's local state — because a later reconnect (after the
    // last viewer leaves and the SSH connection is torn down) reads them
    // from the app's saved state, not from whichever browser triggers it.
    // Missing either one made every reconnect fail with credential_unavailable.
    await waitFor(() =>
      expect(mockUpdateState).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ credentialId: 'cred-1', ownerId: 'app-1-current-user' })
      )
    );
  });

  it('shows a specific error message when the connect call fails with auth_failed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'auth_failed' }) });

    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));

    await waitFor(() => expect(screen.getByText(/authentication failed/i)).toBeInTheDocument());
  });

  it('shows a specific error message when the connect call is refused with host_not_allowed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'host_not_allowed' }) });

    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));

    await waitFor(() => expect(screen.getByText(/not on this server.s allow-list/i)).toBeInTheDocument());
  });

  it('does not show the session picker until "Use an existing session" is checked', () => {
    render(<SSHTerminal.AppComponent {...buildApp()} />);
    expect(screen.queryByRole('button', { name: /fetch/i })).not.toBeInTheDocument();
  });

  it('fetches sessions and populates the dropdown when Fetch is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: ['main', 'work'] }) });

    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('checkbox', { name: /use an existing session/i }));
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/integrations/ssh/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ host: 'example.com', port: 22, credentialId: 'cred-1' }),
        })
      )
    );

    await waitFor(() => expect(screen.getByRole('option', { name: 'work' })).toBeInTheDocument());
  });

  it('selects a fetched session and includes sessionName in the connect POST and persisted state', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: ['main', 'work'] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, credentialId: 'cred-1' }) });

    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('checkbox', { name: /use an existing session/i }));
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));

    await waitFor(() => expect(screen.getByRole('option', { name: 'work' })).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'work' } });
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/integrations/ssh/connect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ appId: 'app-1', host: 'example.com', port: 22, credentialId: 'cred-1', sessionName: 'work' }),
        })
      )
    );

    await waitFor(() =>
      expect(mockUpdateState).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ credentialId: 'cred-1', ownerId: 'app-1-current-user', sessionName: 'work' })
      )
    );
  });

  it('allows typing a session name manually instead of fetching', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, credentialId: 'cred-1' }) });

    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('checkbox', { name: /use an existing session/i }));
    fireEvent.change(screen.getByPlaceholderText(/type a session name/i), { target: { value: 'manual-session' } });
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/integrations/ssh/connect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            appId: 'app-1',
            host: 'example.com',
            port: 22,
            credentialId: 'cred-1',
            sessionName: 'manual-session',
          }),
        })
      )
    );
  });

  it('disables Connect in external-session mode until a session name is provided', () => {
    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('checkbox', { name: /use an existing session/i }));

    expect(screen.getByRole('button', { name: /connect/i })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/type a session name/i), { target: { value: 'manual-session' } });
    expect(screen.getByRole('button', { name: /connect/i })).not.toBeDisabled();
  });

  it('shows a friendly message when fetching sessions fails with session_not_found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'session_not_found' }) });

    render(<SSHTerminal.AppComponent {...buildApp()} />);
    fireEvent.change(screen.getByPlaceholderText(/host/i), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('my-key'));
    fireEvent.click(screen.getByRole('checkbox', { name: /use an existing session/i }));
    fireEvent.click(screen.getByRole('button', { name: /fetch/i }));

    await waitFor(() => expect(screen.getByText(/no longer exists/i)).toBeInTheDocument());
  });
});

describe('SSHTerminal terminal view', () => {
  let sentMessages: string[];
  let wsInstances: MockWebSocket[];

  class MockWebSocket {
    static OPEN = 1;
    public readyState = 1;
    public onmessage: ((event: { data: string }) => void) | null = null;
    public onopen: (() => void) | null = null;
    public onclose: (() => void) | null = null;
    constructor(public url: string) {
      wsInstances.push(this);
    }
    send(data: string) {
      sentMessages.push(data);
    }
    close() {
      this.onclose?.();
    }
  }

  beforeEach(() => {
    sentMessages = [];
    wsInstances = [];
    capturedTerminalInstances.length = 0;
    mockUpdate.mockClear();
    mockUpdateState.mockClear();
    (global as any).WebSocket = MockWebSocket;
  });

  it('opens a WebSocket to /ssh with the appId once connected', () => {
    render(<SSHTerminal.AppComponent {...buildApp({ host: 'example.com', port: 22, credentialId: 'cred-1', connected: true })} />);
    expect(wsInstances).toHaveLength(1);
    expect(wsInstances[0].url).toContain('/ssh?appId=app-1');
  });

  it('sends an input message when the owner types (private mode, the default)', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    );
    const terminalInstance = capturedTerminalInstances[0];
    const onDataCallback = terminalInstance.onData.mock.calls[0][0];
    onDataCallback('ls\n');

    const inputMessages = sentMessages.filter((m) => JSON.parse(m).type === 'input');
    expect(inputMessages).toEqual([JSON.stringify({ type: 'input', data: 'ls\n' })]);
  });

  it('does not send an input message when a non-owner "types" in private mode', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'someone-else', controllerId: 'app-1-current-user' })} />
    );
    const terminalInstance = capturedTerminalInstances[0];
    const onDataCallback = terminalInstance.onData.mock.calls[0][0];
    onDataCallback('rm -rf /\n');

    expect(sentMessages.filter((m) => JSON.parse(m).type === 'input')).toHaveLength(0);
  });

  it('shows a "Take control" button to a non-controller once control is shared', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'someone-else', controllerId: 'someone-else' })} />
    );
    act(() => wsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'sharedControl', shared: true }) }));
    expect(screen.getByRole('button', { name: /take control/i })).toBeInTheDocument();
  });

  it('does not show "Take control" to the owner (who already controls in private mode)', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    );
    expect(screen.queryByRole('button', { name: /take control/i })).not.toBeInTheDocument();
  });

  it('shows a read-only badge for a non-controller viewer of an external (attached) session', () => {
    render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, sessionName: 'shared', controllerId: 'someone-else' })}
      />
    );
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/mirroring shared/i)).toBeInTheDocument();
  });

  it('does not show the read-only badge for an own session (no sessionName)', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, controllerId: 'someone-else' })} />
    );
    expect(screen.queryByText(/read-only/i)).not.toBeInTheDocument();
  });

  it('shows the read-only badge and "Take control" button to the owner on a freshly-mounted external session (backend always re-attaches read-only)', () => {
    render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, sessionName: 'shared', ownerId: 'app-1-current-user' })}
      />
    );
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /take control/i })).toBeInTheDocument();
  });

  it('sends setWritable:true only once control is persisted (not optimistically on click) when taking control of a shared external session', () => {
    const { rerender } = render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, sessionName: 'shared', controllerId: 'someone-else' })}
      />
    );
    // In shared mode a non-owner take-control holder drives (writeEligible keys
    // off the persisted controllerId, so the echo-race this test guards applies).
    act(() => wsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'sharedControl', shared: true }) }));
    fireEvent.click(screen.getByRole('button', { name: /take control/i }));

    expect(mockUpdateState).toHaveBeenCalledWith('app-1', { controllerId: 'app-1-current-user' });
    // The click alone must NOT send setWritable — mockUpdateState is just a
    // mock and doesn't echo the persisted controllerId back into props, so
    // sending here would race the relay's Redis read of controllerId (the
    // bug this fix addresses).
    expect(sentMessages.filter((m) => JSON.parse(m).type === 'setWritable')).toHaveLength(0);

    // Simulate the persisted echo: the server has written controllerId to
    // Redis and broadcast the updated app state back down.
    rerender(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, sessionName: 'shared', controllerId: 'app-1-current-user' })}
      />
    );

    const setWritableMessages = sentMessages.filter((m) => JSON.parse(m).type === 'setWritable');
    expect(setWritableMessages).toEqual([JSON.stringify({ type: 'setWritable', writable: true })]);
  });

  it('the owner clicking "Take control" on a freshly-mounted external session hides the badge/button, sends setWritable:true, and updates controllerId', () => {
    render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, sessionName: 'shared', ownerId: 'app-1-current-user' })}
      />
    );
    // Fresh mount: still shown as read-only until control is re-asserted this attach.
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /take control/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /take control/i }));

    expect(mockUpdateState).toHaveBeenCalledWith('app-1', { controllerId: 'app-1-current-user' });
    const setWritableMessages = sentMessages.filter((m) => JSON.parse(m).type === 'setWritable');
    expect(setWritableMessages).toEqual([JSON.stringify({ type: 'setWritable', writable: true })]);
    expect(screen.queryByText(/read-only/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /take control/i })).not.toBeInTheDocument();
  });

  it('external session: after an in-place reconnect (status connected:false then connected:true), the owner who had taken control sees the badge/button reappear and their keystrokes are gated again until they re-take control', () => {
    render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, sessionName: 'shared', ownerId: 'app-1-current-user' })}
      />
    );
    // Re-assert control on this attach.
    fireEvent.click(screen.getByRole('button', { name: /take control/i }));
    expect(screen.queryByText(/read-only/i)).not.toBeInTheDocument();

    const terminalInstance = capturedTerminalInstances[0];
    const onDataCallback = terminalInstance.onData.mock.calls[0][0];
    onDataCallback('echo before\n');
    expect(sentMessages.filter((m) => JSON.parse(m).type === 'input')).toHaveLength(1);

    // Simulate a network blip: the connection drops and comes back while
    // this component stays mounted (in-place reconnect).
    act(() => {
      wsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'status', connected: false }) });
    });
    act(() => {
      wsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'status', connected: true }) });
    });

    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /take control/i })).toBeInTheDocument();

    onDataCallback('echo after\n');
    // Still only the one input message sent before the reconnect — the
    // post-reconnect keystroke must be gated until control is re-taken.
    expect(sentMessages.filter((m) => JSON.parse(m).type === 'input')).toHaveLength(1);
  });

  it('own session: the owner sees no badge, no "Take control" button, and never triggers a setWritable message', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    );
    expect(screen.queryByText(/read-only/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /take control/i })).not.toBeInTheDocument();
    expect(sentMessages.filter((m) => JSON.parse(m).type === 'setWritable')).toHaveLength(0);
  });

  it('does not send a setWritable message when taking control of an own (non-external) shared session', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'someone-else', controllerId: 'someone-else' })} />
    );
    act(() => wsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'sharedControl', shared: true }) }));
    fireEvent.click(screen.getByRole('button', { name: /take control/i }));

    expect(mockUpdateState).toHaveBeenCalledWith('app-1', { controllerId: 'app-1-current-user' });
    expect(sentMessages.filter((m) => JSON.parse(m).type === 'setWritable')).toHaveLength(0);
  });

  it('the terminal shows no owner settings buttons over the content (they live in the toolbar)', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    );
    expect(screen.queryByRole('button', { name: /terminal settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /share control/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lock size/i })).not.toBeInTheDocument();
  });

  it('forwards setSharedControl to the relay when the owner flips shareByDefault (from the toolbar)', () => {
    const { rerender } = render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    );
    act(() => wsInstances[0].onopen?.());
    const before = sentMessages.map((m) => JSON.parse(m)).filter((m) => m.type === 'setSharedControl').length;
    // The toolbar sets shareByDefault; the app state echoes back to the view.
    rerender(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user', shareByDefault: true })}
      />
    );
    const msgs = sentMessages.map((m) => JSON.parse(m)).filter((m) => m.type === 'setSharedControl');
    expect(msgs[msgs.length - 1]).toEqual({ type: 'setSharedControl', shared: true });
    expect(msgs.length).toBe(before + 1);
  });

  it('in PRIVATE mode a non-owner sees no "Take control" and sends no input', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'someone-else', controllerId: 'app-1-current-user' })} />
    );
    act(() => wsInstances[0].onopen?.());
    expect(screen.queryByRole('button', { name: /take control/i })).not.toBeInTheDocument();
    const onDataCallback = capturedTerminalInstances[0].onData.mock.calls[0][0];
    onDataCallback('whoami\n');
    expect(sentMessages.filter((m) => JSON.parse(m).type === 'input')).toHaveLength(0);
  });

  it('"Take control" appears to a non-owner once the owner enables sharing (sharedControl message)', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'someone-else' })} />
    );
    expect(screen.queryByRole('button', { name: /take control/i })).not.toBeInTheDocument();
    act(() => wsInstances[0].onmessage?.({ data: JSON.stringify({ type: 'sharedControl', shared: true }) }));
    expect(screen.queryByRole('button', { name: /take control/i })).toBeInTheDocument();
  });


  it('sends exactly one resize derived from the shared board size on open, with no size-jiggle', () => {
    render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, controllerId: 'app-1-current-user' })}
      />
    );
    const term = capturedTerminalInstances[0];
    act(() => wsInstances[0].onopen?.());

    const resizes = sentMessages.map((m) => JSON.parse(m)).filter((m) => m.type === 'resize');
    // The board window is 400x300 board units, which every viewer sees
    // identically — so the derived grid (44x16) is the same for all of them,
    // and the single shared pty never flaps between per-viewer sizes. Exactly
    // one resize (the old code sent rows-1 then rows to force a redraw).
    expect(resizes).toEqual([{ type: 'resize', cols: 44, rows: 16 }]);
    expect(term.resize).toHaveBeenCalledWith(44, 16);
  });

  it('re-sends a resize when the shared board size changes', () => {
    const { rerender } = render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, controllerId: 'app-1-current-user' })}
      />
    );
    act(() => wsInstances[0].onopen?.());

    rerender(
      <SSHTerminal.AppComponent
        {...buildApp(
          { host: 'h', port: 22, credentialId: 'c', connected: true, controllerId: 'app-1-current-user' },
          { width: 800, height: 600 }
        )}
      />
    );

    const resizes = sentMessages.map((m) => JSON.parse(m)).filter((m) => m.type === 'resize');
    expect(resizes[resizes.length - 1]).toEqual({ type: 'resize', cols: 88, rows: 33 });
  });

  it('every viewer (including a non-controller) sends a resize on open — size follows the shared window', () => {
    render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, controllerId: 'someone-else' })}
      />
    );
    act(() => wsInstances[0].onopen?.());
    expect(sentMessages.map((m) => JSON.parse(m)).filter((m) => m.type === 'resize')).toContainEqual({
      type: 'resize',
      cols: 44,
      rows: 16,
    });
  });



  it('sends setWritable:false (best-effort) on unmount when this viewer has (re)taken control of an external session', () => {
    const { unmount } = render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, sessionName: 'shared', ownerId: 'app-1-current-user' })}
      />
    );
    // Fresh mount of an external session is read-only until control is
    // re-asserted this attach — take control first, as a real controller
    // would, before the unmount-release path is meaningful to test.
    fireEvent.click(screen.getByRole('button', { name: /take control/i }));
    unmount();
    const setWritableMessages = sentMessages.filter((m) => JSON.parse(m).type === 'setWritable');
    expect(setWritableMessages).toEqual([
      JSON.stringify({ type: 'setWritable', writable: true }),
      JSON.stringify({ type: 'setWritable', writable: false }),
    ]);
  });


  it('enforces the lock: a tile resized away from the locked size is reverted', () => {
    // Locked to 400x300 but the current tile is 800x600 -> snap back on mount.
    render(
      <SSHTerminal.AppComponent
        {...buildApp(
          { host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user', sizeLock: { width: 400, height: 300 } },
          { width: 800, height: 600 }
        )}
      />
    );
    expect(mockUpdate).toHaveBeenCalledWith('app-1', { size: { width: 400, height: 300, depth: 0 } });
  });

  it('does not report a resize when a locked terminal\'s tile changes (pty stays at the locked grid)', () => {
    const { rerender } = render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user', sizeLock: { width: 400, height: 300 } })}
      />
    );
    act(() => wsInstances[0].onopen?.());
    const before = sentMessages.filter((m) => JSON.parse(m).type === 'resize').length;
    // Someone resizes the tile; because the size is locked, the grid must not change.
    rerender(
      <SSHTerminal.AppComponent
        {...buildApp(
          { host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user', sizeLock: { width: 400, height: 300 } },
          { width: 800, height: 600 }
        )}
      />
    );
    expect(sentMessages.filter((m) => JSON.parse(m).type === 'resize').length).toBe(before);
  });

  it('re-asserts the owner\'s shared-control default on connect (shareByDefault)', () => {
    render(
      <SSHTerminal.AppComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user', shareByDefault: true })}
      />
    );
    act(() => wsInstances[0].onopen?.());
    expect(sentMessages.map((m) => JSON.parse(m))).toContainEqual({ type: 'setSharedControl', shared: true });
  });

  it('does not assert shared control on connect when shareByDefault is off', () => {
    render(
      <SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    );
    act(() => wsInstances[0].onopen?.());
    expect(sentMessages.map((m) => JSON.parse(m)).filter((m) => m.type === 'setSharedControl')).toHaveLength(0);
  });

  describe('ws reconnect + keepalive', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
    });

    it('auto-reconnects after an unexpected ws close (input no longer silently stalls)', () => {
      render(<SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true })} />);
      act(() => wsInstances[0].onopen?.());
      expect(wsInstances).toHaveLength(1);
      act(() => wsInstances[0].onclose?.());
      act(() => {
        jest.advanceTimersByTime(600);
      });
      expect(wsInstances.length).toBeGreaterThanOrEqual(2);
      // the "reconnecting" indicator was shown after the drop
      expect(screen.queryByTestId('ssh-reconnecting')).toBeInTheDocument();
    });

    it('sends a keepalive ping while the socket is open (prevents idle-timeout drops)', () => {
      render(<SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true })} />);
      act(() => wsInstances[0].onopen?.());
      act(() => {
        jest.advanceTimersByTime(20000);
      });
      expect(sentMessages.map((m) => JSON.parse(m))).toContainEqual({ type: 'ping' });
    });

    it('does not reconnect after unmount', () => {
      const { unmount } = render(<SSHTerminal.AppComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true })} />);
      act(() => wsInstances[0].onopen?.());
      unmount();
      const count = wsInstances.length;
      act(() => {
        jest.advanceTimersByTime(6000);
      });
      expect(wsInstances.length).toBe(count);
    });
  });
});

describe('SSHTerminal toolbar (app menu)', () => {
  beforeEach(() => {
    mockUpdateState.mockClear();
  });

  it('shows the owner a settings menu with share + lock toggles', () => {
    render(
      <SSHTerminal.ToolbarComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    );
    fireEvent.click(screen.getByRole('button', { name: /terminal settings/i }));
    expect(screen.getByText(/share control/i)).toBeInTheDocument();
    expect(screen.getByText(/lock size/i)).toBeInTheDocument();
  });

  it('renders nothing for a non-owner', () => {
    const { container } = render(
      <SSHTerminal.ToolbarComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'someone-else' })} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing before the terminal is connected (no host)', () => {
    const { container } = render(<SSHTerminal.ToolbarComponent {...buildApp({ ownerId: 'app-1-current-user' })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('toggling "Share control" sets shareByDefault in app state', () => {
    render(
      <SSHTerminal.ToolbarComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    );
    fireEvent.click(screen.getByRole('button', { name: /terminal settings/i }));
    fireEvent.click(screen.getByText(/share control/i));
    expect(mockUpdateState).toHaveBeenCalledWith('app-1', { shareByDefault: true });
  });

  it('toggling "Lock size" captures the current board size', () => {
    render(
      <SSHTerminal.ToolbarComponent {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user' })} />
    ); // default board size 400x300
    fireEvent.click(screen.getByRole('button', { name: /terminal settings/i }));
    fireEvent.click(screen.getByText(/lock size/i));
    expect(mockUpdateState).toHaveBeenCalledWith('app-1', { sizeLock: { width: 400, height: 300 } });
  });

  it('"Unlock size" clears the lock', () => {
    render(
      <SSHTerminal.ToolbarComponent
        {...buildApp({ host: 'h', port: 22, credentialId: 'c', connected: true, ownerId: 'app-1-current-user', sizeLock: { width: 400, height: 300 } })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /terminal settings/i }));
    fireEvent.click(screen.getByText(/unlock size/i));
    expect(mockUpdateState).toHaveBeenCalledWith('app-1', { sizeLock: null });
  });
});
