/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { MermaidApp } from '.';

import { Button, ButtonGroup, Tooltip, Box, useColorModeValue, useToken } from '@chakra-ui/react';
import { renderAsync } from 'pele/lazy';
import { create } from 'zustand';

// Utility functions from SAGE3
import { useAppStore, isUUIDv4, useAssetStore, apiUrls, downloadFile, useLinkStore, useUIStore, setupApp } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { MdCode, MdEdit } from 'react-icons/md';
import { BsFiletypeSvg } from 'react-icons/bs';
import { PiGraph } from 'react-icons/pi';

import { AppWindow } from '../../components';
import { isApp } from '../../schema';

import './styles.css';

// Custom error component to display Mermaid errors
function CustomErrorComponent({ error, mermaidCode }: { error: string; mermaidCode: string }) {
  return (
    <Box color="red" fontSize={"xl"}>
      <h3>Diagram Error</h3>
      <p>{error}</p>
      <details>
        <summary >View Code</summary>
        <pre>{mermaidCode}</pre>
      </details>
    </Box>
  );
}


// Last rendered SVG of each Mermaid app, for the toolbar's SVG download
const useSvgStore = create<{
  svg: Record<string, string>;
  setSvg: (id: string, svg: string) => void;
  removeSvg: (id: string) => void;
}>()((set) => ({
  svg: {},
  setSvg: (id, svg) => set((state) => ({ svg: { ...state.svg, [id]: svg } })),
  removeSvg: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.svg;
      return { svg: rest };
    }),
}));

// Text of the CodeEditor this diagram was opened from, while it exists and is in Mermaid mode
function useSourceCode(app: MermaidApp): string | undefined {
  const sourceId = app.data.sourceApps?.[0];
  return useAppStore((state) => {
    const source = sourceId ? state.apps.find((a) => a._id === sourceId) : undefined;
    if (source && isApp(source, 'CodeEditor') && source.data.state.language === 'mermaid') return source.data.state.content;
    return undefined;
  });
}

/* App component for Mermaid */
function AppComponent(props: MermaidApp): JSX.Element {
  const s = props.data.state;
  const assets = useAssetStore((state) => state.assets);
  const update = useAppStore((state) => state.update);

  // Styling
  const bgColor = useColorModeValue('gray.100', 'gray.700');
  const borderColor = useColorModeValue('gray.700', 'gray.100');
  // Diagram colors, passed to pele as CSS variables
  const [peleBg, peleFg, peleMuted, peleLine, peleSurface, peleSurfaceAlt, peleBorder, peleAccent] = useToken(
    'colors',
    useColorModeValue(
      ['gray.100', 'gray.800', 'gray.500', 'gray.700', 'white', 'gray.50', 'gray.400', 'teal.500'],
      ['gray.700', 'gray.100', 'gray.400', 'gray.200', 'gray.600', 'gray.800', 'gray.400', 'teal.200']
    )
  );
  const peleTheme = {
    '--pele-bg': peleBg,
    '--pele-fg': peleFg,
    '--pele-muted': peleMuted,
    '--pele-line': peleLine,
    '--pele-surface': peleSurface,
    '--pele-surface-alt': peleSurfaceAlt,
    '--pele-border': peleBorder,
    '--pele-accent': peleAccent,
  } as React.CSSProperties;
  // Ref for the mermaid container
  const mermaidRef = useRef<HTMLDivElement>(null);
  // Error state
  const [error, setError] = useState<string | null>(null);
  // Asset data structure
  const [file, setFile] = useState<Asset>();
  // Get the data
  const [data, setData] = useState<string>("");
  // Forget this app's SVG when it closes
  useEffect(() => () => useSvgStore.getState().removeSvg(props._id), [props._id]);
  // Diagram text: the source editor's live code, else the stored content, else the asset
  const sourceCode = useSourceCode(props);
  const code = sourceCode ?? s.content;
  const text = code !== undefined ? code : data;

  // Convert the ID to an asset
  useEffect(() => {
    const isUUID = isUUIDv4(s.assetid);
    if (isUUID) {
      const myasset = assets.find((a) => a._id === s.assetid);
      if (myasset) {
        setFile(myasset);
        // Update the app title
        update(props._id, { title: myasset?.data.originalfilename });
      }
    }
  }, [s.assetid, assets]);

  // Get the data from the asset
  useEffect(() => {
    if (file) {
      const localurl = apiUrls.assets.getAssetById(file.data.file);
      if (localurl) {
        fetch(localurl, {
          headers: {
            'Content-Type': 'text/csv',
            Accept: 'text/csv',
          },
        })
          .then(function (response) {
            return response.text();
          })
          .then(async function (text) {
            setData(text);
          });
      }
    }
  }, [file]);


  useEffect(() => {
    if (!mermaidRef.current || !text) return;
    // Ignore a render that finishes after the text changed or the app closed
    let cancelled = false;
    async function renderDiagram(diag: string) {
      try {
        // idPrefix keeps SVG ids unique when several diagrams share a board
        const { svg } = await renderAsync(diag, { fontSize: 20, idPrefix: `diagram-${props._id}-` });
        if (cancelled) return;
        useSvgStore.getState().setSvg(props._id, svg);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
          const svgElement = mermaidRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.maxWidth = '100%';
            svgElement.style.maxHeight = '100%';
            svgElement.removeAttribute('width');
            svgElement.removeAttribute('height');
          }
        }
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        useSvgStore.getState().setSvg(props._id, '');
        setError(err?.message || 'Unknown error rendering diagram');
        if (mermaidRef.current) mermaidRef.current.innerHTML = '';
      }
    }
    renderDiagram(text);
    return () => {
      cancelled = true;
    };
  }, [props._id, text]);

  return (
    <AppWindow app={props} hideBackgroundIcon={MdCode}>
      <Box p={1} border={'none'} overflow="hidden" height="100%" borderRadius={'md'} background={borderColor}>
        {error ? (
          <CustomErrorComponent error={error} mermaidCode={text} />
        ) : (
          <Box ref={mermaidRef} borderRadius={'md'}
            className="mermaid-app"
            width="100%"
            height="100%"
            p={0}
            m={0}
            overflow="hidden"
            background={bgColor}
            display="flex"
            alignItems="center"
            justifyContent="center"
            style={peleTheme}
          />
        )}
      </Box>
    </AppWindow >
  )
}

