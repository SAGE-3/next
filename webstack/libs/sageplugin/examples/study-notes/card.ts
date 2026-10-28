import { SAGE3Plugin, parseDocumentReference } from '@sage3/sageplugin';
import type { PluginState, PluginText } from '@sage3/sageplugin';
import { cardOf, object, escapeHtml, showError } from './model';
import type { Card } from './model';

const plugin = new SAGE3Plugin();

let content: PluginState = {};
let bodyText = '';
let bodyDocument: PluginText | undefined;
let imageUrl = '';
let imageKey = '';
const figureUrls: string[] = [];

async function loadImage(): Promise<void> {
  const card = cardOf(content);
  const key = card.assetId ? `${card.assetId}:${card.page ?? 'original'}` : '';
  if (imageKey === key) {
    return;
  }

  imageKey = key;
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
  }
  imageUrl = '';

  if (card.assetId) {
    const image = await plugin.request('assets.read', { id: card.assetId, page: card.page });
    if (imageKey !== key) {
      return;
    }
    imageUrl = URL.createObjectURL(image);
  }

  draw();
}

const accentColors: Readonly<Record<string, readonly [primary: string, light: string, dark: string]>> = {
  pink: ['#ffb7c9', '#ffe1e9', '#c2185b'],
  green: ['#b9dc8c', '#e5f3d3', '#4e7d22'],
  yellow: ['#fff08c', '#fff8c9', '#9a7b00'],
  blue: ['#b3dbff', '#e1f0ff', '#1f63a6'],
  purple: ['#dccbf6', '#f0e8fc', '#6a3fb5'],
  orange: ['#ffd2a1', '#ffecd6', '#b85d00'],
};

// One colour per paper, used for [[ref]] chips across the whole board
// [[key]] chips link straight to the paper
const scholarUrl = (query: string) => 'https://scholar.google.com/scholar?q=' + encodeURIComponent(query);
const paperReferences: Readonly<Record<string, readonly [label: string, color: string, url: string]>> = {
  p1: [
    'pirolli & card 2005',
    '#b3dbff',
    scholarUrl('the sensemaking process and leverage points for analyst technology pirolli card 2005'),
  ],
  p2: ['andrews et al. 2010', '#b9dc8c', 'https://doi.org/10.1145/1753326.1753336'],
  p3: ['head et al. 2019', '#ffb7c9', 'https://doi.org/10.1145/3290605.3300500'],
  r93: ['russell et al. 1993', '#c9e4ff', 'https://doi.org/10.1145/169059.169209'],
  b07: ['ball et al. 2007', '#d6edbb', 'https://doi.org/10.1145/1240624.1240656'],
  e12: ['endert et al. 2012', '#d6edbb', 'https://doi.org/10.1145/2207676.2207741'],
  r18: ['rule et al. 2018', '#ffd6e2', 'https://doi.org/10.1145/3173574.3173606'],
  k18: ['kery et al. 2018', '#ffd6e2', 'https://doi.org/10.1145/3173574.3173748'],
};
const escapeMarkup = escapeHtml;

