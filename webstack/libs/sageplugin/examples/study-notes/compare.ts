import { SAGE3Plugin } from '@sage3/sageplugin';
import type { PluginState } from '@sage3/sageplugin';
import { object, escapeHtml as esc, showError } from './model';

type Paper = {
  key: string;
  short: string;
  authors: string;
  venue: string;
  theme: string;
  link?: string;
};
type Row = {
  label: string;
  cells: Record<string, string>;
};
type Table = {
  papers: Paper[];
  rows: Row[];
  spot: string | null;
  theme: string;
};

const plugin = new SAGE3Plugin();
let state: Table = { papers: [], rows: [], spot: null, theme: 'all' };
// Groups come from each table's own paper tags; colours follow first appearance.
const PALETTE = ['#b3dbff', '#b9dc8c', '#ffb7c9', '#dccbf6', '#ffd2a1', '#fff08c'];
const zoom = (): void => {
  document.documentElement.style.setProperty('zoom', String(Math.max(0.2, Math.min(innerWidth / 2300, innerHeight / 830))));
};
zoom();
window.addEventListener('resize', zoom);

async function patch(value: PluginState): Promise<void> {
  const snapshot = await plugin.request('app.content.patch', {
    changes: Object.entries(value).map(([key, entry]) => ({ op: 'set', path: [key], value: entry })),
  });
  load(snapshot.value);
}

const editing = (): boolean => !!(document.activeElement as HTMLElement | null)?.isContentEditable;
let stale = false;

function load(content: PluginState): void {
  state = {
    papers: Array.isArray(content.papers) ? (content.papers as Paper[]) : [],
    rows: Array.isArray(content.rows) ? (content.rows as Row[]) : [],
    spot: typeof content.spot === 'string' ? content.spot : null,
    theme: typeof content.theme === 'string' ? content.theme : 'all',
  };
  // Redrawing would drop the caret, so wait until the edit is committed.
  if (editing()) {
    stale = true;
    return;
  }
  render();
}

function groups(): string[] {
  return [...new Set(state.papers.map((paper) => (paper.theme || '').trim()).filter(Boolean))];
}

function colorOf(theme: string): string {
  const index = groups().indexOf((theme || '').trim());
  return index < 0 ? '#eee6d3' : PALETTE[index % PALETTE.length];
}

function addPaper(paper: Omit<Paper, 'key'>): void {
  const key = 'c' + Date.now().toString(36);
  void patch({ papers: [...state.papers, { key, ...paper }], theme: 'all' }).catch(showError);
}

