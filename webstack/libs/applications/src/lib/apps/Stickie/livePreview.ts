/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Markdown "live preview", as in Obsidian or Typora: the text is shown rendered (headings,
 * bold, italics, code, links, lists, tasks, quotes), except on the lines with the cursor,
 * which show the raw Markdown so it can be edited. A fenced code block shows raw as a whole
 * when the cursor is in it.
 *
 * One set of rules (markdownParts), two outputs: CodeMirror decorations for the editor
 * (markdownLivePreview), and plain lines for a note nobody is editing (renderMarkdownLines),
 * which costs much less than an editor. Both use the same CSS classes (markdownCss), so
 * switching between them doesn't change what's shown.
 */

import { EditorState, Range, Text } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { highlightTree, tagHighlighter, tags } from '@lezer/highlight';

// A parsed Markdown text (the editor's, or one parsed alone)
type Tree = ReturnType<typeof syntaxTree>;

// Markdown characters hidden off the cursor's lines
const HIDDEN_MARKS = new Set(['HeaderMark', 'EmphasisMark', 'CodeMark', 'StrikethroughMark', 'QuoteMark', 'LinkMark']);

/** What to do with a part of the text, for the editor or the plain view */
export type MarkdownPart =
  | { kind: 'line'; at: number; className: string }
  | { kind: 'hide'; from: number; to: number }
  | { kind: 'bullet'; from: number; to: number }
  | { kind: 'task'; from: number; to: number; checked: boolean }
  | { kind: 'mark'; from: number; to: number; className: string; url?: string };

/**
 * The rules: the parts of a Markdown text to style, hide or replace. Lines in `raw` (1-based,
 * those being edited) keep their Markdown characters, dimmed.
 */
