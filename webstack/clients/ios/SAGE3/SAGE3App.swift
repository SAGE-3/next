/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

@main
struct SAGE3App: App {
  var body: some Scene {
    WindowGroup {
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
  }
}

/// Hubs, then a hub's rooms, a room's boards, and a board
struct RootView: View {
  @State private var hubs = HubList()
  // One session per hub, kept while the app runs so going back and forth keeps the login
  @State private var sessions: [UUID: Session] = [:]

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
          sessions.values.forEach { $0.disconnect() }
        }
    }
  }

  private func session(for hub: Hub) -> Session? {
    if let session = sessions[hub.id] { return session }
    guard let session = Session(hub: hub) else { return nil }
    DispatchQueue.main.async { sessions[hub.id] = session }
    return session
  }
}
