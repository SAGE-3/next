/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Flex, Box, Button, IconButton, Tooltip, useToast, useColorModeValue } from '@chakra-ui/react';
import { MdFileDownload, MdKey, MdChat, MdChevronLeft, MdChevronRight } from 'react-icons/md';

import { format } from 'date-fns/format';
import { useAppStore, useHexColor, useUser, downloadFile } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

import { generateDimensionsFromPrompt, generateNodeContent, abstractNode, buildRequirements, callProseAPI, generateUserDimension, VISION_MODELS, summarizeFavorites as summarizeFavoritesAPI, generateNodeImage } from './openai';
import { SetupScreen } from './SetupScreen';
import { ChatPanel } from './ChatPanel';
import { VisualizationCanvas } from './VisualizationCanvas';
import { QAPanel } from './QAPanel';

type SageNode = AppState['nodes'][number];

// ─── AppComponent ─────────────────────────────────────────────────────────────

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const { user } = useUser();
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);
  const toast = useToast();

  // Theme
  const bgColor = useColorModeValue('gray.100', 'gray.800');
  const bgHex = useHexColor(bgColor);
  const panelBg = useColorModeValue('white', 'gray.700');
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
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Refs shared with VisualizationCanvas
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const hasFitRef = useRef(false);

  const isGenerating = s.status === 'generating_dimensions' || s.status === 'generating_responses';

  useEffect(() => {
    if (user) setUsername(user.data.name.split(' ')[0]);
  }, [user]);

  // ── Setup save ──

  const handleSetupSave = (apiKey: string, model: string, batchSize: number, numDimensions: number) => {
    updateState(props._id, { ...s, apiKey, model, batchSize, numDimensions });
  };

  // ── Generation ──

  const generate = useCallback(
    async (branchOpts?: {
      displayPrompt: string;
      aiPrompt: string;
      parentEntryId?: string;
      parentNodeTitle?: string;
    }) => {
      if (!user || !s.apiKey || isGenerating) return;

      const displayPrompt = branchOpts?.displayPrompt ?? input.trim();
      const aiPrompt = branchOpts?.aiPrompt ?? input.trim();
      if (!displayPrompt) {
        toast({ title: 'Enter a prompt', status: 'warning', duration: 2500, isClosable: true });
        return;
      }

      // Guard: image attached but model doesn't support vision
      const image = branchOpts ? undefined : attachedImage ?? undefined;
      if (image && !VISION_MODELS.has(s.model)) {
        toast({
          title: 'Model does not support images',
          description: `Switch to a vision-capable model (e.g. gpt-4o-mini) to use image prompts.`,
          status: 'warning', duration: 4000, isClosable: true,
        });
        return;
      }

      if (!branchOpts) { setInput(''); setAttachedImage(null); }
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
      };

      updateState(props._id, {
        ...s,
        status: 'generating_dimensions',
        statusMessage: 'Determining important aspects…',
        prompt: aiPrompt,
        nodes: [],
        dimensions: [],
        chatHistory: [...s.chatHistory, chatEntry],
      });

      try {
        const rawDims = await generateDimensionsFromPrompt(aiPrompt, s.apiKey, s.model, s.numDimensions, image);

        const dimensions: AppState['dimensions'] = [
          ...Object.entries(rawDims.categorical).map(([name, values], i) => ({
            id: i, name, type: 'categorical' as const, values,
          })),
          ...Object.entries(rawDims.ordinal).map(([name, values], i) => ({
            id: Object.keys(rawDims.categorical).length + i, name, type: 'ordinal' as const, values,
          })),
        ];

        const afterDims = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        updateState(props._id, {
          ...(afterDims ?? s),
          status: 'generating_responses',
          statusMessage: `Generating ${s.batchSize} responses…`,
          dimensions,
          prompt: aiPrompt,
          nodes: [],
        });

        const newNodes: AppState['nodes'] = [];

        await Promise.all(
          Array.from({ length: s.batchSize }, async () => {
            const { requirements, categorical, ordinal } = buildRequirements(rawDims);
            const text = await generateNodeContent(aiPrompt, requirements, s.apiKey, s.model, image);
            const summary = await abstractNode(text, s.apiKey, s.model);
            newNodes.push({
              ID: genId(),
              Title: summary.Title,
              Summary: summary.Summary,
              Keywords: summary.Keywords,
              Steps: summary.Steps,
              Result: text,
              Structure: summary.Structure,
              Dimension: { categorical, ordinal },
              IsMyFav: false,
            });
          })
        );

        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const updatedHistory = (latest?.chatHistory ?? [...s.chatHistory, chatEntry]).map((e) =>
          e.id === chatEntry.id ? { ...e, nodes: newNodes, dimensions } : e
        );
        updateState(props._id, {
          ...(latest ?? s),
          status: 'ready',
          statusMessage: '',
          nodes: newNodes,
          dimensions,
          prompt: aiPrompt,
          chatHistory: updatedHistory,
        });

        setActiveEntryId(chatEntry.id);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Generation failed', description: errMsg, status: 'error', duration: 5000, isClosable: true });
        updateState(props._id, { ...s, status: 'idle', statusMessage: '' });
      }
    },
    [user, s, input, username, isGenerating, props._id]
  );

  const toggleFav = (nodeId: string) => {
    const updated = s.nodes.map((n) => (n.ID === nodeId ? { ...n, IsMyFav: !n.IsMyFav } : n));
    updateState(props._id, { ...s, nodes: updated });
  };

  const clearAll = () => {
    updateState(props._id, {
      ...s, status: 'idle', nodes: [], dimensions: [], prompt: '', statusMessage: '', chatHistory: [], qa: [],
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
    [s, props._id, activeEntryId]
  );

  const restoreSnapshot = useCallback(
    (entry: AppState['chatHistory'][number]) => {
      const entryNodes = entry.nodes ?? [];
      const entryDims = entry.dimensions ?? [];
      if (!entryNodes.length) return;
      updateState(props._id, {
        ...s, nodes: entryNodes, dimensions: entryDims, prompt: entry.prompt, status: 'ready', statusMessage: '',
      });
      positionsRef.current.clear();
      hasFitRef.current = false;
      setActiveEntryId(entry.id);
    },
    [s, props._id]
  );

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
    [s.prompt, activeEntryId, generate]
  );

  const askNodeQuestion = useCallback(
    async (node: SageNode, question: string) => {
      if (!user || !s.apiKey || askingNodeId) return;
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
    [user, s, username, askingNodeId, props._id]
  );

  // ── Dimension management ──

  const addDimension = useCallback(
    async (dimName: string) => {
      if (!s.apiKey || isAddingDimension || s.nodes.length === 0) return;
      setIsAddingDimension(true);
      try {
        const nodeStubs = s.nodes.map((n) => ({ ID: n.ID, Title: n.Title, Summary: n.Summary }));
        const { type, values, assignments } = await generateUserDimension(dimName, s.prompt, nodeStubs, s.apiKey, s.model);

        const newDim = { id: s.dimensions.length, name: dimName, type, values };

        const updatedNodes = s.nodes.map((n) => ({
          ...n,
          Dimension: {
            categorical: type === 'categorical'
              ? { ...n.Dimension.categorical, [dimName]: assignments[n.ID] ?? values[0] }
              : n.Dimension.categorical,
            ordinal: type === 'ordinal'
              ? { ...n.Dimension.ordinal, [dimName]: assignments[n.ID] ?? values[0] }
              : n.Dimension.ordinal,
          },
        }));

        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        updateState(props._id, {
          ...(latest ?? s),
          dimensions: [...(latest ?? s).dimensions, newDim],
          nodes: updatedNodes,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Failed to add dimension', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setIsAddingDimension(false);
      }
    },
    [s, isAddingDimension, props._id]
  );

  const rerollNode = useCallback(
    async (nodeId: string) => {
      if (rerollingNodeId) return;
      setRerollingNodeId(nodeId);
      try {
        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const cur = latest ?? s;
        const rawDims = {
          categorical: Object.fromEntries(cur.dimensions.filter((d) => d.type === 'categorical').map((d) => [d.name, d.values])),
          ordinal: Object.fromEntries(cur.dimensions.filter((d) => d.type === 'ordinal').map((d) => [d.name, d.values])),
        };
        const { requirements, categorical, ordinal } = buildRequirements(rawDims);
        const text = await generateNodeContent(cur.prompt, requirements, s.apiKey, s.model);
        const summary = await abstractNode(text, s.apiKey, s.model);
        const afterGen = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const updatedNodes = (afterGen ?? cur).nodes.map((n) =>
          n.ID === nodeId
            ? { ...n, Title: summary.Title, Summary: summary.Summary, Keywords: summary.Keywords, Steps: summary.Steps, Result: text, Structure: summary.Structure, Dimension: { categorical, ordinal }, IsMyFav: false, imageUrl: undefined }
            : n
        );
        updateState(props._id, { ...(afterGen ?? cur), nodes: updatedNodes });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Re-roll failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setRerollingNodeId(null);
      }
    },
    [s, rerollingNodeId, props._id]
  );

  const generateMore = useCallback(
    async (entry: AppState['chatHistory'][number]) => {
      const entryDims = entry.dimensions ?? [];
      if (!user || !s.apiKey || isGenerating || entryDims.length === 0) return;
      // Restore the entry's snapshot first so the canvas shows the right nodes
      restoreSnapshot(entry);
      const rawDims = {
        categorical: Object.fromEntries(entryDims.filter((d) => d.type === 'categorical').map((d) => [d.name, d.values])),
        ordinal: Object.fromEntries(entryDims.filter((d) => d.type === 'ordinal').map((d) => [d.name, d.values])),
      };
      const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
      updateState(props._id, { ...(latest ?? s), status: 'generating_responses', statusMessage: `Generating ${s.batchSize} more ideas…` });
      try {
        const newNodes: AppState['nodes'] = [];
        await Promise.all(
          Array.from({ length: s.batchSize }, async () => {
            const { requirements, categorical, ordinal } = buildRequirements(rawDims);
            const text = await generateNodeContent(entry.prompt, requirements, s.apiKey, s.model);
            const summary = await abstractNode(text, s.apiKey, s.model);
            newNodes.push({ ID: genId(), Title: summary.Title, Summary: summary.Summary, Keywords: summary.Keywords, Steps: summary.Steps, Result: text, Structure: summary.Structure, Dimension: { categorical, ordinal }, IsMyFav: false });
          })
        );
        const afterGen = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const combinedNodes = [...(afterGen ?? s).nodes, ...newNodes];
        const updatedHistory = (afterGen ?? s).chatHistory.map((e) =>
          e.id === entry.id ? { ...e, nodes: combinedNodes } : e
        );
        updateState(props._id, { ...(afterGen ?? s), status: 'ready', statusMessage: '', nodes: combinedNodes, chatHistory: updatedHistory });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Generation failed', description: msg, status: 'error', duration: 5000, isClosable: true });
        const afterFail = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        updateState(props._id, { ...(afterFail ?? s), status: 'ready', statusMessage: '' });
      }
    },
    [user, s, isGenerating, props._id, restoreSnapshot]
  );

  const generateImageForNode = useCallback(
    async (nodeId: string) => {
      if (generatingImageNodeId) return;
      const node = s.nodes.find((n) => n.ID === nodeId);
      if (!node) return;
      setGeneratingImageNodeId(nodeId);
      try {
        const url = await generateNodeImage(node.Title, node.Summary, node.Keywords, s.apiKey);
        const latest = useAppStore.getState().apps.find((a) => a._id === props._id)?.data.state as AppState | undefined;
        const updatedNodes = (latest ?? s).nodes.map((n) => (n.ID === nodeId ? { ...n, imageUrl: url } : n));
        updateState(props._id, { ...(latest ?? s), nodes: updatedNodes });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'Image generation failed', description: msg, status: 'error', duration: 4000, isClosable: true });
      } finally {
        setGeneratingImageNodeId(null);
      }
    },
    [s, generatingImageNodeId, props._id]
  );

  const summarizeFavorites = useCallback(async () => {
    const favNodes = s.nodes.filter((n) => n.IsMyFav);
    if (favNodes.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeFavoritesAPI(
        favNodes.map((n) => ({ Title: n.Title, Summary: n.Summary, Keywords: n.Keywords })),
        s.prompt,
        s.apiKey,
        s.model
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
        state: { text: header + summary + footer, fontSize: 18, color: 'yellow', lock: false, sources: [props._id], executeInfo: { executeFunc: '', params: {} } },
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
  }, [s.nodes, s.prompt, s.apiKey, s.model, isSummarizing, props._id, props.data, createApp]);

  const branchFromFavorites = useCallback(() => {
    const favNodes = s.nodes.filter((n) => n.IsMyFav);
    if (favNodes.length === 0) return;
    const ideasList = favNodes
      .map((n, i) => `${i + 1}. "${n.Title}": ${n.Summary}`)
      .join('\n');
    const aiPrompt = [
      s.prompt ? `Original topic: ${s.prompt}` : '',
      `\nThe following ideas were favorited from the previous exploration:\n${ideasList}`,
      `\nNow generate new ideas that build on, combine, or extend the themes from these favorites. Explore adjacent variations that share their strengths.`,
    ].filter(Boolean).join('\n');
    const displayPrompt = `Branch from ${favNodes.length} favorite${favNodes.length > 1 ? 's' : ''}: ${favNodes.map((n) => n.Title).join(', ')}`;
    generate({
      displayPrompt,
      aiPrompt,
      parentEntryId: activeEntryId ?? undefined,
    });
  }, [s.nodes, s.prompt, activeEntryId, generate]);

  const removeDimension = useCallback(
    (dimName: string) => {
      const updatedDims = s.dimensions.filter((d) => d.name !== dimName);
      const updatedNodes = s.nodes.map((n) => {
        const categorical = { ...n.Dimension.categorical };
        const ordinal = { ...n.Dimension.ordinal };
        delete categorical[dimName];
        delete ordinal[dimName];
        return { ...n, Dimension: { categorical, ordinal } };
      });
      updateState(props._id, { ...s, dimensions: updatedDims, nodes: updatedNodes });
    },
    [s, props._id]
  );

  // ── Setup screen ──

  if (!s.apiKey) {
    return (
      <SetupScreen
        props={props}
        bgHex={bgHex}
        panelBgHex={panelBgHex}
        textColor={textColor}
        onSave={handleSetupSave}
      />
    );
  }

  // ── Q&A helpers ──

  const qaNode = selectedQANodeId ? s.nodes.find((n) => n.ID === selectedQANodeId) ?? null : null;
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
      <Flex h="100%" w="100%" direction="row" bg={bgHex}>
        {chatPanelOpen && (
          <ChatPanel
            chatHistory={s.chatHistory}
            nodes={s.nodes}
            dimensions={s.dimensions}
            status={s.status}
            statusMessage={s.statusMessage}
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
          />
        )}

        {/* Toggle button pinned to the left edge of the canvas */}
        <Box position="relative" zIndex={30} flexShrink={0}>
          <Tooltip label={chatPanelOpen ? 'Hide panel' : 'Show panel'} placement="right" hasArrow openDelay={400}>
            <IconButton
              aria-label="Toggle chat panel"
              icon={chatPanelOpen ? <MdChevronLeft /> : <MdChevronRight />}
              size="xs"
              variant="solid"
              colorScheme="gray"
              position="absolute"
              top={2}
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
          nodes={s.nodes}
          dimensions={s.dimensions}
          appId={props._id}
          bgHex={bgHex}
          panelBgHex={panelBgHex}
          borderHex={borderHex}
          textColor={textColor}
          status={s.status}
          statusMessage={s.statusMessage}
          askingNodeId={askingNodeId}
          selectedQANodeId={selectedQANodeId}
          qaPanelOpen={qaPanelOpen}
          positionsRef={positionsRef}
          hasFitRef={hasFitRef}
          onToggleFav={toggleFav}
          onBranch={branchFromNode}
          onSelectQA={(nodeId) => { setSelectedQANodeId(nodeId); setQaPanelOpen(true); setQaInput(''); }}
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
  const updateState = useAppStore((state) => state.updateState);
  const toast = useToast();

  const downloadTxt = () => {
    const dt = format(new Date(), 'yyyy-MM-dd-HH:mm:ss');
    let content = `SageIdeator Export — ${dt}\nPrompt: ${s.prompt}\n\n`;
    s.nodes.forEach((n, i) => {
      content += `--- Idea ${i + 1}: ${n.Title} ---\n`;
      content += `Keywords: ${n.Keywords.join(', ')}\n`;
      content += `Summary: ${n.Summary}\n`;
      content += n.Result + '\n\n';
    });
    const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    downloadFile(url, `ideator-${dt}.txt`);
  };

  const clearApiKey = () => {
    updateState(props._id, { ...s, apiKey: '' });
    toast({ title: 'API key cleared', status: 'info', duration: 2500, isClosable: true });
  };

  return (
    <>
      <Tooltip placement="top" hasArrow label="Download ideas as text" openDelay={400}>
        <Button size="xs" colorScheme="teal" variant="solid" onClick={downloadTxt} px={2} mx={1}>
          <MdFileDownload fontSize="14px" />
        </Button>
      </Tooltip>
      <Tooltip placement="top" hasArrow label="Change API key / settings" openDelay={400}>
        <Button size="xs" colorScheme="teal" variant="outline" onClick={clearApiKey} px={2} mx={1}>
          <MdKey fontSize="14px" />
        </Button>
      </Tooltip>
    </>
  );
}

const GroupedToolbarComponent = () => null;

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
