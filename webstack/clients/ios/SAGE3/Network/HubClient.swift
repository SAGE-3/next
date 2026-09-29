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
    try await resolve().info
  }

  /// The hub's information, and the address it actually answers on. A hub's public
  /// address can redirect to its server (https://chicago.sage3.app to
  /// https://sage3alpha.evl.uic.edu): logins, websockets, and cookies need the final one,
  /// since a redirected POST arrives as a GET and a websocket doesn't follow redirects.
  func resolve() async throws -> (info: ServerInfo, base: URL) {
    let (data, response) = try await send("GET", "/api/info")
    let info = try decoder.decode(ServerInfo.self, from: data)
    var base = self.base
    if let final = response.url, var components = URLComponents(url: final, resolvingAgainstBaseURL: false) {
      components.path = ""
      components.query = nil
      if let resolved = components.url { base = resolved }
    }
    return (info, base)
  }

  /// Sign in as a guest, as the web client does: the server makes a new guest account and
  /// sets the session cookie (the reply is a redirect to the home page, which is ignored)
  func loginAsGuest() async throws {
    let body = try encoder.encode(["username": "guest-username", "password": "guest-pass"])
    _ = try await send("POST", "/auth/guest", body: body)
  }

  /// Finish a web login run in the system's login sheet: trade its one-time code, and the
  /// verifier behind the challenge it started with, for this app's own session cookie
  /// (server: libs/sagebase/src/lib/modules/auth/SBMobileLogin.ts)
  func exchangeLoginCode(_ code: String, verifier: String) async throws {
    let body = try encoder.encode(["code": code, "verifier": verifier])
    let (data, http) = try await send("POST", "/auth/mobile/exchange", body: body)
    let reply = try? decoder.decode(APIReply<JSONValue>.self, from: data)
    guard http.statusCode == 200, reply?.success == true else {
      throw HubError.server(reply?.message ?? "The hub did not accept the login.")
    }
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

  /// The hub's clock (ms since 1970), for playing videos in step
  func serverEpoch() async throws -> Double {
    let (data, _) = try await send("GET", "/api/time")
    guard let epoch = try decoder.decode(JSONValue.self, from: data)["epoch"]?.number else { throw HubError.server("No time from the hub.") }
    return epoch
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

  func presence(boardId: String) async throws -> [Presence] { try await documents("GET", "/api/presence", query: ["boardId": boardId]) }

  /// A board's annotations (the document's id is the board's)
  func annotations(boardId: String) async throws -> SBDoc<AnnotationData>? {
    let docs: [SBDoc<AnnotationData>] = try await documents("GET", "/api/annotations/\(boardId)")
    return docs.first
  }

  /// Add shapes to a board's saved annotations, as the web whiteboard does for new
  /// strokes (the full list is only rewritten after an erase)
  func appendAnnotationLines(boardId: String, lines: [JSONValue]) async throws {
    let body = try encoder.encode(["lines": JSONValue.array(lines)])
    let (data, http) = try await send("POST", "/api/annotations/\(boardId)/lines", body: body)
    let reply = try? decoder.decode(APIReply<JSONValue>.self, from: data)
    guard http.statusCode == 200, reply?.success == true else { throw HubError.server(reply?.message ?? "Could not save the annotation.") }
  }

  func users() async throws -> [User] { try await documents("GET", "/api/users") }

  func assets(roomId: String) async throws -> [Asset] { try await documents("GET", "/api/assets", query: ["room": roomId]) }

  /// A file to upload
  struct Upload {
    var filename: String
    var mimetype: String
    var data: Data
  }

  /// Upload files to a room's assets, as the web client does (a multipart form with the
  /// files and the room). The hub processes them (image sizes, PDF pages, ...) before it
  /// answers with the new assets' ids.
  func upload(_ files: [Upload], roomId: String) async throws -> [String] {
    guard let url = url("/api/assets/upload") else { throw HubError.badURL }
    let boundary = "SAGE3-\(UUID().uuidString)"
    var body = Data()
    func field(_ name: String, filename: String? = nil, type: String? = nil, _ content: Data) {
      body.append(Data("--\(boundary)\r\n".utf8))
      var disposition = "Content-Disposition: form-data; name=\"\(name)\""
      if let filename { disposition += "; filename=\"\(filename.replacingOccurrences(of: "\"", with: "'"))\"" }
      body.append(Data((disposition + "\r\n").utf8))
      if let type { body.append(Data("Content-Type: \(type)\r\n".utf8)) }
      body.append(Data("\r\n".utf8))
      body.append(content)
      body.append(Data("\r\n".utf8))
    }
    field("room", Data(roomId.utf8))
    for file in files { field("files", filename: file.filename, type: file.mimetype, file.data) }
    body.append(Data("--\(boundary)--\r\n".utf8))

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    request.setValue(roomId, forHTTPHeaderField: "x-sage3-room")
    request.timeoutInterval = 600
    let (data, response) = try await session.upload(for: request, from: body)
    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    if status == 401 || status == 403 { throw HubError.forbidden }
    guard status == 200, let ids = try? decoder.decode([String].self, from: data) else {
      throw HubError.server(String(data: data, encoding: .utf8).flatMap { $0.isEmpty ? nil : $0 } ?? "The upload failed.")
    }
    return ids
  }

  /// Download an asset's file to a temporary file named like the original
  func download(_ asset: Asset) async throws -> URL {
    guard let url = url("/api/assets/static/\(asset.data.file)") else { throw HubError.badURL }
    let (temporary, response) = try await session.download(from: url)
    guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw HubError.server("The download failed.") }
    let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let name = (asset.data.originalfilename ?? asset.data.file).replacingOccurrences(of: "/", with: "-")
    let destination = folder.appendingPathComponent(name)
    try FileManager.default.moveItem(at: temporary, to: destination)
    return destination
  }

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
