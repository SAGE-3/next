/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
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

// load legacy pdf build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.min.js');
const CMAP_URL = './node_modules/pdfjs-dist/cmaps/';
const FONT_URL = './node_modules/pdfjs-dist/standard_fonts/';
const CMAP_PACKED = true;
import { createCanvas } from 'canvas';
// import { Canvas } from 'canvas-constructor/cairo';

import { getStaticAssetUrl } from '@sage3/backend';
import { ExtraPDFType } from '@sage3/shared/types';

// Image processing tool
import * as sharp from 'sharp';

console.log('PDF> library version', pdfjs.version);

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

  constructor(redisUrl: string, folder: string, worker = true) {
    this.queue = new SBQueue(redisUrl, 'pdf-queue');
    this.output = folder;

    // Add a function to convert PDF
    if (worker) {
      this.queue.addProcessorSandboxed('./dist/libs/workers/src/lib/pdf.js');
    } else {
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
  async addFile(id: string, filename: string) {
    const job = await this.queue.addTask({ id, filename, pathname: this.output });
    return job;
  }
}

/**
 * Process a file
 *
 * @method file
 * @param filename {String} name of the file to be tested
 */
async function pdfProcessing(job: any) {
  // : Promise<ExtraPDFType>
  const filename: string = job.data.filename;
  const pathname: string = path.join(job.data.pathname, filename);
  const directory: string = job.data.pathname;
  const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
  let pdf;

  // @ts-ignore
  const canvasFactory = new NodeCanvasFactory();

  // Read the PDF file into a buffer
  const data = new Uint8Array(fs.readFileSync(pathname));

  // Pass the data to the PDF.js library
  try {
    pdf = await pdfjs.getDocument({
      data,
      canvasFactory,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      standardFontDataUrl: FONT_URL,
    }).promise;
  } catch (err) {
    console.error('PDF> Error parsing file', err);
    return err;
  }
  console.log('PDF> processing file', filename, pdf.numPages);

  // Sharp configuration
  sharp.concurrency(1);
  sharp.cache(false);
  sharp.simd(false);

  // Array of pages
  const allText: string[] = [];
  const arr = [];

  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);

    console.log('PDF> processing page', i + 1);
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
    const desired = 2000;
    const initialviewport = page.getViewport({ scale: 1 });

    // Calculate the scale
    let scale = desired / initialviewport.width;
    // If document is in portrait mode, we need to swap the dimensions
    if (initialviewport.width < initialviewport.height) {
      scale = desired / initialviewport.height;
    }
    // Limit the scale between 1 and 8
    if (scale < 1) scale = 1;
    if (scale > 8) scale = 8;

    scale = Math.floor(scale);

    // Finally, get the viewport with the calculated scale
    const viewport = page.getViewport({ scale: scale });
    console.log('PDF> processing scale', scale);

    console.log('PDF> processing viewport', viewport);
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

    const maxWidth = Math.floor(viewport.width);
    // Maximum resolution
    const options: { width: number; quality: number }[] = [{ width: maxWidth, quality: 70 }];
    // Calculating downscale sizes down to 500pixel
    let curW = Math.floor(maxWidth / 2);
    while (curW > 500) {
      options.push({ width: curW, quality: 75 });
      curW = Math.floor(curW / 2);
    }

    console.log('PDF> processing options', options);

    const renderContext = {
      canvasContext: canvasAndContext.context,
      viewport,
    };

    await page.render(renderContext).promise;

    // Round the dimensions to the nearest integer for sharp library
    const vw = Math.floor(viewport.width);
    const vh = Math.floor(viewport.height);

    console.log('🚀 ~ file: processor-pdf.ts:198 ~ pdfProcessing ~ vw:', viewport.width, viewport.height, vw, vh);
    console.log('🚀 ~ file: processor-pdf.ts:198 ~ pdfProcessing ~ viewport:', viewport);

    // Get RGBA buffer
    const cdata = canvasAndContext.context.getImageData(0, 0, vw, vh).data;
    console.log('PDF> processing image', vw, vh);
    const sharpStream = sharp(cdata, { raw: { width: vw, height: vh, channels: 4 }, failOnError: false });
    // canvasFactory.destroy(canvasAndContext);

    // Generate the WebP in multiple resolutions
    // const sharpOutput = await Promise.all<sharp.OutputInfo>([
    //   // resize multiple versions based on the option set
    //   ...options.map(({ width, quality }) => {
    //     console.log('PDF> sharp image', width);
    //     return sharpStream
    //       .clone()
    //       .resize({ width, kernel: 'lanczos2' })
    //       .webp({ quality, effort: 1 })
    //       .toFile(path.join(directory, `${filenameWithoutExt}-${i}-${width}.webp`));
    //   }),
    // ]);

    const sharpOutput: Array<sharp.OutputInfo> = [];
    for (const opt of options) {
      console.log('before convert', opt.width);
      const im = sharpStream.clone().resize({ width: opt.width, kernel: 'lanczos2' }).webp({ quality: opt.quality, effort: 1 });
      console.log('after convert', opt.width);
      const oneimage = await im.toFile(path.join(directory, `${filenameWithoutExt}-${i}-${opt.width}.webp`)).catch((err) => {
        console.error('PDF> sharp error', err);
        return Promise.reject(err);
      });
      console.log('after save', opt.width);

      console.log('PDF> sharp image', opt.width, oneimage);
      sharpOutput.push(oneimage);
    }

    console.log('PDF> images done for page', i, sharpOutput);

    // combine all the results for that page
    const res = options.map(({ width }) => {
      // information from sharp
      const info = sharpOutput.find((r: any) => r.width === width);
      // url of the page image
      const url = getStaticAssetUrl(`${filenameWithoutExt}-${i}-${width}.webp`);
      return { url, ...info };
    });

    arr.push(res);
  }

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

  return arr;
}

////////////////////////////////////////////////////////////////////////////////
function NodeCanvasFactory() {
  // pass
}

NodeCanvasFactory.prototype = {
  create: function NodeCanvasFactory_create(width: number, height: number) {
    assert(width > 0 && height > 0, 'Invalid canvas size');
    // const canvas = new Canvas(width, height);
    const canvas = createCanvas(width, height);
    // const context = canvas.getContext('2d', { alpha: false, pixelFormat: 'RGB24' });
    const context = canvas.getContext('2d', { alpha: false });

    // Rendering quality settings
    context.patternQuality = 'fast';
    context.quality = 'fast';
    // context.imageSmoothingEnabled = false;
    // context.imageSmoothingQuality = 'low';

    context.save();
    context.fillStyle = 'rgb(255, 255, 255)';
    context.fillRect(0, 0, width, height);
    context.restore();

    return { canvas, context };
  },

  reset: function NodeCanvasFactory_reset(canvasAndContext: any, width: number, height: number) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');
    assert(width > 0 && height > 0, 'Invalid canvas size');
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },

  destroy: function NodeCanvasFactory_destroy(canvasAndContext: any) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');

    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};
////////////////////////////////////////////////////////////////////////////////
