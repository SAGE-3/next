/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useState, useCallback } from 'react';

import { format } from 'date-fns/format';

import { Flex, Box, Button, IconButton, Tooltip, useToast, useColorModeValue } from '@chakra-ui/react';
import { MdFileDownload, MdChat, MdChevronLeft, MdChevronRight } from 'react-icons/md';

import { useAppStore, useHexColor, downloadFile } from '@sage3/frontend';

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
import { useIdeation } from './useIdeation';
import { useImageGeneration } from './useImageGeneration';
import { useStickyImport } from './useStickyImport';
import { ChatPanel } from './ChatPanel';
import { VisualizationCanvas } from './VisualizationCanvas';
import { QAPanel } from './QAPanel';
import { StickyImportDialog } from './StickyImportDialog';

// ─── AppComponent ─────────────────────────────────────────────────────────────

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

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
  const [selectedQANodeId, setSelectedQANodeId] = useState<string | null>(null);
  const [qaPanelOpen, setQaPanelOpen] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const {
    activeEntryId, localNodes, localDims,
    isGenerating, localStatusMessage, askingNodeId,
    isAddingDimension, rerollingNodeId, isGeneratingAt,
    isAddingManualIdea, isSummarizing,
    positionsRef, hasFitRef,
    generate, toggleFav, clearAll, deleteEntry, restoreSnapshot,
    branchFromNode, askNodeQuestion, addDimension, rerollNode,
    generateMore, generateAt, addManualIdea, removeDimension,
    summarizeFavorites, branchFromFavorites,
  } = useIdeation({
    s,
    appId: props._id,
    input,
    setInput,
    attachedImage,
    setAttachedImage,
    boardId: props.data.boardId,
    roomId: props.data.roomId,
    appPosition: props.data.position,
    appSize: props.data.size,
  });

  const { pendingImport, handleImportConfirm, handleImportCancel, handleImportRegenerate } = useStickyImport({
    s,
    localDims,
    activeEntryId,
    appId: props._id,
    appPosition: props.data.position,
    appSize: props.data.size,
  });

  const { generateImageForNode, cancelImageGeneration, generatingImageNodeId } = useImageGeneration({
    s,
    localNodes,
    activeEntryId,
    appId: props._id,
    boardId: props.data.boardId,
    roomId: props.data.roomId,
    appPosition: props.data.position,
  });

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
    updateState(props._id, { pdfContext: null as any });
  }, [props._id, updateState]);

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
          onCancelImageGeneration={cancelImageGeneration}
          generatingImageNodeId={generatingImageNodeId}
          onReroll={rerollNode}
          rerollingNodeId={rerollingNodeId}
          onGenerateAt={generateAt}
          isGeneratingAt={isGeneratingAt}
          onAddManualIdea={addManualIdea}
          isAddingManualIdea={isAddingManualIdea}
        />

        <StickyImportDialog
          isOpen={pendingImport !== null}
          isLoading={pendingImport?.isLoading ?? false}
          originalText={pendingImport?.text ?? ''}
          preview={pendingImport?.preview ?? null}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
          onRegenerate={handleImportRegenerate}
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
