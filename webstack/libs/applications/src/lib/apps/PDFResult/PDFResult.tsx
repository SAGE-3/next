/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useEffect, useState } from 'react';
import { Box, Text, UnorderedList, ListItem, Link } from '@chakra-ui/react';
import { useParams } from 'react-router';

import { humanFileSize } from '@sage3/shared';
import { useAppStore, useUser } from '@sage3/frontend';

import { App } from '../../schema';
import { state as AppState } from './index';
import { AppWindow } from '../../components';

type TocItem = {
  name: string;
  children: TocItem[];
};
type TableofContents = {
  name: string;
  children: TocItem[];
};

// Styling
import './styling.css';

/* App component for PDFResult */

function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const [keywords, setKeywords] = useState([]);
  const [references, setReferences] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [pages, setPages] = useState('');
  const [file_size, setFileSize] = useState('');
  const [toc, setToc] = useState<TableofContents>();
  // App creation
  const createApp = useAppStore((state) => state.create);

  const { boardId, roomId } = useParams();
  const { user } = useUser();

  useEffect(() => {
    if (s.result === '') return;
    const json = JSON.parse(s.result);
    // console.log('JSON>', json);
    setKeywords(json.exif_tool['PDF:Keywords'] ?? '');
    setTitle(json.exif_tool['PDF:Title'] ?? '');
    setAuthors(json.exif_tool['PDF:Author'] ?? '');
    setPages(json.exif_tool['PDF:PageCount'] ? json.exif_tool['PDF:PageCount'].toString() : '');
    setFileSize(json.exif_tool['File:FileSize'] ? humanFileSize(json.exif_tool['File:FileSize']) : '');
    // Fix the references URL when they are not complete
    const refs: string[] = [];
    json.pdf_metadata.references.url.forEach((r: string) => {
      if (r.startsWith('http')) refs.push(r);
      else refs.push('http://' + r);
    });
    setReferences(refs);
    // Table of contents
    if (json.toc) setToc(json.toc);
  }, [s.result]);

  const openUrlInNewWebviewApp = (url: string): void => {
    if (!user) return;
    createApp({
      title: url,
      roomId: roomId!,
      boardId: boardId!,
      position: { x: props.data.position.x + props.data.size.width + 15, y: props.data.position.y, z: 0 },
      size: { width: props.data.size.width, height: props.data.size.height, depth: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      type: 'Webview',
      state: { webviewurl: url },
      raised: true,
      dragging: false,
      pinned: false,
    });
  };

  function handleLink(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
    console.log('Link clicked');
    openUrlInNewWebviewApp(e.currentTarget.href);
    e.preventDefault();
  }

  return (
    <AppWindow app={props}>
      <Box overflowX="clip" overflowY="scroll" height={props.data.size.height + 'px'}>
        <Text fontSize="4xl" fontWeight="bold" m="3">
          PDF Metadata
        </Text>
        <UnorderedList ml={10}>
          {title && (
            <ListItem>
              {' '}
              <b>Title</b>: {title}{' '}
            </ListItem>
          )}
          {authors && (
            <ListItem>
              {' '}
              <b>Authors</b>: {authors}
            </ListItem>
          )}
          {keywords && (
            <ListItem>
              {' '}
              <b>PDF Keywords</b>:{keywords.map((k) => ' ' + k + ',')}
            </ListItem>
          )}
          {pages && (
            <ListItem>
              {' '}
              <b>Pages</b>: {pages}
            </ListItem>
          )}
          {file_size && (
            <ListItem>
              {' '}
              <b>File size</b>: {file_size}
            </ListItem>
          )}
          {references && (
            <ListItem>
              {' '}
              <b>References</b>:
              <UnorderedList>
                {references.map((r, i) => (
                  <ListItem key={i}>
                    <Link href={r} isExternal onClick={handleLink}>
                      {r}
                    </Link>
                  </ListItem>
                ))}
              </UnorderedList>
            </ListItem>
          )}

          {toc && (
            <ListItem>
              {' '}
              <b>Table of Content</b>:
              <UnorderedList>
                {toc.children.map((r: TocItem, i) => (
                  <ListItem key={i}>
                    {r.name}
                    {r.children.length > 0 && (
                      <UnorderedList>
                        {r.children.map((c: TocItem, j) => (
                          <ListItem key={j}>{c.name}</ListItem>
                        ))}
                      </UnorderedList>
                    )}
                  </ListItem>
                ))}
              </UnorderedList>
            </ListItem>
          )}
        </UnorderedList>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app PDFResult */

function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  return <></>;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => { return null; };

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
