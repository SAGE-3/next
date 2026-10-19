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

// Utility functions from SAGE3
import { useAppStore, isUUIDv4, useAssetStore, apiUrls, downloadFile } from '@sage3/frontend';
import { Asset } from '@sage3/shared/types';

import { MdCode, MdFileDownload } from 'react-icons/md';

import { AppWindow } from '../../components';

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
    if (!mermaidRef.current || !data) return;
    // Ignore a render that finishes after the text changed or the app closed
    let cancelled = false;
    async function renderDiagram(diag: string) {
      try {
        // idPrefix keeps SVG ids unique when several diagrams share a board
        const { svg } = await renderAsync(diag, { fontSize: 20, idPrefix: `diagram-${props._id}-` });
        if (cancelled) return;
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
        setError(err?.message || 'Unknown error rendering diagram');
        if (mermaidRef.current) mermaidRef.current.innerHTML = '';
      }
    }
    renderDiagram(data);
    return () => {
      cancelled = true;
    };
  }, [props._id, data]);

  return (
    <AppWindow app={props} hideBackgroundIcon={MdCode}>
      <Box p={1} border={'none'} overflow="hidden" height="100%" borderRadius={'md'} background={borderColor}>
        {error ? (
          <CustomErrorComponent error={error} mermaidCode={data} />
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

  useEffect(() => {
    const asset = assets.find((a) => a._id === s.assetid);
    if (asset) {
      setFile(asset);
    }
  }, [s.assetid, assets]);

  return (
    <ButtonGroup isAttached size="xs" colorScheme="teal" mx={1}>
      <Tooltip placement="top" hasArrow={true} label={'Download Mermaid File'} openDelay={400}>
        <Button
          isDisabled={!file}
          onClick={() => {
            if (file) {
              const dl = apiUrls.assets.getAssetById(file.data.file);
              downloadFile(dl, file.data.originalfilename);
            }
          }}
          size="xs"
          px={0}
        >
          <MdFileDownload size="16px" />
        </Button>
      </Tooltip>
    </ButtonGroup>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: MermaidApp[] }) => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
