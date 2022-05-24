/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

//@ts-nocheck

var assert = require('assert').strict;
const fs = require('fs');
import * as sharp from 'sharp';
import { encode } from 'blurhash';

// load legacy pdf build
const pdfjs = require('pdfjs-dist/legacy/build/pdf.min.js');
const CMAP_URL = './node_modules/pdfjs-dist/cmaps/';
const FONT_URL = './node_modules/pdfjs-dist/standard_fonts/';
const CMAP_PACKED = true;

import { getFullFilePath, getStaticAssetUrl } from '../util/path-util';
import { FileLoader } from '../util/types';
import { createCanvas } from 'canvas';
import { DataOutput } from '@sage3/shared/types';

console.log('PDF> Version', pdfjs.version);

// PDF rendering scale
// Each PDF page has its own viewport which defines the size in pixels(72DPI) and initial rotation.
// By default the viewport is scaled to the original size of the PDF, but this can be changed by modifying the viewport
// const PDF_RENDERING_SCALE = 3;

// Event system to add the new asset
import { EventNames, SAGE3Events } from '@sage3/backend/events';

function NodeCanvasFactory() {}

NodeCanvasFactory.prototype = {
  create: function NodeCanvasFactory_create(width, height) {
    assert(width > 0 && height > 0, 'Invalid canvas size');
    var canvas = createCanvas(width, height);
    var context = canvas.getContext('2d');

    // Rendering quality settings
    context.patternQuality = 'fast';
    context.quality = 'fast';
    // context.antialias = 'default';
    // context.textDrawingMode = 'path';

    return {
      canvas,
      context,
    };
  },

  reset: function NodeCanvasFactory_reset(canvasAndContext, width, height) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');
    assert(width > 0 && height > 0, 'Invalid canvas size');
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },

  destroy: function NodeCanvasFactory_destroy(canvasAndContext) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');

    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  },
};

const pdfLoader: FileLoader = (filename, register, metadata) => {
  // Send a message to add the file into the asset manager
  SAGE3Events.emit(EventNames.AssetInfo, {
    action: 'add',
    owner: metadata?.ownerName || 'sage',
    boardId: metadata?.boardId || '-',
    id: filename,
    originalfilename: metadata?.filename,
  });

  return register.loadable(
    '.pdf',
    (pdfId) => {
      let pdfTask;
      const data = new Uint8Array(fs.readFileSync(getFullFilePath(filename)));
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

      return pdfTask.promise
        .then((pdf) => {
          return {
            pages: Array.from({ length: pdf.numPages }).map((_n, i) => {
              return register.loadable(
                'image',
                () => {
                  return new Promise((resolve) => {
                    pdf.getPage(i + 1).then((page) => {
                      // const viewport = page.getViewport({ scale: PDF_RENDERING_SCALE });

                      // Instead of using a scaling factor, we try to get a given dimension
                      // on the long end (in pixels)
                      // Because different PDFs have different dimension defined (viewbox)
                      const desired = 3200;
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

                      var canvasFactory = new NodeCanvasFactory();
                      var canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

                      // const options: { width: number; quality: number }[] = [{ width: Math.floor(viewport.width), quality: 80 }];
                      const maxWidth = Math.floor(viewport.width);
                      // Maximum resolution
                      let options: { width: number; quality: number }[] = [{ width: maxWidth, quality: 75 }];
                      // Calculating downscale sizes down to 600pixel
                      let curW = Math.floor(maxWidth / 1.5);
                      while (curW > 600) {
                        options.push({ width: curW, quality: 85 });
                        curW = Math.floor(curW / 1.5);
                      }

                      var renderContext = {
                        canvasContext: canvasAndContext.context,
                        viewport,
                        canvasFactory,
                      };
                      const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));

                      page
                        .render(renderContext)
                        .promise.then(() => {
                          // Read the Image and pipe it into Sharp

                          // Get the buffer directly in PNG, low compression for speed
                          const data = canvasAndContext.canvas.toBuffer('image/png', {
                            compressionLevel: 1,
                            filters: canvasAndContext.canvas.PNG_FILTER_NONE,
                          });
                          const sharpStream = sharp(data, { failOnError: false });

                          Promise.all<{ data: Buffer; info: sharp.OutputInfo } | sharp.OutputInfo>([
                            // resize to 32x32 raw format and output to a buffer
                            sharpStream.clone().raw().resize(32, 32, { fit: 'inside' }).toBuffer({ resolveWithObject: true }),
                            // resize multiple versions based on the option set
                            ...options.map(({ width, quality }) =>
                              sharpStream
                                .clone()
                                .resize({ width })
                                .sharpen(1)
                                .webp({ quality })
                                .toFile(getFullFilePath(`${filenameWithoutExt}-${i}-${width}.webp`))
                            ),
                          ]).then((res) => {
                            const [
                              {
                                data: buffer,
                                info: { width, height },
                              },
                              ...imageInfo
                            ] = res as [{ data: Buffer; info: sharp.OutputInfo }, ...sharp.OutputInfo[]];

                            const imageData: DataOutput<'image'> = {
                              // make the default source the unprocessed image
                              src: getStaticAssetUrl(`${filenameWithoutExt}-${i}-${options[0].width}.webp`),
                              // save the image aspect ratio
                              aspectRatio: imageInfo[0].width / imageInfo[0].height,
                              // create the blurhash from the image buffer
                              blurhash: encode(new Uint8ClampedArray(buffer), width, height, 4, 3),
                              // create the size map for the images
                              sizes: Object.fromEntries(
                                options.map(({ width }) => [+width, getStaticAssetUrl(`${filenameWithoutExt}-${i}-${width}.webp`)])
                              ),
                            };

                            resolve(imageData);
                          });
                        })
                        .catch((err) => {
                          console.log('Error Rendering Page', err);
                        });
                    });
                  });
                },
                { createdFrom: pdfId }
              );
            }),
          };
        })
        .catch((e) => console.log('Error Reading PDF', e));
    },
    { filename, asset: getStaticAssetUrl(filename), ...metadata }
  );
};
export default pdfLoader;
