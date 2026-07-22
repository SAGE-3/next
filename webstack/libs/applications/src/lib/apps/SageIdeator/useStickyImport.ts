/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAppStore } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { state as AppState } from './index';
import { abstractNode, buildRequirements } from './openai';
import { ImportPreview } from './StickyImportDialog';

type SageDimension = AppState['dimensions'][number];

export interface PendingImport {
  stickieId: string;
  text: string;
  originalPosition: { x: number; y: number; z: number };
  preview: ImportPreview | null;
  isLoading: boolean;
  temperature: number;
}

interface UseStickyImportProps {
  s: AppState;
  localDims: SageDimension[];
  activeEntryId: string | null;
  appId: string;
  appPosition: { x: number; y: number; z: number };
  appSize: { width: number; height: number; depth: number };
}

export function useStickyImport({ s, localDims, activeEntryId, appId, appPosition, appSize }: UseStickyImportProps) {
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const prevPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const importingRef = useRef(false);

  const boardApps = useAppStore((st) => st.apps);
  const updateApp = useAppStore((st) => st.update);
  const updateState = useAppStore((st) => st.updateState);
  const toast = useToast();

  // Detect when a Stickie's position changes from outside to inside the ideator bounds.
  // App dragging in SAGE3 is local-only during the drag; the store position only updates
  // when the drag ends and the server confirms, so position changes == drag-end events.
  useEffect(() => {
    const stickies = boardApps.filter((a) => a.data.type === 'Stickie');

    for (const stickie of stickies) {
      const prev = prevPositionsRef.current[stickie._id];
      const curr = stickie.data.position;

      if (prev && !importingRef.current) {
        const { width: sw, height: sh } = stickie.data.size;
        const wasInside =
          prev.x < appPosition.x + appSize.width &&
          prev.x + sw > appPosition.x &&
          prev.y < appPosition.y + appSize.height &&
          prev.y + sh > appPosition.y;
        const isInside =
          curr.x < appPosition.x + appSize.width &&
          curr.x + sw > appPosition.x &&
          curr.y < appPosition.y + appSize.height &&
          curr.y + sh > appPosition.y;

        if (!wasInside && isInside) {
          const originalPosition = { x: prev.x, y: prev.y, z: curr.z };
          const text = ((stickie.data.state as { text: string }).text ?? '').trim();

          if (!activeEntryId || localDims.length === 0) {
            toast({ title: 'No idea space yet', description: 'Generate ideas first, then import a Stickie.', status: 'warning', duration: 3000, isClosable: true });
          } else if (text) {
            importingRef.current = true;
            updateApp(stickie._id, { position: { x: appPosition.x + appSize.width + 20, y: appPosition.y, z: curr.z } });
            setPendingImport({ stickieId: stickie._id, text, originalPosition, preview: null, isLoading: true, temperature: 0 });
          }
        }
      }

      prevPositionsRef.current[stickie._id] = { x: curr.x, y: curr.y };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardApps]);

  // Run abstractNode whenever a new import preview is needed (initial drop or "Try Again")
  useEffect(() => {
    if (!pendingImport?.isLoading) return;
    const { text, stickieId, originalPosition } = pendingImport;
    let active = true;
    abstractNode(text, s.apiKey, s.model, pendingImport.temperature)
      .then((preview) => {
        if (active) setPendingImport((prev) => (prev ? { ...prev, preview, isLoading: false } : null));
      })
      .catch(() => {
        if (active) {
          updateApp(stickieId, { position: originalPosition });
          setPendingImport(null);
          importingRef.current = false;
          toast({ title: 'Preview failed', status: 'error', duration: 3000, isClosable: true });
        }
      });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingImport?.isLoading]);

  const handleImportConfirm = useCallback(() => {
    if (!pendingImport?.preview || !activeEntryId) return;
    const { preview, text } = pendingImport;
    const rawDims = {
      categorical: Object.fromEntries(localDims.filter((d) => d.type === 'categorical').map((d) => [d.name, d.values])),
      ordinal: Object.fromEntries(localDims.filter((d) => d.type === 'ordinal').map((d) => [d.name, d.values])),
    };
    const { categorical, ordinal } = buildRequirements(rawDims);
    const newNode: AppState['nodes'][number] = {
      ID: genId(),
      Title: preview.Title,
      Summary: preview.Summary,
      Keywords: preview.Keywords,
      Steps: preview.Steps,
      Result: text,
      Structure: preview.Structure,
      Dimension: { categorical, ordinal },
      IsMyFav: false,
    };
    const latest = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
    const cur = latest ?? s;
    const updatedHistory = cur.chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: [...e.nodes, newNode] } : e));
    updateState(appId, { ...cur, chatHistory: updatedHistory });
    setPendingImport(null);
    importingRef.current = false;
  }, [pendingImport, activeEntryId, localDims, s, appId, updateState]);

  const handleImportCancel = useCallback(() => {
    if (!pendingImport) return;
    updateApp(pendingImport.stickieId, { position: pendingImport.originalPosition });
    setPendingImport(null);
    importingRef.current = false;
  }, [pendingImport, updateApp]);

  const handleImportRegenerate = useCallback(() => {
    if (!pendingImport) return;
    setPendingImport((prev) => (prev ? { ...prev, preview: null, isLoading: true, temperature: 0.7 } : null));
  }, [pendingImport]);

  return { pendingImport, handleImportConfirm, handleImportCancel, handleImportRegenerate };
}
