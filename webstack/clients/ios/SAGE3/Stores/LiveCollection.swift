/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Foundation
import Observation

/// A collection query kept up to date: loaded over HTTP, then followed on the websocket
@MainActor
@Observable
final class LiveCollection<T: Codable> {
  private(set) var items: [SBDoc<T>] = []
  private(set) var error: String?
  private(set) var loaded = false
  private var subscription: String?
  private weak var socket: HubSocket?

  /// load: the initial documents; route: the same query on the websocket, e.g. "/apps?boardId=<id>"
  func start(socket: HubSocket?, route: String, load: () async throws -> [SBDoc<T>]) async {
    stop()
    do {
      items = try await load()
      error = nil
    } catch {
      self.error = error.localizedDescription
    }
    loaded = true
    self.socket = socket
    subscription = socket?.subscribe(route) { [weak self] data in
      self?.apply(data)
    }
  }

  func stop() {
    if let subscription { socket?.unsubscribe(subscription) }
    subscription = nil
  }

  /// Change a document here before the hub confirms it (the next UPDATE event replaces it)
  func updateLocally(_ id: String, _ change: (inout SBDoc<T>) -> Void) {
    if let index = items.firstIndex(where: { $0.id == id }) { change(&items[index]) }
  }

  private func apply(_ data: Data) {
    guard let message = try? JSONDecoder().decode(SubscriptionMessage<T>.self, from: data) else { return }
    let docs = message.event.doc
    switch message.event.type {
    case "CREATE":
      let known = Set(items.map(\.id))
      items.append(contentsOf: docs.filter { !known.contains($0.id) })
    case "UPDATE":
      // The event carries the whole updated documents: replace them
      for doc in docs {
        if let index = items.firstIndex(where: { $0.id == doc.id }) { items[index] = doc } else { items.append(doc) }
      }
    case "DELETE":
      let gone = Set(docs.map(\.id))
      items.removeAll { gone.contains($0.id) }
    default:
      break
    }
  }
}

/// Assets looked up by id, shared by the image tiles of a board
@MainActor
@Observable
final class AssetCache {
  private var assets: [String: Asset] = [:]
  private var loading: Set<String> = []
  private let client: HubClient

  init(client: HubClient) {
    self.client = client
  }

  func asset(_ id: String) -> Asset? {
    if let asset = assets[id] { return asset }
    if !loading.contains(id) {
      loading.insert(id)
      Task {
        if let asset = try? await client.asset(id: id) { assets[id] = asset }
        loading.remove(id)
      }
    }
    return nil
  }
}
