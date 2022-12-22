/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import React from 'react';
import { default as MD } from 'markdown-to-jsx';

import './styles.css';

const LinkWrapper = (props: { children: React.ReactNode }) => {
  return <span>{props.children}</span>;
};

export const Markdown = (props: { data: string[] | string }): JSX.Element => {

  return (
    <MD
      options={{
        overrides: {
          h1: {
            component: 'h1',
            props: {
              className: 'markdown-h1',
            },
          },
          h2: {
            component: 'h2',
            props: {
              className: 'markdown-h2',
            },
          },
          h3: {
            component: 'h3',
            props: {
              className: 'markdown-h3',
            },
          },
          h4: {
            component: 'h4',
            props: {
              className: 'markdown-h4',
            },
          },
          h5: {
            component: 'h5',
            props: {
              className: 'markdown-h5',
            },
          },
          h6: {
            component: 'h6',
            props: {
              className: 'markdown-h6',
            },
          },
          p: {
            component: 'p',
            props: {
              className: 'markdown-p',
            },
          },
          a: {
            component: LinkWrapper,
            props: {
              className: 'markdown-a',
            },
          },
          blockquote: {
            component: 'blockquote',
            props: {
              className: 'markdown-blockquote',
            },
          },
          strong: {
            component: 'strong',
            props: {
              className: 'markdown-strong',
            },
          },
          em: {
            component: 'em',
            props: {
              className: 'markdown-em',
            },
          },
          li: {
            component: 'li',
            props: {
              className: 'markdown-li',
            },
          },
          ol: {
            component: 'ol',
            props: {
              className: 'markdown-ol',
            },
          },
          ul: {
            component: 'ul',
            props: {
              className: 'markdown-ul',
            },
          },
          hr: {
            component: 'hr',
            props: {
              className: 'markdown-hr',
            },
          },
          img: {
            component: 'img',
            props: {
              className: 'markdown-img',
            },
          },
          code: {
            component: 'code',
            props: {
              className: 'markdown-code',
            },
          },
          pre: {
            component: 'pre',
            props: {
              className: 'markdown-pre',
            },
          },
          table: {
            component: 'table',
            props: {
              className: 'markdown-table',
            },
          },
          th: {
            component: 'th',
            props: {
              className: 'markdown-th',
            },
          },
          td: {
            component: 'td',
            props: {
              className: 'markdown-td',
            },
          },
          tr: {
            component: 'tr',
            props: {
              className: 'markdown-tr',
            },
          },
          tbody: {
            component: 'tbody',
            props: {
              className: 'markdown-tbody',
            },
          },
          thead: {
            component: 'thead',
            props: {
              className: 'markdown-thead',
            },
          },
          tfoot: {
            component: 'tfoot',
            props: {
              className: 'markdown-tfoot',
            },
          },
          codeblock: {
            component: 'pre',
            props: {
              className: 'markdown-codeblock',
            },
          },
          dataframe: {
            component: 'pre',
            props: {
              className: 'markdown-dataframe',
            },
          },
        },
      }}
    >
      {Array.isArray(props.data) ? props.data.join('').replace('\n', '<br />') : props.data.replace('\n', '<br />')}
    </MD>
  );
};

export default Markdown;
