/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { FileLoader } from '../util/types';
import { getFullFilePath, getStaticAssetUrl } from '../util/path-util';

import * as sharp from 'sharp';
import { encode } from 'blurhash';
import * as fs from 'fs';
import { DataOutput } from '@sage3/shared/types';

// Event system to add the new asset
import { EventNames, SAGE3Events } from '@sage3/backend/events';

const options: { width: number; quality: number }[] = [
  { width: 400, quality: 75 },
  { width: 800, quality: 80 },
  { width: 1600, quality: 80 },
  { width: 3200, quality: 70 },
];

const imageLoader: FileLoader = (filename, register, metadata) => {
  // Send a message to add the file into the asset manager
  SAGE3Events.emit(EventNames.AssetInfo, {
    action: 'add',
    owner: metadata?.ownerName || 'sage',
    boardId: metadata?.boardId || '-',
    id: filename,
    originalfilename: metadata?.filename,
  });

  return register.loadable(
    'image',
    () =>
      new Promise((resolve) => {
        const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        const extension = filename.substring(filename.lastIndexOf('.'));

        if (extension === '.svg') {
          // preserve SVG type images
          resolve({
            filename: metadata?.filename || filename,
            src: getStaticAssetUrl(filename),
            aspectRatio: 1, // TODO: get real aspect ratio
          });
        } else {
          const sharpStream = sharp({
            failOnError: false,
          });

          // Read the Image and pipe it into Sharp
          fs.createReadStream(getFullFilePath(filename)).pipe(sharpStream);

          Promise.all<{ data: Buffer; info: sharp.OutputInfo } | sharp.OutputInfo>([
            // resize to 32x32 raw format and output to a buffer
            sharpStream.clone().raw().ensureAlpha().resize(32, 32, { fit: 'inside' }).toBuffer({ resolveWithObject: true }),
            // resize multiple versions based on the option set
            ...options.map(({ width, quality }) =>
              sharpStream
                .clone()
                .resize({ width })
                .webp({ quality })
                .toFile(getFullFilePath(`${filenameWithoutExt}-${width}.webp`))
            ),
            // full size image JPEG
            sharpStream
              .clone()
              .jpeg({ quality: 95 })
              .toFile(getFullFilePath(`${filenameWithoutExt}-full.jpg`)),
          ])
            .then((res) => {
              const [
                {
                  data: buffer,
                  info: { width, height },
                },
                ...imageInfo
              ] = res as [{ data: Buffer; info: sharp.OutputInfo }, ...sharp.OutputInfo[]];

              const imageData: DataOutput<'image'> = {
                filename: metadata?.filename || filename,
                // the default source
                src: getStaticAssetUrl(`${filenameWithoutExt}-${options[0].width}.webp`),
                // full size image
                fullSize: getStaticAssetUrl(`${filenameWithoutExt}-full.jpg`),
                // save the image aspect ratio
                aspectRatio: imageInfo[0].width / imageInfo[0].height,
                // create the blurhash from the image buffer
                blurhash: encode(new Uint8ClampedArray(buffer), width, height, 4, 3),
                // create the size map for the images
                sizes: Object.fromEntries(options.map(({ width }) => [+width, getStaticAssetUrl(`${filenameWithoutExt}-${width}.webp`)])),
              };

              resolve(imageData);
            })
            .catch((err) => {
              console.error('ImageLoader> Error processing files', err);

              try {
                fs.unlinkSync(getFullFilePath(filename));

                for (const { width } of options) {
                  fs.unlinkSync(getFullFilePath(`${filenameWithoutExt}-${width}.webp`));
                }
              } catch (e) {
                // do nothing
              }
            });
        }
      }),
    {}
  );
};

export default imageLoader;
