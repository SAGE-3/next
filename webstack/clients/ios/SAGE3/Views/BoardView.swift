/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI
import UIKit

/// A board: its apps, kept up to date, on a canvas you pan with one finger and zoom with
/// two. Tap an app to select it; touch and hold one, then drag, to move it; drag the
/// selected app's corner handle to resize it. Like the web client, a screen point is
/// (board point + offset) × scale.
struct BoardView: View {
  let session: Session
  let board: Board
  /// For the title: hub / room / board
  var roomName: String?
  @State private var apps = LiveCollection<AppData>()
  // The other people on the board, and everyone's name and color (both kept up to date:
  // people join, and a guest's user is made when they arrive)
  @State private var presences = LiveCollection<PresenceData>()
  @State private var users = LiveCollection<UserData>()
  // This user's own presence, for the others
  @State private var presenceSender: PresenceSender?
  @State private var showingFiles = false
  @State private var confirmDelete: SageApp?
  @State private var assets: AssetCache
  @State private var offset = CGPoint.zero
  @State private var scale: CGFloat = 1
  // The app picked up to move, the one being resized, and the selected one
  @State private var moving: Moving?
  @State private var resizing: Resizing?
  @State private var selectedId: String?
  @State private var pinching = false
  @State private var viewSize = CGSize.zero
  @State private var fitted = false
  @Environment(\.colorScheme) private var colorScheme

  init(session: Session, board: Board, roomName: String? = nil) {
    self.session = session
    self.board = board
    self.roomName = roomName
    _assets = State(initialValue: AssetCache(client: session.client))
  }

  private struct Moving {
    var id: String
    var origin: Position
    var delta = CGSize.zero  // in board units
  }

  private struct Resizing {
    var id: String
    var origin: Size
    var size: Size
  }

  // The web client's limits (AppWindow.tsx)
  private static let minSize = CGSize(width: 200, height: 100)
  private static let maxSize = CGSize(width: 8 * 1024, height: 8 * 1024)
  /// Apps whose window keeps its shape when resized, as on the web (lockAspectRatio)
  private static let keepsShape: Set<String> = [
    "Calculator", "Clock", "DOCXViewer", "ImageViewer", "PDFViewer", "PPTXViewer", "Screenshare", "LocalScreenshare",
    "TwilioScreenshare", "SensorOverview", "Timer", "VideoViewer",
  ]

  /// Back to front: raised apps (higher z) last, and the app being moved on top
  private var ordered: [SageApp] {
    apps.items.sorted {
      ($0.id == moving?.id ? 1 : 0, $0.data.position.z ?? 0, $0._updatedAt ?? 0) < ($1.id == moving?.id ? 1 : 0, $1.data.position.z ?? 0, $1._updatedAt ?? 0)
    }
  }