function inline(value: unknown): string {
  let markup = escapeMarkup(value);

  // Preserve links before applying formatting so their URLs remain untouched.
  const links: string[] = [];
  const preserveLink = (html: string) => `\u0000${links.push(html) - 1}\u0000`;

  markup = markup.replace(/\[\[(\w+)\]\]/g, (match, key) => {
    const reference = paperReferences[key.toLowerCase()];
    if (!reference) {
      return match;
    }

    const [label, color, url] = reference;
    return preserveLink(`<a class="ref" style="--rc:${color}" href="${url}" target="_blank" rel="noopener">${label} ↗</a>`);
  });

  markup = markup.replace(/\[([^\]]+)\]\((sage3:\/\/[^\s)]+)\)/g, (match, title, url) => {
    const reference = parseDocumentReference(url.replace(/&amp;/g, '&'));
    if (!reference) {
      return match;
    }

    return preserveLink(
      `<button class="jump" data-app="${escapeMarkup(reference.appId)}" data-page="${reference.page}">↪ ${title}</button>`,
    );
  });

  markup = markup.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
    return preserveLink(`<a href="${url}" target="_blank" rel="noopener">${label}</a>`);
  });
  markup = markup.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_match, prefix, url) => {
    const label = url.replace(/^https?:\/\//, '');
    return prefix + preserveLink(`<a href="${url}" target="_blank" rel="noopener">${label}</a>`);
  });

  markup = markup.replace(/~~(.+?)~~/g, '<s class="x">$1</s>');
  markup = markup.replace(/\(\((.+?)\)\)/g, '<span class="circ">$1</span>');
  markup = markup.replace(/__(.+?)__/g, '<span class="uw">$1</span>');
  markup = markup.replace(/==(pink|green|yellow|blue|purple|orange):(.+?)==/g, '<span class="hl $1">$2</span>');
  markup = markup.replace(/==(.+?)==/g, '<span class="hl acc">$1</span>');
  markup = markup.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  markup = markup.replace(/(^|\s)_(.+?)_(?=\s|$|[.,!?)])/g, '$1<i>$2</i>');
  markup = markup.replace(/\{([^{}]+)\}/g, '<span class="chip">$1</span>');

  return markup.replace(/\u0000(\d+)\u0000/g, (m, index) => links[index]);
}

