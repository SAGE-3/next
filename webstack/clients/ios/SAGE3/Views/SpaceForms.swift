/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

extension View {
  /// Ask for the PIN of a private room or board, and call `onOpen` when it matches
  func pinPrompt<T: Codable>(item: Binding<SBDoc<T>?>, session: Session, hashed: @escaping (SBDoc<T>) -> String?, onOpen: @escaping (SBDoc<T>) -> Void) -> some View {
    modifier(PinPrompt(item: item, session: session, hashed: hashed, onOpen: onOpen))
  }
}

private struct PinPrompt<T: Codable>: ViewModifier {
  @Binding var item: SBDoc<T>?
  let session: Session
  let hashed: (SBDoc<T>) -> String?
  let onOpen: (SBDoc<T>) -> Void
  @State private var pin = ""
  @State private var wrong = false

  func body(content: Content) -> some View {
    content
      .alert("Enter the PIN", isPresented: Binding(get: { item != nil }, set: { if !$0 { item = nil } })) {
        SecureField("PIN", text: $pin)
        Button("Open") {
          if let current = item, session.pinMatches(pin, hashed: hashed(current)) {
            onOpen(current)
          } else {
            wrong = true
          }
          pin = ""
          item = nil
        }
        Button("Cancel", role: .cancel) {
          pin = ""
          item = nil
        }
      } message: {
        Text("This space is protected.")
      }
      .alert("Wrong PIN", isPresented: $wrong) {
        Button("OK", role: .cancel) {}
      }
  }
}

/// A board code like the web client's generateReadableID: XXXXX-XXXXX
private func readableCode() -> String {
  let alphabet = Array("ABCDEFGHIJKLMNPQRSTUVWXYZ123456789")
  let chars = (0..<10).map { _ in alphabet.randomElement()! }
  return String(chars[0..<5]) + "-" + String(chars[5..<10])
}

/// Create a room (room == nil) or a board in a room. Only offered to signed-in users:
/// the hub refuses rooms and boards from guests.
struct CreateSpaceSheet: View {
  let session: Session
  let room: Room?
  @Environment(\.dismiss) private var dismiss
  @State private var name = ""
  @State private var description = ""
  @State private var color = "teal"
  @State private var isPrivate = false
  @State private var pin = ""
  @State private var isListed = true
  @State private var saving = false
  @State private var error: String?

  private var isBoard: Bool { room != nil }

  var body: some View {
    NavigationStack {
      Form {
        TextField("Name", text: $name)
        TextField("Description", text: $description)
        Picker("Color", selection: $color) {
          ForEach(SageColor.names, id: \.self) { name in
            Label(name.capitalized, systemImage: "circle.fill").tint(SageColor.strong(name)).tag(name)
          }
        }
        Toggle("Protected with a PIN", isOn: $isPrivate)
        if isPrivate {
          SecureField("PIN", text: $pin)
        }
        if !isBoard {
          Toggle("Listed publicly", isOn: $isListed)
        }
        if let error {
          Text(error).foregroundStyle(.red)
        }
      }
      .navigationTitle(isBoard ? "New Board" : "New Room")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button("Create") { Task { await create() } }
            .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || (isPrivate && pin.isEmpty) || saving)
        }
      }
    }
  }

  private func create() async {
    guard let owner = session.user?.id else { return }
    saving = true
    defer { saving = false }
    let key = isPrivate ? session.hashPin(pin) ?? "" : ""
    let trimmed = name.trimmingCharacters(in: .whitespaces)
    do {
      if let room {
        // Same fields as the web client's CreateBoardModal
        _ = try await session.client.createBoard(
          BoardData(
            name: trimmed, description: description, color: color, roomId: room.id, ownerId: owner, isPrivate: isPrivate, privatePin: key,
            code: readableCode(), executeInfo: .object(["executeFunc": .string(""), "params": .object([:])])))
      } else {
        _ = try await session.client.createRoom(
          RoomData(name: trimmed, description: description, color: color, ownerId: owner, isPrivate: isPrivate, privatePin: key, isListed: isListed))
      }
      dismiss()
    } catch {
      self.error = error.localizedDescription
    }
  }
}
