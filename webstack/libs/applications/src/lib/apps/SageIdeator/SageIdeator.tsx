/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect, useCallback } from 'react';

import { format } from 'date-fns/format';

import { Flex, Box, Button, IconButton, Tooltip, useToast, useColorModeValue } from '@chakra-ui/react';
import { MdFileDownload, MdChat, MdChevronLeft, MdChevronRight } from 'react-icons/md';

import { useAppStore, useHexColor, useUser, downloadFile } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

// PDF load legacy pdf build
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.min.mjs');
// PDF worker for Node.js
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
// PDF fonts
const CMAP_URL = './node_modules/pdfjs-dist/cmaps/';
const FONT_URL = './node_modules/pdfjs-dist/standard_fonts/';
const CMAP_PACKED = true;

import {
  generateDimensionsFromPrompt,
  generateNodeContent,
  abstractNode,
  buildRequirements,
  callProseAPI,
  generateUserDimension,
  VISION_MODELS,
  summarizeFavorites as summarizeFavoritesAPI,
  generateNodeImage,
} from './openai';

// ─── PDF text extraction ──────────────────────────────────────────────────────
const MAX_PDF_CHARS = 5000;

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages && text.length < MAX_PDF_CHARS; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n';
  }
  return text.slice(0, MAX_PDF_CHARS);
}
import { ChatPanel } from './ChatPanel';
import { VisualizationCanvas, DimBlend } from './VisualizationCanvas';
import { QAPanel } from './QAPanel';

type SageNode = AppState['nodes'][number];

// ─── Blended requirements builder ────────────────────────────────────────────

function buildBlendedRequirements(
  dims: AppState['dimensions'],
  xDimName: string | null,
  xBlend: DimBlend | null,
  yDimName: string | null,
  yBlend: DimBlend | null,
): { requirements: string; categorical: Record<string, string>; ordinal: Record<string, string> } {
  let req = '';
  const categorical: Record<string, string> = {};
  const ordinal: Record<string, string> = {};

  for (const dim of dims) {
    const blend = dim.name === xDimName ? xBlend : dim.name === yDimName ? yBlend : null;
    let assignedValue: string;

    if (blend) {
      if (blend.secondary === null || blend.primaryWeight === 1) {
        req += `${dim.name}: ${blend.primary}\n`;
        assignedValue = blend.primary;
      } else if (blend.primaryWeight >= 0.65) {
        req += `${dim.name}: primarily "${blend.primary}" with some "${blend.secondary}" influence\n`;
        assignedValue = blend.primary;
      } else {
        const pct = Math.round(blend.primaryWeight * 100);
        const sPct = 100 - pct;
        req += `${dim.name}: blend of "${blend.primary}" (${pct}%) and "${blend.secondary}" (${sPct}%)\n`;
        assignedValue = blend.primary;
      }
    } else {
      assignedValue = dim.values[Math.floor(Math.random() * dim.values.length)];
      req += `${dim.name}: ${assignedValue}\n`;
    }

    if (dim.type === 'categorical') categorical[dim.name] = assignedValue;
    else ordinal[dim.name] = assignedValue;
  }

  return { requirements: req, categorical, ordinal };
}

