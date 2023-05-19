/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Node modules
import * as fs from 'fs';
import * as path from 'path';
import { strict as assert } from 'assert';

import { SandboxedJob } from 'bullmq';

// import { Canvas } from 'skia-canvas';
import { createCanvas } from 'canvas';
// Image processing tool
import * as sharp from 'sharp';

// load legacy pdf build
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.min.js');
const CMAP_URL = './node_modules/pdfjs-dist/cmaps/';
const FONT_URL = './node_modules/pdfjs-dist/standard_fonts/';
const CMAP_PACKED = true;

// Function doing the task
export default async (job: SandboxedJob) => {
  // Process the file
  const data = await pdfProcessing(job);
  // Return the result
  return {
    file: job.data.filename,
    id: job.data.id,
    result: data,
  };
};

function getStaticAssetUrl(filename: string): string {
  return `api/assets/static/${filename}`;
}

/**
 * Process a file
 *
 * @method file
 * @param filename {String} name of the file to be tested
 */
async function pdfProcessing(job: any) {
  return new Promise((resolve, reject) => {
    const filename: string = job.data.filename;
    const pathname: string = path.join(job.data.pathname, filename);
    const directory: string = job.data.pathname;
    const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    let pdfTask;

    // Read the PDF file into a buffer
    const data = new Uint8Array(fs.readFileSync(pathname));

    // @ts-ignore
    const canvasFactory = new NodeCanvasFactory();

    // Pass the data to the PDF.js library
    try {
      pdfTask = pdfjs.getDocument({
        data,
        canvasFactory,
        cMapUrl: CMAP_URL,
        cMapPacked: CMAP_PACKED,
        standardFontDataUrl: FONT_URL,
      });
    } catch (err) {
      console.error('PDF> Error parsing file', err);
      return reject(err);
    }

    // Array of pages
    const allText: string[] = [];

    // Process each page
    return pdfTask.promise
      .then((pdf: any) => {
        const arr = Array.from({ length: pdf.numPages }).map((_n, i) => {
          return pdf.getPage(i + 1).then(async (page: any) => {
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

            const renderContext = {
              canvasContext: canvasAndContext.context,
              viewport,
            };

            const renderResult = await page.render(renderContext).promise.then(async () => {
              // Read the Image and pipe it into Sharp

              // Get the buffer directly in PNG, low compression for speed
              // const cdata = await canvasAndContext.canvas.toBuffer('png', {
              //   compressionLevel: 1,
              //   filters: canvasAndContext.canvas.PNG_FILTER_NONE,
              // });
              // const sharpStream = sharp(cdata, { failOnError: false });

              // Round the dimensions to the nearest integer for sharp library
              const vw = Math.floor(viewport.width);
              const vh = Math.floor(viewport.height);

              // Get RGBA buffer
              const cdata = await canvasAndContext.context.getImageData(0, 0, vw, vh).data;
              const sharpStream = sharp(cdata, { raw: { width: vw, height: vh, channels: 4 }, failOnError: false });

              // Generate the WebP in multiple resolutions
              return Promise.all<sharp.OutputInfo>([
                // resize multiple versions based on the option set
                ...options.map(({ width, quality }) =>
                  sharpStream
                    .clone()
                    .resize({ width, kernel: 'lanczos2' })
                    .webp({ quality, effort: 0 })
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
          resolve(pdfres);
        });
      })
      .catch((err: Error) => {
        return reject(err);
      });
  });
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

    const context = canvas.getContext('2d');

    // Rendering quality settings
    context.patternQuality = 'fast';
    context.quality = 'fast';
    // context.imageSmoothingEnabled = false;
    // context.imageSmoothingQuality = 'low';

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
