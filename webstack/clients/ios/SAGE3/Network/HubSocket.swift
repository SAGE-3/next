/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Foundation

/// The hub's websocket (/api): request/reply calls and live subscriptions to collections,
/// with the same messages as the web client (libs/frontend/src/lib/api/ws/api-socket.ts).
///   send:      { id, route: "/api/apps?boardId=...", method: "GET" | "POST" | "PUT" | "DELETE" | "SUB" | "UNSUB", body? }
///   reply:     { id, success, data | message }
///   changes:   { id: <subscription id>, event: { type: CREATE | UPDATE | DELETE, col, doc: [docs] } }
/// The login's session cookie authenticates the connection. It reconnects on its own and
/// then subscribes again.
@MainActor
final class HubSocket {
  private let url: URL
  private let cookieURL: URL
  private var task: URLSessionWebSocketTask?
  private var pingTimer: Timer?
  private var pending: [String: CheckedContinuation<Data, Error>] = [:]
  // Subscription id -> route, and the handler receiving each change message (raw JSON)
  private var subscriptions: [String: (route: String, handler: (Data) -> Void)] = [:]
  private var closed = false
  private var retryDelay: TimeInterval = 1

  init?(base: URL) {
    guard var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return nil }
    components.scheme = components.scheme == "https" ? "wss" : "ws"
    components.path = "/api"
    guard let url = components.url else { return nil }
    self.url = url
    self.cookieURL = base
  }

  func connect() {
    closed = false
    var request = URLRequest(url: url)
    // Cookies are stored for the http(s) address: add them to the ws(s) upgrade
    let cookies = HTTPCookieStorage.shared.cookies(for: cookieURL) ?? []
    HTTPCookie.requestHeaderFields(with: cookies).forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
    let task = URLSession.shared.webSocketTask(with: request)
    self.task = task
    task.resume()
    receive(on: task)
    // Keep idle connections open through proxies
    pingTimer?.invalidate()
    pingTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
      Task { @MainActor in self?.task?.sendPing { _ in } }
    }
    // Subscribe again after a reconnection
    for (id, subscription) in subscriptions {
      write(["id": id, "route": subscription.route, "method": "SUB"])
    }
  }

  func close() {
    closed = true
    pingTimer?.invalidate()
    task?.cancel(with: .normalClosure, reason: nil)
    task = nil
    pending.values.forEach { $0.resume(throwing: HubError.server("Disconnected.")) }
    pending = [:]
    subscriptions = [:]
  }

  /// Subscribe to changes of a collection query, e.g. "/apps?boardId=<id>". Returns the
  /// subscription id, for unsubscribe.
  func subscribe(_ route: String, handler: @escaping (Data) -> Void) -> String {
    let id = UUID().uuidString.lowercased()
    subscriptions[id] = ("/api" + route, handler)
    write(["id": id, "route": "/api" + route, "method": "SUB"])
    return id
  }

  func unsubscribe(_ id: String) {
    guard let subscription = subscriptions.removeValue(forKey: id) else { return }
    // The server finds the subscription from its collection: "/api/<collection>"
    let collection = subscription.route.split(separator: "/").dropFirst().first.map { $0.split(separator: "?")[0] } ?? ""
    write(["id": id, "route": "/api/\(collection)", "method": "UNSUB"])
  }

  /// A request/reply call, e.g. ("/apps/<id>", "PUT"); returns the raw reply
  func request(_ route: String, method: String, body: JSONValue? = nil) async throws -> Data {
    let id = UUID().uuidString.lowercased()
    return try await withCheckedThrowingContinuation { continuation in
      pending[id] = continuation
      var message: [String: JSONValue] = ["id": .string(id), "route": .string("/api" + route), "method": .string(method)]
      if let body { message["body"] = body }
      write(message)
    }
  }

  private func write(_ message: [String: String]) {
    write(message.mapValues { JSONValue.string($0) })
  }

  private func write(_ message: [String: JSONValue]) {
    guard let task, let data = try? JSONEncoder().encode(message), let text = String(data: data, encoding: .utf8) else { return }
    task.send(.string(text)) { _ in }
  }

  private func receive(on task: URLSessionWebSocketTask) {
    task.receive { [weak self] result in
      Task { @MainActor in
        guard let self, self.task === task else { return }
        switch result {
        case .success(let message):
          switch message {
          case .string(let text): self.dispatch(Data(text.utf8))
          case .data(let data): self.dispatch(data)
          @unknown default: break
          }
          self.retryDelay = 1
          self.receive(on: task)
        case .failure:
          self.reconnectLater()
        }
      }
    }
  }

  private func dispatch(_ data: Data) {
    struct Envelope: Decodable {
      var id: String
      var event: JSONValue?
    }
    guard let envelope = try? JSONDecoder().decode(Envelope.self, from: data) else { return }
    if envelope.event != nil {
      subscriptions[envelope.id]?.handler(data)
    } else if let continuation = pending.removeValue(forKey: envelope.id) {
      continuation.resume(returning: data)
    }
  }

  private func reconnectLater() {
    guard !closed else { return }
    pending.values.forEach { $0.resume(throwing: HubError.server("Disconnected.")) }
    pending = [:]
    task = nil
    let delay = retryDelay
    retryDelay = min(retryDelay * 2, 30)
    DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
      guard let self, !self.closed else { return }
      self.connect()
    }
  }
}
