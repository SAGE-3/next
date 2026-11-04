import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { PluginSelection } from '@sage3/sageplugin';
import { normalizePDFSelection } from './PDFSelection';
import './PDFTextLayer.css';

export function usePDFDocument(url: string | undefined) {
  const [loaded, setLoaded] = useState<{
    readonly url: string;
    readonly document?: PDFDocumentProxy;
    readonly error?: string;
  }>();

  useEffect(() => {
    if (!url) {
      return;
    }

    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | undefined;

    void (async () => {
      try {
        // Match the browser PDF.js worker convention used by SageIdeator.
        GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
        loadingTask = getDocument({ url, withCredentials: true });

        const document = await loadingTask.promise;
        if (!cancelled) {
          setLoaded({ url, document });
        }
      } catch (error: unknown) {
        if (!cancelled) {
          console.warn('PDF text selection unavailable', error);
          setLoaded({ url, error: 'Text selection unavailable for this PDF.' });
        }
      }
    })();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [url]);

  return loaded?.url === url ? loaded : undefined;
}

interface PDFTextLayerProps {
  readonly document: PDFDocumentProxy;
  readonly page: number;
  readonly onSelection: (page: number, selection?: PluginSelection) => void;
}

export function PDFTextLayer({ document: pdfDocument, page, onSelection }: PDFTextLayerProps): JSX.Element {
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    const pageElement = pageRef.current;
    const textContainer = textRef.current;

    if (!frame || !pageElement || !textContainer) {
      return;
    }

    let cancelled = false;
    let textLayer: TextLayer | undefined;
    let resizeObserver: ResizeObserver | undefined;

    setError(false);

    void (async () => {
      try {
        const pdfPage = await pdfDocument.getPage(page + 1);
        if (cancelled) {
          return;
        }

        const viewport = pdfPage.getViewport({ scale: 1 });
        pageElement.style.width = `${viewport.width}px`;
        pageElement.style.height = `${viewport.height}px`;

        const fitPageToFrame = () => {
          const scale = Math.min(frame.clientWidth / viewport.width, frame.clientHeight / viewport.height);
          const left = (frame.clientWidth - viewport.width * scale) / 2;
          const top = (frame.clientHeight - viewport.height * scale) / 2;

          pageElement.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
        };

        fitPageToFrame();
        resizeObserver = new ResizeObserver(fitPageToFrame);
        resizeObserver.observe(frame);

        textContainer.style.setProperty('--total-scale-factor', String(viewport.userUnit));
        textLayer = new TextLayer({
          container: textContainer,
          viewport,
          textContentSource: pdfPage.streamTextContent(),
        });

        // Explicit dimensions avoid PDF.js viewer-wide scale/round CSS dependencies.
        const unrotatedViewport = pdfPage.getViewport({ scale: 1, rotation: 0 });
        textContainer.style.width = `${unrotatedViewport.width}px`;
        textContainer.style.height = `${unrotatedViewport.height}px`;

        await textLayer.render();
      } catch (error: unknown) {
        if (!cancelled) {
          textContainer.replaceChildren();
          console.warn('PDF page text selection unavailable', error);
          setError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      textLayer?.cancel();

      const selection = window.getSelection();
      if (selection?.anchorNode && textContainer.contains(selection.anchorNode)) {
        selection.removeAllRanges();
      }

      textContainer.replaceChildren();
    };
  }, [pdfDocument, page]);

  useEffect(() => {
    const textContainer = textRef.current;
    const pageElement = pageRef.current;

    if (!textContainer || !pageElement) {
      return;
    }

    const updateSelection = () => {
      const selection = window.getSelection();
      if (!selection?.anchorNode || !textContainer.contains(selection.anchorNode)) {
        return;
      }

      if (selection.isCollapsed || !selection.rangeCount || !selection.focusNode || !textContainer.contains(selection.focusNode)) {
        onSelection(page);
        return;
      }

      const passage = normalizePDFSelection(
        selection.toString(),
        Array.from(selection.getRangeAt(0).getClientRects()),
        pageElement.getBoundingClientRect(),
      );

      onSelection(page, passage);
    };

    document.addEventListener('selectionchange', updateSelection);
    return () => document.removeEventListener('selectionchange', updateSelection);
  }, [page, onSelection]);

  const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <div
      ref={frameRef}
      className="sage-pdf-text-frame"
      data-pdf-text-layer
      onPointerDown={(event) => {
        event.stopPropagation();

        if (event.button === 0) {
          onSelection(page);
        }
      }}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onClick={stopPropagation}
      onDoubleClick={stopPropagation}
      onTouchStart={stopPropagation}
      onTouchMove={stopPropagation}
      onTouchEnd={stopPropagation}
      onKeyDown={stopPropagation}
    >
      <div ref={pageRef} className="sage-pdf-text-page">
        <div ref={textRef} className="sage-pdf-text-layer" tabIndex={0} aria-label={`PDF page ${page + 1} text`} />
      </div>
      {error && (
        <span className="sage-pdf-text-error" role="status">
          Text selection unavailable for this page.
        </span>
      )}
    </div>
  );
}
