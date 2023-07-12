/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as urlMetadata from 'url-metadata';
import { loadImage } from 'canvas';

export type URLMetadata = {
  title: string;
  description: string;
  image: string;
};

export async function URLMetadata(url: string): Promise<URLMetadata> {
  try {
    const metadata = await urlMetadata(url);
    const title = extractTitle(metadata);
    const description = extractDescription(metadata);
    const image = await extractImageUrl(metadata);

    return {
      title,
      description,
      image,
    };
  } catch (err) {
    console.error(err);
    return {
      title: '',
      description: '',
      image: '',
    };
  }
}

function extractTitle(meta: any) {
  // Attempt to extract from Twitter
  if (meta['twitter:title'] !== '') {
    return meta['twitter:title'];
  }
  // Attempt to extract from og
  if (meta['og:title'] !== '') {
    return meta['og:title'];
  }
  // Attempt to extract from general meta
  if (meta.title !== '') {
    return meta.title;
  }
  if (meta.url) {
    const url = new URL(meta.url);
    return url.hostname;
  }

  return null;
}

function extractDescription(meta: any) {
  // Attempt to extract from Twitter
  if (meta['twitter:description'] !== '') {
    return meta['twitter:description'];
  }
  // Attempt to extract from og
  if (meta['og:description'] !== '') {
    return meta['og:description'];
  }
  // Attempt to extract from general meta
  if (meta.description !== '') {
    return meta.description;
  }
  return null;
}

async function extractImageUrl(meta: any) {
  let url = null;
  // Attempt to extract from Twitter
  if (meta['twitter:image'] !== '') {
    url = meta['twitter:image'];
  }
  // Attempt to extract from og
  if (meta['og:image'] !== '') {
    url = meta['og:image'];
  }
  // Attempt to extract from general meta
  if (meta.image !== '') {
    url = meta.image;
  }
  // Validate the url is a valid image url
  if (url) {
    const result = await loadImage(url);
    // Validate result is an image
    if (result.width > 0 && result.height > 0) {
      return url;
    } else {
      return null;
    }
  } else {
    return null;
  }
}
