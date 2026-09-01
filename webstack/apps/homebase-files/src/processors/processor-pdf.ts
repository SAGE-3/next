/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Node modules
import * as fs from 'fs';
import * as path from 'path';
import { strict as assert } from 'assert';

// SAGEBase queue
import { SBQueue } from '../connectors';
import { addUploadMessage as addStructuredUploadMessage } from '../api/messageCollection';

// PDF load legacy pdf build
const pdfjs = require('pdfjs-dist/legacy/build/pdf.min.mjs');
// PDF worker for Node.js
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
// PDF fonts
const CMAP_URL = './node_modules/pdfjs-dist/cmaps/';
const FONT_URL = './node_modules/pdfjs-dist/standard_fonts/';
const WASM_URL = './node_modules/pdfjs-dist/wasm/';
const CMAP_PACKED = true;
const DEFAULT_PDF_RENDER_CONCURRENCY = 1;
const MAX_PDF_RENDER_CONCURRENCY = 8;
const LARGE_PDF_PAGE_WARNING = 200;
const PDF_PROGRESS_MIN_INTERVAL_MS = 5000;

import { getStaticAssetUrl } from '@sage3/backend';
import { ExtraPDFType } from '@sage3/shared/types';

// Image processing tool
import sharp, { type OutputInfo } from 'sharp';

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function getPDFRenderConcurrency(): number {
  const configured = parsePositiveInteger(process.env.SAGE3_PDF_RENDER_CONCURRENCY);
  return Math.min(configured || DEFAULT_PDF_RENDER_CONCURRENCY, MAX_PDF_RENDER_CONCURRENCY);
}

function getPDFMaxPages(): number | undefined {
  return parsePositiveInteger(process.env.SAGE3_PDF_MAX_EAGER_PAGES);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanupGeneratedPDFArtifacts(directory: string, filenameWithoutExt: string): void {
  const generatedPagePattern = new RegExp(`^${escapeRegExp(filenameWithoutExt)}-\\d+-\\d+\\.webp$`);
  const generatedTextFile = `${filenameWithoutExt}-text.json`;

  try {
    const files = fs.readdirSync(directory);
    for (const file of files) {
      if (generatedPagePattern.test(file) || file === generatedTextFile) {
        try {
          fs.unlinkSync(path.join(directory, file));
        } catch (err) {
          console.warn('PDF> failed to remove generated artifact', file, err);
        }
      }
    }
  } catch (err) {
    console.warn('PDF> failed to inspect generated artifacts for cleanup', err);
  }
}

async function addUploadMessage(
  userId: string | undefined,
  payload: string,
  options: {
    uploadId?: string;
    fileId?: string;
    roomId?: string;
    filename?: string;
    phase?: 'uploading' | 'metadata' | 'processing' | 'rendering' | 'ready' | 'failed';
    progress?: { current?: number; total?: number; percent?: number; unit?: 'files' | 'pages' | 'bytes' };
    close?: boolean;
  } = {},
): Promise<void> {
  if (!userId) return;
  try {
    await addStructuredUploadMessage(userId, payload, options);
  } catch (err) {
    console.warn('PDF> failed to send upload message', err);
  }
}

function createPDFProgressReporter(
  userId: string | undefined,
  originalFilename: string,
  totalPages: number,
  uploadId: string | undefined,
  fileId: string | undefined,
  roomId: string | undefined,
) {
  let lastSentAt = 0;
  let lastReportedPage = 0;
  const filename = originalFilename || 'PDF';

  return async (renderedPages: number, force = false) => {
    const now = Date.now();
    const isDone = renderedPages >= totalPages;
    if (!force && !isDone && now - lastSentAt < PDF_PROGRESS_MIN_INTERVAL_MS) return;
    if (!force && !isDone && renderedPages === lastReportedPage) return;

    lastSentAt = now;
    lastReportedPage = renderedPages;
    const percent = totalPages > 0 ? Math.floor((renderedPages / totalPages) * 100) : 0;
    await addUploadMessage(userId, `Rendering ${filename}: page ${renderedPages} of ${totalPages} (${percent}%)`, {
      uploadId,
      fileId,
      roomId,
      filename,
      phase: renderedPages >= totalPages ? 'ready' : 'rendering',
      progress: { current: renderedPages, total: totalPages, percent, unit: 'pages' },
      close: renderedPages >= totalPages,
    });
  };
}

async function mapWithConcurrency<T>(count: number, concurrency: number, mapper: (index: number) => Promise<T>): Promise<T[]> {
  const results = new Array<T>(count);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, count);

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < count) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

// Fixed mid/thumbnail widths (px) added below the full render.
const PDF_TIER_WIDTHS = [1000, 500];

