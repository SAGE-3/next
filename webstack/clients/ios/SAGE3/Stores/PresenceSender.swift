/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Foundation

/// This user's presence on the board, as the web client sends it (PresenceComponent.tsx):
/// the board on entering and leaving, and the cursor (here, the last touch) and the view,
/// at most 7 times a second. The hub marks the user online and offline with the websocket.
@MainActor
final class PresenceSender {
  private weak var socket: HubSocket?
  private let userId: String
  private var pending: [String: JSONValue] = [:]
  private var lastSent = Date.distantPast
  private var scheduled = false
  private static let interval: TimeInterval = 1.0 / 7

  init(socket: HubSocket?, userId: String) {
    self.socket = socket
    self.userId = userId
  }

  func enter(roomId: String, boardId: String) {
    send(["roomId": .string(roomId), "boardId": .string(boardId), "following": .string("")])
  }

  func leave() {
    pending = [:]
    send(["roomId": .string(""), "boardId": .string(""), "following": .string("")])
  }

  /// A board point
  func cursor(_ point: CGPoint) {
    queue(["cursor": .object(["x": .number(point.x.rounded()), "y": .number(point.y.rounded()), "z": .number(0)])])
  }

  /// The visible part of the board, in board coordinates
  func viewport(_ rect: CGRect) {
    queue(["viewport": .object([
      "position": .object(["x": .number(rect.minX.rounded()), "y": .number(rect.minY.rounded()), "z": .number(0)]),
      "size": .object(["width": .number(rect.width.rounded()), "height": .number(rect.height.rounded()), "depth": .number(0)]),
      "selfUpdate": .bool(true),
    ])])
  }

  private func queue(_ fields: [String: JSONValue]) {
    pending.merge(fields) { _, new in new }
    let wait = Self.interval - Date().timeIntervalSince(lastSent)
    if wait <= 0 {
      flush()
    } else if !scheduled {
      scheduled = true
      DispatchQueue.main.asyncAfter(deadline: .now() + wait) { [weak self] in
        self?.scheduled = false
        self?.flush()
      }
    }
  }

  private func flush() {
    guard !pending.isEmpty else { return }
    send(pending)
    pending = [:]
  }

  private func send(_ fields: [String: JSONValue]) {
    lastSent = Date()
    var body = fields
    body["status"] = .string("online")
    let route = "/presence/\(userId)"
    Task { _ = try? await socket?.request(route, method: "PUT", body: .object(body)) }
  }
}
