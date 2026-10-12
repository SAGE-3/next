/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import CoreGraphics
import Foundation
import Observation

/// One shape of the whiteboard, in board coordinates
struct AnnotationShape: Identifiable {
  enum Kind { case line, rectangle, circle, arrow, doubleArrow }

  let id: String
  let kind: Kind
  let points: [CGPoint]
  let color: String?
  let alpha: CGFloat
  let size: CGFloat
  /// Where it is, grown by its width, to skip shapes off screen
  let bounds: CGRect

  init?(_ json: JSONValue) {
    guard let flat = json["points"]?.array?.compactMap(\.number), flat.count >= 2 else { return nil }
    var points: [CGPoint] = []
    points.reserveCapacity(flat.count / 2)
    var index = 0
    while index + 1 < flat.count {
      points.append(CGPoint(x: flat[index], y: flat[index + 1]))
      index += 2
    }
    switch json["type"]?.string ?? "line" {
    case "rectangle": kind = .rectangle
    case "circle": kind = .circle
    case "arrow": kind = .arrow
    case "doubleArrow": kind = .doubleArrow
    default: kind = .line
    }
    self.points = points
    id = json["id"]?.string ?? UUID().uuidString
    color = json["userColor"]?.string
    // The web whiteboard's defaults when a shape doesn't say
    alpha = CGFloat(json["alpha"]?.number ?? 0.6)
    size = CGFloat(json["size"]?.number ?? 5)
    let xs = points.map(\.x), ys = points.map(\.y)
    // Arrowheads reach 2.5 widths past their end points
    let pad = size * 3
    bounds = CGRect(x: xs.min()! - pad, y: ys.min()! - pad, width: xs.max()! - xs.min()! + 2 * pad, height: ys.max()! - ys.min()! + 2 * pad)
  }

  /// How far a board point is from the shape's outline (for the eraser)
  func distance(to point: CGPoint) -> CGFloat {
    switch kind {
    case .rectangle:
      let xs = points.map(\.x), ys = points.map(\.y)
      let box = CGRect(x: xs.min()!, y: ys.min()!, width: xs.max()! - xs.min()!, height: ys.max()! - ys.min()!)
      let corners = [CGPoint(x: box.minX, y: box.minY), CGPoint(x: box.maxX, y: box.minY), CGPoint(x: box.maxX, y: box.maxY), CGPoint(x: box.minX, y: box.maxY)]
      return (0..<4).map { sqrt(Simplify.segmentDistanceSquared(point, corners[$0], corners[($0 + 1) % 4])) }.min()!
    default:
      guard points.count > 1 else { return hypot(point.x - points[0].x, point.y - points[0].y) }
      return (1..<points.count).map { sqrt(Simplify.segmentDistanceSquared(point, points[$0 - 1], points[$0])) }.min()!
    }
  }
}

/// A board's annotations, shared live like the web whiteboard shares them: the web's own
/// Yjs (YjsEngine) in the board's room, "annotations-<boardId>" on the hub's /yjs
/// websocket. The saved copy (the annotations document) is shown until the room is
/// synced, loaded into the room when it's empty (as the web whiteboard does when alone),
/// and kept up to date the web's way: new strokes appended, the whole list rewritten after
/// an erase. Without a room (no connection), the saved copy is read again every few
/// seconds.
@MainActor
@Observable
final class AnnotationStore {
  private(set) var shapes: [AnnotationShape] = []
  /// Strokes come live from the room (else from the saved copy)
  private(set) var live = false

  @ObservationIgnored private var client: HubClient?
  @ObservationIgnored private weak var socket: HubSocket?
  @ObservationIgnored private var boardId = ""
  @ObservationIgnored private var saved: [JSONValue] = []
  @ObservationIgnored private var lastData: Data?
  @ObservationIgnored private var subscription: String?
  @ObservationIgnored private var poll: Task<Void, Never>?
  // The Yjs room
  @ObservationIgnored private var engine: YjsEngine?
  @ObservationIgnored private var room: URLSessionWebSocketTask?
  @ObservationIgnored private var closed = false
  @ObservationIgnored private var retryDelay: TimeInterval = 1
  @ObservationIgnored private var redraw: DispatchWorkItem?
  // New strokes waiting to be appended to the saved copy (the web's 1.5 s debounce)
  @ObservationIgnored private var pendingAppends: [JSONValue] = []
  @ObservationIgnored private var appendTimer: DispatchWorkItem?

  /// How often the saved copy is read again, without a room
  private static let refresh: Duration = .seconds(5)
  /// The web whiteboard's save debounce
  private static let saveDelay: TimeInterval = 1.5

