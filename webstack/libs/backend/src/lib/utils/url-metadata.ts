/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as urlMetadata from 'url-metadata';

// Data we need to the WebpageLink app
export type URLMetadata = {
  title: string;
  description: string;
  image: string | null;
};

export async function URLMetadata(url: string): Promise<URLMetadata> {
  try {
    // Get the metadata using Open Graph Protocol (og:), Twitter Card meta tags, and JSON-LD.
    const data = await urlMetadata(url, {
      // `fetch` API cache setting for request
      cache: 'no-cache',
      // timeout in milliseconds, default is 10 seconds
      timeout: 2000,
      // number of characters to truncate description to
      descriptionLength: 750,
      // force image urls in selected tags to use https,
      // valid for 'image', 'og:image' and 'og:image:secure_url' tags
      ensureSecureImageRequest: true,
      // return raw response body as string
      includeResponseBody: false,
    });
    // Strip out empty values
    const metadata = removeEmpty(data);

    // Extract the data we want
    const title = extractTitle(metadata);
    const description = extractDescription(metadata);
    const image = extractImageUrl(metadata, url);

    return {
      title,
      description,
      image,
    };
  } catch (err) {
    return {
      title: '',
      description: '',
      image: '',
    };
  }
}

/**
 * Removes empty values from an object
 *
 * @param {any} obj
 * @returns
 */
function removeEmpty(obj: urlMetadata.Result) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null && v !== '' && Object.keys(v).length != 0));
}

/**
 * Extracts the title from the meta data
 *
 * @param {*} meta
 * @returns
 */
function extractTitle(meta: any) {
  if (meta['og:title']) {
    // Attempt to extract from og
    return meta['og:title'];
  } else if (meta.title) {
    // Attempt to extract from general meta
    return meta.title;
  } else if (meta['twitter:title']) {
    // Attempt to extract from Twitter
    return meta['twitter:title'];
  } else if (meta.url) {
    const url = new URL(meta.url);
    return url.hostname;
  }

  return null;
}

/*
 * Extracts the description from the meta data
 *
 * @param {*} meta
 * @returns
 * */
function extractDescription(meta: any) {
  if (meta['og:description']) {
    // Attempt to extract from og
    return meta['og:description'];
  } else if (meta.description) {
    // Attempt to extract from general meta
    return meta.description;
  } else if (meta['twitter:description']) {
    // Attempt to extract from Twitter
    return meta['twitter:description'];
  } else if (meta.url) {
    return meta.url;
  }

  return null;
}

/*
 * Extracts the image url from the meta data
 *
 * @param {*} meta
 * @param {string} siteurl
 * @returns
 * */
function extractImageUrl(meta: any, siteurl: string) {
  let url = null;
  if (meta['og:image']) {
    // Attempt to extract from og
    url = meta['og:image'];
  } else if (meta.image) {
    // Attempt to extract from general meta
    url = meta.image;
  } else if (meta['twitter:image']) {
    // Attempt to extract from Twitter
    url = meta['twitter:image'];
  } else if (meta['msapplication-TileImage']) {
    // Attempt to extract from msapplication ;-)
    url = meta['msapplication-TileImage'];
  }
  // Validate the url is a valid image url
  if (url) {
    try {
      const result = new URL(siteurl);
      if (url.startsWith('/') && siteurl) {
        // relative path
        return result.origin + url;
      } else {
        // absolute path
        const res = new URL(url);
        return res.href;
      }
    } catch (err) {
      return null;
    }
  } else {
    return null;
  }
}
