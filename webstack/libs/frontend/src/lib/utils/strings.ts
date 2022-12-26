/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Same as charAt() but supports unicode and odd characters
 * From:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt
 *
 * @param {string} str
 * @param {number} idx
 * @returns {string}
 */
export function fixedCharAt(str: string, idx: number): string {
  let ret = '';
  str += '';
  const end = str.length;

  const surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  while (surrogatePairs.exec(str) != null) {
    const lastIdx = surrogatePairs.lastIndex;
    if (lastIdx - 2 < idx) {
      idx++;
    } else {
      break;
    }
  }

  if (idx >= end || idx < 0) {
    return '';
  }

  ret += str.charAt(idx);

  if (/[\uD800-\uDBFF]/.test(ret) && /[\uDC00-\uDFFF]/.test(str.charAt(idx + 1))) {
    // Go one further, since one of the "characters" is part of a surrogate pair
    ret += str.charAt(idx + 1);
  }
  return ret;
}

/**
 * Function to generate initials from a name
 * Redefined from Chakra to handle UTF characters
 *
 * @param {string} name
 * @returns {string}
 */
export function initials(name: string): string {
  const [firstName, lastName] = name.split(' ');
  return firstName && lastName ? `${fixedCharAt(firstName, 0)}${fixedCharAt(lastName, 0)}` : fixedCharAt(firstName, 0);
}

/**
 * Limit a string to n characters and add ellipsis if needed
 *
 * @param {string} str
 * @param {number} n
 * @returns {string}
 */
export function truncateWithEllipsis(str: string, n: number): string {
  if (!str) return str;
  return str.length > n ? str.substring(0, n - 1) + '…' : str;
}

/**
 * zeroPad
 * @export
 * @param {number} num value to padd, convert to string
 * @param {number} places how many places
 * @returns {string} result
 */
export function zeroPad(num: number, places: number): string {
  return String(num).padStart(places, '0');
}

/**
 * Return a string for a file size number
 *
 * @param {number} size
 * @returns {string}
 */
export function humanFileSize(size: number): string {
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const val = Number((size / Math.pow(1024, i)).toFixed(1));
  return val + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

/**
 * Process a URL to be embedded
 *
 * @param {string} view_url
 * @returns {string} resulting url
 */
export function processContentURL(view_url: string): string {
  // A youtube URL with a 'watch' video
  if (view_url.startsWith('https://www.youtube.com') && !view_url.includes('/channel/') && view_url !== 'https://www.youtube.com/') {
    if (view_url.indexOf('embed') === -1 || view_url.indexOf('watch?v=') >= 0) {
      // Search for the Youtube ID
      let video_id = view_url.split('v=')[1];
      const ampersandPosition = video_id.indexOf('&');
      if (ampersandPosition !== -1) {
        video_id = video_id.substring(0, ampersandPosition);
      }
      view_url = 'https://www.youtube.com/embed/' + video_id + '?autoplay=0';
    }
  } else if (view_url.startsWith('https://www.ted.com/talks')) {
    // Handler for TED talks
    const talk = view_url.replace('https://www.ted.com/talks', 'https://embed.ted.com/talks');
    view_url = talk;
  } else if (view_url.startsWith('https://youtu.be')) {
    // youtube short URL (used in sharing)
    const video_id = view_url.split('/').pop();
    view_url = 'https://www.youtube.com/embed/' + video_id + '?autoplay=0';
  } else if (view_url.indexOf('vimeo') >= 0) {
    // Search for the Vimeo ID
    const m = view_url.match(/^.+vimeo.com\/(.*\/)?([^#?]*)/);
    const vimeo_id = m ? m[2] || m[1] : null;
    if (vimeo_id) {
      view_url = 'https://player.vimeo.com/video/' + vimeo_id;
    }
  } else if (view_url.indexOf('twitch.tv') >= 0) {
    // Twitch video from:
    //    https://go.twitch.tv/videos/180266596
    // to embedded:
    //    https://player.twitch.tv/?!autoplay&video=v180266596
    // Search for the Twitch ID
    const tw = view_url.match(/^.+twitch.tv\/(.*\/)?([^#?]*)/);
    const twitch_id = tw ? tw[2] || tw[1] : null;
    if (twitch_id) {
      view_url = 'https://player.twitch.tv/?!autoplay&video=v' + twitch_id;
    }
  }
  return view_url;
}

/**
 * Check if a string looks like a UUIDv4
 * @param uuid: string to be tested
 * @returns {boolean} true if uuid is valid
 */
export function isUUIDv4(uuid: string): boolean {
  const v4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return v4Regex.test(uuid);
}
