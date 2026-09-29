/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Foundation

enum HubError: LocalizedError {
  case badURL
  case notSignedIn
  case forbidden
  case server(String)

  var errorDescription: String? {
    switch self {
    case .badURL: return "The hub address is not valid."
    case .notSignedIn: return "You are not signed in to this hub."
    case .forbidden: return "You are not allowed to do this."
    case .server(let message): return message
    }
  }
}

/// HTTP access to one hub (a SAGE3 server). The session cookie set by the login is kept
/// in the shared cookie storage, so every request to the hub, image loads included,
/// sends it.
final class HubClient {
  let base: URL
  private let session = URLSession.shared
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()

  init(base: URL) {
    self.base = base
  }

  /// Full URL of a path on the hub ("/api/rooms", or a relative asset URL)
  func url(_ path: String, query: [String: String] = [:]) -> URL? {
    guard var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return nil }
    let prefix = components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path
    components.path = prefix + (path.hasPrefix("/") ? path : "/" + path)
    if !query.isEmpty {
      components.queryItems = query.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }
    }
    return components.url
  }

  private func send(_ method: String, _ path: String, query: [String: String] = [:], body: Data? = nil) async throws -> (Data, HTTPURLResponse) {
    guard let url = url(path, query: query) else { throw HubError.badURL }
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let body {
      request.httpBody = body
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    }
    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse else { throw HubError.server("No response from the hub.") }
    if http.statusCode == 401 { throw HubError.notSignedIn }
    if http.statusCode == 403 { throw HubError.forbidden }
    return (data, http)
  }

  /// A REST call returning documents: { success, data: [doc] }
  private func documents<T: Codable>(_ method: String, _ path: String, query: [String: String] = [:], body: Data? = nil) async throws -> [SBDoc<T>] {
    let (data, _) = try await send(method, path, query: query, body: body)
    let reply = try decoder.decode(APIReply<[SBDoc<T>]>.self, from: data)
    guard reply.success else { throw HubError.server(reply.message ?? "The hub refused the request.") }
    return reply.data ?? []
  }

  // MARK: Hub and login

  /// Public information about the hub (name, version, login methods), no login needed
  func info() async throws -> ServerInfo {
    let (data, _) = try await send("GET", "/api/info")
    return try decoder.decode(ServerInfo.self, from: data)
  }

  /// Sign in as a guest, as the web client does: the server makes a new guest account and
  /// sets the session cookie (the reply is a redirect to the home page, which is ignored)
  func loginAsGuest() async throws {
    let body = try encoder.encode(["username": "guest-username", "password": "guest-pass"])
    _ = try await send("POST", "/auth/guest", body: body)
  }

  /// The signed-in account, or nil when the session is missing or expired
  func verify() async throws -> AuthVerify.Auth? {
    do {
      let (data, _) = try await send("GET", "/auth/verify")
      let reply = try decoder.decode(AuthVerify.self, from: data)
      return reply.success ? reply.auth : nil
    } catch HubError.notSignedIn {
      return nil
    }
  }

  /// The user of the signed-in account. A guest has none at first: create it the way the
  /// web client does (libs/frontend/src/lib/providers/useUser.tsx)
  func currentUser(_ auth: AuthVerify.Auth) async throws -> User {
    // A missing user comes back as { success: false }: treat it as none yet
    let users: [User] = (try? await documents("GET", "/api/users/\(auth.id)")) ?? []
    if let user = users.first { return user }
    guard auth.provider == "guest" else { throw HubError.server("This account has no SAGE3 user yet: sign in once on the web first.") }
    let newUser = UserData(
      name: "Guest #\(auth.id.prefix(6))", email: "", color: "blue", profilePicture: "",
      userType: "client", userRole: "guest", savedBoards: [], recentBoards: [])
    let created: [User] = try await documents("POST", "/api/users/create", body: try encoder.encode(newUser))
    guard let user = created.first else { throw HubError.server("The hub did not create the guest user.") }
    return user
  }

  func configuration() async throws -> ServerConfiguration {
    let (data, _) = try await send("GET", "/api/configuration")
    return try decoder.decode(ServerConfiguration.self, from: data)
  }

  func logout() async {
    _ = try? await send("GET", "/auth/logout")
    if let cookies = HTTPCookieStorage.shared.cookies(for: base) {
      cookies.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
    }
  }

  // MARK: Collections

  func rooms() async throws -> [Room] { try await documents("GET", "/api/rooms") }

  func boards(roomId: String) async throws -> [Board] { try await documents("GET", "/api/boards", query: ["roomId": roomId]) }

  func apps(boardId: String) async throws -> [SageApp] { try await documents("GET", "/api/apps", query: ["boardId": boardId]) }

  func asset(id: String) async throws -> Asset? {
    let assets: [Asset] = try await documents("GET", "/api/assets/\(id)")
    return assets.first
  }

  func createRoom(_ room: RoomData) async throws -> Room? {
    let rooms: [Room] = try await documents("POST", "/api/rooms", body: try encoder.encode(room))
    return rooms.first
  }

  func createBoard(_ board: BoardData) async throws -> Board? {
    let boards: [Board] = try await documents("POST", "/api/boards", body: try encoder.encode(board))
    return boards.first
  }
}
