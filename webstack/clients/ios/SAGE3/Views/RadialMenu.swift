/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */


import SwiftUI

/// The board's ring menu, opened by a long press on the board's background (the web's
/// right-click radial menu, in short): its buttons around the press, clear of the screen's
/// edges. A tap elsewhere closes it.
struct RadialMenu: View {
  struct Item {
    var label: String
    var symbol: String
    var enabled = true
    var run: () -> Void
  }

  let center: CGPoint
  let items: [Item]
  let close: () -> Void

  /// From the center to each button's center
  private static let radius: CGFloat = 86
  private static let button: CGFloat = 54

  var body: some View {
    GeometryReader { geometry in
      // Keep the whole ring (and its labels) on screen
      let margin = Self.radius + Self.button / 2 + 18
      let spot = CGPoint(
        x: min(max(center.x, margin), max(margin, geometry.size.width - margin)),
        y: min(max(center.y, margin), max(margin, geometry.size.height - margin))
      )
      ZStack {
        Color.black.opacity(0.08)
          .contentShape(Rectangle())
          .onTapGesture(perform: close)
        Button(action: close) {
          Image(systemName: "xmark").font(.headline).frame(width: 40, height: 40)
        }
        .buttonStyle(.plain)
        .background(.regularMaterial, in: Circle())
        .position(spot)
        .accessibilityLabel("Close Menu")
        ForEach(items.indices, id: \.self) { index in
          let item = items[index]
          // Evenly around, the first at the top
          let angle = -Double.pi / 2 + 2 * Double.pi * Double(index) / Double(items.count)
          Button {
            close()
            item.run()
          } label: {
            VStack(spacing: 3) {
              Image(systemName: item.symbol)
                .font(.title3)
                .frame(width: Self.button, height: Self.button)
                .background(.regularMaterial, in: Circle())
                .shadow(color: .black.opacity(0.2), radius: 3, y: 1)
              Text(item.label).font(.caption2.weight(.medium))
            }
          }
          .buttonStyle(.plain)
          .disabled(!item.enabled)
          .opacity(item.enabled ? 1 : 0.4)
          .position(x: spot.x + Self.radius * cos(angle), y: spot.y + Self.radius * sin(angle) + 8)
        }
      }
    }
    .transition(.opacity.combined(with: .scale(scale: 0.9)))
  }
}

/// The whole board in small: every app, and the part on screen; tap to go there
struct MinimapSheet: View {
  let apps: [SageApp]
  let visible: CGRect
  let go: (CGPoint) -> Void
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      GeometryReader { geometry in
        let frames = apps.map { CGRect(x: $0.data.position.x, y: $0.data.position.y, width: $0.data.size.width, height: $0.data.size.height) }
        // Everything, the view included, with a margin
        let all = frames.reduce(visible) { $0.union($1) }.insetBy(dx: -200, dy: -200)
        let k = min(geometry.size.width / all.width, geometry.size.height / all.height)
        let dx = (geometry.size.width - all.width * k) / 2
        let dy = (geometry.size.height - all.height * k) / 2
        let map = { (r: CGRect) in CGRect(x: dx + (r.minX - all.minX) * k, y: dy + (r.minY - all.minY) * k, width: r.width * k, height: r.height * k) }
        ZStack(alignment: .topLeading) {
          BoardColors.background
          ForEach(apps) { app in
            let frame = map(CGRect(x: app.data.position.x, y: app.data.position.y, width: app.data.size.width, height: app.data.size.height))
            RoundedRectangle(cornerRadius: 2)
              .fill(Color.gray.opacity(0.35))
              .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.gray, lineWidth: 0.5))
              .frame(width: max(frame.width, 2), height: max(frame.height, 2))
              .offset(x: frame.minX, y: frame.minY)
          }
          let view = map(visible)
          Rectangle()
            .stroke(Color.teal, lineWidth: 2)
            .frame(width: view.width, height: view.height)
            .offset(x: view.minX, y: view.minY)
        }
        .contentShape(Rectangle())
        .onTapGesture { location in
          go(CGPoint(x: all.minX + (location.x - dx) / k, y: all.minY + (location.y - dy) / k))
          dismiss()
        }
      }
      .padding()
      .navigationTitle("Map")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
      }
    }
  }
}

/// New apps to add where the menu was opened
struct NewAppsSheet: View {
  let choices: [NewApp]
  let add: (NewApp) -> Void
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      List(choices, id: \.type) { app in
        Button {
          add(app)
          dismiss()
        } label: {
          Label(app.type, systemImage: NewApp.symbol(of: app.type))
        }
      }
      .navigationTitle("Add an App")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
      }
    }
  }
}

/// The people on this board; tap one to go where they are (their view, or their cursor)
struct UsersSheet: View {
  let presences: LiveCollection<PresenceData>
  let users: LiveCollection<UserData>
  let me: User?
  let boardId: String
  let go: (CGPoint) -> Void
  let openSettings: () -> Void
  @Environment(\.dismiss) private var dismiss

  private var here: [(presence: PresenceData, user: User)] {
    let people = Dictionary(users.items.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    return presences.items.compactMap { doc in
      let presence = doc.data
      guard presence.userId != me?.id, presence.boardId == boardId, presence.status != "offline", let user = people[presence.userId] else { return nil }
      return (presence, user)
    }
    .sorted { $0.user.data.name.localizedCaseInsensitiveCompare($1.user.data.name) == .orderedAscending }
  }

  var body: some View {
    NavigationStack {
      List {
        if let me {
          Section {
            Button {
              dismiss()
              openSettings()
            } label: {
              HStack {
                Circle().fill(SageColor.person(me.data.color)).frame(width: 14, height: 14)
                Text(me.data.name)
                Spacer()
                Text("Settings").foregroundStyle(.secondary)
              }
            }
          } header: {
            Text("You")
          }
        }
        Section {
          if here.isEmpty {
            Text("No one else is on this board.").foregroundStyle(.secondary)
          }
          ForEach(here, id: \.user.id) { item in
            let spot = location(of: item.presence)
            Button {
              if let spot { go(spot) }
              dismiss()
            } label: {
              HStack {
                Circle().fill(SageColor.person(item.user.data.color)).frame(width: 14, height: 14)
                Text(item.user.data.name)
                Spacer()
                if item.user.data.userType == "wall" { Text("Wall").foregroundStyle(.secondary) }
              }
            }
            .disabled(spot == nil)
          }
        } header: {
          Text("On This Board")
        }
      }
      .navigationTitle("Users")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
      }
    }
  }

  /// The middle of their view, else their cursor
  private func location(of presence: PresenceData) -> CGPoint? {
    if let viewport = presence.viewport, viewport.size.width > 0 {
      return CGPoint(x: viewport.position.x + viewport.size.width / 2, y: viewport.position.y + viewport.size.height / 2)
    }
    return presence.cursor.map { CGPoint(x: $0.x, y: $0.y) }
  }
}