function render(): void {
  stale = false;
  const tags = groups();
  const theme = state.theme === 'all' || tags.includes(state.theme) ? state.theme : 'all';
  const themes = document.getElementById('themes')!;
  themes.innerHTML = tags.length
    ? [['all', '#fff08c'], ...tags.map((tag) => [tag, colorOf(tag)])]
        .map(([key, color]) => `<button class="th${theme === key ? ' on' : ''}" style="--c:${color}" data-k="${esc(key)}">${esc(key)}</button>`)
        .join('')
    : '';
  themes.querySelectorAll<HTMLElement>('.th').forEach((button) => {
    button.onclick = () => {
      void patch({ theme: button.dataset.k! }).catch(showError);
    };
  });

  const papers = state.papers.filter((paper) => theme === 'all' || (paper.theme || '').trim() === theme);
  const className = (paper: Paper): string => {
    if (!state.spot) {
      return '';
    }
    return state.spot === paper.key ? ' spot' : ' dim';
  };
  const field = (paper: Paper, name: 'short' | 'authors' | 'venue' | 'theme', css: string, placeholder: string): string =>
    `<span class="${css}" contenteditable="true" data-k="${esc(paper.key)}" data-f="${name}" data-ph="${placeholder}">${esc(paper[name] || '')}</span>`;
  const table = document.getElementById('t')!;
  table.innerHTML =
    `<thead><tr><th class="corner"></th>${papers
      .map(
        (paper) =>
          `<th class="${className(paper)}" style="--c:${colorOf(paper.theme)}">` +
          `<div class="ctl"><button class="sp" data-k="${esc(paper.key)}" title="spotlight this paper">◎</button>` +
          `<button class="x" data-k="${esc(paper.key)}" title="remove this paper">×</button></div>` +
          field(paper, 'short', 't', 'title') +
          (paper.link ? `<a class="lk" href="${esc(paper.link)}">open paper</a>` : '') +
          field(paper, 'authors', 'a', 'authors') +
          '<br/>' +
          field(paper, 'venue', 'm', 'year · venue') +
          field(paper, 'theme', 'm g', 'group') +
          '</th>',
      )
      .join('')}</tr></thead>\n    ` +
    `<tbody>${state.rows
      .map(
        (row, rowIndex) =>
          `<tr><th><span contenteditable="true" data-r="${rowIndex}" data-ph="row">${esc(row.label)}</span>` +
          `<button class="x" data-r="${rowIndex}" title="remove this row">×</button></th>${papers
            .map(
              (paper) =>
                `<td contenteditable="true" data-r="${rowIndex}" data-k="${esc(paper.key)}" class="${className(paper)}">` +
                `${esc(row.cells[paper.key] || '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</td>`,
            )
            .join('')}</tr>`,
      )
      .join('')}</tbody>`;

  document.getElementById('empty')!.hidden = state.papers.length > 0;

  table.querySelectorAll<HTMLAnchorElement>('a').forEach((anchor) =>
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void plugin.request('ui.openUrl', { url: anchor.href }).catch(showError);
    }),
  );
  table.querySelectorAll<HTMLElement>('[contenteditable]').forEach((cell) => {
    cell.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        cell.blur();
      }
    });
    cell.addEventListener('blur', () => {
      const text = (cell.innerText ?? '').trim();
      if (cell.dataset.f) {
        const papers = state.papers.map((paper) => (paper.key === cell.dataset.k ? { ...paper, [cell.dataset.f!]: text } : paper));
        if (JSON.stringify(papers) !== JSON.stringify(state.papers)) {
          void patch({ papers }).catch(showError);
          return;
        }
      } else {
        const rows = structuredClone(state.rows);
        const row = rows[Number(cell.dataset.r)];
        if (cell.dataset.k) {
          row.cells[cell.dataset.k] = text;
        } else {
          row.label = text;
        }
        if (JSON.stringify(rows) !== JSON.stringify(state.rows)) {
          void patch({ rows }).catch(showError);
          return;
        }
      }
      // Nothing changed here, but a remote update may have arrived while typing.
      if (stale) {
        setTimeout(() => !editing() && render());
      }
    });
  });

  table.querySelectorAll<HTMLElement>('button.sp').forEach((button) => {
    button.onclick = () => {
      void patch({ spot: state.spot === button.dataset.k ? null : button.dataset.k! }).catch(showError);
    };
  });
  table.querySelectorAll<HTMLElement>('button.x').forEach((button) => {
    button.onclick = () => {
      if (button.dataset.k) {
        const papers = state.papers.filter((paper) => paper.key !== button.dataset.k);
        const rows = state.rows.map((row) => {
          const cells = { ...row.cells };
          delete cells[button.dataset.k!];
          return { ...row, cells };
        });
        void patch({ papers, rows, spot: state.spot === button.dataset.k ? null : state.spot }).catch(showError);
      } else {
        void patch({ rows: state.rows.filter((_row, index) => index !== Number(button.dataset.r)) }).catch(showError);
      }
    };
  });
}

document.getElementById('addrow')!.onclick = () => {
  void patch({ rows: [...state.rows, { label: 'new row', cells: {} }] }).catch(showError);
};
document.getElementById('addpaper')!.onclick = () => addPaper({ short: 'new paper', authors: '', venue: '', theme: '' });

// "Ball_North_Bowman_2007_Move_to_Improve.pdf" → authors before the year, title after it.
function fromFileName(name: string): Omit<Paper, 'key'> {
  const words = name
    .replace(/\.pdf$/i, '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
  const at = words.findIndex((word) => /^(19|20)\d\d$/.test(word));
  if (at < 0) {
    return { short: words.join(' '), authors: '', venue: '', theme: '' };
  }
  const names = words.slice(0, at);
  let authors = names.join(' ');
  if (!names.includes('al') && names.length > 1) {
    authors = names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  }
  return { short: words.slice(at + 1).join(' ') || words.join(' '), authors, venue: words[at], theme: '' };
}

// Offer the PDFs already on the board as ready made columns, named by their file.
const fromPdf = document.getElementById('frompdf') as HTMLSelectElement;
fromPdf.addEventListener('focus', () => {
  void Promise.all([plugin.request('apps.list'), plugin.request('assets.list')])
    .then(([apps, assets]) => {
      const names = new Map(assets.map((asset) => [asset.id, asset.name]));
      const pdfs = apps
        .filter((app) => app.data.type === 'PDFViewer')
        // The window title carries the current page ("… - 5 of 6"), so prefer the file name.
        .map((app) => names.get(String(app.data.state.assetid)) ?? app.data.title.replace(/\s+-\s+\d+\s+of\s+\d+$/, ''));
      fromPdf.innerHTML =
        `<option value="">＋ paper from a pdf…</option>` + pdfs.map((name) => `<option>${esc(name)}</option>`).join('');
    })
    .catch(showError);
});
fromPdf.addEventListener('change', () => {
  const name = fromPdf.value;
  fromPdf.value = '';
  if (name) {
    addPaper(fromFileName(name));
  }
});

plugin.on('app', (app) => load(object(app.data.state.content)));
plugin.on('error', showError);
void plugin.ready.then((init) => load(object(init.app?.data.state.content))).catch(showError);
window.addEventListener('pagehide', () => plugin.dispose());
