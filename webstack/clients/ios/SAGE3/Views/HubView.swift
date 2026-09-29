/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

/// A hub: sign in (guest only for now), then its rooms
struct HubView: View {
  let session: Session
  @State private var checking = true
  @State private var signingIn = false
  @State private var error: String?

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
        session.info = try? await session.client.info()
        _ = await session.resume()
      }
      checking = false
    }
  }

  private var guestAllowed: Bool { session.info?.logins?.contains("guest") ?? false }

  private var signIn: some View {
    VStack(spacing: 20) {
      Image(systemName: "rectangle.3.group").font(.system(size: 56)).foregroundStyle(.tint)
      Text(session.info?.serverName ?? session.hub.name).font(.title2.bold())
      if let version = session.info?.version {
        Text("SAGE3 \(version)").font(.subheadline).foregroundStyle(.secondary)
      }
      if session.info == nil {
        Text("This hub is not reachable.").foregroundStyle(.red)
      } else if guestAllowed {
        Button {
          Task { await signInAsGuest() }
        } label: {
          Label("Continue as Guest", systemImage: "person.crop.circle")
            .frame(maxWidth: 280)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(signingIn)
        Text("Guests can browse rooms and boards and view them.\nOther sign-in methods will come in a later version.")
          .font(.footnote)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      } else {
        Text("This hub does not allow guests. Other sign-in methods will come in a later version.")
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

  private func signInAsGuest() async {
    signingIn = true
    defer { signingIn = false }
    do {
      try await session.loginAsGuest()
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
  }
}