// ─── AppComponent ─────────────────────────────────────────────────────────────

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { user } = useUser();
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const toast = useToast();

  // Theme
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const bgHex = useHexColor(bgColor);
  const panelBg = useColorModeValue('gray.50', 'gray.600');
  const panelBgHex = useHexColor(panelBg);
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const borderHex = useHexColor(borderColor);

  // Input / UI state
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [askingNodeId, setAskingNodeId] = useState<string | null>(null);
  const [selectedQANodeId, setSelectedQANodeId] = useState<string | null>(null);
  const [qaPanelOpen, setQaPanelOpen] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [isAddingDimension, setIsAddingDimension] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [generatingImageNodeId, setGeneratingImageNodeId] = useState<string | null>(null);
  const [rerollingNodeId, setRerollingNodeId] = useState<string | null>(null);
  const [isGeneratingAt, setIsGeneratingAt] = useState(false);
  const [isAddingManualIdea, setIsAddingManualIdea] = useState(false);
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [localStatusMessage, setLocalStatusMessage] = useState('');

  // Refs shared with VisualizationCanvas
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const hasFitRef = useRef(false);

  // Per-user local view — derived from the active chatHistory entry
  const activeEntry = s.chatHistory.find((e) => e.id === activeEntryId) ?? null;
  const localNodes = activeEntry?.nodes ?? [];
  const localDims = activeEntry?.dimensions ?? [];

  useEffect(() => {
    if (user) setUsername(user.data.name.split(' ')[0]);
  }, [user]);

  // ── Setup save ──


  // ── PDF context ──
  const handleAttachPdf = useCallback(
    async (file: File) => {
      setIsLoadingPdf(true);
      try {
        const text = await extractPdfText(file);
        updateState(props._id, { ...s, pdfContext: { filename: file.name, text } });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'PDF extraction failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setIsLoadingPdf(false);
      }
    },
    [s, props._id],
  );

  const handleClearPdf = useCallback(() => {
    updateState(props._id, { ...s, pdfContext: undefined });
  }, [s, props._id]);

  // ── Generation ──

  const generate = useCallback(
    async (branchOpts?: { displayPrompt: string; aiPrompt: string; parentEntryId?: string; parentNodeTitle?: string }) => {
      if (!user || isGenerating) return;

      const displayPrompt = branchOpts?.displayPrompt ?? input.trim();
      const aiPrompt = branchOpts?.aiPrompt ?? input.trim();
      if (!displayPrompt) {
        toast({ title: 'Enter a prompt', status: 'warning', duration: 2500, isClosable: true });
        return;
      }

      // Guard: image attached but model doesn't support vision
      const image = branchOpts ? undefined : (attachedImage ?? undefined);
      if (image && !VISION_MODELS.has(s.model)) {
        toast({
          title: 'Model does not support images',
          description: `Switch to a vision-capable model (e.g. gpt-4o-mini) to use image prompts.`,
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
        return;
      }

      if (!branchOpts) {
        setInput('');
        setAttachedImage(null);
        updateState(props._id, { ...s, pdfContext: undefined });
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
      updateState(props._id, {
        ...s,
        prompt: aiPrompt,
        chatHistory: [...s.chatHistory, chatEntry],
      });

      try {
        const rawDims = await generateDimensionsFromPrompt(aiPrompt, s.apiKey, s.model, s.numDimensions, image, s.pdfContext?.text);

        const dimensions: AppState['dimensions'] = [
          ...Object.entries(rawDims.categorical).map(([name, values], i) => ({
            id: i,
            name,
            type: 'categorical' as const,
            values,
          })),
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
            const text = await generateNodeContent(aiPrompt, requirements, s.apiKey, s.model, image, s.pdfContext?.text);
            const summary = await abstractNode(text, s.apiKey, s.model);
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

        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const updatedHistory = (latest?.chatHistory ?? [...s.chatHistory, chatEntry]).map((e) =>
          e.id === chatEntry.id ? { ...e, nodes: newNodes, dimensions } : e,
        );
        setIsGenerating(false);
        setLocalStatusMessage('');
        updateState(props._id, {
          ...(latest ?? s),
          status: 'ready',
          prompt: aiPrompt,
          chatHistory: updatedHistory,
        });

        setActiveEntryId(chatEntry.id);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Generation failed', description: errMsg, status: 'error', duration: 5000, isClosable: true });
        setIsGenerating(false);
        setLocalStatusMessage('');
        updateState(props._id, { ...s, status: 'idle' });
      }
    },
    [user, s, input, username, isGenerating, props._id, attachedImage],
  );

  const toggleFav = (nodeId: string) => {
    if (!activeEntryId) return;
    const updatedNodes = localNodes.map((n) => (n.ID === nodeId ? { ...n, IsMyFav: !n.IsMyFav } : n));
    const updatedHistory = s.chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: updatedNodes } : e));
    updateState(props._id, { ...s, chatHistory: updatedHistory });
  };

  const clearAll = () => {
    updateState(props._id, {
      ...s,
      status: 'idle',
      nodes: [],
      dimensions: [],
      prompt: '',
      statusMessage: '',
      chatHistory: [],
      qa: [],
    });
    positionsRef.current.clear();
    hasFitRef.current = false;
    setActiveEntryId(null);
  };

  const deleteEntry = useCallback(
    (entryId: string) => {
      const updated = s.chatHistory.filter((e) => e.id !== entryId);
      updateState(props._id, { ...s, chatHistory: updated });
      if (activeEntryId === entryId) {
        // Switch to the previous remaining entry, if any
        const idx = s.chatHistory.findIndex((e) => e.id === entryId);
        const next = updated[idx - 1] ?? updated[idx] ?? null;
        setActiveEntryId(next?.id ?? null);
      }
    },
    [s, props._id, activeEntryId],
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
      generate({
        displayPrompt: node.Title,
        aiPrompt,
        parentEntryId: activeEntryId ?? undefined,
        parentNodeTitle: node.Title,
      });
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
        const answer = await callProseAPI(`${context}\n\nQuestion: ${question}`, s.apiKey, s.model);
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
        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        updateState(props._id, { ...(latest ?? s), qa: [...(latest?.qa ?? s.qa ?? []), qaEntry] });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Question failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setAskingNodeId(null);
      }
    },
    [user, s, username, askingNodeId, props._id],
  );

  // ── Dimension management ──

  const addDimension = useCallback(
    async (dimName: string) => {
      if (isAddingDimension || localNodes.length === 0 || !activeEntryId) return;
      setIsAddingDimension(true);
      try {
        const nodeStubs = localNodes.map((n) => ({ ID: n.ID, Title: n.Title, Summary: n.Summary }));
        const { type, values, assignments } = await generateUserDimension(dimName, s.prompt, nodeStubs, s.apiKey, s.model);
        const newDim = { id: localDims.length, name: dimName, type, values };
        const updatedNodes = localNodes.map((n) => ({
          ...n,
          Dimension: {
            categorical:
              type === 'categorical' ? { ...n.Dimension.categorical, [dimName]: assignments[n.ID] ?? values[0] } : n.Dimension.categorical,
            ordinal: type === 'ordinal' ? { ...n.Dimension.ordinal, [dimName]: assignments[n.ID] ?? values[0] } : n.Dimension.ordinal,
          },
        }));
        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const updatedHistory = cur.chatHistory.map((e) =>
          e.id === activeEntryId ? { ...e, nodes: updatedNodes, dimensions: [...(e.dimensions ?? []), newDim] } : e,
        );
        updateState(props._id, { ...cur, chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Failed to add dimension', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setIsAddingDimension(false);
      }
    },
    [s, localNodes, localDims, activeEntryId, isAddingDimension, props._id],
  );

  const rerollNode = useCallback(
    async (nodeId: string) => {
      if (rerollingNodeId || !activeEntryId) return;
      setRerollingNodeId(nodeId);
      try {
        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const curEntry = cur.chatHistory.find((e) => e.id === activeEntryId);
        if (!curEntry) return;
        const rawDims = {
          categorical: Object.fromEntries(curEntry.dimensions.filter((d) => d.type === 'categorical').map((d) => [d.name, d.values])),
          ordinal: Object.fromEntries(curEntry.dimensions.filter((d) => d.type === 'ordinal').map((d) => [d.name, d.values])),
        };
        const { requirements, categorical, ordinal } = buildRequirements(rawDims);
        const text = await generateNodeContent(curEntry.prompt, requirements, s.apiKey, s.model, undefined, s.pdfContext?.text);
        const summary = await abstractNode(text, s.apiKey, s.model);
        const afterGen = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const afterEntry = (afterGen ?? cur).chatHistory.find((e) => e.id === activeEntryId);
        if (!afterEntry) return;
        const updatedNodes = afterEntry.nodes.map((n) =>
          n.ID === nodeId
            ? {
                ...n,
                Title: summary.Title,
                Summary: summary.Summary,
                Keywords: summary.Keywords,
                Steps: summary.Steps,
                Result: text,
                Structure: summary.Structure,
                Dimension: { categorical, ordinal },
                IsMyFav: false,
                imageUrl: undefined,
              }
            : n,
        );
        const updatedHistory = (afterGen ?? cur).chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: updatedNodes } : e));
        updateState(props._id, { ...(afterGen ?? cur), chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Re-roll failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setRerollingNodeId(null);
      }
    },
    [s, localNodes, activeEntryId, rerollingNodeId, props._id],
  );

  const generateMore = useCallback(
    async (entry: AppState['chatHistory'][number]) => {
      const entryDims = entry.dimensions ?? [];
      if (!user || isGenerating || entryDims.length === 0) return;
      // Restore the entry's snapshot first so the canvas shows the right nodes
      restoreSnapshot(entry);
      const rawDims = {
        categorical: Object.fromEntries(entryDims.filter((d) => d.type === 'categorical').map((d) => [d.name, d.values])),
        ordinal: Object.fromEntries(entryDims.filter((d) => d.type === 'ordinal').map((d) => [d.name, d.values])),
      };
      setIsGenerating(true);
      setLocalStatusMessage(`Generating ${s.batchSize} more ideas…`);
      const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
      updateState(props._id, { ...(latest ?? s) });
      try {
        const newNodes: AppState['nodes'] = [];
        const moreResults = await Promise.allSettled(
          Array.from({ length: s.batchSize }, async () => {
            const { requirements, categorical, ordinal } = buildRequirements(rawDims);
            const text = await generateNodeContent(entry.prompt, requirements, s.apiKey, s.model, undefined, s.pdfContext?.text);
            const summary = await abstractNode(text, s.apiKey, s.model);
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
        const afterGen = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const cur = afterGen ?? s;
        const existingEntry = cur.chatHistory.find((e) => e.id === entry.id);
        const combinedNodes = [...(existingEntry?.nodes ?? entry.nodes), ...newNodes];
        const updatedHistory = cur.chatHistory.map((e) => (e.id === entry.id ? { ...e, nodes: combinedNodes } : e));
        setIsGenerating(false);
        setLocalStatusMessage('');
        updateState(props._id, { ...cur, status: 'ready', chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Generation failed', description: msg, status: 'error', duration: 5000, isClosable: true });
        setIsGenerating(false);
        setLocalStatusMessage('');
        const afterFail = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        updateState(props._id, { ...(afterFail ?? s), status: 'ready' });
      }
    },
    [user, s, isGenerating, props._id, restoreSnapshot],
  );

  const generateImageForNode = useCallback(
    async (nodeId: string) => {
      if (generatingImageNodeId || !activeEntryId) return;
      const node = localNodes.find((n) => n.ID === nodeId);
      if (!node) return;
      setGeneratingImageNodeId(nodeId);
      try {
        const url = await generateNodeImage(node.Title, node.Summary, node.Keywords, s.apiKey, s.prompt, node.Dimension);
        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const updatedNodes = (cur.chatHistory.find((e) => e.id === activeEntryId)?.nodes ?? localNodes).map((n) =>
          n.ID === nodeId ? { ...n, imageUrl: url } : n,
        );
        const updatedHistory = cur.chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: updatedNodes } : e));
        updateState(props._id, { ...cur, chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Image generation failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setGeneratingImageNodeId(null);
      }
    },
    [s, localNodes, activeEntryId, generatingImageNodeId, props._id],
  );

  const summarizeFavorites = useCallback(async () => {
    const favNodes = localNodes.filter((n) => n.IsMyFav);
    if (favNodes.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeFavoritesAPI(
        favNodes.map((n) => ({ Title: n.Title, Summary: n.Summary, Keywords: n.Keywords })),
        s.prompt,
        s.apiKey,
        s.model,
      );
      const header = `★ Favorites Summary\nTopic: ${s.prompt}\n\n`;
      const footer = `\n\nFavorites: ${favNodes.map((n) => n.Title).join(', ')}`;
      await createApp({
        title: 'Favorites Summary',
        roomId: props.data.roomId,
        boardId: props.data.boardId,
        position: { x: props.data.position.x + props.data.size.width + 20, y: props.data.position.y, z: 0 },
        size: { width: 420, height: 520, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'Stickie',
        state: {
          text: header + summary + footer,
          fontSize: 18,
          color: 'yellow',
          lock: false,
          sources: [props._id],
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
  }, [localNodes, s.prompt, s.apiKey, s.model, isSummarizing, props._id, props.data, createApp]);

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
    generate({
      displayPrompt,
      aiPrompt,
      parentEntryId: activeEntryId ?? undefined,
    });
  }, [localNodes, s.prompt, activeEntryId, generate]);

  const generateAt = useCallback(
    async ({
      worldX,
      worldY,
      xDimName,
      xBlend,
      yDimName,
      yBlend,
    }: {
      worldX: number;
      worldY: number;
      xDimName: string | null;
      xBlend: DimBlend | null;
      yDimName: string | null;
      yBlend: DimBlend | null;
    }) => {
      if (!activeEntryId || localDims.length === 0) return;
      setIsGeneratingAt(true);
      try {
        const { requirements, categorical, ordinal } = buildBlendedRequirements(localDims, xDimName, xBlend, yDimName, yBlend);
        const text = await generateNodeContent(s.prompt, requirements, s.apiKey, s.model);
        const summary = await abstractNode(text, s.apiKey, s.model);
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
        // Seed the position near where the user clicked so the simulation starts there
        positionsRef.current.set(newNode.ID, { x: worldX, y: worldY });
        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const updatedHistory = cur.chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: [...e.nodes, newNode] } : e));
        updateState(props._id, { ...cur, chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Generation failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setIsGeneratingAt(false);
      }
    },
    [s, localDims, activeEntryId, props._id, positionsRef],
  );

  const addManualIdea = useCallback(
    async (text: string) => {
      if (!activeEntryId) return;
      setIsAddingManualIdea(true);
      try {
        const summary = await abstractNode(text, s.apiKey, s.model);
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
        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const updatedHistory = cur.chatHistory.map((e) => (e.id === activeEntryId ? { ...e, nodes: [...e.nodes, newNode] } : e));
        updateState(props._id, { ...cur, chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Failed to add idea', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setIsAddingManualIdea(false);
      }
    },
    [s, localDims, activeEntryId, props._id],
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
      updateState(props._id, { ...s, chatHistory: updatedHistory });
    },
    [s, localNodes, localDims, activeEntryId, props._id],
  );

  // ── Setup screen ──

  // ── Q&A helpers ──

  const qaNode = selectedQANodeId ? (localNodes.find((n) => n.ID === selectedQANodeId) ?? null) : null;
  const nodeQAEntries = (s.qa ?? []).filter((e) => e.nodeId === selectedQANodeId);

  const submitQA = () => {
    const q = qaInput.trim();
    if (!q || !qaNode || askingNodeId) return;
    askNodeQuestion(qaNode, q);
    setQaInput('');
  };

  // ── Main render ──

  return (
    <AppWindow app={props} hideBackgroundIcon={MdChat}>
      <Flex h="100%" w="100%" direction="row" bg={bgHex} position="relative">
        {chatPanelOpen && (
          <ChatPanel
            chatHistory={s.chatHistory}
            nodes={localNodes}
            dimensions={localDims}
            status={localNodes.length > 0 ? 'ready' : s.status}
            statusMessage={localStatusMessage}
            isGenerating={isGenerating}
            activeEntryId={activeEntryId}
            input={input}
            panelBgHex={panelBgHex}
            borderHex={borderHex}
            textColor={textColor}
            onInputChange={setInput}
            onGenerate={() => generate()}
            onGenerateMore={generateMore}
            onClearAll={clearAll}
            onRestoreSnapshot={restoreSnapshot}
            onEditPrompt={setInput}
            onDeleteEntry={deleteEntry}
            attachedImage={attachedImage}
            onAttachImage={setAttachedImage}
            pdfFilename={s.pdfContext?.filename ?? null}
            onAttachPdf={handleAttachPdf}
            onClearPdf={handleClearPdf}
            isLoadingPdf={isLoadingPdf}
            numDimensions={s.numDimensions}
            batchSize={s.batchSize}
            onNumDimensionsChange={(n) => updateState(props._id, { ...s, numDimensions: n })}
            onBatchSizeChange={(n) => updateState(props._id, { ...s, batchSize: n })}
          />
        )}

        {/* Toggle button pinned to the left edge of the canvas, vertically centered */}
        <Box position="relative" zIndex={30} flexShrink={0}>
          <Tooltip label={chatPanelOpen ? 'Hide panel' : 'Show panel'} placement="right" hasArrow openDelay={400}>
            <IconButton
              aria-label="Toggle chat panel"
              icon={chatPanelOpen ? <MdChevronLeft /> : <MdChevronRight />}
              size="xs"
              variant="solid"
              colorScheme="gray"
              position="absolute"
              top={0}
              left={0}
              h="28px"
              minW="14px"
              w="14px"
              borderRadius="0 4px 4px 0"
              onClick={() => setChatPanelOpen((v) => !v)}
            />
          </Tooltip>
        </Box>

        <VisualizationCanvas
          nodes={localNodes}
          dimensions={localDims}
          appId={props._id}
          bgHex={bgHex}
          panelBgHex={panelBgHex}
          borderHex={borderHex}
          textColor={textColor}
          status={localNodes.length > 0 ? 'ready' : s.status}
          statusMessage={localStatusMessage}
          isGenerating={isGenerating}
          askingNodeId={askingNodeId}
          selectedQANodeId={selectedQANodeId}
          qaPanelOpen={qaPanelOpen}
          positionsRef={positionsRef}
          hasFitRef={hasFitRef}
          onToggleFav={toggleFav}
          onBranch={branchFromNode}
          onSelectQA={(nodeId) => {
            setSelectedQANodeId(nodeId);
            setQaPanelOpen(true);
            setQaInput('');
          }}
          onAddDimension={addDimension}
          onRemoveDimension={removeDimension}
          isAddingDimension={isAddingDimension}
          onBranchFavorites={branchFromFavorites}
          onSummarizeFavorites={summarizeFavorites}
          isSummarizing={isSummarizing}
          onGenerateImage={generateImageForNode}
          generatingImageNodeId={generatingImageNodeId}
          onReroll={rerollNode}
          rerollingNodeId={rerollingNodeId}
          onGenerateAt={generateAt}
          isGeneratingAt={isGeneratingAt}
          onAddManualIdea={addManualIdea}
          isAddingManualIdea={isAddingManualIdea}
        />

        {qaPanelOpen && (
          <QAPanel
            node={qaNode}
            qaEntries={nodeQAEntries}
            askingNodeId={askingNodeId}
            qaInput={qaInput}
            panelBgHex={panelBgHex}
            borderHex={borderHex}
            textColor={textColor}
            onQaInputChange={setQaInput}
            onSubmit={submitQA}
            onClose={() => setQaPanelOpen(false)}
          />
        )}
      </Flex>
    </AppWindow>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;

  const downloadTxt = () => {
    const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    let content = `SageIdeator Export — ${dt}\n\n`;
    s.chatHistory.forEach((entry) => {
      content += `=== Prompt: ${entry.prompt} ===\n\n`;
      (entry.nodes ?? []).forEach((n, i) => {
        content += `--- Idea ${i + 1}: ${n.Title} ---\n`;
        content += `Keywords: ${n.Keywords.join(', ')}\n`;
        content += `Summary: ${n.Summary}\n`;
        content += n.Result + '\n\n';
      });
    });
    const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    downloadFile(url, `ideator-${dt}.txt`);
  };

  return (
    <>
      <Tooltip placement="top" hasArrow label="Download ideas as text" openDelay={400}>
        <Button size="xs" colorScheme="teal" variant="solid" onClick={downloadTxt} px={2} mx={1}>
          <MdFileDownload fontSize="14px" />
        </Button>
      </Tooltip>
    </>
  );
}

const GroupedToolbarComponent = () => null;

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
