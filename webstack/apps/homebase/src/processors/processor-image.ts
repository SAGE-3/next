/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// Node modules
import { getStaticAssetUrl } from '@sage3/backend';
import * as fs from 'fs';
import * as path from 'path';

// Image processing tool
import * as sharp from 'sharp';

// SAGEBase queue
import { SBQueue } from '../connectors';

const options: { width: number; quality: number }[] = [
  { width: 400, quality: 75 },
  { width: 800, quality: 80 },
  { width: 1600, quality: 80 },
  { width: 3200, quality: 70 },
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

  constructor(redisUrl: string, folder: string) {
    this.queue = new SBQueue(redisUrl, 'image-queue');
    this.output = folder;

    this.queue.addProcessor(async (job) => {
      const data = await sharpProcessing(job);
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
 * Process a file, using exec method
 *
 * @method file
 * @param filename {String} name of the file to be tested
 */
async function sharpProcessing(job: any): Promise<any> {
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
        src: getStaticAssetUrl(filename),
        aspectRatio: 1, // TODO: get real aspect ratio
      });
    } else {
      const sharpStream = sharp({
        failOnError: false,
      });

      // Read the Image and pipe it into Sharp
      fs.createReadStream(pathname).pipe(sharpStream);
      Promise.all<sharp.OutputInfo>([
        // resize multiple versions based on the option set
        ...options.map(({ width, quality }) =>
          sharpStream
            .clone()
            .resize({ width })
            .webp({ quality })
            .toFile(path.join(directory, `${filenameWithoutExt}-${width}.webp`))
        ),
        // full size image JPEG
        sharpStream
          .clone()
          .jpeg({ quality: 95 })
          .toFile(path.join(directory, `${filenameWithoutExt}-full.jpg`)),
      ])
        .then((res) => {
          const { width: imgWidth, height: imgHeight } = res[0];
          const imageData = {
            filename: pathname,
            // the default source
            src: getStaticAssetUrl(`${filenameWithoutExt}-${options[0].width}.webp`),
            // full size image
            fullSize: getStaticAssetUrl(`${filenameWithoutExt}-full.jpg`),
            // save the image aspect ratio
            aspectRatio: imgWidth / imgHeight,
            // create the size map for the images
            sizes: options.map(({ width }) => ({ width, url: getStaticAssetUrl(`${filenameWithoutExt}-${width}.webp`) })),
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
    }
  });
}
