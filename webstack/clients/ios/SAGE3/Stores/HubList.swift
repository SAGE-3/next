/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Foundation
import Observation

/// A hub the user can connect to
struct Hub: Codable, Identifiable, Hashable {
  var id = UUID()
  var name: String
  var url: String
}

/// The saved hubs (UserDefaults), starting with the Electron client's default list
/// (clients/electron/src/bookmarkstore.js) and, in debug builds, the local dev server
@Observable
final class HubList {
  private static let key = "sage3.hubs"

  static let defaults: [Hub] = {
    var hubs = [
      Hub(name: "Chicago", url: "https://chicago.sage3.app"),
      Hub(name: "Chicago Development", url: "https://mini.sage3.app"),
      Hub(name: "Hawaii", url: "https://manoa.sage3.app"),
      Hub(name: "Hawaii Development", url: "https://pele.sage3.app"),
      Hub(name: "Virginia Tech", url: "https://sage3.cs.vt.edu"),
    ]
    #if DEBUG
      hubs.insert(Hub(name: "Local development", url: "http://localhost:4200"), at: 0)
    #endif
    return hubs
  }()

  var hubs: [Hub] {
    didSet { save() }
  }

  init() {
    if let data = UserDefaults.standard.data(forKey: Self.key), let saved = try? JSONDecoder().decode([Hub].self, from: data) {
      hubs = saved
    } else {
      hubs = Self.defaults
    }
  }

  func add(name: String, url: String) {
    var address = url.trimmingCharacters(in: .whitespaces)
    if !address.contains("://") { address = "https://" + address }
    while address.hasSuffix("/") { address.removeLast() }
    hubs.append(Hub(name: name.isEmpty ? address : name, url: address))
  }

  func remove(at offsets: IndexSet) {
    for index in offsets.sorted(by: >) { hubs.remove(at: index) }
  }

  func reset() {
    hubs = Self.defaults
  }

  private func save() {
    if let data = try? JSONEncoder().encode(hubs) {
      UserDefaults.standard.set(data, forKey: Self.key)
    }
  }
}
