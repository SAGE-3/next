/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls } from '../config/urls';

/**
 * Trigger a file download
 * @param url data to download
 * @param name optional filename
 */
export function downloadFile(url: string, name?: string): void {
  const a = document.createElement('a');
  a.href = url;
  const filename = name || url.split('/').pop();
  if (filename) {
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Downloads a resource by proxying the provided URL through the application's download API and triggering a browser save dialog.
 *
 * The function encodes the target URL, requests `/api/files/download/{encodedUrl}`, converts the response to a Blob, creates a temporary object URL,
 * and programmatically clicks an anchor element with the provided filename as the download attribute. The temporary object URL is revoked after clicking.
 *
 * @param url - The remote resource URL to download (will be encoded and proxied).
 * @param name - Suggested filename for the downloaded file (sets the anchor's `download` attribute).
 * @returns A promise that resolves when the download process has been initiated. It does not guarantee completion of the file write to disk.
 * @throws {Error} If the fetch response is not OK (response.ok is false), an Error with the HTTP status is thrown.
 */
export async function downloadViaProxy(url: string, name: string) {
  // Construct a proxy endpoint that will fetch the remote URL server-side.
  // The target URL is encoded to make it safe to include in the path.
  const proxyUrl = apiUrls.assets.getDownloadURL(url);

  // Request the proxied resource from the application's API.
  const response = await fetch(proxyUrl);

  // If the server returned a non-2xx status, throw an Error with the status code.
  if (!response.ok) throw new Error(`Download failed1: ${response.status}`);

  // Convert the response body to a Blob so the browser can treat it as a file.
  const blob = await response.blob();

  // Create a temporary object URL for the Blob that can be used as an <a> href.
  const blobUrl = URL.createObjectURL(blob);

  // Create an anchor element and configure it to download the Blob when clicked.
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = name;

  // Programmatically click the anchor to trigger the browser's save dialog.
  a.click();

  // Release the temporary object URL to free memory/resources.
  URL.revokeObjectURL(blobUrl);
}

// /**
//  * Process a URL to be embedded
//  *
//  * @param {string} view_url
//  * @returns {string} resulting url
//  */
// export function processContentURL(view_url: string): string {
//   // A youtube URL with a 'watch' video
//   if (view_url.startsWith('https://www.youtube.com') && !view_url.includes('/channel/')) {
//     if (view_url.indexOf('embed') === -1 || view_url.indexOf('watch?v=') >= 0) {
//       // Search for the Youtube ID
//       let video_id = view_url.split('v=')[1];
//       const ampersandPosition = video_id.indexOf('&');
//       if (ampersandPosition != -1) {
//         video_id = video_id.substring(0, ampersandPosition);
//       }
//       view_url = 'https://www.youtube.com/embed/' + video_id + '?autoplay=0';
//     }
//     // ask for a HD resize
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   } else if (view_url.startsWith('https://www.ted.com/talks')) {
//     // Handler for TED talks
//     const talk = view_url.replace('https://www.ted.com/talks', 'https://embed.ted.com/talks');
//     view_url = talk;
//     // ask for a HD resize
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   } else if (view_url.startsWith('https://youtu.be')) {
//     // youtube short URL (used in sharing)
//     const video_id = view_url.split('/').pop();
//     view_url = 'https://www.youtube.com/embed/' + video_id + '?autoplay=0';
//     // ask for a HD resize
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   } else if (view_url.indexOf('vimeo') >= 0) {
//     // Search for the Vimeo ID
//     const m = view_url.match(/^.+vimeo.com\/(.*\/)?([^#?]*)/);
//     const vimeo_id = m ? m[2] || m[1] : null;
//     if (vimeo_id) {
//       view_url = 'https://player.vimeo.com/video/' + vimeo_id;
//     }
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   } else if (view_url.endsWith('.ipynb') && view_url.indexOf('mybinder.org') === -1) {
//     // only use nbviewer if it is a locally hosted file
//     // otherwise just a webview
//     if (view_url.startsWith('/')) {
//       // ipython notebook file are link to nbviewer.jupyter.org online
//       // except if it's a link to binder.org, which does its own rendering.
//       const host = this.config.host + ':' + this.config.port;
//       view_url = 'https://nbviewer.jupyter.org/url/' + host + view_url;
//     }
//   } else if (view_url.indexOf('twitch.tv') >= 0) {
//     // Twitch video from:
//     //    https://go.twitch.tv/videos/180266596
//     // to embedded:
//     //    https://player.twitch.tv/?!autoplay&video=v180266596
//     // Search for the Twitch ID
//     const tw = view_url.match(/^.+twitch.tv\/(.*\/)?([^#?]*)/);
//     const twitch_id = tw ? tw[2] || tw[1] : null;
//     if (twitch_id) {
//       view_url = 'https://player.twitch.tv/?!autoplay&video=v' + twitch_id;
//     }
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   } else if (view_url.indexOf('docs.google.com/presentation') >= 0) {
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   } else if (view_url.indexOf('appear.in') >= 0 || view_url.indexOf('whereby.com') >= 0) {
//     if (!view_url.endsWith('?widescreen')) {
//       // to enable non-cropped mode, in widescreen
//       view_url += '?widescreen';
//     }
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   } else if (view_url.indexOf('scp.tv') >= 0) {
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   } else if (view_url.endsWith('.pptx')) {
//     // try to handle Office file. Starting with PPTX
//     const localurl = view_url;
//     view_url = 'https://view.officeapps.live.com/op/embed.aspx?src=';
//     // alternativ using Google docs
//     // https://docs.google.com/viewer?url= URL &embedded=true&chrome=false
//     const host = this.config.host + ':' + this.config.port + '/';
//     view_url += encodeURIComponent('http://' + host + localurl);
//     view_url += '&wdAr=1.7777777777777777';
//     // sendResize(this.sage2_width, this.sage2_width / 1.777777778);
//   }
//   return view_url;
// }
