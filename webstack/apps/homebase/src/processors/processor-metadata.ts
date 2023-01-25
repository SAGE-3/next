/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as fs from 'fs';
import * as path from 'path';

// SAGEBase queue
import { SBQueue } from '../connectors';

import { DefaultExifToolOptions, ExifTool, Tags, FileTags, ExifTime, ExifDate, ExifDateTime } from 'exiftool-vendored';

// Create an exiftool singleton with the right options
const exiftool = new ExifTool({
  ...DefaultExifToolOptions,
  numericTags: ['FileSize'],
  maxProcs: 2,
});

/**
 * Type for EXIF values
 */
export type ExifDataType = FileTags;

export class MetadataProcessor {
  // Bull queues
  private queue: SBQueue;
  private output: string;

  constructor(redisUrl: string, folder: string) {
    this.queue = new SBQueue(redisUrl, 'metadata-queue');
    this.output = folder;

    this.queue.addProcessor(async (job) => {
      const data = await exiftoolFile(path.join(this.output, job.data.file));
      const fn = `${job.data.file}.json`;
      const metadataFilename = path.join(this.output, fn);
      fs.writeFileSync(metadataFilename, JSON.stringify(data, null, 2));
      return Promise.resolve({
        file: job.data.file,
        id: job.data.id,
        data: data,
        result: fn,
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
  addFile(id: string, file: string): Promise<any> {
    return this.queue.addTask({ id, file }).then((job) => {
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
async function exiftoolFile(filename: string): Promise<ExifDataType> {
  return new Promise((resolve, reject) => {
    exiftool
      .read(filename, ['-fast2', '--b']) // fast and ignore binary data
      .then((tags: Tags) => {
        if (tags.errors && tags.errors.length > 0) {
          reject('EXIF> Error parsing JSON ' + tags.errors);
        } else {
          // Add a dummy type if needed
          if (!tags.MIMEType) {
            tags.MIMEType = 'text/plain';
          }
          if (!tags.FileType) {
            tags.FileType = 'text/plain';
          }
          // Cleanup the tags
          for (const k in tags) {
            // @ts-ignore
            if (k.startsWith('ProfileDescription')) delete tags[k];
            // rewrite dates as a string
            // @ts-ignore
            if (tags[k] instanceof ExifDateTime) tags[k] = tags[k].toString();
            // @ts-ignore
            if (tags[k] instanceof ExifTime) tags[k] = tags[k].toString();
            // @ts-ignore
            if (tags[k] instanceof ExifDate) tags[k] = tags[k].toString();
          }
          // Python notebook
          // @ts-ignore
          if (tags['Cells']) delete tags['Cells'];
          // GEOJSON big structure
          // @ts-ignore
          if (tags['Features']) delete tags['Features'];
        }
        // Done
        resolve(tags as FileTags);
      })
      .catch((err) => {
        reject('EXIF> Error parsing JSON ' + err);
      });
  });
}
