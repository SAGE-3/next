/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as fs from 'fs';
import * as path from 'path';

import { SandboxedJob } from 'bullmq';
import { DefaultExifToolOptions, ExifTool, Tags, FileTags, ExifTime, ExifDate, ExifDateTime } from 'exiftool-vendored';

// Type for EXIF values
type ExifDataType = FileTags;

// Function doing the task
export default async (job: SandboxedJob) => {
  // Process the file
  const exif = await exiftoolFile(path.join(job.data.output, job.data.file));
  // Write the metadata to a JSON file
  const fn = `${job.data.file}.json`;
  const metadataFilename = path.join(job.data.output, fn);
  fs.writeFileSync(metadataFilename, JSON.stringify(exif, null, 2));
  // Return the result
  return {
    file: job.data.file,
    id: job.data.id,
    data: exif,
    result: fn,
  };
};

// Create an exiftool singleton with the right options
const exiftool = new ExifTool({
  ...DefaultExifToolOptions,
  numericTags: ['FileSize'],
  maxProcs: 2,
});

/**
 * Process a file, using exec method
 *
 * @method file
 * @param filename {String} name of the file to be tested
 */
async function exiftoolFile(filename: string): Promise<ExifDataType> {
  return new Promise((resolve, reject) => {
    let speed = '-fast1';
    // Big JSON files are slow to process
    if (filename.endsWith('json')) {
      speed = '-fast3';
    }
    exiftool
      .read(filename, [speed, '--b']) // fast and ignore binary data
      .then((tags: Tags) => {
        if (tags.errors && tags.errors.length > 0) {
          // reject('EXIF> Error parsing JSON ' + tags.errors);
          // unknow file type, return any with the tags we got
          resolve(tags as FileTags);
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