  private var selected: SageApp? { apps.items.first { $0.id == selectedId } }

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .topLeading) {
        BoardGrid(offset: offset, scale: scale)
        ForEach(ordered.filter { isVisible($0, in: geometry.size) }) { app in
          let frame = screenFrame(app)
          let lifted = app.id == moving?.id
          AppTile(app: app, scale: scale, assets: assets, client: session.client)
            .frame(width: frame.width, height: frame.height)
            .overlay {
              if app.id == selectedId {
                RoundedRectangle(cornerRadius: 4).strokeBorder(Color.teal, lineWidth: 3)
              }
            }
            .scaleEffect(lifted ? 1.03 : 1)
            .shadow(color: .black.opacity(lifted ? 0.35 : 0), radius: lifted ? 12 : 0, y: lifted ? 6 : 0)
            .position(x: frame.midX, y: frame.midY)
            .animation(.easeOut(duration: 0.15), value: lifted)
        }
        PresenceLayer(presences: presences, users: users, me: session.user?.id, boardId: board.id, offset: offset, scale: scale)
      }
      .clipped()
      .overlay {
        BoardGestures(onTap: tap, onDoubleTap: doubleTap, onHold: hold, onPan: pan, onPinch: pinch)
      }
      .overlay(alignment: .topLeading) {
        // Above the gestures, so the handle gets the touch first
        if let app = selected, moving == nil {
          let frame = screenFrame(app)
          if canChange(app) {
            ResizeHandle()
              .position(x: frame.maxX, y: frame.maxY)
              .gesture(resize(app))
          }
        }
      }
      .onAppear { viewSize = geometry.size }
      .onChange(of: geometry.size) { _, size in viewSize = size }
    }
    .overlay(alignment: .bottom) {
      // The selected app's toolbar: always on screen, above the board's toolbar
      if let app = selected, moving == nil, resizing == nil {
        AppToolbar(
          app: app,
          pages: app.data.type == "PDFViewer" && session.canMoveApps
            ? AppToolbar.Pages(page: page(of: app), count: pageCount(of: app), shown: pagesShown(by: app)) { setPage(of: app, to: $0) }
            : nil,
          onClose: session.canDeleteApps ? { confirmDelete = app } : nil
        )
        .padding(.bottom, 12)
        .padding(.horizontal, 8)
      }
    }
    .overlay(alignment: .bottomLeading) {
      if apps.loaded && !apps.items.isEmpty && selected == nil {
        Text(statusText)
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
      ToolbarItem(placement: .principal) {
        // Where you are: hub / room / board (the middle gives way on narrow screens)
        Text([session.info?.serverName ?? session.hub.name, roomName, board.data.name].compactMap { $0 }.joined(separator: " / "))
          .font(.headline)
          .lineLimit(1)
          .truncationMode(.middle)
          .minimumScaleFactor(0.8)
      }
      ToolbarItemGroup(placement: .bottomBar) {
        Button { fitAll() } label: { Label("Show All Apps", systemImage: "arrow.up.left.and.arrow.down.right") }
        Button { zoom(by: 1 / 1.5) } label: { Label("Zoom Out", systemImage: "minus.magnifyingglass") }
        Button { zoom(by: 1.5) } label: { Label("Zoom In", systemImage: "plus.magnifyingglass") }
        Spacer()
        Button { showingFiles = true } label: { Label("Files", systemImage: "folder") }
        Button {
          Appearance.set(colorScheme == .dark ? "light" : "dark")
        } label: {
          Label(colorScheme == .dark ? "Light Mode" : "Dark Mode", systemImage: colorScheme == .dark ? "sun.max" : "moon")
        }
      }
    }
    .confirmationDialog(
      "Delete \(confirmDelete?.data.title.flatMap { $0.isEmpty ? nil : $0 } ?? confirmDelete?.data.type ?? "this app")?",
      isPresented: Binding(get: { confirmDelete != nil }, set: { if !$0 { confirmDelete = nil } }),
      titleVisibility: .visible
    ) {
      Button("Delete", role: .destructive) {
        if let app = confirmDelete { delete(app) }
        confirmDelete = nil
      }
      Button("Cancel", role: .cancel) { confirmDelete = nil }
    } message: {
      Text("It is removed from the board for everyone.")
    }
    .sheet(isPresented: $showingFiles) {
      AssetsSheet(session: session, roomId: board.data.roomId, open: openOnBoard)
    }
    .onChange(of: [offset.x, offset.y, scale, viewSize.width, viewSize.height]) { _, _ in
      presenceSender?.viewport(visibleBoard)
    }
    .task(id: session.socket == nil) {
      if let me = session.user?.id {
        let sender = PresenceSender(socket: session.socket, userId: me)
        sender.enter(roomId: board.data.roomId, boardId: board.id)
        presenceSender = sender
      }
      await apps.start(socket: session.socket, route: "/apps?boardId=\(board.id)") { try await session.client.apps(boardId: board.id) }
      if !fitted {
        fitted = true
        fitAll()
      }
      await users.start(socket: session.socket, route: "/users") { try await session.client.users() }
      await presences.start(socket: session.socket, route: "/presence?boardId=\(board.id)") { try await session.client.presence(boardId: board.id) }
    }
    .onDisappear {
      apps.stop()
      presences.stop()
      users.stop()
      presenceSender?.leave()
    }
  }

  // MARK: Geometry

  /// The selected app's type and title, or the app count; and the zoom
  private var statusText: String {
    let zoom = "\(Int((scale * 100).rounded()))%"
    if let app = selected {
      let title = app.data.title.flatMap { $0.isEmpty ? nil : $0 }
      return [app.data.type, title, zoom].compactMap { $0 }.joined(separator: " · ")
    }
    return "\(apps.items.count) apps · \(zoom)"
  }

  private func screenFrame(_ app: SageApp) -> CGRect {
    var p = app.data.position
    if let moving, moving.id == app.id {
      p.x += moving.delta.width
      p.y += moving.delta.height
    }
    var s = app.data.size
    if let resizing, resizing.id == app.id { s = resizing.size }
    return CGRect(x: (p.x + offset.x) * scale, y: (p.y + offset.y) * scale, width: s.width * scale, height: s.height * scale)
  }

  /// The part of the board on screen, in board coordinates
  private var visibleBoard: CGRect {
    CGRect(x: -offset.x, y: -offset.y, width: viewSize.width / scale, height: viewSize.height / scale)
  }

  /// A screen point on the board
  private func boardPoint(_ point: CGPoint) -> CGPoint {
    CGPoint(x: point.x / scale - offset.x, y: point.y / scale - offset.y)
  }

  /// Put files on the board, as the web client does: side by side in a row (10 apart),
  /// the row at the free spot closest to the center of the view, then created on the hub
  private func openOnBoard(_ files: [Asset]) {
    let made = files.map(NewApp.showing)
    guard !made.isEmpty else { return }
    var x: CGFloat = 0
    let frames = made.map { app -> CGRect in
      defer { x += app.size.width + 10 }
      return CGRect(origin: CGPoint(x: x, y: 0), size: app.size)
    }
    let row = frames.dropFirst().reduce(frames[0]) { $0.union($1) }
    let others = apps.items.map { CGRect(x: $0.data.position.x, y: $0.data.position.y, width: $0.data.size.width, height: $0.data.size.height) }
    let spot = Placement.find(view: visibleBoard, apps: others, size: row.size)
    let documents = zip(made, frames).map { app, frame in
      app.document(at: CGPoint(x: spot.x + frame.minX, y: spot.y + frame.minY), roomId: board.data.roomId, boardId: board.id)
    }
    Task {
      if documents.count == 1 {
        _ = try? await session.socket?.request("/apps", method: "POST", body: documents[0])
      } else {
        _ = try? await session.socket?.request("/apps", method: "POST", body: .object(["batch": .array(documents)]))
      }
    }
  }

  /// Remove an app from the board, for everyone (as the web client's close button)
  private func delete(_ app: SageApp) {
    if selectedId == app.id { selectedId = nil }
    Task { _ = try? await session.socket?.request("/apps/\(app.id)", method: "DELETE") }
  }

  /// May this user move or resize this app
  private func canChange(_ app: SageApp) -> Bool {
    session.canMoveApps && app.data.pinned != true
  }

  /// The frontmost app under a screen point
  private func app(at point: CGPoint) -> SageApp? {
    ordered.last { screenFrame($0).contains(point) }
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

  /// A tap selects the app under it, or nothing
  private func tap(at location: CGPoint) {
    presenceSender?.cursor(boardPoint(location))
    selectedId = app(at: location)?.id
  }

  /// A double tap on a PDF turns its page, as on the web (right part: next, left: previous);
  /// anywhere else it shows all apps
  private func doubleTap(at location: CGPoint) {
    guard let target = app(at: location), target.data.type == "PDFViewer", session.canMoveApps else { return fitAll() }
    let frame = screenFrame(target)
    let forward = (location.x - frame.minX) / max(frame.width, 1) > 0.4
    setPage(of: target, to: page(of: target) + (forward ? 1 : -1))
  }

  // MARK: PDF pages

  private func page(of app: SageApp) -> Int {
    Int(app.data.state?["currentPage"]?.number ?? 0)
  }

  private func pagesShown(by app: SageApp) -> Int {
    max(1, Int(app.data.state?["displayPages"]?.number ?? 1))
  }

  /// numPages, or the number of page images of its asset when the state doesn't say
  private func pageCount(of app: SageApp) -> Int {
    if let count = app.data.state?["numPages"]?.number, count > 0 { return Int(count) }
    guard let id = app.data.state?["assetid"]?.string else { return 1 }
    return max(1, assets.asset(id)?.data.derived?.array?.count ?? 1)
  }

  /// Go to a page (kept within the pages, leaving room for all the pages shown), for
  /// everyone: shown here at once, then sent to the hub as the web toolbar does
  private func setPage(of app: SageApp, to wanted: Int) {
    let last = max(0, pageCount(of: app) - pagesShown(by: app))
    let before = page(of: app)
    let target = min(max(wanted, 0), last)
    guard target != before else { return }
    apps.updateLocally(app.id) { $0.data.state = ($0.data.state ?? .object([:])).setting("currentPage", to: .number(Double(target))) }
    Task {
      let reply = try? await session.socket?.request("/apps/\(app.id)", method: "PUT", body: .object(["state.currentPage": .number(Double(target))]))
      let accepted = reply.flatMap { try? JSONDecoder().decode(APIReply<JSONValue>.self, from: $0) }?.success ?? false
      if !accepted {
        apps.updateLocally(app.id) { $0.data.state = ($0.data.state ?? .object([:])).setting("currentPage", to: .number(Double(before))) }
      }
    }
  }

  /// Touch and hold an app, then drag: pick it up, move it, put it down
  private func hold(_ phase: BoardGestures.Phase, at start: CGPoint, moved: CGSize) {
    switch phase {
    case .began:
      guard !pinching, resizing == nil, let target = app(at: start), canChange(target) else { return }
      moving = Moving(id: target.id, origin: target.data.position)
      selectedId = target.id
      UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    case .changed:
      moving?.delta = CGSize(width: moved.width / scale, height: moved.height / scale)
      presenceSender?.cursor(boardPoint(CGPoint(x: start.x + moved.width, y: start.y + moved.height)))
    case .ended:
      if var final = moving {
        final.delta = CGSize(width: moved.width / scale, height: moved.height / scale)
        drop(final)
      }
      moving = nil
    }
  }

  /// One finger: pan the board (not while an app is being moved)
  private func pan(_ phase: BoardGestures.Phase, by delta: CGSize, at location: CGPoint) {
    guard phase == .changed, moving == nil else { return }
    presenceSender?.cursor(boardPoint(location))
    offset.x += delta.width / scale
    offset.y += delta.height / scale
  }

  /// Two fingers: zoom, keeping the board point between them in place
  private func pinch(_ phase: BoardGestures.Phase, by factor: CGFloat, around anchor: CGPoint) {
    switch phase {
    case .began, .changed:
      pinching = true
      let newScale = min(max(scale * factor, 0.01), 4)
      let boardX = anchor.x / scale - offset.x
      let boardY = anchor.y / scale - offset.y
      scale = newScale
      offset = CGPoint(x: anchor.x / newScale - boardX, y: anchor.y / newScale - boardY)
    case .ended:
      pinching = false
    }
  }

  /// Drag the corner handle: resize with the top-left corner in place, within the web client's
  /// limits, keeping the shape of apps that do on the web; one update when it ends
  private func resize(_ app: SageApp) -> some Gesture {
    DragGesture(minimumDistance: 0, coordinateSpace: .global)
      .onChanged { value in
        let origin = resizing?.origin ?? app.data.size
        var width = origin.width + value.translation.width / scale
        var height = origin.height + value.translation.height / scale
        if Self.keepsShape.contains(app.data.type), origin.height > 0 {
          let ratio = origin.width / origin.height
          if abs(value.translation.width) >= abs(value.translation.height) { height = width / ratio } else { width = height * ratio }
        }
        width = min(max(width, Self.minSize.width), Self.maxSize.width)
        height = min(max(height, Self.minSize.height), Self.maxSize.height)
        resizing = Resizing(id: app.id, origin: origin, size: Size(width: width.rounded(), height: height.rounded(), depth: origin.depth))
      }
      .onEnded { _ in
        if let resizing { commitResize(resizing, position: app.data.position) }
        resizing = nil
      }
  }

  private func commitResize(_ change: Resizing, position: Position) {
    guard change.size.width != change.origin.width || change.size.height != change.origin.height else { return }
    apps.updateLocally(change.id) { $0.data.size = change.size }
    let body = JSONValue.object([
      "position": .object(["x": .number(position.x), "y": .number(position.y), "z": .number(position.z ?? 0)]),
      "size": .object(["width": .number(change.size.width), "height": .number(change.size.height), "depth": .number(change.size.depth ?? 0)]),
    ])
    Task {
      let reply = try? await session.socket?.request("/apps/\(change.id)", method: "PUT", body: body)
      let accepted = reply.flatMap { try? JSONDecoder().decode(APIReply<JSONValue>.self, from: $0) }?.success ?? false
      if !accepted { apps.updateLocally(change.id) { $0.data.size = change.origin } }
    }
  }

  /// Put a moved app down: show it there at once, then tell the hub (as the web client
  /// does, one update when the move ends); back where it was if the hub refuses
  private func drop(_ move: Moving) {
    let distance = hypot(move.delta.width, move.delta.height)
    // Not moved, or an implausible jump (the web client's limit)
    guard distance > 0.5, distance <= 50_000 else { return }
    let position = Position(x: (move.origin.x + move.delta.width).rounded(), y: (move.origin.y + move.delta.height).rounded(), z: move.origin.z)
    apps.updateLocally(move.id) { $0.data.position = position }
    let body = JSONValue.object(["position": .object(["x": .number(position.x), "y": .number(position.y), "z": .number(position.z ?? 0)])])
    Task {
      let reply = try? await session.socket?.request("/apps/\(move.id)", method: "PUT", body: body)
      let accepted = reply.flatMap { try? JSONDecoder().decode(APIReply<JSONValue>.self, from: $0) }?.success ?? false
      if !accepted { apps.updateLocally(move.id) { $0.data.position = move.origin } }
    }
  }
}

