/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { format } from 'date-fns/format';

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
 * Exact-or-subdomain hostname match (never a substring match, so lookalike
 * hosts like evil-vimeo.com or vimeo.com.evil.net do not qualify)
 */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}

/**
 * Process a URL to be embedded: rewrite known services to their embed form.
 * Services are identified by URL hostname; unknown or unparseable URLs are
 * returned unchanged (this is a rewriter — isValidURL is the gate).
 *
 * @param {string} view_url
 * @returns {string} resulting url
 */
export function processContentURL(view_url: string): string {
  let u: URL;
  try {
    u = new URL(view_url);
  } catch {
    return view_url;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return view_url;
  const host = u.hostname.toLowerCase();

  if (host === 'www.youtube.com' && !u.pathname.startsWith('/channel/') && u.pathname !== '/') {
    // A youtube URL with a 'watch' video
    const video_id = u.searchParams.get('v');
    if (video_id && !u.pathname.startsWith('/embed')) {
      view_url = 'https://www.youtube.com/embed/' + encodeURIComponent(video_id) + '?autoplay=0';
    }
  } else if (host === 'www.ted.com' && u.pathname.startsWith('/talks')) {
    // Handler for TED talks
    view_url = view_url.replace('https://www.ted.com/talks', 'https://embed.ted.com/talks');
  } else if (host === 'youtu.be') {
    // youtube short URL (used in sharing)
    const video_id = u.pathname.split('/').pop();
    if (video_id) {
      view_url = 'https://www.youtube.com/embed/' + encodeURIComponent(video_id) + '?autoplay=0';
    }
  } else if (hostMatches(host, 'vimeo.com')) {
    // Vimeo ID is the last path segment
    const vimeo_id = u.pathname.split('/').filter(Boolean).pop();
    if (vimeo_id) {
      view_url = 'https://player.vimeo.com/video/' + encodeURIComponent(vimeo_id);
    }
  } else if (hostMatches(host, 'twitch.tv')) {
    // Twitch video from: https://go.twitch.tv/videos/180266596
    // to embedded:       https://player.twitch.tv/?!autoplay&video=v180266596
    const twitch_id = u.pathname.split('/').filter(Boolean).pop();
    if (twitch_id) {
      view_url = 'https://player.twitch.tv/?!autoplay&video=v' + encodeURIComponent(twitch_id);
    }
  } else if (
    hostMatches(host, 'figma.com') &&
    u.pathname.match(/^\/(file|proto)\/([0-9a-zA-Z]{22,128})(\/.*)?$/) &&
    !view_url.includes('figma.com/embed')
  ) {
    view_url = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(view_url)}`;
  } else if (host === 'docs.google.com') {
    // slides in presentation mode when published
    if (u.pathname.match(/^\/presentation/) && u.pathname.match(/\/pub\/?$/)) {
      u.pathname = u.pathname.replace(/\/pub$/, '/embed');
      const keys = Array.from(u.searchParams.keys());
      for (const key of keys) {
        u.searchParams.delete(key);
      }
      view_url = u.href;
    }
  } else if (hostMatches(host, 'observablehq.com')) {
    if (u.pathname.match(/^\/@([^/]+)\/([^/]+)\/?$/)) {
      view_url = `${u.origin}/embed${u.pathname}?cell=*`;
    }
    if (u.pathname.match(/^\/d\/([^/]+)\/?$/)) {
      const pathName = u.pathname.replace(/^\/d/, '');
      view_url = `${u.origin}/embed${pathName}?cell=*`;
    }
  } else if (hostMatches(host, 'twitter.com')) {
    view_url = `https://oembed.link/${view_url}`;
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

/**
 * Validate a URL string
 * From github.com/ogt/valid-url but not maintained
 * @param {string} value
 * @returns {(string | undefined)}
 */
export function isValidURL(value: string): string | undefined {
  if (!value) {
    return;
  }

  // check for illegal characters
  // eslint-disable-next-line no-useless-escape
  if (/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\ʻ\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(value)) return;

  // check for hex escapes that aren't complete
  if (/%[^0-9a-f]/i.test(value)) return;
  if (/%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)) return;

  let scheme = '';
  let authority = '';
  let path = '';
  let query = '';
  let fragment = '';
  let out = '';

  // from RFC 3986
  const splitted = splitUri(value);
  if (!splitted) return;
  scheme = splitted[1];
  authority = splitted[2];
  path = splitted[3];
  query = splitted[4];
  fragment = splitted[5];

  // scheme and path are required, though the path can be empty
  if (!(scheme && scheme.length && path.length >= 0)) return;

  // if authority is present, the path must be empty or begin with a /
  if (authority && authority.length) {
    if (!(path.length === 0 || /^\//.test(path))) return;
  } else {
    // if authority is not present, the path must not start with //
    if (/^\/\//.test(path)) return;
  }

  // scheme must begin with a letter, then consist of letters, digits, +, ., or -
  // eslint-disable-next-line no-useless-escape
  if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase())) return;

  // Only allow web protocols: rejects javascript:, data:, file:, chrome:,
  // sage3:, etc. — validated URLs end up in webviews and links.
  const lowScheme = scheme.toLowerCase();
  if (lowScheme !== 'http' && lowScheme !== 'https') {
    return;
  }

  // re-assemble the URL per section 5.3 in RFC 3986
  out += scheme + ':';
  if (authority && authority.length) {
    out += '//' + authority;
  }

  out += path;

  if (query && query.length) {
    out += '?' + query;
  }

  if (fragment && fragment.length) {
    out += '#' + fragment;
  }

  return out;
}

/**
 * URI spitter method - direct from RFC 3986
 * @param {string} uri
 * @returns RegExpMatchArray
 */
function splitUri(uri: string) {
  // eslint-disable-next-line no-useless-escape
  const splitted = uri.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
  return splitted;
}

// Uses date-fn to format a UTC timestamp to a human readable string
// https://date-fns.org/v2.21.1/docs/format
export function formatDateAndTime(date: number | string): string {
  return format(date, 'MMM do, yyyy h:mmaaa');
}

/**
 * Escape a value for interpolation into HTML text content
 * or into a *quoted* attribute value.
 */
export function escapeHtml(value: string): string {
  const HTML_CHARS = /["'&<>]/;
  const str = '' + value;
  const match = HTML_CHARS.exec(str);

  if (!match) return str; // fast path: nothing to do

  let out = '';
  let lastIndex = 0;
  let index = match.index;
  let escape;

  for (; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34:
        escape = '&quot;';
        break; // "
      case 38:
        escape = '&amp;';
        break; // &
      case 39:
        escape = '&#39;';
        break; // '
      case 60:
        escape = '&lt;';
        break; //
      case 62:
        escape = '&gt;';
        break; // >
      default:
        continue;
    }

    if (lastIndex !== index) out += str.substring(lastIndex, index);
    lastIndex = index + 1;
    out += escape;
  }

  return lastIndex !== index ? out + str.substring(lastIndex, index) : out;
}
