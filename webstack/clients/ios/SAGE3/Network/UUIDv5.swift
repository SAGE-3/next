/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import CryptoKit
import Foundation

/// A version 5 (SHA-1, name-based) UUID, as the `uuid` npm package makes it. The web
/// client stores the PIN of a private room or board as uuidv5(pin, namespace), and
/// checks a typed PIN by hashing it the same way.
func uuidV5(_ name: String, namespace: String) -> String? {
  guard let space = UUID(uuidString: namespace) else { return nil }
  var bytes = withUnsafeBytes(of: space.uuid) { Array($0) }
  bytes.append(contentsOf: Array(name.utf8))
  var hash = Array(Insecure.SHA1.hash(data: bytes).prefix(16))
  hash[6] = (hash[6] & 0x0F) | 0x50  // version 5
  hash[8] = (hash[8] & 0x3F) | 0x80  // RFC 4122 variant
  let hex = hash.map { String(format: "%02x", $0) }.joined()
  let parts = [hex.prefix(8), hex.dropFirst(8).prefix(4), hex.dropFirst(12).prefix(4), hex.dropFirst(16).prefix(4), hex.dropFirst(20)]
  return parts.joined(separator: "-")
}
