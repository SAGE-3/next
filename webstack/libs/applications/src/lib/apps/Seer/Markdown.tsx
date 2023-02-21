import { default as MD } from 'markdown-to-jsx';

type MarkdownProps = {
  markdown: any;
  startWebview: (url: string) => void;
};

export default function Markdown(props: any) {
  const { markdown, startWebview } = props as MarkdownProps;
  return (
    <MD
      options={{
        overrides: {
          a: {
            component: 'a',
            props: {
              onClick: (e: any) => {
                e.preventDefault();
                startWebview(e.target.href);
              },
              style: {
                color: '#555',
                textDecoration: 'underline',
              },
            },
          },
          h1: {
            component: 'h1',
            props: {
              style: {
                fontSize: '1.5em',
                fontWeight: 'bold',
                color: '#008080',
              },
            },
          },
          h2: {
            component: 'h2',
            props: {
              style: {
                fontSize: '1.3em',
                fontWeight: 'bold',
                color: '#008080',
              },
            },
          },
          h3: {
            component: 'h3',
            props: {
              style: {
                fontSize: '1.1em',
                fontWeight: 'bold',
                color: '#008080',
              },
            },
          },
          h4: {
            component: 'h4',
            props: {
              style: {
                fontSize: '1em',
                fontWeight: 'bold',
                color: '#008080',
              },
            },
          },
          h5: {
            component: 'h5',
            props: {
              style: {
                fontSize: '0.9em',
                fontWeight: 'bold',
                color: '#008080',
              },
            },
          },
          h6: {
            component: 'h6',
            props: {
              style: {
                fontSize: '0.8em',
                fontWeight: 'bold',
                color: '#008080',
              },
            },
          },
          p: {
            component: 'p',
            props: {
              style: {
                fontSize: '0.9em',
              },
            },
          },
          li: {
            component: 'li',
            props: {
              style: {
                fontSize: '0.9em',
                display: 'list-item',
                margin: '1em',
              },
            },
          },
          ul: {
            component: 'ul',
            props: {
              style: {
                fontSize: '0.9em',
              },
            },
          },
          ol: {
            component: 'ol',
            props: {
              style: {
                fontSize: '0.9em',
                listStyleType: 'decimal',
              },
            },
          },
          blockquote: {
            component: 'blockquote',
            props: {
              style: {
                fontSize: '0.9em',
                borderLeft: '0.2em solid #008080',
                paddingLeft: '0.5em',
              },
            },
          },
          code: {
            component: 'code',
            props: {
              style: {
                fontSize: '0.9em',
                padding: '0.2em',
                fontFamily: 'monospace',
              },
            },
          },
          del: {
            component: 'del',
            props: {
              style: {
                fontSize: '0.9em',
                textDecoration: 'line-through',
              },
            },
          },
        },
      }}
    >
      {markdown}
    </MD>
  );
}