function render(markdown: string): string {
  const renderedLines: string[] = [];
  const lines = (markdown || '').split('\n');
  let stats: string[] = [];

  const flushStats = () => {
    if (stats.length) {
      renderedLines.push(`<div class="stats">${stats.join('')}</div>`);
      stats = [];
    }
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.replace(/\s+$/, '');
    const trimmedLine = line.trim();

    if (!trimmedLine.startsWith('stat:')) {
      flushStats();
    }
    if (!trimmedLine) {
      renderedLines.push('<div style="height:0.45em"></div>');
      return;
    }

    let checkboxMatch: RegExpMatchArray | null;
    let numberedMatch: RegExpMatchArray | null;

    if (trimmedLine.startsWith('### ')) {
      renderedLines.push(`<h3>${inline(trimmedLine.slice(4))}</h3>`);
    } else if (trimmedLine.startsWith('## ')) {
      renderedLines.push(`<h2>${inline(trimmedLine.slice(3))}</h2>`);
    } else if (trimmedLine.startsWith('# ')) {
      renderedLines.push(`<h1>${inline(trimmedLine.slice(2))}</h1>`);
    } else if (trimmedLine === '~~~') {
      renderedLines.push('<div class="divider"></div>');
    } else if ((checkboxMatch = trimmedLine.match(/^\[( |x)\]\s+(.*)$/))) {
      const checked = checkboxMatch[1] === 'x';
      renderedLines.push(
        `<div class="chk${checked ? ' on' : ''}" data-line="${lineIndex}">` +
          `<span class="box"></span><span class="t">${inline(checkboxMatch[2])}</span></div>`,
      );
    } else if (trimmedLine.startsWith('* ')) {
      const sublist = line.startsWith('  ') ? ' sub' : '';
      renderedLines.push(`<div class="li${sublist}">${inline(trimmedLine.slice(2))}</div>`);
    } else if ((numberedMatch = trimmedLine.match(/^(\d+)\)\s+(.*)$/))) {
      renderedLines.push(`<div class="num"><b class="n">${numberedMatch[1]}</b>${inline(numberedMatch[2])}</div>`);
    } else if (trimmedLine.startsWith('>> ')) {
      const rotation = [-1.6, 1.1, -0.6, 1.8][lineIndex % 4];
      renderedLines.push(`<div class="margin" style="--mr:${rotation}deg">${inline(trimmedLine.slice(3))}</div>`);
    } else if (trimmedLine.startsWith('> ')) {
      renderedLines.push(`<div class="callout">${inline(trimmedLine.slice(2))}</div>`);
    } else if (trimmedLine.startsWith('!! ')) {
      renderedLines.push(`<div class="bigbox">${inline(trimmedLine.slice(3))}</div>`);
    } else if (trimmedLine.startsWith('=> ')) {
      renderedLines.push(`<div class="arrow"><span class="ar">➜</span><span>${inline(trimmedLine.slice(3))}</span></div>`);
    } else if (trimmedLine.startsWith('?? ')) {
      renderedLines.push(`<div class="q"><span class="qm">?</span><span>${inline(trimmedLine.slice(3))}</span></div>`);
    } else if (trimmedLine.startsWith('stat:')) {
      const [value, label] = trimmedLine
        .slice(5)
        .split('|')
        .map((part) => part.trim());

      stats.push(`<div class="stat"><div class="sv">${escapeMarkup(value)}</div>` + `<div class="sl">${inline(label || '')}</div></div>`);
    } else if (trimmedLine.startsWith('bar:')) {
      const [label, value, maximum, accent] = trimmedLine
        .slice(4)
        .split('|')
        .map((part) => part.trim());

      const [primaryColor, lightColor] = accentColors[accent] || accentColors.blue;
      const percentage = Math.max(0, Math.min(100, (parseFloat(value) / parseFloat(maximum || '100')) * 100));
      const unit = maximum === '100' ? '%' : '';

      renderedLines.push(
        `<div class="bar" style="--c:${primaryColor};--cl:${lightColor}"><span>${inline(label)}</span>` +
          `<div class="track"><div class="fill" style="width:${percentage}%"></div></div>` +
          `<span class="v">${escapeMarkup(value)}${unit}</span></div>`,
      );
    } else if (trimmedLine.startsWith('img:')) {
      const [assetId, caption, page] = trimmedLine
        .slice(4)
        .split('|')
        .map((part) => part.trim());

      const captionMarkup = caption ? `<div class="cap">${inline(caption)}</div>` : '';
      renderedLines.push(
        `<div class="fig"><img data-asset="${escapeMarkup(assetId)}" data-page="${escapeMarkup(page || '')}" ` +
          `data-cap="${escapeMarkup(caption || '')}" alt="${escapeMarkup(caption || 'Board asset')}"/>` +
          `${captionMarkup}</div>`,
      );
    } else {
      renderedLines.push(`<p>${inline(trimmedLine)}</p>`);
    }
  });

  flushStats();
  return renderedLines.join('');
}

let currentCard: Card | undefined;

// A tick is part of the note text, so the editor and every viewer see the same "[x]".
async function toggleCheck(line: number): Promise<void> {
  if (!bodyDocument) {
    return;
  }
  const lines = bodyDocument.value.split('\n');
  const match = lines[line]?.match(/^(\s*)\[( |x)\]/);
  if (!match) {
    return;
  }
  const offset = lines.slice(0, line).reduce((total, text) => total + text.length + 1, 0) + match[1].length + 1;
  const text = bodyDocument.text;
  text.doc!.transact(() => {
    text.delete(offset, 1);
    text.insert(offset, match[2] === 'x' ? ' ' : 'x');
  });
  await bodyDocument.flush();
}

