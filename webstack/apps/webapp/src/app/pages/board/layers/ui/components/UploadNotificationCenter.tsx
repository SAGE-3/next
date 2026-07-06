/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CloseButton,
  Flex,
  HStack,
  IconButton,
  Progress,
  SlideFade,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdAdd, MdCheckCircle, MdChevronLeft, MdChevronRight, MdError, MdFileUpload } from 'react-icons/md';

import { useAppStore, useAssetStore, useFiles, useMessageStore, useUIStore, useUser } from '@sage3/frontend';
import { Message } from '@sage3/shared/types';

type UploadNoticeStatus = 'loading' | 'success' | 'error' | 'info';

type UploadNotice = {
  id: string;
  key: string;
  uploadId?: string;
  assetId?: string;
  title: string;
  description: string;
  status: UploadNoticeStatus;
  progress?: number;
  close: boolean;
  startedAt: number;
  updatedAt: number;
};

type UploadNotificationCenterProps = {
  roomId: string;
  boardId: string;
};

function dismissedStorageKey(userId: string, roomId: string): string {
  return `sage3-upload-notifications-dismissed:${userId}:${roomId}`;
}

function readDismissedKeys(userId: string | undefined, roomId: string): string[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(dismissedStorageKey(userId, roomId));
    if (!stored) return [];
    const keys = JSON.parse(stored);
    return Array.isArray(keys) ? keys.filter((key) => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

function writeDismissedKeys(userId: string | undefined, roomId: string, keys: string[]) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(dismissedStorageKey(userId, roomId), JSON.stringify(keys.slice(-200)));
  } catch {
    // Local storage is best-effort UI state.
  }
}

function boundedPercent(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, value));
}

function extractProgress(payload: string): number | undefined {
  const match = payload.match(/\((\d+)%\)/);
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 10);
  return boundedPercent(value);
}