/* App toolbar component for the app Mermaid */
function ToolbarComponent(props: MermaidApp): JSX.Element {
  const s = props.data.state;
  const assets = useAssetStore((state) => state.assets);
  const [file, setFile] = useState<Asset>();
  const code = useSourceCode(props) ?? s.content;
  const svg = useSvgStore((state) => state.svg[props._id]);
  const createApp = useAppStore((state) => state.create);
  const update = useAppStore((state) => state.update);
  const addLink = useLinkStore((state) => state.addLink);
  // The CodeEditor this diagram follows, if it still exists
  const sourceId = props.data.sourceApps?.[0];
  const editorId = useAppStore((state) =>
    sourceId && state.apps.some((a) => a._id === sourceId && a.data.type === 'CodeEditor') ? sourceId : undefined
  );

  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (asset) {
      setFile(asset);
    }
  }, [s.assetid, assets]);

  // Edit the diagram code in a CodeEditor, which the diagram then follows
  const editCode = async () => {
    // Already linked to an editor: select it
    if (editorId) {
      useUIStore.getState().setSelectedApp(editorId);
      return;
    }
    // Code from the stored content, else from the asset
    let text = code;
    if (text === undefined && file) {
      const response = await fetch(apiUrls.assets.getAssetById(file.data.file));
      text = await response.text();
    }
    const { position, size, roomId, boardId } = props.data;
    const app = setupApp('CodeEditor', 'CodeEditor', position.x - 620, position.y, roomId, boardId, { w: 600, h: size.height }, {
      content: text ?? '',
      language: 'mermaid',
      ...(file ? { filename: file.data.originalfilename } : {}),
    });
    const res = await createApp(app);
    if (res.success === true) {
      // Follow the new editor (first source), keeping earlier sources such as a Chat
      update(props._id, { sourceApps: [res.data._id, ...(props.data.sourceApps ?? [])] });
      addLink(res.data._id, props._id, boardId, 'provenance');
    }
  };

  return (
    <>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top" hasArrow={true} label={editorId ? 'Show Code Editor' : 'Edit in Code Editor'} openDelay={400}>
          <Button onClick={editCode} isDisabled={!editorId && !file && code === undefined} size="xs" px={0}>
            <MdEdit size="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
        <Tooltip placement="top" hasArrow={true} label={'Download Mermaid File'} openDelay={400}>
          <Button
            isDisabled={!file && !code}
            onClick={() => {
              if (file) {
                const dl = apiUrls.assets.getAssetById(file.data.file);
                downloadFile(dl, file.data.originalfilename);
              } else if (code) {
                downloadFile('data:text/plain;charset=utf-8,' + encodeURIComponent(code), 'diagram.mmd');
              }
            }}
            size="xs"
            px={0}
          >
            <PiGraph size="16px" />
          </Button>
        </Tooltip>
        <Tooltip placement="top" hasArrow={true} label={'Download as SVG'} openDelay={400}>
          <Button
            isDisabled={!svg}
            onClick={() => {
              // Name it after the source file when there is one
              const base = file ? file.data.originalfilename.replace(/\.[^.]+$/, '') : 'diagram';
              downloadFile('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), `${base}.svg`);
            }}
            size="xs"
            px={0}
          >
            <BsFiletypeSvg size="16px" />
          </Button>
        </Tooltip>
      </ButtonGroup>
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: MermaidApp[] }) => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
