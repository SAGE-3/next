/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
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
import { Canvas } from 'skia-canvas';
import { getStaticAssetUrl } from '@sage3/backend';
import { ExtraPDFType } from '@sage3/shared/types';

// Image processing tool
import * as sharp from 'sharp';

////////////////////////////////////////////////////////////////////////////////
function NodeCanvasFactory() {
  // pass
}

NodeCanvasFactory.prototype = {
  create: function NodeCanvasFactory_create(width: number, height: number) {
    assert(width > 0 && height > 0, 'Invalid canvas size');
    const canvas = new Canvas(width, height);
    const context = canvas.getContext('2d');

    // Rendering quality settings
    // context.patternQuality = 'fast';
    // context.quality = 'fast';

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

    this.queue.addProcessor(async (job) => {
      const data = await pdfProcessing(job);
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
  addFile(id: string, filename: string): Promise<any> {
    return this.queue.addTask({ id, filename, pathname: this.output }).then((job) => {
      // returns the promise for the job completion
      return job.finished();
    });
  }
}

/**
 * Process a file
 *
 * @method file
 * @param filename {String} name of the file to be tested
 */
async function pdfProcessing(job: any): Promise<ExtraPDFType> {
  return new Promise((resolve, _reject) => {
    const filename: string = job.data.filename;
    const pathname: string = path.join(job.data.pathname, filename);
    const directory: string = job.data.pathname;
    const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    // const extension = filename.substring(filename.lastIndexOf('.'));
    let pdfTask;
    const data = new Uint8Array(fs.readFileSync(pathname));
    try {
      pdfTask = pdfjs.getDocument({
        data,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        standardFontDataUrl: FONT_URL,
      });
    } catch (err) {
      console.error('Error Loading PDF', err);
      return;
    }
    return pdfTask.promise.then((pdf: any) => {
      console.log('PDF> num pages', pdf.numPages);
      const arr = Array.from({ length: pdf.numPages }).map((_n, i) => {
        console.log('PDF> Page', i);
        return pdf.getPage(i + 1).then(async (page: any) => {
          console.log('PDF> got page', i + 1);

          // Instead of using a scaling factor, we try to get a given dimension
          // on the long end (in pixels)
          // Because different PDFs have different dimension defined (viewbox)
          const desired = 2400;
          const initialviewport = page.getViewport({ scale: 1 });
          // Calculate the scale
          let scale = Math.round(desired / initialviewport.width);
          // If document is in portrait mode, we need to swap the dimensions
          if (initialviewport.width < initialviewport.height) {
            scale = Math.round(desired / initialviewport.height);
          }
          // Limit the scale between 1 and 8
          if (scale < 1) scale = 1;
          if (scale > 8) scale = 8;
          // Finally, get the viewport with the calculated scale
          const viewport = page.getViewport({ scale: scale });

          // @ts-ignore
          const canvasFactory = new NodeCanvasFactory();
          const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

          const maxWidth = Math.floor(viewport.width);
          // Maximum resolution
          const options: { width: number; quality: number }[] = [{ width: maxWidth, quality: 75 }];
          // Calculating downscale sizes down to 500pixel
          let curW = Math.floor(maxWidth / 1.5);
          while (curW > 500) {
            options.push({ width: curW, quality: 85 });
            curW = Math.floor(curW / 1.75);
          }

          const renderContext = {
            canvasContext: canvasAndContext.context,
            viewport,
            canvasFactory,
          };

          const renderResult = await page.render(renderContext).promise.then(async () => {
            // Read the Image and pipe it into Sharp

            // Get the buffer directly in PNG, low compression for speed
            const cdata = await canvasAndContext.canvas.toBuffer('png', {
              compressionLevel: 1,
              filters: canvasAndContext.canvas.PNG_FILTER_NONE,
            });
            const sharpStream = sharp(cdata, { failOnError: false });

            return Promise.all<sharp.OutputInfo>([
              // resize multiple versions based on the option set
              ...options.map(({ width, quality }) =>
                sharpStream
                  .clone()
                  .resize({ width })
                  .webp({ quality })
                  .toFile(path.join(directory, `${filenameWithoutExt}-${i}-${width}.webp`))
              ),
            ]);
          });
          // combine all the results for that page
          return options.map(({ width }) => {
            // information from sharp
            const info = renderResult.find((r: any) => r.width === width);
            // url of the page image
            const url = getStaticAssetUrl(`${filenameWithoutExt}-${i}-${width}.webp`);
            return { url, ...info };
          });
        });
      });
      return Promise.all(arr).then((pdfres) => {
        console.log('PDF> processing done');
        resolve(pdfres);
      });
    });
  });
}
