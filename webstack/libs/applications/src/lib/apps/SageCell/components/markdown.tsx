/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { default as Mark } from 'markdown-to-jsx';
import { Text, Box, Image, OrderedList, UnorderedList, ListItem, Link, useColorModeValue, AspectRatio } from '@chakra-ui/react';

type MarkdownProps = {
  markdown: string;
  openInWebview: (url: string) => void;
};

export function Markdown(props: any): JSX.Element {
  const { markdown, openInWebview } = props as MarkdownProps;
  return (
    <Mark
      options={{
        overrides: {
          div: { component: Box, props: { as: 'div' } },
          text: { component: Text, props: { as: 'span' } },
          p: { component: Text, props: { as: 'p' } },
          title: { component: Text, props: { as: 'h1', fontSize: '3xl' } },
          h1: { component: Text, props: { as: 'h1', fontSize: '2xl' } },
          h2: { component: Text, props: { as: 'h2', fontSize: 'xl' } },
          h3: { component: Text, props: { as: 'h3', fontSize: 'lg' } },
          h4: { component: Text, props: { as: 'h4', fontSize: 'md' } },
          h5: { component: Text, props: { as: 'h5', fontSize: 'sm' } },
          h6: { component: Text, props: { as: 'h6', fontSize: 'xs' } },
          a: {
            component: Link,
            props: {
              onClick: (e: any) => {
                e.preventDefault();
                if (e.target.href.startsWith('http')) {
                  openInWebview(e.target.href);
                } else {
                  window.open(e.target.href, '_blank');
                }
              },
              style: {
                color: useColorModeValue('rgb(86, 133, 213)', 'rgb(24, 200, 213)'),
                _hover: {
                  textDecoration: 'underline',
                },
              },
              isExternal: true,
            },
          },
          em: { component: Text, props: { as: 'em' } },
          strong: { component: Text, props: { as: 'strong' } },
          code: { component: Text, props: { as: 'code', fontFamily: 'monospace' } },
          del: { component: Text, props: { as: 'del' } },
          ins: { component: Text, props: { as: 'ins' } },
          pre: { component: Text, props: { as: 'pre' } },
          sub: { component: Text, props: { as: 'sub' } },
          sup: { component: Text, props: { as: 'sup' } },
          ul: {
            component: UnorderedList,
            props: {
              style: {
                listStyleType: 'disc',
                listStylePosition: 'inside',
                paddingLeft: '.5em',
              },
            },
          },
          ol: {
            component: OrderedList,
            props: {
              style: {
                listStyleType: 'decimal',
                listStylePosition: 'inside',
                paddingLeft: '.5em',
              },
            },
          },
          li: { component: ListItem },
          table: { component: Text, props: { as: 'table' } },
          thead: { component: Text, props: { as: 'thead' } },
          tbody: { component: Text, props: { as: 'tbody' } },
          tr: { component: Text, props: { as: 'tr' } },
          th: { component: Text, props: { as: 'th' } },
          td: { component: Text, props: { as: 'td' } },
          hr: { component: Text, props: { as: 'hr' } },
          br: { component: Text, props: { as: 'br' } },
          img: { component: Image },
          blockquote: {
            props: {
              style: {
                borderLeft: '4px solid #ccc',
                paddingLeft: '1em',
              },
            },
          },
          audio: {
            component: Box,
            props: { as: 'audio', controls: true, src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
          },
          // video: {
          //   component: AspectRatio,
          //   props: { ratio: 16 / 9 },
          //   children: {
          //     component: iframe,
          //     props: { title: 'lol', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', allowFullScreen: false },
          //   },
          // },
          // iframe: {
          //   component: Box,
          //   props: { as: 'iframe', title: 'lol', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
          // },
        },
      }}
    >
      {markdown}
    </Mark>
  );
}