function markdownParts(tree: Tree, doc: Text, raw: Set<number>, from = 0, to = doc.length): MarkdownPart[] {
  const parts: MarkdownPart[] = [];
  const isRaw = (start: number, end: number) => {
    if (raw.size === 0) return false;
    const first = doc.lineAt(start).number;
    const last = doc.lineAt(end).number;
    for (let n = first; n <= last; n++) if (raw.has(n)) return true;
    return false;
  };
  const eachLine = (start: number, end: number, className: string) => {
    for (let pos = start; pos <= end; ) {
      const line = doc.lineAt(pos);
      parts.push({ kind: 'line', at: line.from, className });
      pos = line.to + 1;
    }
  };

  tree.iterate({
    from,
    to,
    enter: (node) => {
      const name = node.name;
      // Headings and quotes: the whole line is styled, raw or not
      const heading = /^ATXHeading(\d)$/.exec(name);
      if (heading) parts.push({ kind: 'line', at: doc.lineAt(node.from).from, className: `cm-md-h${heading[1]}` });
      if (name === 'Blockquote') eachLine(node.from, node.to, 'cm-md-quote');
      // A fenced code block is raw as a whole while the cursor is in it
      if (name === 'FencedCode') {
        eachLine(node.from, node.to, 'cm-md-codeblock');
        if (isRaw(node.from, node.to)) return false;
        // Otherwise its ``` lines are hidden
        const open = doc.lineAt(node.from);
        const close = doc.lineAt(node.to);
        if (open.number !== close.number) {
          if (open.to > open.from) parts.push({ kind: 'hide', from: open.from, to: open.to });
          if (/^\s*(```|~~~)\s*$/.test(close.text) && close.to > close.from) parts.push({ kind: 'hide', from: close.from, to: close.to });
        }
        return false;
      }
      // Links: [text](url) shows its text, styled (the URL is kept in the text)
      if (name === 'Link' && !isRaw(node.from, node.to)) {
        const url = node.node.getChild('URL');
        const label = node.node.getChildren('LinkMark');
        if (url && label.length >= 2) {
          parts.push({ kind: 'mark', from: label[0].to, to: label[1].from, className: 'cm-md-link', url: doc.sliceString(url.from, url.to) });
          parts.push({ kind: 'hide', from: label[1].from, to: node.to });
          parts.push({ kind: 'hide', from: label[0].from, to: label[0].to });
        }
        return false;
      }
      if (isRaw(node.from, node.to)) {
        // On the lines being edited, the Markdown characters show, dimmed
        if (HIDDEN_MARKS.has(name) && node.to > node.from) parts.push({ kind: 'mark', from: node.from, to: node.to, className: 'cm-md-mark' });
        return;
      }
      if (HIDDEN_MARKS.has(name)) {
        let end = node.to;
        // "# Title": the space after the heading's marks too
        if ((name === 'HeaderMark' || name === 'QuoteMark') && doc.sliceString(end, end + 1) === ' ') end += 1;
        if (end > node.from) parts.push({ kind: 'hide', from: node.from, to: end });
      } else if (name === 'ListMark') {
        const mark = doc.sliceString(node.from, node.to);
        const task = node.node.parent?.getChild('Task');
        // Bullets only for unordered lists that aren't tasks ("1." stays as written)
        if (/^[-*+]$/.test(mark) && !task) parts.push({ kind: 'bullet', from: node.from, to: node.to });
        // A task's "-" is hidden: its checkbox stands for it
        if (task) {
          let end = node.to;
          if (doc.sliceString(end, end + 1) === ' ') end += 1;
          parts.push({ kind: 'hide', from: node.from, to: end });
        }
      } else if (name === 'TaskMarker') {
        parts.push({ kind: 'task', from: node.from, to: node.to, checked: /x/i.test(doc.sliceString(node.from, node.to)) });
      }
      return;
    },
  });
  return parts;
}

// Text styles, as classes shared by both outputs (styled in markdownCss)
const markdownHighlighter = tagHighlighter([
  { tag: tags.strong, class: 'cm-md-strong' },
  { tag: tags.emphasis, class: 'cm-md-em' },
  { tag: tags.strikethrough, class: 'cm-md-strike' },
  { tag: tags.monospace, class: 'cm-md-code' },
  { tag: tags.url, class: 'cm-md-url' },
]);

/** The styles of both outputs, for the element holding the note (Chakra's `css`) */
export const markdownCss = {
  '.cm-md-h1': { fontSize: '1.6em', fontWeight: 'bold' },
  '.cm-md-h2': { fontSize: '1.35em', fontWeight: 'bold' },
  '.cm-md-h3': { fontSize: '1.15em', fontWeight: 'bold' },
  '.cm-md-h4, .cm-md-h5, .cm-md-h6': { fontWeight: 'bold' },
  // (also as .cm-line.cm-md-quote: more specific than the editor theme's line padding)
  '.cm-md-quote, .cm-line.cm-md-quote': { borderLeft: '4px solid rgba(0, 0, 0, 0.25)', paddingLeft: '0.6em', fontStyle: 'italic' },
  '.cm-md-codeblock': { fontFamily: 'Menlo, Consolas, monospace', backgroundColor: 'rgba(0, 0, 0, 0.06)', fontSize: '0.85em' },
  '.cm-md-strong': { fontWeight: 'bold' },
  '.cm-md-em': { fontStyle: 'italic' },
  '.cm-md-strike': { textDecoration: 'line-through' },
  '.cm-md-code': { fontFamily: 'Menlo, Consolas, monospace', backgroundColor: 'rgba(0, 0, 0, 0.06)', borderRadius: '3px' },
  '.cm-md-url': { opacity: 0.6 },
  '.cm-md-mark': { opacity: 0.4 },
  '.cm-md-bullet': { paddingRight: '0.2em' },
  '.cm-md-task': { width: '0.8em', height: '0.8em', margin: '0 0.35em 0 0', verticalAlign: 'middle', cursor: 'pointer' },
  '.cm-md-link': { color: '#2b6cb0', textDecoration: 'underline', cursor: 'pointer' },
};

// ─── The editor's output ──────────────────────────────────────────────────────

/** A bullet in place of a list's "-", "*" or "+" */
class BulletWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-md-bullet';
    span.textContent = '•';
    return span;
  }
}

/** A checkbox in place of a task's "[ ]" or "[x]"; clicking it toggles the task in the text */
class TaskWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly pos: number) {
    super();
  }
  eq(other: TaskWidget) {
    return other.checked === this.checked && other.pos === this.pos;
  }
  toDOM(view: EditorView) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = this.checked;
    box.className = 'cm-md-task';
    box.disabled = view.state.readOnly;
    box.addEventListener('mousedown', (event) => {
      event.preventDefault();
      if (view.state.readOnly) return;
      // "[ ]" <-> "[x]": the character between the brackets
      view.dispatch({ changes: { from: this.pos + 1, to: this.pos + 2, insert: this.checked ? ' ' : 'x' }, userEvent: 'input' });
    });
    return box;
  }
  ignoreEvent() {
    return false;
  }
}

/** The line numbers (1-based) shown raw: those with the cursor or a selection, when focused */
function rawLines(view: EditorView): Set<number> {
  const lines = new Set<number>();
  if (!view.hasFocus) return lines;
  const doc = view.state.doc;
  for (const range of view.state.selection.ranges) {
    const first = doc.lineAt(range.from).number;
    const last = doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) lines.add(n);
  }
  return lines;
}

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const raw = rawLines(view);
  const tree = syntaxTree(view.state);
  for (const { from, to } of view.visibleRanges) {
    for (const part of markdownParts(tree, view.state.doc, raw, from, to)) {
      if (part.kind === 'line') decorations.push(Decoration.line({ class: part.className }).range(part.at));
      else if (part.kind === 'hide') decorations.push(Decoration.replace({}).range(part.from, part.to));
      else if (part.kind === 'bullet') decorations.push(Decoration.replace({ widget: new BulletWidget() }).range(part.from, part.to));
      else if (part.kind === 'task') decorations.push(Decoration.replace({ widget: new TaskWidget(part.checked, part.from) }).range(part.from, part.to));
      else
        decorations.push(
          Decoration.mark({ class: part.className, attributes: part.url ? { 'data-url': part.url } : undefined }).range(part.from, part.to),
        );
    }
  }
  return Decoration.set(decorations, true);
}

const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      // The cursor moving between lines or the focus changing changes what is raw
      if (update.docChanged || update.viewportChanged || update.selectionSet || update.focusChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    eventHandlers: {
      // A rendered link opens in a new tab (the Electron client sends it to the browser)
      mousedown: (event) => {
        const link = (event.target as HTMLElement).closest('.cm-md-link') as HTMLElement | null;
        const url = link?.dataset.url;
        if (!url || !/^https?:\/\//i.test(url)) return false;
        event.preventDefault();
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      },
    },
  },
);

/** Markdown (with GitHub's tables, tasks and strikethrough) shown as a live preview */
export function markdownLivePreview() {
  return [markdown({ base: markdownLanguage }), syntaxHighlighting(markdownHighlighter), livePreviewPlugin];
}

/** Read only, or not (a locked Stickie) */
export function readOnly(locked: boolean) {
  return [EditorState.readOnly.of(locked), EditorView.editable.of(!locked)];
}

// ─── The plain output (a note nobody is editing) ──────────────────────────────

/** A piece of a line: some text with its classes, or a bullet or a checkbox in its place */
export type MarkdownSegment =
  | { text: string; classNames: string[]; url?: string }
  | { bullet: true }
  | { task: true; checked: boolean };

/** A line of the plain output: its classes (heading, quote, ...) and its pieces */
export type MarkdownLine = { classNames: string[]; segments: MarkdownSegment[] };

/**
 * A Markdown text, fully rendered (nothing raw), as lines of pieces: what the editor shows
 * without the focus, without an editor
 */
export function renderMarkdownLines(text: string): MarkdownLine[] {
  const doc = Text.of(text.split('\n'));
  const tree = markdownLanguage.parser.parse(text);
  const parts = markdownParts(tree, doc, new Set());

  // Per character: hidden, replaced (at the start of a bullet or a task), and its classes
  const hidden = new Uint8Array(text.length);
  const replaced = new Map<number, { end: number; segment: MarkdownSegment }>();
  const classes: string[][] = Array.from({ length: text.length }, () => []);
  const urls = new Map<number, string>();
  const lineClasses = new Map<number, string[]>();
  for (const part of parts) {
    if (part.kind === 'line') lineClasses.set(part.at, [...(lineClasses.get(part.at) ?? []), part.className]);
    else if (part.kind === 'hide') hidden.fill(1, part.from, part.to);
    else if (part.kind === 'bullet') replaced.set(part.from, { end: part.to, segment: { bullet: true } });
    else if (part.kind === 'task') replaced.set(part.from, { end: part.to, segment: { task: true, checked: part.checked } });
    else
      for (let i = part.from; i < part.to; i++) {
        classes[i].push(part.className);
        if (part.url) urls.set(i, part.url);
      }
  }
  highlightTree(tree, markdownHighlighter, (from, to, className) => {
    for (let i = from; i < to; i++) classes[i].push(className);
  });

  const lines: MarkdownLine[] = [];
  for (let n = 1; n <= doc.lines; n++) {
    const line = doc.line(n);
    const segments: MarkdownSegment[] = [];
    for (let i = line.from; i < line.to; ) {
      const replacement = replaced.get(i);
      if (replacement) {
        segments.push(replacement.segment);
        i = replacement.end;
        continue;
      }
      if (hidden[i]) {
        i++;
        continue;
      }
      // A run of characters with the same classes
      const key = classes[i].join(' ');
      let j = i + 1;
      while (j < line.to && !hidden[j] && !replaced.has(j) && classes[j].join(' ') === key) j++;
      segments.push({ text: text.slice(i, j), classNames: classes[i], url: urls.get(i) });
      i = j;
    }
    lines.push({ classNames: lineClasses.get(line.from) ?? [], segments });
  }
  return lines;
}
