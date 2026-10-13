import { SAGE3Plugin } from '@sage3/sageplugin';
import type { PluginState } from '@sage3/sageplugin';
import { object, escapeHtml as esc, showError } from './model';

type Flashcard = {
  tag: string;
  q: string;
  a: string;
};
type Deck = {
  deck: Flashcard[];
  order: number[] | null;
  idx: number;
  flip: boolean;
  known: Record<string, boolean>;
  filter: string;
};

const plugin = new SAGE3Plugin();
const TAGS: Record<string, readonly string[]> = {
  P1: ['pirolli & card', '#b3dbff'],
  P2: ['space to think', '#b9dc8c'],
  P3: ['managing messes', '#ffb7c9'],
  X: ['connections', '#dccbf6'],
};
let state: Deck = { deck: [], order: null, idx: 0, flip: false, known: {}, filter: 'all' };

const zoom = (): void => {
  document.documentElement.style.setProperty('zoom', String(Math.max(0.2, Math.min(innerWidth / 1300, innerHeight / 820))));
};
zoom();
window.addEventListener('resize', zoom);

function visible(): number[] {
  const order = state.order || state.deck.map((_, index) => index);
  return order.filter((index) => state.deck[index] && (state.filter === 'all' || state.deck[index].tag === state.filter));
}

function load(content: PluginState): void {
  state = {
    deck: Array.isArray(content.deck) ? (content.deck as Flashcard[]) : [],
    order: Array.isArray(content.order) ? (content.order as number[]) : null,
    idx: typeof content.idx === 'number' ? content.idx : 0,
    flip: content.flip === true,
    known: object(content.known) as Record<string, boolean>,
    filter: typeof content.filter === 'string' ? content.filter : 'all',
  };
  render();
}

function push(value: Partial<Deck>): void {
  Object.assign(state, value);
  render();
  void plugin
    .request('app.content.patch', {
      changes: Object.entries(value).map(([key, entry]) => ({ op: 'set', path: [key], value: entry })),
    })
    .catch(showError);
}

// Cards are plain text: **bold** and line breaks, everything else shows as typed.
const markup = (text: string): string =>
  esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br/>');

function render(): void {
  const indices = visible();
  const filters = document.getElementById('filters')!;
  filters.innerHTML = [['all', 'all', '#fff08c'], ...Object.entries(TAGS).map(([key, value]) => [key, ...value])]
    .map(
      ([key, name, color]) =>
        `<button class="f${state.filter === key ? ' on' : ''}" style="--fc:${color}" data-k="${key}">${name}</button>`,
    )
    .join('');
  filters.querySelectorAll<HTMLElement>('.f').forEach((button) => {
    button.onclick = () => push({ filter: button.dataset.k!, idx: 0, flip: false });
  });

  const card = document.getElementById('card')!;
  const knownCount = indices.filter((index) => state.known[`card_${index}`] === true).length;
  document.getElementById('tally')!.textContent = `${knownCount} of ${indices.length} known`;
  document.getElementById('bar')!.style.width = (indices.length ? (knownCount / indices.length) * 100 : 0) + '%';

  if (!indices.length) {
    card.innerHTML = '<div class="face front"><div class="q">no cards yet</div></div>';
    card.onclick = null;
    return;
  }

  const visibleIndex = Math.min(state.idx, indices.length - 1);
  const flashcard = state.deck[indices[visibleIndex]];
  const tag = TAGS[flashcard.tag] || TAGS.X;

  card.className = 'card' + (state.flip ? ' flip' : '');
  let statusMark = '';
  if (state.known[`card_${indices[visibleIndex]}`] === true) {
    statusMark = ' ✓';
  } else if (state.known[`card_${indices[visibleIndex]}`] === false) {
    statusMark = ' ↺';
  }

  card.innerHTML =
    `<div class="face front">` +
    `<span class="tag" style="--tc:${tag[1]}">${tag[0]}</span>` +
    `<span class="num">${visibleIndex + 1} / ${indices.length}${statusMark}</span>` +
    `<div class="q">${markup(flashcard.q)}</div>` +
    `<div class="hint">click to flip</div></div>\n    ` +
    `<div class="face back">` +
    `<span class="tag" style="--tc:${tag[1]}">${tag[0]}</span>` +
    `<span class="num">answer</span>` +
    `<div class="a">${markup(flashcard.a)}</div></div>`;

  card.onclick = () => push({ flip: !state.flip });
}

