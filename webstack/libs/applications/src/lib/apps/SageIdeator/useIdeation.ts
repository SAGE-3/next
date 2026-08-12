/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAppStore, useUser } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { state as AppState } from './index';
import { DimBlend } from './VisualizationCanvas';
import {
  generateDimensionsFromPrompt,
  generateNodeContent,
  abstractNode,
  buildRequirements,
  buildBlendedRequirements,
  generateUserDimension,
  callProseAPI,
  summarizeFavorites as summarizeFavoritesAPI,
} from './openai';
import { useAiProvider } from './useAiProvider';

type SageNode = AppState['nodes'][number];
type SageDimension = AppState['dimensions'][number];

interface UseIdeationProps {
  s: AppState;
  appId: string;
  input: string;
  setInput: (v: string) => void;
  attachedImage: string | null;
  setAttachedImage: (v: string | null) => void;
  boardId: string;
  roomId: string;
  appPosition: { x: number; y: number; z: number };
  appSize: { width: number; height: number; depth: number };
}

export function useIdeation({ s, appId, input, setInput, attachedImage, setAttachedImage, boardId, roomId, appPosition, appSize }: UseIdeationProps) {
  const { user } = useUser();
  const username = user?.data.name.split(' ')[0] ?? '';

  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localStatusMessage, setLocalStatusMessage] = useState('');
  const [askingNodeId, setAskingNodeId] = useState<string | null>(null);
  const [isAddingDimension, setIsAddingDimension] = useState(false);
  const [rerollingNodeId, setRerollingNodeId] = useState<string | null>(null);
  const [isGeneratingAt, setIsGeneratingAt] = useState(false);
  const [isAddingManualIdea, setIsAddingManualIdea] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const hasFitRef = useRef(false);

  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const toast = useToast();
  const { aiProvider, llmManager } = useAiProvider();

  // Derived from active entry
  const activeEntry = s.chatHistory.find((e) => e.id === activeEntryId) ?? null;
  const localNodes: SageNode[] = (activeEntry?.nodes ?? []).map((n) => ({
    ...n,
    IsMyFav: (s.favorites ?? {})[n.ID] ?? false,
  }));
  const localDims: SageDimension[] = activeEntry?.dimensions ?? [];

  const generate = useCallback(
    async (branchOpts?: { displayPrompt: string; aiPrompt: string; parentEntryId?: string; parentNodeTitle?: string }) => {
      if (!user || isGenerating) return;

      const displayPrompt = branchOpts?.displayPrompt ?? input.trim();
      const aiPrompt = branchOpts?.aiPrompt ?? input.trim();
      if (!displayPrompt) {
        toast({ title: 'Enter a prompt', status: 'warning', duration: 2500, isClosable: true });
        return;
      }

      const image = branchOpts ? undefined : (attachedImage ?? undefined);
      if (image && !llmManager?.canProviderPerformTask(aiProvider, 'image')) {
        toast({
          title: 'Provider does not support images',
          description: `Your AI provider (${aiProvider || 'none'}) can't process images. Pick a vision-capable provider in your user settings.`,
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      if (!branchOpts) {
        setInput('');
        setAttachedImage(null);
      }
      positionsRef.current.clear();
      hasFitRef.current = false;

      const chatEntry = {
        id: genId(),
        prompt: displayPrompt,
        userName: username,
        userId: user._id,
        timestamp: Date.now(),
        nodes: [] as AppState['nodes'],
        dimensions: [] as AppState['dimensions'],
        parentEntryId: branchOpts?.parentEntryId,
        parentNodeTitle: branchOpts?.parentNodeTitle,
        imageUrl: image,
        pdfFilename: s.pdfContext?.filename,
      };

      setIsGenerating(true);
      setLocalStatusMessage('Determining important aspects…');
      updateState(appId, {
        ...s,
        prompt: aiPrompt,
        chatHistory: [...s.chatHistory, chatEntry],
        ...(!branchOpts && { pdfContext: null as any }),
      });

      try {
        const rawDims = await generateDimensionsFromPrompt(aiPrompt, aiProvider, s.numDimensions, image, s.pdfContext?.text);
        const dimensions: AppState['dimensions'] = [
          ...Object.entries(rawDims.categorical).map(([name, values], i) => ({ id: i, name, type: 'categorical' as const, values })),
          ...Object.entries(rawDims.ordinal).map(([name, values], i) => ({
            id: Object.keys(rawDims.categorical).length + i,
            name,
            type: 'ordinal' as const,
            values,
          })),
        ];

        setLocalStatusMessage(`Generating ${s.batchSize} responses…`);
        const newNodes: AppState['nodes'] = [];
        const results = await Promise.allSettled(
          Array.from({ length: s.batchSize }, async () => {
            const { requirements, categorical, ordinal } = buildRequirements(rawDims);
            const text = await generateNodeContent(aiPrompt, requirements, aiProvider, image, s.pdfContext?.text);
            const summary = await abstractNode(text, aiProvider);
            return {
              ID: genId(),
              Title: summary.Title,
              Summary: summary.Summary,
              Keywords: summary.Keywords,
              Steps: summary.Steps,
              Result: text,
              Structure: summary.Structure,
              Dimension: { categorical, ordinal },
              IsMyFav: false,
            };
          }),
        );
        for (const r of results) {
          if (r.status === 'fulfilled') newNodes.push(r.value);
        }
        if (newNodes.length === 0) throw new Error('All idea generations failed');

        const latest = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        const updatedHistory = (latest?.chatHistory ?? [...s.chatHistory, chatEntry]).map((e) =>
          e.id === chatEntry.id ? { ...e, nodes: newNodes, dimensions } : e,
        );
        setIsGenerating(false);
        setLocalStatusMessage('');
        updateState(appId, { ...(latest ?? s), status: 'ready', prompt: aiPrompt, chatHistory: updatedHistory });
        setActiveEntryId(chatEntry.id);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Generation failed', description: errMsg, status: 'error', duration: 5000, isClosable: true });
        setIsGenerating(false);
        setLocalStatusMessage('');
        updateState(appId, { ...s, status: 'idle' });
      }
    },
    [user, s, input, username, isGenerating, appId, attachedImage, setInput, setAttachedImage, updateState, toast, aiProvider, llmManager],
  );

  const toggleFav = useCallback(
    (nodeId: string) => {
      const current = (s.favorites ?? {})[nodeId] ?? false;
      updateState(appId, { favorites: { ...(s.favorites ?? {}), [nodeId]: !current } });
    },
    [s, appId, updateState],
  );

  const clearAll = useCallback(() => {
    updateState(appId, {
      ...s,
      status: 'idle',
      nodes: [],
      dimensions: [],
      prompt: '',
      statusMessage: '',
      chatHistory: [],
      qa: [],
      favorites: {},
      nodeImages: {},
    });
    positionsRef.current.clear();
    hasFitRef.current = false;
    setActiveEntryId(null);
  }, [s, appId, updateState]);

  const deleteEntry = useCallback(
    (entryId: string) => {
      const updated = s.chatHistory.filter((e) => e.id !== entryId);
      updateState(appId, { ...s, chatHistory: updated });
      if (activeEntryId === entryId) {
        const idx = s.chatHistory.findIndex((e) => e.id === entryId);
        const next = updated[idx - 1] ?? updated[idx] ?? null;
        setActiveEntryId(next?.id ?? null);
      }
    },
    [s, appId, activeEntryId, updateState],
  );

  const restoreSnapshot = useCallback((entry: AppState['chatHistory'][number]) => {
    if (!(entry.nodes ?? []).length) return;
    positionsRef.current.clear();
    hasFitRef.current = false;
    setActiveEntryId(entry.id);
  }, []);

  const branchFromNode = useCallback(
    (node: SageNode) => {
      const aiPrompt = [
        s.prompt,
        `\nNow explore new variations specifically inspired by this idea:`,
        `Title: "${node.Title}"`,
        node.Summary,
        node.Steps?.length ? `Steps: ${node.Steps.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      generate({ displayPrompt: node.Title, aiPrompt, parentEntryId: activeEntryId ?? undefined, parentNodeTitle: node.Title });
    },
    [s.prompt, activeEntryId, generate],
  );

  const askNodeQuestion = useCallback(
    async (node: SageNode, question: string) => {
      if (!user || askingNodeId) return;
      setAskingNodeId(node.ID);
      try {
        const context = [
          `Idea: "${node.Title}"`,
          node.Summary,
          node.Steps?.length ? `Steps: ${node.Steps.join('; ')}` : '',
          node.Result ? `Details: ${node.Result}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        const answer = await callProseAPI(`Answer in 80 words or fewer.\n\n${context}\n\nQuestion: ${question}`, aiProvider);
        const qaEntry = {
          id: genId(),
          nodeId: node.ID,
          nodeTitle: node.Title,
          question,
          answer,
          userId: user._id,
          userName: username,
          timestamp: Date.now(),
        };
        const latest = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        updateState(appId, { ...(latest ?? s), qa: [...(latest?.qa ?? s.qa ?? []), qaEntry] });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Question failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setAskingNodeId(null);
      }
    },
    [user, s, username, askingNodeId, appId, updateState, toast, aiProvider],
  );

  const addDimension = useCallback(
    async (dimName: string) => {
      if (isAddingDimension || localNodes.length === 0 || !activeEntryId) return;
      setIsAddingDimension(true);
      try {
        const nodeStubs = localNodes.map((n) => ({ ID: n.ID, Title: n.Title, Summary: n.Summary }));
        const { type, values, assignments } = await generateUserDimension(dimName, s.prompt, nodeStubs, aiProvider);
        const newDim = { id: localDims.length, name: dimName, type, values };
        const updatedNodes = localNodes.map((n) => ({
          ...n,
          Dimension: {
            categorical: type === 'categorical' ? { ...n.Dimension.categorical, [dimName]: assignments[n.ID] ?? values[0] } : n.Dimension.categorical,
            ordinal: type === 'ordinal' ? { ...n.Dimension.ordinal, [dimName]: assignments[n.ID] ?? values[0] } : n.Dimension.ordinal,
          },
        }));
        const latest = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const updatedHistory = cur.chatHistory.map((e) =>
          e.id === activeEntryId ? { ...e, nodes: updatedNodes, dimensions: [...(e.dimensions ?? []), newDim] } : e,
        );
        updateState(appId, { ...cur, chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Failed to add dimension', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setIsAddingDimension(false);
      }
    },
    [s, localNodes, localDims, activeEntryId, isAddingDimension, appId, updateState, toast, aiProvider],
  );

  const rerollNode = useCallback(
    async (nodeId: string) => {
      if (rerollingNodeId || !activeEntryId) return;
      setRerollingNodeId(nodeId);
      try {
        const latest = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const curEntry = cur.chatHistory.find((e) => e.id === activeEntryId);
        if (!curEntry) return;
        const originalNode = curEntry.nodes.find((n) => n.ID === nodeId);
        if (!originalNode) return;
        // Preserve the original node's dimension assignments so it stays in the same design-space position
        const { categorical, ordinal } = originalNode.Dimension;
        const requirements = [
          ...Object.entries(categorical).map(([name, value]) => `${name}: ${value}`),
          ...Object.entries(ordinal).map(([name, value]) => `${name}: ${value}`),
        ].join('\n');
        const text = await generateNodeContent(curEntry.prompt, requirements, aiProvider, undefined, s.pdfContext?.text);
        const summary = await abstractNode(text, aiProvider);
        const afterGen = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        const afterEntry = (afterGen ?? cur).chatHistory.find((e) => e.id === activeEntryId);
        if (!afterEntry) return;
        const updatedNodes = afterEntry.nodes.map((n) =>
          n.ID === nodeId
            ? { ...n, Title: summary.Title, Summary: summary.Summary, Keywords: summary.Keywords, Steps: summary.Steps, Result: text, Structure: summary.Structure, Dimension: { categorical, ordinal }, IsMyFav: false, imageUrl: undefined }
            : n,
        );
        const updatedHistory = (afterGen ?? cur).chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: updatedNodes } : e));
        updateState(appId, { ...(afterGen ?? cur), chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Re-roll failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setRerollingNodeId(null);
      }
    },
    [s, activeEntryId, rerollingNodeId, appId, updateState, toast, aiProvider],
  );

  const generateMore = useCallback(
    async (entry: AppState['chatHistory'][number]) => {
      const entryDims = entry.dimensions ?? [];
      if (!user || isGenerating || entryDims.length === 0) return;
      restoreSnapshot(entry);
      const rawDims = {
        categorical: Object.fromEntries(entryDims.filter((d) => d.type === 'categorical').map((d) => [d.name, d.values])),
        ordinal: Object.fromEntries(entryDims.filter((d) => d.type === 'ordinal').map((d) => [d.name, d.values])),
      };
      setIsGenerating(true);
      setLocalStatusMessage(`Generating ${s.batchSize} more ideas…`);
      const latest = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
      updateState(appId, { ...(latest ?? s) });
      try {
        const newNodes: AppState['nodes'] = [];
        const moreResults = await Promise.allSettled(
          Array.from({ length: s.batchSize }, async () => {
            const { requirements, categorical, ordinal } = buildRequirements(rawDims);
            const text = await generateNodeContent(entry.prompt, requirements, aiProvider, undefined, s.pdfContext?.text);
            const summary = await abstractNode(text, aiProvider);
            return {
              ID: genId(),
              Title: summary.Title,
              Summary: summary.Summary,
              Keywords: summary.Keywords,
              Steps: summary.Steps,
              Result: text,
              Structure: summary.Structure,
              Dimension: { categorical, ordinal },
              IsMyFav: false,
            };
          }),
        );
        for (const r of moreResults) {
          if (r.status === 'fulfilled') newNodes.push(r.value);
        }
        if (newNodes.length === 0) throw new Error('All idea generations failed');
        const afterGen = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        const cur = afterGen ?? s;
        const existingEntry = cur.chatHistory.find((e) => e.id === entry.id);
        const combinedNodes = [...(existingEntry?.nodes ?? entry.nodes), ...newNodes];
        const updatedHistory = cur.chatHistory.map((e) => (e.id === entry.id ? { ...e, nodes: combinedNodes } : e));
        setIsGenerating(false);
        setLocalStatusMessage('');
        updateState(appId, { ...cur, status: 'ready', chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Generation failed', description: msg, status: 'error', duration: 5000, isClosable: true });
        setIsGenerating(false);
        setLocalStatusMessage('');
        const afterFail = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        updateState(appId, { ...(afterFail ?? s), status: 'ready' });
      }
    },
    [user, s, isGenerating, appId, restoreSnapshot, updateState, toast, aiProvider],
  );

  const generateAt = useCallback(
    async ({ worldX, worldY, xDimName, xBlend, yDimName, yBlend }: {
      worldX: number; worldY: number;
      xDimName: string | null; xBlend: DimBlend | null;
      yDimName: string | null; yBlend: DimBlend | null;
    }) => {
      if (!activeEntryId || localDims.length === 0) return;
      setIsGeneratingAt(true);
      try {
        const { requirements, categorical, ordinal } = buildBlendedRequirements(localDims, xDimName, xBlend, yDimName, yBlend);
        const text = await generateNodeContent(s.prompt, requirements, aiProvider);
        const summary = await abstractNode(text, aiProvider);
        const newNode: AppState['nodes'][number] = {
          ID: genId(),
          Title: summary.Title,
          Summary: summary.Summary,
          Keywords: summary.Keywords,
          Steps: summary.Steps,
          Result: text,
          Structure: summary.Structure,
          Dimension: { categorical, ordinal },
          IsMyFav: false,
        };
        positionsRef.current.set(newNode.ID, { x: worldX, y: worldY });
        const latest = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const updatedHistory = cur.chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: [...e.nodes, newNode] } : e));
        updateState(appId, { ...cur, chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Generation failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setIsGeneratingAt(false);
      }
    },
    [s, localDims, activeEntryId, appId, updateState, toast, aiProvider],
  );

  const addManualIdea = useCallback(
    async (text: string) => {
      if (!activeEntryId) return;
      setIsAddingManualIdea(true);
      try {
        const summary = await abstractNode(text, aiProvider);
        const rawDims = {
          categorical: Object.fromEntries(localDims.filter((d) => d.type === 'categorical').map((d) => [d.name, d.values])),
          ordinal: Object.fromEntries(localDims.filter((d) => d.type === 'ordinal').map((d) => [d.name, d.values])),
        };
        const { categorical, ordinal } = buildRequirements(rawDims);
        const newNode: AppState['nodes'][number] = {
          ID: genId(),
          Title: summary.Title,
          Summary: summary.Summary,
          Keywords: summary.Keywords,
          Steps: summary.Steps,
          Result: text,
          Structure: summary.Structure,
          Dimension: { categorical, ordinal },
          IsMyFav: false,
        };
        const latest = useAppStore.getState().apps.find((a) => a._id === appId)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const updatedHistory = cur.chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: [...e.nodes, newNode] } : e));
        updateState(appId, { ...cur, chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Failed to add idea', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setIsAddingManualIdea(false);
      }
    },
    [s, localDims, activeEntryId, appId, updateState, toast, aiProvider],
  );

  const removeDimension = useCallback(
    (dimName: string) => {
      if (!activeEntryId) return;
      const updatedDims = localDims.filter((d) => d.name !== dimName);
      const updatedNodes = localNodes.map((n) => {
        const categorical = { ...n.Dimension.categorical };
        const ordinal = { ...n.Dimension.ordinal };
        delete categorical[dimName];
        delete ordinal[dimName];
        return { ...n, Dimension: { categorical, ordinal } };
      });
      const updatedHistory = s.chatHistory.map((e) =>
        e.id === activeEntryId ? { ...e, nodes: updatedNodes, dimensions: updatedDims } : e,
      );
      updateState(appId, { ...s, chatHistory: updatedHistory });
    },
    [s, localNodes, localDims, activeEntryId, appId, updateState],
  );

  const summarizeFavorites = useCallback(async () => {
    const favNodes = localNodes.filter((n) => n.IsMyFav);
    if (favNodes.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeFavoritesAPI(
        favNodes.map((n) => ({ Title: n.Title, Summary: n.Summary, Keywords: n.Keywords })),
        s.prompt,
        aiProvider,
      );
      const header = `★ Favorites Summary\nTopic: ${s.prompt}\n\n`;
      const footer = `\n\nFavorites: ${favNodes.map((n) => n.Title).join(', ')}`;
      await createApp({
        title: 'Favorites Summary',
        roomId,
        boardId,
        position: { x: appPosition.x + appSize.width + 20, y: appPosition.y, z: 0 },
        size: { width: 420, height: 520, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Stickie',
        state: {
          text: header + summary + footer,
          fontSize: 18,
          color: 'yellow',
          lock: false,
          sources: [appId],
          executeInfo: { executeFunc: '', params: {} },
        },
        raised: true,
        dragging: false,
        pinned: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Summary failed', description: msg, status: 'error', duration: 4000, isClosable: true });
    } finally {
      setIsSummarizing(false);
    }
  }, [localNodes, s, isSummarizing, appId, boardId, roomId, appPosition, appSize, createApp, updateState, toast, aiProvider]);

  const branchFromFavorites = useCallback(() => {
    const favNodes = localNodes.filter((n) => n.IsMyFav);
    if (favNodes.length === 0) return;
    const ideasList = favNodes.map((n, i) => `${i + 1}. "${n.Title}": ${n.Summary}`).join('\n');
    const aiPrompt = [
      s.prompt ? `Original topic: ${s.prompt}` : '',
      `\nThe following ideas were favorited from the previous exploration:\n${ideasList}`,
      `\nNow generate new ideas that build on, combine, or extend the themes from these favorites. Explore adjacent variations that share their strengths.`,
    ]
      .filter(Boolean)
      .join('\n');
    const displayPrompt = `Branch from ${favNodes.length} favorite${favNodes.length > 1 ? 's' : ''}: ${favNodes.map((n) => n.Title).join(', ')}`;
    generate({ displayPrompt, aiPrompt, parentEntryId: activeEntryId ?? undefined });
  }, [localNodes, s.prompt, activeEntryId, generate]);

  return {
    // Derived state
    activeEntryId,
    activeEntry,
    localNodes,
    localDims,
    // Loading flags
    isGenerating,
    localStatusMessage,
    askingNodeId,
    isAddingDimension,
    rerollingNodeId,
    isGeneratingAt,
    isAddingManualIdea,
    isSummarizing,
    // Refs for canvas
    positionsRef,
    hasFitRef,
    // Actions
    generate,
    toggleFav,
    clearAll,
    deleteEntry,
    restoreSnapshot,
    branchFromNode,
    askNodeQuestion,
    addDimension,
    rerollNode,
    generateMore,
    generateAt,
    addManualIdea,
    removeDimension,
    summarizeFavorites,
    branchFromFavorites,
  };
}