function getPDFResolutionOptions(maxWidth: number): { width: number; quality: number }[] {
  const fullWidth = Math.max(1, Math.floor(maxWidth));
  // Explicit tiers so every page yields a predictable set of sizes regardless of
  // orientation. (Halving the width stopped after one step for portrait pages,
  // whose width is the short edge, giving 2 tiers vs 3 for landscape.)
  // The top tier is always the full render (keeps max quality); the fixed widths
  // are added below it, skipping any that meet or exceed the full width so we
  // never upscale or emit duplicate sizes.
  const options: { width: number; quality: number }[] = [{ width: fullWidth, quality: 70 }];
  for (const tierWidth of PDF_TIER_WIDTHS) {
    if (tierWidth < fullWidth) {
      options.push({ width: tierWidth, quality: 75 });
    }
  }
  return options;
}

/**
 * Converting PDF to multiple resolutions using pdfjs and sharp
 *
 * @export
 * @class PDFProcessor
 */
export class PDFProcessor {
  // Bull queues
  private queue: SBQueue;
  private output: string;

  constructor(redisUrl: string, folder: string) {
    this.queue = new SBQueue(redisUrl, 'pdf-queue');
    this.output = folder;

    // Add a function to convert PDF
    this.queue.addProcessor(async (job) => {
      const data = await pdfProcessing(job).catch((err) => {
        return Promise.reject(err);
      });
      return Promise.resolve({
        file: job.data.filename,
        id: job.data.id,
        result: data,
      });
    });
  }

  /**
   * Return bull queue name
   *
   * @returns {string}
   *
   * @memberOf FileProcessor
   */
  getName(): string {
    return this.queue.getName();
  }

  /**
   * Create a task to process a file
   *
   * @param {string} id
   * @param {string} file
   * @returns {Promise<any>}
   *
   * @memberOf TaskManager
   */
  async addFile(id: string, filename: string, userId?: string, originalFilename?: string, uploadId?: string, fileId?: string, roomId?: string) {
    const job = await this.queue.addTask({ id, filename, pathname: this.output, userId, originalFilename, uploadId, fileId, roomId });
    return job;
  }
}

/**
 * Process a file
 *
 * @method file
 * @param filename {String} name of the file to be tested
 */
