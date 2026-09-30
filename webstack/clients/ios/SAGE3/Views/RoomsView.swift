/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

/// A row for a room or a board: its color, name, description, and a lock when private
struct SpaceRow: View {
  let name: String
  let description: String?
  let color: String?
  let isPrivate: Bool

  var body: some View {
    HStack(spacing: 12) {
      RoundedRectangle(cornerRadius: 4).fill(SageColor.strong(color)).frame(width: 8, height: 36)
      VStack(alignment: .leading, spacing: 2) {
        Text(name).font(.headline)
        if let description, !description.isEmpty {
          Text(description).font(.caption).foregroundStyle(.secondary).lineLimit(2)
        }
      }
      Spacer()
      if isPrivate { Image(systemName: "lock.fill").foregroundStyle(.secondary) }
    }
  }
}

/// The hub's rooms, kept up to date
struct RoomsView: View {
  let session: Session
  @State private var rooms = LiveCollection<RoomData>()
  @State private var members = LiveCollection<RoomMembersData>()
  @State private var search = ""
  @State private var pinFor: Room?
  @State private var openRoomId: String?
  @State private var creating = false
  @State private var problem: String?

  // Listed rooms, and unlisted ones the user owns (as the web client shows them)
  private var visible: [Room] {
    rooms.items
      .filter { $0.data.isListed != false || $0.data.ownerId == session.user?.id }
      .filter { search.isEmpty || $0.data.name.localizedCaseInsensitiveContains(search) }
      .sorted { $0.data.name.localizedCaseInsensitiveCompare($1.data.name) == .orderedAscending }
  }

  /// A room the user owns or joined (the web home lists only those)
  private func isMine(_ room: Room) -> Bool {
    guard let me = session.user?.id else { return false }
    return room.data.ownerId == me || members.items.first { $0.id == room.id }?.data.members?.contains(me) == true
  }

  var body: some View {
    List {
      if session.canJoinRooms {
        // As the web: your rooms, and the others to join (from its room search)
        Section("Your Rooms") {
          ForEach(visible.filter(isMine)) { room in
            row(room)
              .swipeActions {
                if room.data.ownerId != session.user?.id {
                  Button("Leave", role: .destructive) { Task { await leave(room) } }
                }
              }
          }
        }
        let others = visible.filter { !isMine($0) }
        if !others.isEmpty {
          Section {
            ForEach(others) { room in
              HStack {
                row(room)
                Button("Join") { join(room) }
                  .buttonStyle(.bordered)
                  .controlSize(.small)
              }
            }
          } header: {
            Text("Other Rooms")
          } footer: {
            Text(problem ?? "Join a room to see it in your rooms, as on the web.")
              .foregroundStyle(problem == nil ? Color.secondary : Color.red)
          }
        }
      } else {
        Section {
          ForEach(visible) { room in row(room) }
        } footer: {
          Text("Guests can open rooms and boards, but not create or join them.")
        }
      }
    }
    .overlay {
      if rooms.loaded && visible.isEmpty {
        ContentUnavailableView(search.isEmpty ? "No Rooms" : "No Matching Rooms", systemImage: "square.grid.2x2", description: Text(rooms.error ?? ""))
      } else if !rooms.loaded {
        ProgressView()
      }
    }
    .searchable(text: $search, prompt: "Search rooms")
    .navigationTitle(session.info?.serverName ?? session.hub.name)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Button { creating = true } label: { Label("New Room", systemImage: "plus") }
          .disabled(!session.canCreateRoomsAndBoards)
      }
      ToolbarItem(placement: .secondaryAction) {
        Button("Sign Out", role: .destructive) { Task { await session.logout() } }
      }
    }
    .task(id: session.socket == nil) {
      await rooms.start(socket: session.socket, route: "/rooms") { try await session.client.rooms() }
      if session.canJoinRooms {
        await members.start(socket: session.socket, route: "/roommembers") { try await session.client.roomMembers() }
      }
    }
    .onDisappear {
      rooms.stop()
      members.stop()
    }
    .navigationDestination(item: $openRoomId) { id in
      if let room = rooms.items.first(where: { $0.id == id }) { BoardsView(session: session, room: room) }
    }
    .pinPrompt(item: $pinFor, session: session, hashed: { $0.data.privatePin }) { room in
      // A room to join, once its PIN matches; one already joined just opens
      if session.canJoinRooms && !isMine(room) { Task { await joinAndOpen(room) } } else { openRoomId = room.id }
    }
    .sheet(isPresented: $creating) { CreateSpaceSheet(session: session, room: nil) }
  }

  private func row(_ room: Room) -> some View {
    Button { open(room) } label: {
      SpaceRow(name: room.data.name, description: room.data.description, color: room.data.color, isPrivate: room.data.isPrivate == true)
    }
    .foregroundStyle(.primary)
  }

  private func open(_ room: Room) {
    if session.canJoinRooms && !isMine(room) {
      join(room)
    } else if room.data.isPrivate == true && room.data.ownerId != session.user?.id {
      pinFor = room
    } else {
      openRoomId = room.id
    }
  }

  /// Join a room (a private one after its PIN), then open it
  private func join(_ room: Room) {
    if room.data.isPrivate == true && room.data.ownerId != session.user?.id {
      pinFor = room
    } else {
      Task { await joinAndOpen(room) }
    }
  }

  private func joinAndOpen(_ room: Room) async {
    do {
      try await session.client.joinRoom(room.id)
      problem = nil
      openRoomId = room.id
    } catch {
      problem = "Could not join \(room.data.name): \(error.localizedDescription)"
    }
  }

  private func leave(_ room: Room) async {
    do {
      try await session.client.leaveRoom(room.id)
      problem = nil
    } catch {
      problem = "Could not leave \(room.data.name): \(error.localizedDescription)"
    }
  }
}

