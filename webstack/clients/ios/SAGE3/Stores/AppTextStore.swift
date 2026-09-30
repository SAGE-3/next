/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */


import Foundation
import Observation

/// The live text of a board's apps (Stickies), as the web keeps it: a Y.Text per app,
/// named by its id, in the board's Yjs room "apps-<boardId>" on the hub's /yjs. We are in
/// the room's awareness like a web client (name, color, uid): the web Stickie takes a
/// text save from someone not there for a Python update.
@MainActor
@Observable
final class AppTextStore {
  /// Synced with the room: texts are live
  private(set) var live = false
  /// Bumped when a text changed (read by the views showing texts)
  private(set) var version = 0
  @ObservationIgnored private var client: HubClient?
  @ObservationIgnored private var boardId = ""
  @ObservationIgnored private var me: (name: String, color: String, uid: String)?
  @ObservationIgnored private var engine: YjsEngine?
  @ObservationIgnored private var room: URLSessionWebSocketTask?
  @ObservationIgnored private var closed = false
  @ObservationIgnored private var retryDelay: TimeInterval = 1
  @ObservationIgnored private var bump: DispatchWorkItem?
  @ObservationIgnored private var renewal: Timer?

  func start(client: HubClient, boardId: String, user: User?) {
    stop()
    closed = false
    self.client = client
    self.boardId = boardId
    if let user { me = (user.data.name, user.data.color, user.id) }
    connectRoom()
    // y-protocols forgets a client after 30 s without news
    renewal = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
      Task { @MainActor in
        guard let self, let message = self.engine?.renew() else { return }
        self.room?.send(.data(message)) { _ in }
      }
    }
  }

  func stop() {
    closed = true
    renewal?.invalidate()
    renewal = nil
    // Leave the awareness, then close
    if let room, let message = engine?.leave() {
      room.send(.data(message)) { _ in room.cancel(with: .normalClosure, reason: nil) }
    } else {
      room?.cancel(with: .normalClosure, reason: nil)
    }
    room = nil
    engine = nil
    live = false
  }

  /// An app's live text; nil when not live, or when it's empty in the room (the saved
  /// text then stands, as the web's first client loads it into the room)
  func text(_ id: String) -> String? {
    guard live, let text = engine?.text(id), !text.isEmpty else { return nil }
    return text
  }

  /// An app's text in the room as it is, even empty ("" when not live)
  func current(_ id: String) -> String {
    live ? engine?.text(id) ?? "" : ""
  }

  /// Start editing an app's text: alone in the room, the saved text is the truth, and
  /// goes into the room (as the web Stickie does when it's the only one there)
  func beginEditing(_ id: String, saved: String) -> String {
    guard live, let engine else { return saved }
    if engine.peers == 0 { engine.setText(id, saved) }
    return engine.text(id)
  }

  /// Our change to an app's text, for everyone in the room
  func edit(_ id: String, _ value: String) {
    guard live else { return }
    engine?.setText(id, value)
  }

  // MARK: The Yjs room

  private func connectRoom() {
    // A reconnection keeps the document (and our awareness clock); the sync merges
    guard !closed, let client, let engine = engine ?? YjsEngine() else { return }
    self.engine = engine
    guard var components = URLComponents(url: client.base, resolvingAgainstBaseURL: false) else { return }
    components.scheme = components.scheme == "https" ? "wss" : "ws"
    components.path = "/yjs/apps-\(boardId)"
    guard let url = components.url else { return }
    var request = URLRequest(url: url)
    // The login's session cookie (stored for the http(s) address)
    let cookies = HTTPCookieStorage.shared.cookies(for: client.base) ?? []
    HTTPCookie.requestHeaderFields(with: cookies).forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
    let task = URLSession.shared.webSocketTask(with: request)
    room = task
    engine.onSend = { [weak task] data in task?.send(.data(data)) { _ in } }
    engine.onChange = { [weak self] in self?.scheduleBump() }
    task.resume()
    task.send(.data(engine.start())) { _ in }
    if let me, let hello = engine.announce(name: me.name, color: me.color, uid: me.uid) { task.send(.data(hello)) { _ in } }
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
      live = true
      scheduleBump()
    }
  }

  /// Tell the views, at most every 50 ms (changes arrive in bursts, one per keystroke)
  private func scheduleBump() {
    guard live, bump == nil else { return }
    let work = DispatchWorkItem { [weak self] in
      guard let self else { return }
      self.bump = nil
      self.version += 1
    }
    bump = work
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
