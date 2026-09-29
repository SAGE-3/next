/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Foundation
import Observation

/// The signed-in session on one hub: the HTTP client, the user, and the websocket
@MainActor
@Observable
final class Session {
  let hub: Hub
  let client: HubClient
  private(set) var socket: HubSocket?
  private(set) var user: User?
  private(set) var namespace: String?
  var info: ServerInfo?

  init?(hub: Hub) {
    guard let url = URL(string: hub.url) else { return nil }
    self.hub = hub
    self.client = HubClient(base: url)
  }

  /// Guests may read everything and add apps, but not create or change rooms and boards
  /// (libs/shared/src/lib/permissions/SAGEAbility.ts), and not upload
  var isGuest: Bool { user?.data.userRole == "guest" }

  var canCreateRoomsAndBoards: Bool {
    guard let role = user?.data.userRole else { return false }
    return role == "user" || role == "admin"
  }

  /// Use the session left by an earlier login, if it's still valid
  func resume() async -> Bool {
    guard let auth = try? await client.verify() else { return false }
    return await start(auth)
  }

  func loginAsGuest() async throws {
    try await client.loginAsGuest()
    guard let auth = try await client.verify() else { throw HubError.server("The guest login did not work.") }
    guard await start(auth) else { throw HubError.server("Could not open the guest session.") }
  }

  private func start(_ auth: AuthVerify.Auth) async -> Bool {
    guard let user = try? await client.currentUser(auth) else { return false }
    self.user = user
    namespace = (try? await client.configuration())?.namespace
    socket?.close()
    socket = HubSocket(base: client.base)
    socket?.connect()
    return true
  }

  /// Close the websocket when leaving the hub (the login stays)
  func disconnect() {
    socket?.close()
    socket = nil
  }

  /// Reopen the websocket when coming back to the hub
  func connectIfNeeded() {
    guard user != nil, socket == nil else { return }
    socket = HubSocket(base: client.base)
    socket?.connect()
  }

  func logout() async {
    socket?.close()
    socket = nil
    user = nil
    await client.logout()
  }

  /// Does a typed PIN open a private room or board
  func pinMatches(_ pin: String, hashed: String?) -> Bool {
    guard let namespace, let hashed, let key = uuidV5(pin, namespace: namespace) else { return false }
    return key == hashed
  }

  /// The stored form of a new PIN
  func hashPin(_ pin: String) -> String? {
    guard let namespace else { return nil }
    return uuidV5(pin, namespace: namespace)
  }
}