  func start(client: HubClient, socket: HubSocket?, boardId: String) async {
    stop()
    closed = false
    self.client = client
    self.socket = socket
    self.boardId = boardId
    await reload()
    // The web's full saves, while not live
    subscription = socket?.subscribe("/annotations/\(boardId)") { [weak self] data in
      guard let self, !self.live, let message = try? JSONDecoder().decode(SubscriptionMessage<AnnotationData>.self, from: data) else { return }
      self.showSaved(message.event.doc.first?.data.whiteboardLines ?? [])
    }
    connectRoom()
    poll = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(for: Self.refresh)
        guard !Task.isCancelled, let self else { return }
        if !self.live { await self.reload() }
      }
    }
  }

  func stop() {
    closed = true
    flushAppends()
    poll?.cancel()
    poll = nil
    if let subscription { socket?.unsubscribe(subscription) }
    subscription = nil
    room?.cancel(with: .normalClosure, reason: nil)
    room = nil
    engine = nil
    live = false
  }

  // MARK: Editing

  /// Add a shape (the web whiteboard's format) for everyone
  func add(_ shape: JSONValue) {
    guard let engine, live, let stored = engine.add(shape) else { return }
    pendingAppends.append(stored)
    appendTimer?.cancel()
    let work = DispatchWorkItem { [weak self] in self?.flushAppends() }
    appendTimer = work
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.saveDelay, execute: work)
  }

  /// Erase a shape for everyone, then rewrite the saved list (the web's full save)
  func remove(id: String) {
    guard let engine, live, engine.remove(id: id) else { return }
    pendingAppends = []
    appendTimer?.cancel()
    let all = engine.lines()
    Task { _ = try? await socket?.request("/annotations/\(boardId)", method: "PUT", body: .object(["whiteboardLines": .array(all)])) }
  }

  private func flushAppends() {
    appendTimer?.cancel()
    guard !pendingAppends.isEmpty, let client else { return }
    let lines = pendingAppends
    pendingAppends = []
    let board = boardId
    Task {
      do {
        try await client.appendAnnotationLines(boardId: board, lines: lines)
      } catch {
        // As the web whiteboard does when an append fails: rewrite the whole list
        if let all = engine?.lines() {
          _ = try? await socket?.request("/annotations/\(board)", method: "PUT", body: .object(["whiteboardLines": .array(all)]))
        }
      }
    }
  }

  // MARK: The saved copy

  private func reload() async {
    guard let client, let doc = try? await client.annotations(boardId: boardId) else { return }
    saved = doc.data.whiteboardLines ?? []
    if !live { showSaved(saved) }
  }

  private func showSaved(_ lines: [JSONValue]) {
    saved = lines
    show(lines)
  }

  private func show(_ lines: [JSONValue]) {
    // Parse again only when something changed
    let encoded = try? JSONEncoder().encode(lines)
    guard encoded != lastData else { return }
    lastData = encoded
    shapes = lines.compactMap(AnnotationShape.init)
  }

  // MARK: The Yjs room

  private func connectRoom() {
    guard !closed, let client, let engine = engine ?? YjsEngine() else { return }
    self.engine = engine
    guard var components = URLComponents(url: client.base, resolvingAgainstBaseURL: false) else { return }
    components.scheme = components.scheme == "https" ? "wss" : "ws"
    components.path = "/yjs/annotations-\(boardId)"
    guard let url = components.url else { return }
    var request = URLRequest(url: url)
    // The login's session cookie (stored for the http(s) address)
    let cookies = HTTPCookieStorage.shared.cookies(for: client.base) ?? []
    HTTPCookie.requestHeaderFields(with: cookies).forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
    let task = URLSession.shared.webSocketTask(with: request)
    room = task
    engine.onSend = { [weak task] data in task?.send(.data(data)) { _ in } }
    engine.onChange = { [weak self] in self?.scheduleRedraw() }
    task.resume()
    task.send(.data(engine.start())) { _ in }
    receive(on: task)
  }

  private func receive(on task: URLSessionWebSocketTask) {
    task.receive { [weak self] result in
      Task { @MainActor in
        guard let self, self.room === task else { return }
        switch result {
        case .success(let message):
          if case .data(let data) = message { self.handle(data, on: task) }
          self.retryDelay = 1
          self.receive(on: task)
        case .failure:
          self.reconnectLater()
        }
      }
    }
  }

  private func handle(_ data: Data, on task: URLSessionWebSocketTask) {
    guard let engine else { return }
    if let reply = engine.receive(data) { task.send(.data(reply)) { _ in } }
    if !live, engine.isSynced {
      // Synced: an empty room gets the saved strokes, as the web whiteboard does when
      // it is alone; from now on, the room is the truth
      if engine.lines().isEmpty, !saved.isEmpty { engine.hydrate(saved) }
      live = true
      scheduleRedraw()
    }
  }

  /// Redraw from the room, at most every 50 ms (changes arrive in bursts)
  private func scheduleRedraw() {
    guard live, redraw == nil else { return }
    let work = DispatchWorkItem { [weak self] in
      guard let self else { return }
      self.redraw = nil
      if let lines = self.engine?.lines() { self.show(lines) }
    }
    redraw = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05, execute: work)
  }

  private func reconnectLater() {
    guard !closed else { return }
    room = nil
    live = false
    let delay = retryDelay
    retryDelay = min(retryDelay * 2, 30)
    DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in self?.connectRoom() }
  }
}
