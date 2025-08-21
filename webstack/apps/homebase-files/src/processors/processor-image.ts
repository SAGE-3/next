/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Node modules
import { getStaticAssetUrl } from '@sage3/backend';
import * as fs from 'fs';
import * as path from 'path';

// Image processing tool
import * as sharp from 'sharp';

// SAGEBase queue
import { SBQueue } from '../connectors';
import { ExtraImageType } from '@sage3/shared/types';

// Placeholder for the image options, actually values calculated from the image
const options: { width: number; quality: number }[] = [
  { width: 400, quality: 75 },
  { width: 1200, quality: 80 },
  { width: 3200, quality: 70 },
  { width: 4800, quality: 70 },
];

/**
 * Converting image to multiple resolutions using 'sharp'
 *
 * @export
 * @class ImageProcessor
 */
export class ImageProcessor {
  // Bull queues
  private queue: SBQueue;
  private output: string;

  constructor(redisUrl: string, folder: string, worker = true) {
    this.queue = new SBQueue(redisUrl, 'image-queue');
    this.output = folder;

    // Add a function to process images
    if (worker) {
      this.queue.addProcessorSandboxed('./dist/libs/workers/src/lib/image.js');
    } else {
      this.queue.addProcessor(async (job) => {
        const data = await sharpProcessing(job);
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
 * Process a file, using exec method
 *
 * @method file
 * @param filename {String} name of the file to be tested
 */
async function sharpProcessing(job: any): Promise<ExtraImageType> {
  return new Promise((resolve, reject) => {
    const filename: string = job.data.filename;
    const pathname: string = path.join(job.data.pathname, filename);
    const directory: string = job.data.pathname;
    const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const extension = filename.substring(filename.lastIndexOf('.'));

    if (extension === '.svg') {
      // preserve SVG type images
      resolve({
        filename: pathname,
        url: getStaticAssetUrl(filename),
        fullSize: getStaticAssetUrl(filename),
        aspectRatio: 1, // TODO: get real aspect ratio
        width: 100, // TODO: get real width
        height: 100, // TODO: get real height
        sizes: [],
      });
    } else {
      const sharpStream = sharp({
        failOnError: false,
        limitInputPixels: 4294836225, // 65k x 65k
      });

      // Read the Image and pipe it into Sharp
      fs.createReadStream(pathname).pipe(sharpStream);

      sharpStream
        .rotate() // take into account EXIF orientation
        .metadata()
        .then((metadata: any) => {
          const ww = metadata.width || 100;
          const hh = metadata.height || 100;
          const aspectRatio = ww / hh;
          if (aspectRatio < 1) {
            // portrait
            const maxheight = Math.min(hh, 16383); // webp limit
            const maxwidth = Math.round(maxheight * aspectRatio);
            // decreasing width by 2 each step, making sure we don't go below 8
            options[0].width = Math.max(8, Math.round(maxwidth / 8));
            options[1].width = Math.max(8, Math.round(maxwidth / 4));
            options[2].width = Math.max(8, Math.round(maxwidth / 2));
            options[3].width = maxwidth;
          } else {
            // landscape
            const maxwidth = Math.min(ww, 16383); // webp limit
            // decreasing width by 2 each step, making sure we don't go below 8
            options[0].width = Math.max(8, Math.round(maxwidth / 8));
            options[1].width = Math.max(8, Math.round(maxwidth / 4));
            options[2].width = Math.max(8, Math.round(maxwidth / 2));
            options[3].width = maxwidth;
          }
          Promise.all<sharp.OutputInfo>([
            // resize multiple versions based on the option set
            ...options.map(({ width, quality }) =>
              sharpStream
                .clone()
                .resize({ width })
                .webp({ quality })
                .toFile(path.join(directory, `${filenameWithoutExt}-${width}.webp`)),
            ),
            // full size image JPEG
            sharpStream
              .clone()
              .jpeg({ quality: 95 })
              .toFile(path.join(directory, `${filenameWithoutExt}-full.jpg`)),
          ])
            .then((res) => {
              // Get last image size (the full size jpeg)
              const { width: imgWidth, height: imgHeight } = res[res.length - 1];
              const imageData: ExtraImageType = {
                filename: pathname,
                // the default source
                url: getStaticAssetUrl(`${filenameWithoutExt}-${options[0].width}.webp`),
                // full size image
                fullSize: getStaticAssetUrl(`${filenameWithoutExt}-full.jpg`),
                width: imgWidth,
                height: imgHeight,
                // save the image aspect ratio
                aspectRatio: imgWidth / imgHeight,
                // create the size map for the images
                sizes: options.map(({ width }, idx) => {
                  const url = getStaticAssetUrl(`${filenameWithoutExt}-${width}.webp`);
                  const info = res[idx];
                  return { url, ...info };
                }),
              };
              resolve(imageData);
            })
            .catch((err) => {
              console.error('ImageLoader> Error processing files', err);

              try {
                fs.unlinkSync(pathname);

                for (const { width } of options) {
                  fs.unlinkSync(path.join(directory, `${filenameWithoutExt}-${width}.webp`));
                }
              } catch (e) {
                // do nothing
              }
              reject(err);
            });
        })
        .catch((err: any) => {
          console.error('ImageLoader> Error processing', err);
          reject(err);
        });
    }
  });
}
