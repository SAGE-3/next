/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import AuthenticationServices
import UIKit

/// The system's login sheet (ASWebAuthenticationSession), shown over the app's key window.
/// Returns the address the hub sends the sheet back to.
@MainActor
final class LoginSheet: NSObject, ASWebAuthenticationPresentationContextProviding {
  private var session: ASWebAuthenticationSession?

  func open(_ url: URL, callbackScheme: String) async throws -> URL {
    try await withCheckedThrowingContinuation { continuation in
      let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callback, error in
        self?.session = nil
        if let callback {
          continuation.resume(returning: callback)
        } else {
          continuation.resume(throwing: error ?? ASWebAuthenticationSessionError(.canceledLogin))
        }
      }
      session.presentationContextProvider = self
      // Share Safari's cookies, so an account already signed in to Google is offered
      session.prefersEphemeralWebBrowserSession = false
      self.session = session
      if !session.start() {
        self.session = nil
        continuation.resume(throwing: HubError.server("Could not open the login page."))
      }
    }
  }

  nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    MainActor.assumeIsolated {
      let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
      return scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? scenes.first.map { ASPresentationAnchor(windowScene: $0) } ?? ASPresentationAnchor()
    }
  }
}