async function pdfProcessing(job: any): Promise<ExtraPDFType> {
  const filename: string = job.data.filename;
  const pathname: string = path.join(job.data.pathname, filename);
  const directory: string = job.data.pathname;
  const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  let pdfTask;

  // @ts-ignore
  // const canvasFactory = new NodeCanvasFactory();

  // Read the PDF file into a buffer
  const data = new Uint8Array(fs.readFileSync(pathname));

  // Pass the data to the PDF.js library
  try {
    pdfTask = pdfjs.getDocument({
      data,
      // canvasFactory,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      standardFontDataUrl: FONT_URL,
      wasmUrl: WASM_URL,
      useWasm: true,
    });
  } catch (err) {
    console.error('PDF> Error parsing file', err);
    return Promise.reject(err);
  }

  // Array of pages
  const allText: string[] = [];
  const renderConcurrency = getPDFRenderConcurrency();
  const maxPages = getPDFMaxPages();
  const userId = job.data.userId as string | undefined;
  const originalFilename = (job.data.originalFilename as string | undefined) || filename;
  const uploadId = job.data.uploadId as string | undefined;
  const fileId = job.data.fileId as string | undefined;
  const roomId = job.data.roomId as string | undefined;
  let completedPages = 0;
  let pdf: any;

  try {
    pdf = await pdfTask.promise;

    if (maxPages && pdf.numPages > maxPages) {
      throw new Error(`PDF has ${pdf.numPages} pages, exceeding SAGE3_PDF_MAX_EAGER_PAGES=${maxPages}`);
    }

    if (pdf.numPages > LARGE_PDF_PAGE_WARNING) {
      console.log(`PDF> large document detected: ${pdf.numPages} pages, render concurrency ${renderConcurrency}`);
    }

    await addUploadMessage(userId, `Rendering ${originalFilename}: 0 of ${pdf.numPages} pages`, {
      uploadId,
      fileId,
      roomId,
      filename: originalFilename,
      phase: 'rendering',
      progress: { current: 0, total: pdf.numPages, percent: 0, unit: 'pages' },
    });
    const reportProgress = createPDFProgressReporter(userId, originalFilename, pdf.numPages, uploadId, fileId, roomId);

    const renderPage = async (i: number): Promise<ExtraPDFType[number]> => {
      let page;
      let canvasAndContext;
      const canvasFactory = pdf.canvasFactory;

      try {
        page = await pdf.getPage(i + 1);

        // Get the text content of the page
        const text = await page.getTextContent();
        let pageText = '';
        for (let k = 0; k < text.items.length; k++) {
          const item = text.items[k];
          // Remove very small spaces
          if (item.str === ' ' && item.width < 0.1) continue;
          // Add the text
          if (item.str) pageText += item.str;
          // Add the end of line
          if (item.hasEOL) pageText += '\n';
        }
        // Store the text into a page array
        allText[i] = pageText;

        // Instead of using a scaling factor, we try to get a given dimension
        // on the long end (in pixels)
        // Because different PDFs have different dimension defined (viewbox)
        const desired = 2500;
        const initialviewport = page.getViewport({ scale: 1 });

        // Calculate the scale
        let scale = desired / initialviewport.width;
        // If document is in portrait mode, we need to swap the dimensions
        if (initialviewport.width < initialviewport.height) {
          scale = desired / initialviewport.height;
        }
        // Limit the scale between 1 and 8
        if (scale < 0) scale = 1;
        if (scale > 8) scale = 8;

        // Finally, get the viewport with the calculated scale
        const viewport = page.getViewport({ scale: scale });

        canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

        const options = getPDFResolutionOptions(viewport.width);

        const renderContext = {
          canvasContext: canvasAndContext.context,
          viewport,
        };

        await page.render(renderContext).promise;

        // Read the Image and pipe it into Sharp

        // Get the buffer directly in PNG, low compression for speed
        // const cdata = await canvasAndContext.canvas.toBuffer('png', {
        //   compressionLevel: 1,
        //   filters: canvasAndContext.canvas.PNG_FILTER_NONE,
        // });
        // const sharpStream = sharp(cdata, { failOn: 'none' });

        // Round the dimensions to the nearest integer for sharp library
        const vw = Math.floor(viewport.width);
        const vh = Math.floor(viewport.height);

        // Get RGBA buffer
        const cdata = await canvasAndContext.context.getImageData(0, 0, vw, vh).data;
        const sharpStream = sharp(cdata, { raw: { width: vw, height: vh, channels: 4 }, failOn: 'none' });

        // Generate the WebP in multiple resolutions
        const renderResult = await Promise.all<OutputInfo>([
          // resize multiple versions based on the option set
          ...options.map(({ width, quality }) =>
            sharpStream
              .clone()
              .resize({ width, kernel: 'lanczos2' })
              .webp({ quality, effort: 0 })
              .toFile(path.join(directory, `${filenameWithoutExt}-${i}-${width}.webp`)),
          ),
        ]);

        // combine all the results for that page
        return options.map(({ width }, optionIndex) => {
          // information from sharp
          const info = renderResult[optionIndex];
          assert(info, `Missing rendered output for PDF page ${i + 1} at width ${width}`);
          // url of the page image
          const url = getStaticAssetUrl(`${filenameWithoutExt}-${i}-${width}.webp`);
          return { url, ...info };
        });
      } finally {
        if (canvasAndContext && canvasFactory && typeof canvasFactory.destroy === 'function') {
          try {
            canvasFactory.destroy(canvasAndContext);
          } catch (err) {
            console.warn('PDF> canvas cleanup failed', err);
          }
        }
        if (page && typeof page.cleanup === 'function') {
          try {
            page.cleanup();
          } catch (err) {
            console.warn('PDF> page cleanup failed', err);
          }
        }
      }
    };

    const pdfres = await mapWithConcurrency(pdf.numPages, renderConcurrency, async (i) => {
      const result = await renderPage(i);
      completedPages++;
      await reportProgress(completedPages);
      return result;
    });
    // Get all the text data
    const textdata = {
      count: allText.length,
      pages: allText,
    };
    // Save the text to a file
    console.log('PDF> saving text content');
    const f = job.data.filename;
    const fn = path.join(job.data.pathname, path.basename(f, path.extname(f))) + '-text.json';
    fs.writeFileSync(fn, JSON.stringify(textdata, null, 2));
    // Return the result
    console.log('PDF> processing done');
    await reportProgress(completedPages, true);
    return pdfres;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('PDF> processing failed', originalFilename, message);
    cleanupGeneratedPDFArtifacts(directory, filenameWithoutExt);
    await addUploadMessage(
      userId,
      `Rendering failed for ${originalFilename} after ${completedPages} page${completedPages === 1 ? '' : 's'}: ${message}`,
      {
        uploadId,
        fileId,
        roomId,
        filename: originalFilename,
        phase: 'failed',
        progress: {
          current: completedPages,
          total: pdf?.numPages,
          percent: pdf?.numPages ? Math.floor((completedPages / pdf.numPages) * 100) : undefined,
          unit: 'pages',
        },
        close: true,
      },
    );
    throw err;
  } finally {
    if (pdf && typeof pdf.destroy === 'function') {
      try {
        await pdf.destroy();
      } catch (err) {
        console.warn('PDF> document cleanup failed', err);
      }
    }
  }
}
