/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Fetch user-provided URLs while refusing non-public destinations (SSRF protection).
 * @file Safe fetch of user-provided URLs
 * @version 1.0.0
 */

// Node modules
import * as dns from 'node:dns/promises';
import * as net from 'node:net';

// Limits for fetching user-provided URLs
const FETCH_TIMEOUT = 10 * 1000; // ms, time to response headers, per redirect hop
const MAX_REDIRECTS = 3;

// Address ranges a user-provided URL must never reach
const blockedRanges = new net.BlockList();
// IPv4: "this network", private (RFC 1918), CGNAT, loopback, link-local, benchmarking, multicast and reserved
blockedRanges.addSubnet('0.0.0.0', 8);
blockedRanges.addSubnet('10.0.0.0', 8);
blockedRanges.addSubnet('100.64.0.0', 10);
blockedRanges.addSubnet('127.0.0.0', 8);
blockedRanges.addSubnet('169.254.0.0', 16);
blockedRanges.addSubnet('172.16.0.0', 12);
blockedRanges.addSubnet('192.168.0.0', 16);
blockedRanges.addSubnet('198.18.0.0', 15);
blockedRanges.addSubnet('224.0.0.0', 3);
// IPv6: unspecified + loopback, unique-local, link-local, multicast
blockedRanges.addSubnet('::', 127, 'ipv6');
blockedRanges.addSubnet('fc00::', 7, 'ipv6');
blockedRanges.addSubnet('fe80::', 10, 'ipv6');
blockedRanges.addSubnet('ff00::', 8, 'ipv6');

function isBlockedAddress(address: string, family: number): boolean {
  if (family === 6) {
    // An IPv4-mapped IPv6 address reaches the embedded IPv4 target — check that instead
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return blockedRanges.check(mapped[1], 'ipv4');
    return blockedRanges.check(address, 'ipv6');
  }
  return blockedRanges.check(address, 'ipv4');
}

/**
 * Throw unless every address the URL's hostname resolves to is public.
 *
 * Blocks loopback, private, link-local, multicast, and reserved ranges so a
 * user-provided URL cannot reach internal services.
 *
 * @param {string} url the URL to check
 * @returns {Promise<URL>} the parsed URL
 */
export async function assertPublicHost(url: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Malformed URL: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL scheme: ${parsed.protocol}`);
  }
  // The hostname of an IPv6 literal is bracketed in WHATWG URLs
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error(`Cannot resolve host: ${hostname}`);
  }
  if (addresses.length === 0) throw new Error(`Cannot resolve host: ${hostname}`);
  // Every resolved address must be public, not just the first one
  for (const { address, family } of addresses) {
    if (isBlockedAddress(address, family)) {
      throw new Error(`URL resolves to a non-public address: ${address}`);
    }
  }
  return parsed;
}

/**
 * Fetch a user-provided URL, refusing non-public destinations.
 *
 * Redirects are followed manually and each hop is re-validated with
 * assertPublicHost. Each hop must return response headers within
 * FETCH_TIMEOUT; the body stream itself is not time-bounded.
 *
 * Note: the address check happens before the request (resolve-then-fetch),
 * so a hostile DNS server flipping records between the two lookups is a
 * residual risk; network egress rules are the backstop for that.
 *
 * @param {string} url the http(s) URL to fetch
 * @returns {Promise<Response>} the (non-redirect) fetch response
 */
export async function fetchPublicURL(url: string): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    let response: Response;
    try {
      response = await fetch(current, { redirect: 'manual', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect without a Location header');
      await response.body?.cancel();
      current = new URL(location, current).toString();
      continue;
    }
    return response;
  }
  throw new Error('Too many redirects');
}
