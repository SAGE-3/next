/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Flex, Button, Tooltip, useToast, useColorModeValue } from '@chakra-ui/react';
import { MdFileDownload, MdKey, MdChat } from 'react-icons/md';

import { format } from 'date-fns/format';
import { useAppStore, useHexColor, useUser, downloadFile } from '@sage3/frontend';
import { genId } from '@sage3/shared';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

import { generateDimensionsFromPrompt, generateNodeContent, abstractNode, buildRequirements, callProseAPI } from './openai';
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

      if (!branchOpts) setInput('');
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
        const rawDims = await generateDimensionsFromPrompt(aiPrompt, s.apiKey, s.model, s.numDimensions);

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
            const text = await generateNodeContent(aiPrompt, requirements, s.apiKey, s.model);
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
          onClearAll={clearAll}
          onRestoreSnapshot={restoreSnapshot}
          onEditPrompt={setInput}
        />

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
