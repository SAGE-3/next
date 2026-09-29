/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

#if DEBUG
  import SwiftUI

  /// Open a hub's rooms, a room's boards, or a board directly as a guest, for screenshots
  /// and quick checks in the simulator (debug builds only). Launch arguments:
  ///   -SAGE3Hub http://localhost:4200 [-SAGE3Room <room id> [-SAGE3Board <board id>]]
  /// e.g. xcrun simctl launch booted app.sage3.ios -SAGE3Hub http://localhost:4200
  enum DebugLaunch {
    static var hub: String? { UserDefaults.standard.string(forKey: "SAGE3Hub") }
    static var room: String? { UserDefaults.standard.string(forKey: "SAGE3Room") }
    static var board: String? { UserDefaults.standard.string(forKey: "SAGE3Board") }
  }

  struct DebugLaunchView: View {
    let url: String
    @State private var session: Session?
    @State private var room: Room?
    @State private var board: Board?
    @State private var error: String?

    var body: some View {
      NavigationStack {
        Group {
          if let session, room != nil, let board {
            BoardView(session: session, board: board)
          } else if let session, let room {
            BoardsView(session: session, room: room)
          } else if let session, session.user != nil {
            RoomsView(session: session)
          } else {
            ProgressView(error ?? "Signing in as a guest…")
          }
        }
      }
      .task { await open() }
    }

    private func open() async {
      guard let session = Session(hub: Hub(name: "Debug", url: url)) else { return error = "Invalid hub address" }
      do {
        await session.connect()
        try await session.loginAsGuest()
        if let roomId = DebugLaunch.room {
          room = try await session.client.rooms().first { $0.id == roomId }
          if let boardId = DebugLaunch.board {
            board = try await session.client.boards(roomId: roomId).first { $0.id == boardId }
          }
        }
        self.session = session
      } catch {
        self.error = error.localizedDescription
      }
    }
  }

#endif