/// The corner handle of the selected app: a fixed size on screen, easy to touch
private struct ResizeHandle: View {
  var body: some View {
    Image(systemName: "arrow.up.left.and.arrow.down.right")
      .font(.system(size: 11, weight: .bold))
      .foregroundStyle(.white)
      .frame(width: 26, height: 26)
      .background(Circle().fill(Color.teal))
      .overlay(Circle().strokeBorder(.white, lineWidth: 2))
      .shadow(color: .black.opacity(0.3), radius: 3, y: 1)
      .frame(width: 44, height: 44)
      .contentShape(Rectangle())
      .accessibilityLabel("Resize")
  }
}

/// The selected app's toolbar, at the bottom of the board: its name, its own controls (a
/// PDF's pages), and a close button that deletes it
private struct AppToolbar: View {
  /// A PDF's page controls
  struct Pages {
    var page: Int
    var count: Int
    var shown: Int
    var go: (Int) -> Void

    var last: Int { max(0, count - shown) }
    var label: String { shown > 1 ? "\(page + 1)–\(min(page + shown, count)) / \(count)" : "\(page + 1) / \(count)" }
  }

  let app: SageApp
  var pages: Pages?
  /// nil: this user may not delete apps
  var onClose: (() -> Void)?
  // On a phone, the first and last page buttons give way
  @Environment(\.horizontalSizeClass) private var sizeClass