function fileKeyFromPayload(payload: string): string | undefined {
  if (payload === 'Uploading Assets' || payload === 'Processing Assets' || payload === 'Assets Ready') {
    return undefined;
  }

  const patterns = [
    /^Processing done for (.+)$/,
    /^Processing failed for (.+?):/,
    /^Processing (.+)$/,
    /^Rendering failed for (.+?) after /,
    /^Rendering (.+?):/,
  ];

  for (const pattern of patterns) {
    const match = payload.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function statusFromPhase(phase: Message['data']['phase']): UploadNoticeStatus | undefined {
  if (phase === 'failed') return 'error';
  if (phase === 'ready') return 'success';
  if (phase === 'uploading' || phase === 'metadata' || phase === 'processing' || phase === 'rendering') return 'loading';
  return undefined;
}

function noticeFromMessage(message: Message, roomId: string): UploadNotice | null {
  const { type, payload, close, uploadId, fileId, roomId: messageRoomId, assetId, filename, phase, progress } = message.data;
  if (type !== 'upload' && type !== 'process') return null;
  if (messageRoomId !== roomId) return null;

  const fallbackFileKey = fileKeyFromPayload(payload);
  const structuredFileKey = fileId || filename;
  const fileKey = structuredFileKey || fallbackFileKey;
  const status: UploadNoticeStatus =
    statusFromPhase(phase) || (/failed/i.test(payload) ? 'error' : close || /done|ready/i.test(payload) ? 'success' : 'loading');

  if (fileKey) {
    return {
      id: message._id,
      key: `file:${fileKey}`,
      uploadId,
      assetId,
      title: filename || fallbackFileKey || 'File',
      description: payload,
      status,
      progress: boundedPercent(progress?.percent) ?? extractProgress(payload),
      close,
      startedAt: message._createdAt,
      updatedAt: message._createdAt,
    };
  }

  return {
    id: message._id,
    key: uploadId ? `upload:${uploadId}` : 'upload',
    uploadId,
    title: 'Upload',
    description: payload,
    status,
    progress: boundedPercent(progress?.percent) ?? extractProgress(payload),
    close,
    startedAt: message._createdAt,
    updatedAt: message._createdAt,
  };
}

function StatusIcon(props: { status: UploadNoticeStatus }) {
  if (props.status === 'loading') return <Spinner size="xs" />;
  if (props.status === 'error') return <MdError size="16px" />;
  if (props.status === 'success') return <MdCheckCircle size="16px" />;
  return <MdFileUpload size="16px" />;
}

export function UploadNotificationCenter(props: UploadNotificationCenterProps) {
  const { user } = useUser();
  const subscribe = useMessageStore((state) => state.subscribe);
  const unsubscribe = useMessageStore((state) => state.unsubscribe);
  const messages = useMessageStore((state) => state.messages);
  const updateAssets = useAssetStore((state) => state.update);
  const createApp = useAppStore((state) => state.create);
  const { openAppForFile } = useFiles();
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [creatingKeys, setCreatingKeys] = useState<string[]>([]);
  const previousLoadingNoticeKeysRef = useRef<Set<string> | null>(null);

  const bg = useColorModeValue('whiteAlpha.900', 'gray.800');
  const border = useColorModeValue('gray.200', 'whiteAlpha.300');
  const muted = useColorModeValue('gray.600', 'gray.300');
  const rowHover = useColorModeValue('gray.50', 'whiteAlpha.100');
  const headerBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  useEffect(() => {
    if (!user) return;
    subscribe();
    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe, user?._id]);

  useEffect(() => {
    setDismissedKeys(readDismissedKeys(user?._id, props.roomId));
    setIsOpen(false);
    previousLoadingNoticeKeysRef.current = null;
  }, [props.roomId, user?._id]);

  useEffect(() => {
    writeDismissedKeys(user?._id, props.roomId, dismissedKeys);
  }, [dismissedKeys, props.roomId, user?._id]);

  useEffect(() => {
    setDismissedKeys((keys) => {
      if (!user || keys.length === 0) return keys;
      const activeKeys = new Set<string>();
      for (const message of messages) {
        if (message._createdBy !== user._id) continue;
        const notice = noticeFromMessage(message, props.roomId);
        if (notice) activeKeys.add(notice.key);
      }
      const nextKeys = keys.filter((key) => activeKeys.has(key) || key.startsWith('file:') || key.startsWith('upload:'));
      return nextKeys.length === keys.length ? keys : nextKeys;
    });
  }, [messages, props.roomId, user]);

  const notices = useMemo(() => {
    const byKey = new Map<string, UploadNotice>();
    const uploadIdsWithFileMessages = new Set<string>();
    let hasLegacyFileMessage = false;

    for (const message of messages) {
      if (!user || message._createdBy !== user._id) continue;
      const notice = noticeFromMessage(message, props.roomId);
      if (!notice) continue;
      if (notice.key.startsWith('file:')) {
        hasLegacyFileMessage = true;
        if (notice.uploadId) uploadIdsWithFileMessages.add(notice.uploadId);
      }
      if (dismissedKeys.includes(notice.key)) continue;

      const existing = byKey.get(notice.key);
      if (!existing || notice.updatedAt >= existing.updatedAt) {
        byKey.set(notice.key, {
          ...notice,
          assetId: notice.assetId || existing?.assetId,
          startedAt: existing ? Math.min(existing.startedAt, notice.startedAt) : notice.startedAt,
        });
      }
    }

    const groupedNotices = Array.from(byKey.values());

    // Keep file-level cards as the source of truth once they exist, even if the user dismisses them.
    return groupedNotices
      .filter((notice) => {
        const isUploadNotice = notice.key === 'upload' || notice.key.startsWith('upload:');
        if (!isUploadNotice) return true;
        if (notice.uploadId) return !uploadIdsWithFileMessages.has(notice.uploadId);
        return !hasLegacyFileMessage;
      })
      .sort((a, b) => a.startedAt - b.startedAt)
      .slice(0, 8);
  }, [dismissedKeys, messages, props.roomId, user]);

  useEffect(() => {
    // Keep the panel closed for historical uploads, but surface active work immediately.
    const loadingKeys = new Set(
      notices.filter((notice) => notice.status === 'loading').map((notice) => notice.key),
    );
    const previousLoadingKeys = previousLoadingNoticeKeysRef.current;
    if (!previousLoadingKeys) {
      if (loadingKeys.size > 0) setIsOpen(true);
      previousLoadingNoticeKeysRef.current = loadingKeys;
      return;
    }

    if ([...loadingKeys].some((key) => !previousLoadingKeys.has(key))) {
      setIsOpen(true);
    }
    previousLoadingNoticeKeysRef.current = loadingKeys;
  }, [notices]);

  const dismissNotice = useCallback((key: string) => {
    setDismissedKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
  }, []);

  const clearAll = useCallback(() => {
    setDismissedKeys((keys) => Array.from(new Set([...keys, ...notices.map((notice) => notice.key)])));
    setIsOpen(false);
  }, [notices]);

  const handleCreateApp = useCallback(
    async (notice: UploadNotice) => {
      if (!notice.assetId || creatingKeys.includes(notice.key)) return;
      setCreatingKeys((keys) => [...keys, notice.key]);
      try {
        await updateAssets(props.roomId);
        const ui = useUIStore.getState();
        const x = Math.floor(-ui.boardPosition.x + window.innerWidth / ui.scale / 2);
        const y = Math.floor(-ui.boardPosition.y + window.innerHeight / ui.scale / 2);
        const app = await openAppForFile(notice.assetId, x, y, props.roomId, props.boardId);
        if (app) await createApp(app);
      } finally {
        setCreatingKeys((keys) => keys.filter((key) => key !== notice.key));
      }
    },
    [createApp, creatingKeys, openAppForFile, props.boardId, props.roomId, updateAssets],
  );

  if (!user) return null;

  return (
    <Flex align="flex-start" justify="flex-end" gap={1} pointerEvents="auto">
      <IconButton
        aria-label={isOpen ? 'Hide upload notifications' : 'Show upload notifications'}
        icon={isOpen ? <MdChevronRight /> : <MdChevronLeft />}
        size="sm"
        minW="28px"
        width="28px"
        height="32px"
        mt={1}
        bg={bg}
        border="1px solid"
        borderColor={border}
        boxShadow="md"
        onClick={() => setIsOpen((open) => !open)}
      />
      <SlideFade in={isOpen} offsetX="20px" unmountOnExit>
        <Box
          bg={bg}
          border="1px solid"
          borderColor={border}
          borderRadius="md"
          boxShadow="md"
          overflow="hidden"
          width={{ base: 'min(88vw, 380px)', md: '380px' }}
        >
          <HStack px={3} py={2} bg={headerBg} borderBottom="1px solid" borderColor={border} justify="space-between">
            <Text fontSize="sm" fontWeight="semibold">
              Uploads
            </Text>
            <Button size="xs" variant="ghost" onClick={clearAll}>
              Clear All
            </Button>
          </HStack>
          {notices.length === 0 ? (
            <Box px={3} py={3}>
              <Text fontSize="xs" color={muted}>
                No uploads
              </Text>
            </Box>
          ) : (
            <VStack align="stretch" spacing={0} maxH="min(54vh, 440px)" overflowY="auto">
              {notices.map((notice) => (
                <Box
                  key={notice.key}
                  px={3}
                  py={2}
                  borderBottom="1px solid"
                  borderColor={border}
                  _last={{ borderBottom: '0' }}
                  _hover={{ bg: rowHover }}
                >
                  <HStack align="flex-start" spacing={2}>
                    <Box
                      pt="3px"
                      color={notice.status === 'error' ? 'red.500' : notice.status === 'success' ? 'green.500' : 'teal.500'}
                    >
                      <StatusIcon status={notice.status} />
                    </Box>
                    <Box minW={0} flex="1">
                      <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                        {notice.title}
                      </Text>
                      <Text fontSize="xs" color={muted} noOfLines={2}>
                        {notice.description}
                      </Text>
                      {notice.progress !== undefined && (
                        <Progress
                          mt={2}
                          size="xs"
                          borderRadius="sm"
                          colorScheme={notice.status === 'error' ? 'red' : 'teal'}
                          value={notice.progress}
                        />
                      )}
                      {notice.assetId && notice.status === 'success' && (
                        <Button
                          mt={2}
                          size="xs"
                          leftIcon={<MdAdd />}
                          colorScheme="teal"
                          variant="outline"
                          isLoading={creatingKeys.includes(notice.key)}
                          onClick={() => handleCreateApp(notice)}
                        >
                          Create App
                        </Button>
                      )}
                    </Box>
                    <CloseButton
                      size="sm"
                      mt="-1"
                      mr="-1"
                      aria-label={`Dismiss ${notice.title}`}
                      onClick={() => dismissNotice(notice.key)}
                    />
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </SlideFade>
    </Flex>
  );
}
