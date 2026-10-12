/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import CryptoKit
import Foundation

/// The secret of one web login (PKCE, RFC 7636): the random verifier stays in the app,
/// the hub only sees its challenge, and it gives the login back only to whoever knows
/// the verifier.
struct WebLogin {
  /// Where the hub sends the login sheet back to (sage3://auth?code=...)
  static let callbackScheme = "sage3"

  let verifier: String
  let challenge: String

  init() {
    var bytes = [UInt8](repeating: 0, count: 32)
    _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    verifier = Data(bytes).base64URLEncoded
    challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncoded
  }
}

extension Data {
  /// Base64 without padding, with - and _ (base64url)
  var base64URLEncoded: String {
    base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
  }
}