  private var name: String {
    if let title = app.data.title, !title.isEmpty { return title }
    return app.data.type
  }

  var body: some View {
    HStack(spacing: 2) {
      Text(name)
        .font(.subheadline.weight(.semibold))
        .lineLimit(1)
        .truncationMode(.middle)
        .frame(maxWidth: pages == nil ? 220 : (sizeClass == .compact ? 90 : 160))
        .padding(.horizontal, 8)
      if let pages {
        Divider().frame(height: 22)
        if sizeClass != .compact {
          button("First Page", "backward.end.fill", enabled: pages.page > 0) { pages.go(0) }
        }
        button("Previous Page", "chevron.left", enabled: pages.page > 0) { pages.go(pages.page - 1) }
        Text(pages.label)
          .font(.callout.monospacedDigit())
          .frame(minWidth: 56)
        button("Next Page", "chevron.right", enabled: pages.page < pages.last) { pages.go(pages.page + 1) }
        if sizeClass != .compact {
          button("Last Page", "forward.end.fill", enabled: pages.page < pages.last) { pages.go(pages.last) }
        }
      }
      if let onClose {
        Divider().frame(height: 22)
        button("Delete App", "xmark", enabled: true, action: onClose)
          .foregroundStyle(.red)
      }
    }
    .padding(.horizontal, 6)
    .padding(.vertical, 4)
    .background(.regularMaterial, in: Capsule())
    .shadow(color: .black.opacity(0.2), radius: 4, y: 2)
    .fixedSize()
  }

  private func button(_ label: String, _ symbol: String, enabled: Bool, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      Image(systemName: symbol).frame(width: 40, height: 36).contentShape(Rectangle())
    }
    .disabled(!enabled)
    .accessibilityLabel(label)
  }
}
