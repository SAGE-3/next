/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { CredentialsSettingsTab } from './CredentialsSettingsTab';

const mockRefetch = jest.fn();
let mockCredentials: any[] = [];
let mockLoading = false;

const mockToast = jest.fn();

jest.mock('../../../hooks', () => ({
  useCredentials: () => ({ credentials: mockCredentials, loading: mockLoading, refetch: mockRefetch }),
}));

jest.mock('@chakra-ui/react', () => {
  const actual = jest.requireActual('@chakra-ui/react');
  return { ...actual, useToast: () => mockToast };
});

function renderTab() {
  return render(
    <ChakraProvider>
      <CredentialsSettingsTab />
    </ChakraProvider>
  );
}

describe('CredentialsSettingsTab', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockRefetch.mockClear();
    mockToast.mockClear();
    mockCredentials = [
      { id: 'c1', name: 'my-ssh-key', type: 'sshPrivateKey', ownerId: 'u1', createdAt: 1735689600000, updatedAt: 1735689600000 },
    ];
    mockLoading = false;
  });

  it('lists existing credentials with a human-readable type label', () => {
    renderTab();
    expect(screen.getByText('my-ssh-key')).toBeInTheDocument();
    expect(screen.getByText('SSH Private Key')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no credentials', () => {
    mockCredentials = [];
    renderTab();
    expect(screen.getByText(/no stored credentials yet/i)).toBeInTheDocument();
  });

  it('shows the add form when "+ New credential" is clicked, and hides it on cancel', () => {
    renderTab();
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new credential/i }));
    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();
  });

  it('submits a secretText credential with the correct body shape', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-id' }) });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /new credential/i }));
    fireEvent.change(screen.getByDisplayValue(/ssh private key/i), { target: { value: 'secretText' } });
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'ctfd-token' } });
    fireEvent.change(screen.getByPlaceholderText('Secret'), { target: { value: 'abc123' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/credentials',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'ctfd-token', type: 'secretText', value: { type: 'secretText', secret: 'abc123' } }),
        })
      )
    );
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  });

  it('submits an sshPrivateKey credential with the correct body shape', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-id' }) });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /new credential/i }));
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'my-key' } });
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'deploy' } });
    fireEvent.change(screen.getByPlaceholderText(/private key/i), { target: { value: 'KEY-DATA' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/credentials',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'my-key',
            type: 'sshPrivateKey',
            value: { type: 'sshPrivateKey', username: 'deploy', privateKey: 'KEY-DATA', passphrase: undefined },
          }),
        })
      )
    );
  });

  it('shows an inline error and does not close the form when the create call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'name is required' }) });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /new credential/i }));
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'x' } });
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'u' } });
    fireEvent.change(screen.getByPlaceholderText(/private key/i), { target: { value: 'k' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(screen.getByText(/please enter a name/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('shows an inline confirm on delete click, and removes the row on confirmed delete', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /delete credential/i }));
    expect(screen.getByText(/delete 'my-ssh-key'\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/credentials/c1', { method: 'DELETE' }));
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  });

  it('cancelling the delete confirm makes no request', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /delete credential/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows a toast when delete fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /delete credential/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' })));
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