/// A room's boards, kept up to date
struct BoardsView: View {
  let session: Session
  let room: Room
  @State private var boards = LiveCollection<BoardData>()
  @State private var pinFor: Board?
  @State private var openBoardId: String?
  @State private var creating = false

  private var sorted: [Board] {
    boards.items.sorted { $0.data.name.localizedCaseInsensitiveCompare($1.data.name) == .orderedAscending }
  }

  var body: some View {
    List {
      Section {
        ForEach(sorted) { board in
          Button { open(board) } label: {
            SpaceRow(name: board.data.name, description: board.data.description, color: board.data.color, isPrivate: board.data.isPrivate == true)
          }
          .foregroundStyle(.primary)
        }
      } header: {
        if let description = room.data.description, !description.isEmpty { Text(description) }
      }
    }
    .overlay {
      if boards.loaded && sorted.isEmpty {
        ContentUnavailableView("No Boards", systemImage: "rectangle.on.rectangle", description: Text(boards.error ?? ""))
      } else if !boards.loaded {
        ProgressView()
      }
    }
    .navigationTitle(room.data.name)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Button { creating = true } label: { Label("New Board", systemImage: "plus") }
          .disabled(!session.canCreateRoomsAndBoards)
      }
    }
    .task(id: session.socket == nil) {
      await boards.start(socket: session.socket, route: "/boards?roomId=\(room.id)") { try await session.client.boards(roomId: room.id) }
    }
    .onDisappear { boards.stop() }
    .navigationDestination(item: $openBoardId) { id in
      if let board = boards.items.first(where: { $0.id == id }) { BoardView(session: session, board: board, roomName: room.data.name) }
    }
    .pinPrompt(item: $pinFor, session: session, hashed: { $0.data.privatePin }) { openBoardId = $0.id }
    .sheet(isPresented: $creating) { CreateSpaceSheet(session: session, room: room) }
  }

  private func open(_ board: Board) {
    if board.data.isPrivate == true && board.data.ownerId != session.user?.id {
      pinFor = board
    } else {
      openBoardId = board.id
    }
  }
}
