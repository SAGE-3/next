/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */


import SwiftUI

/// This device's board preferences, like the web's user settings (kept per browser there)
enum BoardPreferences {
  static let showCursors = "sage3.showCursors"
  static let showViewports = "sage3.showViewports"
  static let showAppTitles = "sage3.showAppTitles"
  static let showGrid = "sage3.showGrid"
  /// Zoom to each app you create, and select it (the web's zoomToNewApps; on by default here,
  /// where apps are small on a phone's screen)
  static let zoomToNewApps = "sage3.zoomToNewApps"
}

/// The signed-in user's profile (on the hub, as the web's Edit Account: name, color, type)
/// and this device's preferences (appearance, what the board shows)
struct SettingsSheet: View {
  let session: Session
  @Environment(\.dismiss) private var dismiss
  @State private var name = ""
  @State private var color = ""
  @State private var userType = "client"
  @State private var saving = false
  @State private var error: String?
  @State private var appearance = Appearance.saved
  @State private var confirmingDeletion = false
  @State private var deleting = false
  @AppStorage(BoardPreferences.showCursors) private var showCursors = true
  @AppStorage(BoardPreferences.showViewports) private var showViewports = true
  @AppStorage(BoardPreferences.showAppTitles) private var showAppTitles = false
  @AppStorage(BoardPreferences.showGrid) private var showGrid = true
  @AppStorage(BoardPreferences.zoomToNewApps) private var zoomToNewApps = true

  /// The web's limit on names
  private static let nameMax = 50

  private var user: User? { session.user }
  private var trimmedName: String { String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(Self.nameMax)) }
  private var changes: [String: String] {
    guard let user else { return [:] }
    var fields: [String: String] = [:]
    if !trimmedName.isEmpty && trimmedName != user.data.name { fields["name"] = trimmedName }
    if color != user.data.color { fields["color"] = color }
    if userType != user.data.userType { fields["userType"] = userType }
    return fields
  }

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("Name", text: $name)
            .textContentType(.name)
            .onChange(of: name) { _, value in if value.count > Self.nameMax { name = String(value.prefix(Self.nameMax)) } }
          LabeledContent("Color") {
            HStack(spacing: 6) {
              ForEach(SageColor.names, id: \.self) { option in
                Circle()
                  .fill(SageColor.person(option))
                  .frame(width: 24, height: 24)
                  .overlay(Circle().strokeBorder(.primary, lineWidth: option == color ? 2 : 0))
                  .onTapGesture { color = option }
                  .accessibilityLabel(option.capitalized)
                  .accessibilityAddTraits(option == color ? .isSelected : [])
              }
            }
          }
          Picker("Type", selection: $userType) {
            Text("Client").tag("client")
            Text("Wall").tag("wall")
          }
          if let user {
            LabeledContent("Role", value: user.data.userRole.capitalized)
            if !user.data.email.isEmpty { LabeledContent("Email", value: user.data.email) }
          }
        } header: {
          Text("Profile")
        } footer: {
          Text(error ?? "Everyone sees your name and color on your cursor. A wall also shows its view to others.")
            .foregroundStyle(error == nil ? Color.secondary : Color.red)
        }

        Section {
          Picker("Appearance", selection: $appearance) {
            Text("System").tag("")
            Text("Light").tag("light")
            Text("Dark").tag("dark")
          }
          .onChange(of: appearance) { _, value in Appearance.set(value) }
          Toggle("Others' Cursors", isOn: $showCursors)
          Toggle("Walls' Views", isOn: $showViewports)
          Toggle("App Titles", isOn: $showAppTitles)
          Toggle("Grid", isOn: $showGrid)
          Toggle("Zoom to New Apps", isOn: $zoomToNewApps)
        } header: {
          Text("This Device")
        } footer: {
          Text("Zoom to New Apps: the board zooms to each app you add, and selects it.")
        }

        Section {
          if let version = session.info?.version {
            LabeledContent("Hub", value: session.info?.serverName ?? session.hub.name)
            LabeledContent("SAGE3", value: version)
          }
          NavigationLink("Acknowledgements") { AcknowledgementsView() }
          // A hub account (not a guest's) can be deleted from here, as on the web
          if user?.data.email.isEmpty == false {
            Button("Delete Account…", role: .destructive) { confirmingDeletion = true }
              .disabled(deleting)
          }
        } header: {
          Text("Account")
        }
      }
      .navigationTitle("Settings")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          if saving {
            ProgressView()
          } else {
            Button("Done") { Task { await save() } }
          }
        }
      }
      .confirmationDialog("Delete your account on \(session.info?.serverName ?? session.hub.name)?", isPresented: $confirmingDeletion, titleVisibility: .visible) {
        Button("Delete Account", role: .destructive) { Task { await deleteAccount(allData: false) } }
        Button("Delete Account and All My Data", role: .destructive) { Task { await deleteAccount(allData: true) } }
        Button("Cancel", role: .cancel) {}
      } message: {
        Text("This can't be undone. Your rooms, boards and files go to the hub's administrator, unless you also delete all your data.")
      }
      .onAppear {
        name = user?.data.name ?? ""
        color = user?.data.color ?? ""
        userType = user?.data.userType ?? "client"
      }
    }
  }

  private func deleteAccount(allData: Bool) async {
    deleting = true
    defer { deleting = false }
    do {
      try await session.deleteAccount(deleteAllData: allData)
      dismiss()
    } catch {
      self.error = "Could not delete the account: \(error.localizedDescription)"
    }
  }

  /// Save the profile's changes, if any, then close
  private func save() async {
    guard !changes.isEmpty else { return dismiss() }
    saving = true
    defer { saving = false }
    do {
      try await session.updateProfile(changes)
      dismiss()
    } catch {
      self.error = "Could not save: \(error.localizedDescription)"
    }
  }
}

/// The open source software in the app, and its licenses (Resources/Acknowledgements.txt)
private struct AcknowledgementsView: View {
  private var text: String {
    guard let url = Bundle.main.url(forResource: "Acknowledgements", withExtension: "txt"), let text = try? String(contentsOf: url, encoding: .utf8) else { return "" }
    return text
  }

  var body: some View {
    ScrollView {
      Text(text)
        .font(.system(.footnote, design: .monospaced))
        .textSelection(.enabled)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
    }
    .navigationTitle("Acknowledgements")
    .navigationBarTitleDisplayMode(.inline)
  }
}
