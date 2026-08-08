/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAppStore, useLinkStore, apiUrls } from '@sage3/frontend';

import { state as AppState } from './index';
import { generateNodeImage } from './openai';

type SageNode = AppState['nodes'][number];

interface UseImageGenerationProps {
  s: AppState;
  localNodes: SageNode[];
  activeEntryId: string | null;
  appId: string;
  boardId: string;
  roomId: string;
  appPosition: { x: number; y: number; z: number };
}

export function useImageGeneration({ s, localNodes, activeEntryId, appId, boardId, roomId, appPosition }: UseImageGenerationProps) {
  const [generatingImageNodeId, setGeneratingImageNodeId] = useState<string | null>(null);
  const imageAbortRef = useRef<AbortController | null>(null);

  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const addLink = useLinkStore((st) => st.addLink);
  const toast = useToast();

  const generateImageForNode = useCallback(
    async (nodeId: string, context?: string, count = 1, presetLabel?: string, userContext?: string) => {
      if (generatingImageNodeId || !activeEntryId) return;
      const node = localNodes.find((n) => n.ID === nodeId);
      if (!node) return;

      const controller = new AbortController();
      imageAbortRef.current = controller;
      setGeneratingImageNodeId(nodeId);

      try {
        // ── 1. Find or create anchor Stickie ─────────────────────────────
        const liveApps = useAppStore.getState().apps;
        const existingStickieId = s.nodeStickies?.[nodeId];
        let stickieApp = existingStickieId
          ? liveApps.find((a) => a._id === existingStickieId) ?? null
          : null;

        if (!stickieApp) {
          stickieApp = liveApps.find(
            (a) =>
              a.data.type === 'Stickie' &&
              a.data.boardId === boardId &&
              (a.data.state as { text?: string }).text?.startsWith(node.Title)
          ) ?? null;
        }

        let stickieId: string;
        let stickiePosition: { x: number; y: number; z: number };
        let stickieSize: { width: number; height: number; depth: number };

        if (stickieApp) {
          stickieId = stickieApp._id;
          stickiePosition = stickieApp.data.position;
          stickieSize = stickieApp.data.size;
        } else {
          const stickieResult = await createApp({
            title: node.Title,
            roomId,
            boardId,
            position: { x: appPosition.x, y: appPosition.y - 260, z: 0 },
            size: { width: 320, height: 200, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: {
              text: `${node.Title}\n\n${node.Summary}`,
              fontSize: 18,
              color: 'purple',
              lock: false,
              sources: [appId],
              executeInfo: { executeFunc: '', params: {} },
            },
            raised: true,
            dragging: false,
            pinned: false,
          });
          stickieId = stickieResult?.data?._id ?? '';
          stickiePosition = { x: appPosition.x, y: appPosition.y - 260, z: 0 };
          stickieSize = { width: 320, height: 200, depth: 0 };
        }

        // ── 2. Count existing visualizations to offset placement ──────────
        const existingVizCount = liveApps.filter(
          (a) =>
            a.data.type === 'ImageViewer' &&
            a.data.boardId === boardId &&
            a.data.title.startsWith(node.Title)
        ).length;

        // ── 3. Generate all variations ────────────────────────
        const safeTitle = node.Title.replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 40);
        const safePrompt = s.prompt.replace(/[^a-zA-Z0-9\s-]/g, '').trim().slice(0, 40);
        const imgSize = 512;
        const gap = 20;

        const results = await Promise.allSettled(
          Array.from({ length: count }, () =>
            generateNodeImage(node.Title, node.Summary, node.Keywords, s.apiKey, s.prompt, node.Dimension, controller.signal, context)
          )
        );

        // ── 4. Upload and place each successful result ────────────────────
        let placedCount = 0;
        let lastAssetId: string | null = null;

        for (const result of results) {
          if (result.status === 'rejected') {
            const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
            if (msg !== 'Cancelled') {
              toast({ title: 'One variation failed', description: msg, status: 'warning', duration: 3000, isClosable: true });
            }
            continue;
          }

          const iteration = existingVizCount + placedCount + 1;
          const blob = await fetch(result.value).then((r) => r.blob());
          const imgFile = new File([blob], `${safeTitle} v${iteration} - ${safePrompt}.png`, { type: 'image/png' });
          const fd = new FormData();
          fd.append('files', imgFile);
          fd.append('room', roomId);
          const uploadRes = await fetch(apiUrls.assets.upload, { method: 'POST', body: fd, credentials: 'include' });
          if (!uploadRes.ok) {
            toast({ title: 'Upload failed', status: 'warning', duration: 3000, isClosable: true });
            continue;
          }
          const uploadedIds = await uploadRes.json() as string[];
          const assetDbId = uploadedIds[0];
          if (!assetDbId) continue;
          lastAssetId = assetDbId;

          // Build ImageViewer title
          const titleParts = [`${node.Title} v${iteration}`];
          if (presetLabel) titleParts.push(presetLabel);
          if (userContext) titleParts.push(`"${userContext.slice(0, 30)}"`);
          const imageTitle = `${titleParts.join(' · ')} — ${s.prompt}`.slice(0, 100);

          const imgX = stickiePosition.x + stickieSize.width + gap + (existingVizCount + placedCount) * (imgSize + gap);

          const imageResult = await createApp({
            title: imageTitle,
            roomId,
            boardId,
            position: { x: imgX, y: stickiePosition.y, z: 0 },
            size: { width: imgSize, height: imgSize, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'ImageViewer',
            state: { assetid: assetDbId },
            raised: true,
            dragging: false,
            pinned: false,
          });

          const imageViewerId = imageResult?.data?._id;

          // ── Create  Stickie and link ──
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const provenanceLines = [`Iteration: v${iteration}`, `Prompt: ${s.prompt}`];
          if (presetLabel) provenanceLines.push(`Style: ${presetLabel}`);
          if (userContext) provenanceLines.push(`Context: "${userContext}"`);
          provenanceLines.push(`Generated: ${time}`);

          const provenanceResult = await createApp({
            title: `${node.Title} v${iteration} — provenance`,
            roomId,
            boardId,
            position: { x: imgX, y: stickiePosition.y + imgSize + gap, z: 0 },
            size: { width: imgSize, height: 160, depth: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            type: 'Stickie',
            state: {
              text: provenanceLines.join('\n'),
              fontSize: 16,
              color: 'yellow',
              lock: false,
              sources: [],
              executeInfo: { executeFunc: '', params: {} },
            },
            raised: true,
            dragging: false,
            pinned: false,
          });

          const provenanceId = provenanceResult?.data?._id;
          if (stickieId && provenanceId) addLink(stickieId, provenanceId, boardId, 'provenance');
          if (provenanceId && imageViewerId) addLink(provenanceId, imageViewerId, boardId, 'provenance');

          placedCount++;
        }

        // ── 5. Persist stickie + most recent asset ID in state ────────────
        if (placedCount > 0 && lastAssetId) {
          updateState(appId, {
            nodeImages: { ...(s.nodeImages ?? {}), [nodeId]: lastAssetId },
            nodeStickies: { ...(s.nodeStickies ?? {}), [nodeId]: stickieId },
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg !== 'Cancelled') {
          toast({ title: 'Visualization failed', description: msg, status: 'error', duration: 4000, isClosable: true });
        }
      } finally {
        imageAbortRef.current = null;
        setGeneratingImageNodeId(null);
      }
    },
    [s, localNodes, activeEntryId, generatingImageNodeId, appId, boardId, roomId, appPosition, createApp, addLink, updateState, toast]
  );

  const cancelImageGeneration = useCallback(() => {
    imageAbortRef.current?.abort();
    imageAbortRef.current = null;
    setGeneratingImageNodeId(null);
  }, []);

  return { generateImageForNode, cancelImageGeneration, generatingImageNodeId };
}
