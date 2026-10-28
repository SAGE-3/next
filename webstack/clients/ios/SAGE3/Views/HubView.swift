/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import AuthenticationServices
import SwiftUI

/// A hub: sign in (Apple, Google or guest), then its rooms
struct HubView: View {
  let session: Session
  @State private var loginSheet = LoginSheet()
  @State private var checking = true
  @State private var signingIn = false
  @State private var error: String?
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    Group {
      if checking {
        ProgressView("Connecting to \(session.hub.name)…")
      } else if session.user != nil {
        RoomsView(session: session)
      } else {
        signIn
      }
    }
    .task {
      if session.user != nil {
        session.connectIfNeeded()
      } else {
        await session.connect()
        if session.info != nil { _ = await session.resume() }
      }
      checking = false
    }
  }

  private var guestAllowed: Bool { session.info?.logins?.contains("guest") ?? false }
  private var googleAllowed: Bool { session.info?.logins?.contains("google") ?? false }
  private var appleAllowed: Bool { session.info?.logins?.contains("apple") ?? false }

  private var signIn: some View {
    VStack(spacing: 20) {
      Image(systemName: "rectangle.3.group").font(.system(size: 56)).foregroundStyle(.tint)
      Text(session.info?.serverName ?? session.hub.name).font(.title2.bold())
      if let version = session.info?.version {
        Text("SAGE3 \(version)").font(.subheadline).foregroundStyle(.secondary)
      }
      if session.info == nil {
        Text("This hub is not reachable.").foregroundStyle(.red)
      } else if guestAllowed || googleAllowed || appleAllowed {
        if appleAllowed {
          // Apple's look for its sign-in button: black (white in dark mode), its logo
          Button {
            Task { await signIn { try await session.loginWithApple(authenticate: openLoginSheet) } }
          } label: {
            Label("Sign in with Apple", systemImage: "apple.logo")
              .frame(maxWidth: 280)
          }
          .buttonStyle(.borderedProminent)
          .tint(colorScheme == .dark ? .white : .black)
          .foregroundStyle(colorScheme == .dark ? .black : .white)
          .controlSize(.large)
          .disabled(signingIn)
        }
        if googleAllowed {
          Button {
            Task { await signIn { try await session.loginWithGoogle(authenticate: openLoginSheet) } }
          } label: {
            Label("Sign in with Google", systemImage: "person.badge.key")
              .frame(maxWidth: 280)
          }
          .buttonStyle(.borderedProminent)
          .controlSize(.large)
          .disabled(signingIn)
        }
        if guestAllowed {
          Button {
            Task { await signIn { try await session.loginAsGuest() } }
          } label: {
            Label("Continue as Guest", systemImage: "person.crop.circle")
              .frame(maxWidth: 280)
          }
          .buttonStyle(.bordered)
          .controlSize(.large)
          .disabled(signingIn)
          Text("Guests can browse rooms and boards and view them.")
            .font(.footnote)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
        }
      } else {
        Text("This hub allows neither Apple, Google nor guest sign-in. Other sign-in methods will come in a later version.")
          .font(.footnote)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
      if let error {
        Text(error).font(.footnote).foregroundStyle(.red).multilineTextAlignment(.center)
      }
    }
    .padding()
    .navigationTitle(session.hub.name)
  }

  private func signIn(_ login: () async throws -> Void) async {
    signingIn = true
    defer { signingIn = false }
    do {
      try await login()
      error = nil
    } catch let failure as ASWebAuthenticationSessionError where failure.code == .canceledLogin {
      // Closed the login sheet: nothing to report
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }

  /// The system's login sheet, returning the address the hub sends it back to
  private func openLoginSheet(_ url: URL, _ scheme: String) async throws -> URL {
    try await loginSheet.open(url, callbackScheme: scheme)
  }
}
