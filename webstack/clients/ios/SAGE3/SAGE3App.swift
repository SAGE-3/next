/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI
import UIKit

@main
struct SAGE3App: App {
  var body: some Scene {
    WindowGroup {
      Group {
        #if DEBUG
          if let hub = DebugLaunch.hub {
            DebugLaunchView(url: hub)
          } else {
            RootView()
          }
        #else
          RootView()
        #endif
      }
      // Light or dark as last chosen with the board's toolbar
      .onAppear { Appearance.apply(Appearance.saved) }
    }
  }
}

/// The app's light/dark choice, kept in UserDefaults ("light", "dark", or none: follow the
/// system setting)
enum Appearance {
  static let key = "sage3.appearance"

  static var saved: String { UserDefaults.standard.string(forKey: key) ?? "" }

  /// Save the choice and switch the app to it right away
  static func set(_ value: String) {
    UserDefaults.standard.set(value, forKey: key)
    apply(value)
  }

  /// Set the windows' style directly: it switches every view at once, which
  /// preferredColorScheme does not reliably do while the app is running
  static func apply(_ value: String) {
    let style: UIUserInterfaceStyle = value == "light" ? .light : value == "dark" ? .dark : .unspecified
    for scene in UIApplication.shared.connectedScenes {
      (scene as? UIWindowScene)?.windows.forEach { $0.overrideUserInterfaceStyle = style }
    }
  }
}

/// Hubs, then a hub's rooms, a room's boards, and a board
struct RootView: View {
  @State private var hubs = HubList()
  @State private var sessions = SessionCache()

  var body: some View {
    NavigationStack {
      HubListView(hubs: hubs)
        .navigationDestination(for: Hub.self) { hub in
          if let session = session(for: hub) {
            HubView(session: session)
          } else {
            ContentUnavailableView("Invalid address", systemImage: "exclamationmark.triangle", description: Text(hub.url))
          }
        }
        .onAppear {
          // Back on the hub list: close the websockets, keep the logins
          sessions.all.forEach { $0.disconnect() }
        }
    }
  }

  private func session(for hub: Hub) -> Session? {
    sessions.session(for: hub)
  }
}

/// One session per hub, kept while the app runs so going back and forth keeps the login.
/// A plain class, not observed: looking a session up while drawing must not redraw.
@MainActor
final class SessionCache {
  private var sessions: [UUID: Session] = [:]

  var all: [Session] { Array(sessions.values) }

  func session(for hub: Hub) -> Session? {
    if let session = sessions[hub.id] { return session }
    guard let session = Session(hub: hub) else { return nil }
    sessions[hub.id] = session
    return session
  }
}