function draw(): void {
  figureUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  const card = cardOf(content);
  currentCard = card;

  const colors = accentColors[card.accent ?? 'yellow'] ?? accentColors.yellow;
  const root = document.getElementById('card')!;
  root.style.setProperty('--accent', colors[0]);
  root.style.setProperty('--accentl', colors[1]);
  root.style.setProperty('--accentd', colors[2]);
  root.style.setProperty('--fs', (card.fs || 25) + 'px');
  root.style.transform = `rotate(${card.tilt || 0}deg)`;

  const style = card.style || 'paper';
  let decoration = '';
  if (card.deco === 'pin') {
    decoration = '<div class="pin" style="left:calc(50% - 15px);top:-10px"></div>';
  }
  if (card.deco === 'pins') {
    decoration = '<div class="pin" style="left:14px;top:-8px"></div>' + '<div class="pin" style="right:14px;top:-8px"></div>';
  }
  if (card.deco === 'tape') {
    decoration = `<div class="tape" style="--tapec:${colors[0]};left:calc(50% - 75px);top:-18px;transform:rotate(-3deg)"></div>`;
  }
  if (card.deco === 'tape2') {
    decoration =
      `<div class="tape" style="--tapec:${colors[0]};left:-40px;top:6px;transform:rotate(-38deg)"></div>` +
      `<div class="tape" style="--tapec:${colors[0]};right:-40px;top:6px;transform:rotate(38deg)"></div>`;
  }

  let cardMarkup = '';
  if (style === 'polaroid') {
    cardMarkup =
      `<div class="pimg" style="background-image:url('${escapeMarkup(imageUrl)}')" data-full="${escapeMarkup(imageUrl)}"></div>` +
      `<div class="pcap">${inline(card.title || '')}</div>`;
  } else {
    if (card.kicker) {
      cardMarkup += `<div class="kicker">${inline(card.kicker)}</div>`;
    }
    if (card.title) {
      cardMarkup += `<div class="title${style === 'banner' ? ' big' : ''}">` + `<span class="hlbar">${inline(card.title)}</span></div>`;
    }
    if (card.subtitle) {
      cardMarkup += `<div class="subtitle">${inline(card.subtitle)}</div>`;
    }

    const bodyClasses = `body${card.cols === 2 ? ' cols2' : ''}${card.pen === 2 ? ' pen2' : ''}`;
    cardMarkup += `<div class="${bodyClasses}">${render(bodyText)}</div>`;

    // Page references navigate the linked PDF for everyone on the board.
    const jumps = (card.pages || []).filter((page) => typeof page.page === 'number');
    if (card.sourceAppId && jumps.length) {
      const buttons = jumps.map((page) => {
        const caption = page.caption || 'p' + (page.page + 1);
        return `<button class="jump" data-page="${page.page}">↪ ${inline(caption)}</button>`;
      });
      cardMarkup += `<div class="jumps">${buttons.join('')}</div>`;
    }

    if (card.source && card.source.appId) {
      cardMarkup +=
        `<div class="jumps"><button class="jump back" data-app="${escapeMarkup(card.source.appId)}" ` +
        `data-page="${card.source.page}">↩ back to p${card.source.page + 1}</button></div>`;
    }

    if (card.footer) {
      cardMarkup += card.link
        ? `<a class="footer" href="${escapeMarkup(card.link)}" target="_blank" rel="noopener">${inline(card.footer)} ↗</a>`
        : `<div class="footer">${inline(card.footer)}</div>`;
    }
  }

  const empty = !card.title && !bodyText && style !== 'polaroid';
  if (empty) {
    cardMarkup = '<div class="blank">blank note…<br/>double click, or ✎ edit note in the toolbar</div>';
  }

  const collecting = object(plugin.state.value.target).appId === plugin.app?._id;
  const collectingMarkup = collecting ? '<div class="collecting">📌 collecting quotes</div>' : '';
  root.innerHTML = `${decoration}<div class="sheet ${style}">${cardMarkup}</div>${collectingMarkup}`;

  root.querySelector('.sheet')!.addEventListener('dblclick', (event) => {
    if (!(event.target as Element).closest('a, button, .chk')) {
      void plugin.request('ui.panel.open', { viewId: 'edit', appId: plugin.app!._id }).catch(showError);
    }
  });

  root.querySelectorAll<HTMLElement>('.hl.acc').forEach((highlight) => {
    highlight.style.background = `linear-gradient(100deg, transparent 2%, ${colors[0]} 4%, ${colors[0]} 96%, transparent 98%)`;
  });

  root.querySelectorAll<HTMLElement>('.chk').forEach((checkbox) => {
    checkbox.addEventListener('click', () => {
      void toggleCheck(Number(checkbox.dataset.line)).catch(showError);
    });
  });

  root.querySelectorAll<HTMLButtonElement>('.jump').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();

      const appId = button.dataset.app || card.sourceAppId;
      button.disabled = true;
      if (!appId) {
        return;
      }

      plugin
        .request('documents.navigate', { appId, page: Number(button.dataset.page) })
        .catch((error) => {
          button.title = String(error.message || error);
          button.classList.add('err');
        })
        .finally(() => {
          button.disabled = false;
        });
    });
  });

  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      void plugin.request('ui.openUrl', { url: anchor.href }).catch(showError);
    });
  });

  root.querySelectorAll<HTMLImageElement>('img[data-asset]').forEach((image) => {
    const id = image.dataset.asset!;
    const page = image.dataset.page ? Number(image.dataset.page) : undefined;

    void plugin
      .request('assets.read', { id, page })
      .then((blob) => {
        if (!image.isConnected) {
          return;
        }

        image.src = URL.createObjectURL(blob);
        figureUrls.push(image.src);
        image.addEventListener('load', () => fit(card), { once: true });
      })
      .catch(showError);
  });

  root.querySelectorAll<HTMLElement>('[data-full], .fig img').forEach((image) => {
    image.addEventListener('click', () => {
      const url = image.dataset.full || image.getAttribute('src');
      const caption = image.dataset.cap || '';

      const lightbox = document.createElement('div');
      lightbox.className = 'lightbox';
      lightbox.innerHTML = `<img src="${url}"/><div>${inline(caption)}</div>`;
      lightbox.addEventListener('click', () => lightbox.remove());

      root.appendChild(lightbox);
    });
  });

  fit(card);
}

