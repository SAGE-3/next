/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */


import SwiftUI

/// Edit a Stickie's text: typing goes to everyone in the board's Yjs room at once, and is
/// saved to the app 1 s after the last keystroke, as the web Stickie does
struct StickieEditor: View {
  let app: SageApp
  let texts: AppTextStore
  /// Save the text in the app's state
  let save: (String) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var text = ""
  @State private var lastSaved: String?
  @State private var pendingSave: DispatchWorkItem?
  @FocusState private var focused: Bool

  /// The web's save debounce
  private static let saveDelay: TimeInterval = 1

  var body: some View {
    NavigationStack {
      TextEditor(text: $text)
        .font(.system(size: 20))
        .foregroundStyle(.black)
        .scrollContentBackground(.hidden)
        .padding(12)
        .background(SageColor.light(app.data.state?["color"]?.string ?? "yellow"))
        .focused($focused)
        .navigationTitle(app.data.title.flatMap { $0.isEmpty ? nil : $0 } ?? "Stickie")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") { dismiss() }
          }
        }
    }
    .onAppear {
      let saved = app.data.state?["text"]?.string ?? ""
      text = texts.beginEditing(app.id, saved: saved)
      lastSaved = saved
      focused = true
    }
    .onChange(of: text) { _, value in
      // Ours, or someone else's that just came in
      guard value != texts.current(app.id) else { return }
      texts.edit(app.id, value)
      scheduleSave()
    }
    .onChange(of: texts.version) { _, _ in
      // Others' typing: shown here too (the cursor may move)
      let live = texts.current(app.id)
      if texts.live, live != text { text = live }
    }
    .onDisappear { saveNow() }
  }

  private func scheduleSave() {
    pendingSave?.cancel()
    let work = DispatchWorkItem { saveNow() }
    pendingSave = work
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.saveDelay, execute: work)
  }

  private func saveNow() {
    pendingSave?.cancel()
    pendingSave = nil
    guard text != lastSaved else { return }
    lastSaved = text
    save(text)
  }
}