function move(delta: number): void {
  const count = visible().length;
  if (count) {
    push({ idx: (Math.min(state.idx, count - 1) + delta + count) % count, flip: false });
  }
}

function mark(value: boolean): void {
  const indices = visible();
  if (!indices.length) {
    return;
  }

  const key = `card_${indices[Math.min(state.idx, indices.length - 1)]}`;
  state.known[key] = value;
  void plugin.request('app.content.patch', { changes: [{ op: 'set', path: ['known', key], value }] }).catch(showError);
  move(1);
}

document.getElementById('prev')!.onclick = () => move(-1);
document.getElementById('next')!.onclick = () => move(1);
document.getElementById('got')!.onclick = () => mark(true);
document.getElementById('again')!.onclick = () => mark(false);
document.getElementById('shuf')!.onclick = () => {
  const order = state.deck.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  push({ order, idx: 0, flip: false });
};
document.getElementById('reset')!.onclick = () => push({ known: {}, idx: 0, flip: false, order: null });

function editor(index: number | null): void {
  const flashcard = index === null ? { tag: state.filter === 'all' ? 'X' : state.filter, q: '', a: '' } : state.deck[index];
  const form = document.createElement('div');
  form.className = 'ed';
  form.innerHTML =
    `<label>question</label><textarea class="q2" aria-label="Question"></textarea>` +
    `<label>answer</label><textarea class="a2" aria-label="Answer"></textarea>\n    ` +
    `<div class="row"><select class="t2" aria-label="Category">${Object.entries(TAGS)
      .map(([key, tag]) => `<option value="${key}">${tag[0]}</option>`)
      .join('')}</select>\n    ` +
    (index === null ? '' : '<button class="btn del">delete card</button>') +
    `<span style="flex:1"></span><button class="btn cancel">cancel</button>` +
    `<button class="btn save">save</button></div>`;

  const question = form.querySelector<HTMLTextAreaElement>('.q2')!;
  const answer = form.querySelector<HTMLTextAreaElement>('.a2')!;
  const category = form.querySelector<HTMLSelectElement>('.t2')!;
  question.value = flashcard.q;
  answer.value = flashcard.a;
  category.value = flashcard.tag;

  form.querySelector<HTMLButtonElement>('.cancel')!.onclick = () => form.remove();
  form.querySelector<HTMLButtonElement>('.save')!.onclick = () => {
    const card = { tag: category.value, q: question.value, a: answer.value };
    const deck = state.deck.slice();
    if (index === null) {
      deck.push(card);
    } else {
      deck[index] = card;
    }

    form.remove();
    push({
      deck,
      order: null,
      idx: index === null ? deck.length - 1 : state.idx,
      flip: false,
      filter: index === null ? 'all' : state.filter,
    });
  };

  const deleteButton = form.querySelector<HTMLButtonElement>('.del');
  if (deleteButton && index !== null) {
    deleteButton.onclick = () => {
      const deck = state.deck.slice();
      deck.splice(index, 1);
      form.remove();
      push({ deck, order: null, idx: 0, flip: false, known: {} });
    };
  }

  document.querySelector('.stage')!.appendChild(form);
}

document.getElementById('add')!.onclick = () => editor(null);
document.getElementById('edit')!.onclick = () => {
  const indices = visible();
  if (indices.length) {
    editor(indices[Math.min(state.idx, indices.length - 1)]);
  }
};

plugin.on('app', (app) => load(object(app.data.state.content)));
plugin.on('error', showError);

void plugin.ready.then((init) => load(object(init.app?.data.state.content))).catch(showError);
window.addEventListener('pagehide', () => plugin.dispose());
