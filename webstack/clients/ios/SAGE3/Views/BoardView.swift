/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

/// A board: its apps, kept up to date, on a canvas you pan with one finger and zoom with
/// two. Like the web client, a screen point is (board point + offset) × scale.
struct BoardView: View {
  let session: Session
  let board: Board
  @State private var apps = LiveCollection<AppData>()
  @State private var assets: AssetCache
  @State private var offset = CGPoint.zero
  @State private var scale: CGFloat = 1
  @State private var dragStart: CGPoint?
  @State private var zoomStart: (scale: CGFloat, offset: CGPoint)?
  @State private var viewSize = CGSize.zero
  @State private var fitted = false
  @Environment(\.colorScheme) private var colorScheme

  init(session: Session, board: Board) {
    self.session = session
    self.board = board
    _assets = State(initialValue: AssetCache(client: session.client))
  }

  /// Back to front: raised apps (higher z) last
  private var ordered: [SageApp] {
    apps.items.sorted { ($0.data.position.z ?? 0, $0._updatedAt ?? 0) < ($1.data.position.z ?? 0, $1._updatedAt ?? 0) }
  }

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .topLeading) {
        BoardGrid(offset: offset, scale: scale)
        ForEach(ordered.filter { isVisible($0, in: geometry.size) }) { app in
          let frame = screenFrame(app)
          AppTile(app: app, scale: scale, assets: assets, client: session.client)
            .frame(width: frame.width, height: frame.height)
            .position(x: frame.midX, y: frame.midY)
        }
      }
      .clipped()
      .contentShape(Rectangle())
      .gesture(pan.simultaneously(with: zoom))
      .onTapGesture(count: 2) { fitAll() }
      .onAppear { viewSize = geometry.size }
      .onChange(of: geometry.size) { _, size in viewSize = size }
    }
    .overlay(alignment: .bottomLeading) {
      if apps.loaded && !apps.items.isEmpty {
        Text("\(apps.items.count) apps · \(Int((scale * 100).rounded()))%")
          .font(.caption.monospacedDigit())
          .padding(.horizontal, 10)
          .padding(.vertical, 5)
          .background(.regularMaterial, in: Capsule())
          .padding(12)
      }
    }
    .overlay(alignment: .center) {
      if !apps.loaded {
        ProgressView()
      } else if apps.items.isEmpty {
        ContentUnavailableView("Empty Board", systemImage: "rectangle.dashed", description: Text(apps.error ?? "No apps on this board yet."))
      }
    }
    .navigationTitle(board.data.name)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItemGroup(placement: .bottomBar) {
        Button { fitAll() } label: { Label("Show All Apps", systemImage: "arrow.up.left.and.arrow.down.right") }
        Button { zoom(by: 1 / 1.5) } label: { Label("Zoom Out", systemImage: "minus.magnifyingglass") }
        Button { zoom(by: 1.5) } label: { Label("Zoom In", systemImage: "plus.magnifyingglass") }
        Spacer()
        Button {
          Appearance.set(colorScheme == .dark ? "light" : "dark")
        } label: {
          Label(colorScheme == .dark ? "Light Mode" : "Dark Mode", systemImage: colorScheme == .dark ? "sun.max" : "moon")
        }
      }
    }
    .task(id: session.socket == nil) {
      await apps.start(socket: session.socket, route: "/apps?boardId=\(board.id)") { try await session.client.apps(boardId: board.id) }
      if !fitted {
        fitted = true
        fitAll()
      }
    }
    .onDisappear { apps.stop() }
  }

  // MARK: Geometry

  private func screenFrame(_ app: SageApp) -> CGRect {
    let p = app.data.position
    let s = app.data.size
    return CGRect(x: (p.x + offset.x) * scale, y: (p.y + offset.y) * scale, width: s.width * scale, height: s.height * scale)
  }

  private func isVisible(_ app: SageApp, in size: CGSize) -> Bool {
    screenFrame(app).intersects(CGRect(origin: .zero, size: size).insetBy(dx: -100, dy: -100))
  }

  /// Fit every app in the view (75% of it, like the web client's fitApps)
  private func fitAll() {
    guard viewSize.width > 0, viewSize.height > 0 else { return }
    guard !apps.items.isEmpty else {
      // An empty board: its middle, at 100%
      scale = 1
      offset = CGPoint(x: -1_500_000 + viewSize.width / 2, y: -1_500_000 + viewSize.height / 2)
      return
    }
    let frames = apps.items.map { CGRect(x: $0.data.position.x, y: $0.data.position.y, width: $0.data.size.width, height: $0.data.size.height) }
    let box = frames.dropFirst().reduce(frames[0]) { $0.union($1) }
    let fit = min(0.75 * viewSize.width / max(box.width, 1), 0.75 * viewSize.height / max(box.height, 1))
    withAnimation(.easeInOut(duration: 0.3)) {
      scale = min(max(fit, 0.01), 4)
      offset = CGPoint(x: -box.midX + viewSize.width / scale / 2, y: -box.midY + viewSize.height / scale / 2)
    }
  }

  /// Zoom around the center of the view (toolbar buttons)
  private func zoom(by factor: CGFloat) {
    let newScale = min(max(scale * factor, 0.01), 4)
    let center = CGPoint(x: viewSize.width / 2, y: viewSize.height / 2)
    withAnimation(.easeInOut(duration: 0.2)) {
      offset = CGPoint(x: center.x / newScale - (center.x / scale - offset.x), y: center.y / newScale - (center.y / scale - offset.y))
      scale = newScale
    }
  }

  // MARK: Gestures

  private var pan: some Gesture {
    DragGesture(minimumDistance: 2)
      .onChanged { value in
        let start = dragStart ?? offset
        dragStart = start
        offset = CGPoint(x: start.x + value.translation.width / scale, y: start.y + value.translation.height / scale)
      }
      .onEnded { _ in dragStart = nil }
  }

  private var zoom: some Gesture {
    MagnifyGesture()
      .onChanged { value in
        let start = zoomStart ?? (scale, offset)
        zoomStart = start
        let newScale = min(max(start.scale * value.magnification, 0.01), 4)
        // Keep the board point under the fingers in place
        let anchor = value.startLocation
        let boardX = anchor.x / start.scale - start.offset.x
        let boardY = anchor.y / start.scale - start.offset.y
        scale = newScale
        offset = CGPoint(x: anchor.x / newScale - boardX, y: anchor.y / newScale - boardY)
        dragStart = nil
      }
      .onEnded { _ in zoomStart = nil }
  }
}
