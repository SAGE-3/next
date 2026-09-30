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
  /// Talks to the address the hub answers on (see connect())
  private(set) var client: HubClient
  private(set) var socket: HubSocket?
  private(set) var user: User?
  private(set) var namespace: String?
  /// The apps a production hub offers (nil: all, as the web client in development)
  private(set) var offeredApps: [String]?
  /// The hub shares screens through its own LiveKit SFU (LocalScreenshare apps)
  private(set) var hasLiveKit = false
  var info: ServerInfo?

  init?(hub: Hub) {
    guard let url = URL(string: hub.url) else { return nil }
    self.hub = hub
    self.client = HubClient(base: url)
  }

  /// Guests may read everything and add apps, but not create or change rooms and boards
  /// (libs/shared/src/lib/permissions/SAGEAbility.ts), and not upload
  var isGuest: Bool { user?.data.userRole == "guest" }

  /// Guests may move apps too; spectators only watch
  var canMoveApps: Bool {
    guard let role = user?.data.userRole else { return false }
    return role == "user" || role == "admin" || role == "guest"
  }

  /// Guests may not delete apps (SAGEAbility: create, read, update only)
  var canDeleteApps: Bool { canCreateRoomsAndBoards }

  /// Joining rooms is for users and admins (SAGEAbility: guests only read room members)
  var canJoinRooms: Bool { canCreateRoomsAndBoards }

  /// Annotating needs the right to update boards, which guests don't have
  var canAnnotate: Bool { canCreateRoomsAndBoards }

  /// Guests may not upload (SAGEAbility: assets are download-only for them)
  var canUpload: Bool { canCreateRoomsAndBoards }

  var canCreateRoomsAndBoards: Bool {
    guard let role = user?.data.userRole else { return false }
    return role == "user" || role == "admin"
  }

  /// Find the hub's server, following the redirect of its public address, and get its
  /// information. Call before signing in.
  func connect() async {
    guard let (info, base) = try? await client.resolve() else { return }
    self.info = info
    if base != client.base { client = HubClient(base: base) }
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

  /// Sign in with Google, in the system's login sheet (`authenticate` opens it and returns
  /// the address it ends on). The hub hands the login back as a one-time code, which only
  /// the verifier behind the challenge can use (PKCE).
  func loginWithGoogle(authenticate: (URL, String) async throws -> URL) async throws {
    try await webLogin("google", "Google", authenticate: authenticate)
  }

  func loginWithApple(authenticate: (URL, String) async throws -> URL) async throws {
    try await webLogin("apple", "Apple", authenticate: authenticate)
  }

  /// The hub's web login for a provider (/auth/<provider>) in the login sheet, handed to
  /// the app with a one-time code (see WebLogin)
  private func webLogin(_ provider: String, _ name: String, authenticate: (URL, String) async throws -> URL) async throws {
    let login = WebLogin()
    guard let url = client.url("/auth/\(provider)", query: ["mobile": login.challenge]) else { throw HubError.badURL }
    let callback = try await authenticate(url, WebLogin.callbackScheme)
    guard let code = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value else {
      throw HubError.server("The hub did not complete the login.")
    }
    try await client.exchangeLoginCode(code, verifier: login.verifier)
    guard let auth = try await client.verify() else { throw HubError.server("The \(name) login did not work.") }
    guard await start(auth) else { throw HubError.server("Could not open the session.") }
  }

  private func start(_ auth: AuthVerify.Auth) async -> Bool {
    guard let user = try? await client.currentUser(auth) else { return false }
    self.user = user
    let configuration = try? await client.configuration()
    namespace = configuration?.namespace
    offeredApps = info?.production == true ? configuration?.features?.apps : nil
    hasLiveKit = configuration?.features?.screenshare == "livekit"
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

  /// Change the signed-in user's name, color, or type, for everyone
  func updateProfile(_ fields: [String: String]) async throws {
    guard let id = user?.id, !fields.isEmpty else { return }
    if let updated = try await client.updateUser(id: id, fields) { user = updated }
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