// Pick the largest body size (within limits) whose content fits without scrolling
function fit(card: Card): void {
  const root = document.getElementById('card')!;
  const sheet = root.querySelector<HTMLElement>('.sheet');
  if (!sheet || card.style === 'polaroid' || card.nofit) {
    return;
  }

  let minimumSize = card.minfs || 15;
  let maximumSize = card.maxfs || 44;
  let bestSize = minimumSize;

  while (minimumSize <= maximumSize) {
    const candidateSize = (minimumSize + maximumSize) >> 1;
    root.style.setProperty('--fs', candidateSize + 'px');

    if (sheet.scrollHeight <= sheet.clientHeight + 1 && sheet.scrollWidth <= sheet.clientWidth + 1) {
      bestSize = candidateSize;
      minimumSize = candidateSize + 1;
    } else {
      maximumSize = candidateSize - 1;
    }
  }

  root.style.setProperty('--fs', bestSize + 'px');
}

let fitTimer: number | undefined;
window.addEventListener('resize', () => {
  window.clearTimeout(fitTimer);
  fitTimer = window.setTimeout(() => {
    if (currentCard) {
      fit(currentCard);
    }
  }, 150);
});

if (document.fonts) {
  void document.fonts.ready.then(() => {
    if (currentCard) {
      fit(currentCard);
    }
  });
}

plugin.on('app', (app) => {
  content = object(app.data.state.content);
  draw();
  void loadImage().catch(showError);
});
plugin.on('state', draw);
plugin.on('error', showError);

void plugin.ready
  .then(async (init) => {
    content = object(init.app?.data.state.content);
    bodyDocument = await plugin.openText('body');
    bodyText = bodyDocument.value;

    bodyDocument.observe((value) => {
      bodyText = value;
      draw();
    });

    draw();
    await loadImage();
  })
  .catch(showError);

window.addEventListener('pagehide', () => {
  bodyDocument?.dispose();
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
  }
  figureUrls.forEach((url) => URL.revokeObjectURL(url));
  plugin.dispose();
});
