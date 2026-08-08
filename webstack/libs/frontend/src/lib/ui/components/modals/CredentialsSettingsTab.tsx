/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tooltip,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { MdDelete } from 'react-icons/md';
import { useCredentials, CredentialType, CredentialMetadata } from '../../../hooks';

const TYPE_LABELS: Record<CredentialType, string> = {
  sshPrivateKey: 'SSH Private Key',
  secretText: 'Secret Text',
  usernamePassword: 'Username & Password',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

/**
 * "Credentials" tab of EditUserSettingsModal — list, create, and delete the
 * current user's own stored credentials, across all types. Values are never
 * fetched or shown; only metadata (name, type, created date) is displayed,
 * matching the backend's own guarantee that no route ever returns a
 * credential's decrypted value to the client.
 */
export function CredentialsSettingsTab(): JSX.Element {
  const { credentials, loading, refetch } = useCredentials();
  const [listError, setListError] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(id: string) {
    try {
      const resp = await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
      if (!resp.ok) {
        toast({ title: 'Failed to delete credential', status: 'error', duration: 3000 });
        return;
      }
      setConfirmDeleteId(null);
      refetch();
    } catch {
      toast({ title: 'Failed to delete credential', status: 'error', duration: 3000 });
    }
  }

  return (
    <VStack align="stretch" spacing={3}>
      {listError ? (
        <VStack align="stretch" spacing={2}>
          <Text color="red.400">Could not load your credentials.</Text>
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </VStack>
      ) : (
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Created</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {credentials.map((c) => (
              <CredentialRow
                key={c.id}
                credential={c}
                confirming={confirmDeleteId === c.id}
                onDeleteClick={() => setConfirmDeleteId(c.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => handleDelete(c.id)}
              />
            ))}
            {!loading && credentials.length === 0 && (
              <Tr>
                <Td colSpan={4}>
                  <Text color="gray.500">No stored credentials yet.</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      )}

      {showAddForm ? (
        <AddCredentialForm
          onDone={() => {
            setShowAddForm(false);
            refetch();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          + New credential
        </Button>
      )}
    </VStack>
  );
}

function CredentialRow(props: {
  credential: CredentialMetadata;
  confirming: boolean;
  onDeleteClick: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}): JSX.Element {
  const { credential, confirming, onDeleteClick, onCancelDelete, onConfirmDelete } = props;
  return (
    <Tr>
      <Td>{credential.name}</Td>
      <Td>{TYPE_LABELS[credential.type]}</Td>
      <Td>{formatDate(credential.createdAt)}</Td>
      <Td>
        {confirming ? (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="xs">Delete '{credential.name}'? Any app using it will lose access.</Text>
            <Box>
              <Button size="xs" colorScheme="red" mr={2} onClick={onConfirmDelete}>
                Delete
              </Button>
              <Button size="xs" onClick={onCancelDelete}>
                Cancel
              </Button>
            </Box>
          </VStack>
        ) : (
          <Tooltip label="Delete">
            <IconButton
              aria-label="Delete credential"
              icon={<MdDelete />}
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={onDeleteClick}
            />
          </Tooltip>
        )}
      </Td>
    </Tr>
  );
}

const NEW_CREDENTIAL_ERROR_MESSAGES: Record<string, string> = {
  'name is required': 'Please enter a name for this credential.',
};

function AddCredentialForm(props: { onDone: () => void; onCancel: () => void }): JSX.Element {
  const [type, setType] = useState<CredentialType>('sshPrivateKey');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildValue(): Record<string, unknown> {
    if (type === 'secretText') return { type, secret };
    if (type === 'usernamePassword') return { type, username, password };
    return { type, username, privateKey, passphrase: passphrase || undefined };
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, value: buildValue() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(NEW_CREDENTIAL_ERROR_MESSAGES[data.error] || data.error || 'Failed to save credential.');
        return;
      }
      props.onDone();
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    Boolean(name) &&
    ((type === 'secretText' && Boolean(secret)) ||
      (type === 'usernamePassword' && Boolean(username) && Boolean(password)) ||
      (type === 'sshPrivateKey' && Boolean(username) && Boolean(privateKey)));

  return (
    <VStack align="stretch" spacing={2} borderWidth={1} borderRadius="md" p={3}>
      <Select value={type} onChange={(e) => setType(e.target.value as CredentialType)} size="sm">
        <option value="sshPrivateKey">SSH Private Key</option>
        <option value="secretText">Secret Text</option>
        <option value="usernamePassword">Username & Password</option>
      </Select>
      <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} size="sm" />

      {type === 'secretText' && (
        <Input placeholder="Secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} size="sm" />
      )}

      {type === 'usernamePassword' && (
        <>
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} size="sm" />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} size="sm" />
        </>
      )}

      {type === 'sshPrivateKey' && (
        <>
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} size="sm" />
          <Textarea
            placeholder="Private key (paste the full contents)"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            rows={5}
            fontFamily="mono"
            fontSize="xs"
          />
          <Input
            placeholder="Passphrase (optional)"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            size="sm"
          />
        </>
      )}

      {error && <Text color="red.400">{error}</Text>}

      <Box>
        <Button size="sm" colorScheme="teal" mr={2} onClick={handleSubmit} isLoading={saving} isDisabled={!canSubmit}>
          Add
        </Button>
        <Button size="sm" onClick={props.onCancel}>
          Cancel
        </Button>
      </Box>
    </VStack>
  );
}
