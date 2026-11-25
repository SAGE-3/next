/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

/// The other people on the board, drawn like the web client does (Presence/Cursors.tsx,
/// Viewports.tsx): each one's cursor with their name, fading out after 20 s without
/// moving, and the view of wall displays. A layer of its own, so their frequent updates
/// redraw it and not the apps.
struct PresenceLayer: View {
  let presences: LiveCollection<PresenceData>
  let users: LiveCollection<UserData>
  let me: String?
  let boardId: String
  let offset: CGPoint
  let scale: CGFloat
  // This device's preferences (SettingsSheet)
  var showCursors = true
  var showViewports = true
  // When each person's cursor last moved, for the fade
  @State private var lastMoved: [String: (position: Position, time: Date)] = [:]

  /// A cursor fades out after this long without moving
  private static let fadeAfter: TimeInterval = 20

  private var others: [(presence: PresenceData, user: User)] {
    let people = Dictionary(users.items.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    return presences.items.compactMap { doc in
      let presence = doc.data
      guard presence.userId != me, presence.boardId == boardId, presence.status != "offline", let user = people[presence.userId] else { return nil }
      return (presence, user)
    }
  }

  var body: some View {
    TimelineView(.periodic(from: .now, by: 1)) { timeline in
      ZStack(alignment: .topLeading) {
        ForEach(others, id: \.user.id) { item in
          if showViewports, item.user.data.userType == "wall", let viewport = item.presence.viewport {
            ViewportOutline(name: item.user.data.name, color: SageColor.person(item.user.data.color), frame: screenRect(viewport.position, viewport.size))
          }
        }
        ForEach(others, id: \.user.id) { item in
          if showCursors, let cursor = item.presence.cursor {
            let faded = timeline.date.timeIntervalSince(lastMoved[item.user.id]?.time ?? timeline.date) > Self.fadeAfter
            RemoteCursor(name: item.user.data.name, color: SageColor.person(item.user.data.color))
              .offset(x: (cursor.x + offset.x) * scale, y: (cursor.y + offset.y) * scale)
              .opacity(faded ? 0 : 1)
              .animation(.easeInOut(duration: 1), value: faded)
              .animation(.linear(duration: 0.15), value: cursor)
          }
        }
      }
    }
    .allowsHitTesting(false)
    .onChange(of: presences.items.map { $0.data.cursor }, initial: true) { _, _ in
      let now = Date()
      for item in others {
        guard let cursor = item.presence.cursor else { continue }
        if lastMoved[item.user.id]?.position != cursor { lastMoved[item.user.id] = (cursor, now) }
      }
    }
  }

  private func screenRect(_ position: Position, _ size: Size) -> CGRect {
    CGRect(x: (position.x + offset.x) * scale, y: (position.y + offset.y) * scale, width: size.width * scale, height: size.height * scale)
  }
}

/// A pointer in the person's color, tip at its position, and their name in a gray tag
private struct RemoteCursor: View {
  let name: String
  let color: Color

  var body: some View {
    HStack(alignment: .top, spacing: 1) {
      Image(systemName: "cursorarrow")
        .font(.system(size: 20, weight: .bold))
        .foregroundStyle(color)
        .shadow(color: .black.opacity(0.35), radius: 1)
      Text(name)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.white)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(Color(hex: 0x718096), in: RoundedRectangle(cornerRadius: 5))
        .offset(y: 12)
    }
    .fixedSize()
  }
}

/// A wall display's view: an outline and a title bar in its color, at 55% opacity
private struct ViewportOutline: View {
  let name: String
  let color: Color
  let frame: CGRect
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    let bar: CGFloat = 28
    ZStack(alignment: .topLeading) {
      UnevenRoundedRectangle(topLeadingRadius: 6, topTrailingRadius: 6)
        .fill(color)
        .frame(width: frame.width, height: bar)
        .overlay {
          Text("Viewport for \(name)")
            .font(.system(size: 16))
            .foregroundStyle(colorScheme == .dark ? .black : .white)
            .lineLimit(1)
            .padding(.horizontal, 6)
        }
        .offset(x: frame.minX, y: frame.minY - bar)
      UnevenRoundedRectangle(bottomLeadingRadius: 6, bottomTrailingRadius: 6)
        .strokeBorder(color, lineWidth: 3)
        .frame(width: frame.width, height: frame.height)
        .offset(x: frame.minX, y: frame.minY)
    }
    .opacity(0.55)
  }
}
