/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

/// The saved hubs, with each one's name, version and online count from /api/info
struct HubListView: View {
  let hubs: HubList
  @State private var adding = false

  var body: some View {
    List {
      Section {
        ForEach(hubs.hubs) { hub in
          NavigationLink(value: hub) { HubRow(hub: hub) }
        }
        .onDelete { hubs.remove(at: $0) }
      } footer: {
        Text("Swipe left on a hub to remove it.")
      }
    }
    .navigationTitle("SAGE3 Hubs")
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Button { adding = true } label: { Label("Add Hub", systemImage: "plus") }
      }
      ToolbarItem(placement: .secondaryAction) {
        Button("Restore Default Hubs") { hubs.reset() }
      }
    }
    .sheet(isPresented: $adding) { AddHubSheet(hubs: hubs) }
  }
}

private struct HubRow: View {
  let hub: Hub
  @State private var info: ServerInfo?
  @State private var reachable: Bool?

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      HStack {
        Circle()
          .fill(reachable == nil ? Color.gray : reachable == true ? Color.green : Color.red)
          .frame(width: 8, height: 8)
        Text(hub.name).font(.headline)
      }
      Text(hub.url).font(.caption).foregroundStyle(.secondary)
      if let info {
        Text([info.version.map { "Version \($0)" }, info.onlineUsers.map { "\($0) online" }].compactMap { $0 }.joined(separator: " · "))
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .task {
      guard let url = URL(string: hub.url) else { return reachable = false }
      do {
        info = try await HubClient(base: url).info()
        reachable = info?.isSage3 ?? true
      } catch {
        reachable = false
      }
    }
  }
}

private struct AddHubSheet: View {
  let hubs: HubList
  @Environment(\.dismiss) private var dismiss
  @State private var name = ""
  @State private var url = ""

  var body: some View {
    NavigationStack {
      Form {
        TextField("Name", text: $name)
        TextField("Address, e.g. https://chicago.sage3.app", text: $url)
          .keyboardType(.URL)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
      }
      .navigationTitle("Add Hub")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button("Add") {
            hubs.add(name: name, url: url)
            dismiss()
          }
          .disabled(url.trimmingCharacters(in: .whitespaces).isEmpty)
        }
      }
    }
  }
}
