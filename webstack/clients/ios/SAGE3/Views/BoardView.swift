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
  // The whiteboard's shapes
  @State private var annotations = AnnotationStore()
  @State private var annotating = false
  // The board's live app texts (Stickies), and the one being edited
  @State private var texts = AppTextStore()
  @State private var editingStickie: SageApp?
  // The board's shared screens, watched while the board has any
  @State private var screens = ScreenShareStore()
  // The board's video players (this device only)
  @State private var videos = VideoPlayers()
  // This user's own presence, for the others
  @State private var presenceSender: PresenceSender?
  @State private var showingFiles = false
  @State private var showingSettings = false
  // The ring menu: where it was opened (on screen, and on the board), and its panel
  @State private var ringAt: CGPoint?
  @State private var ringBoardPoint: CGPoint?
  @State private var panel: RingPanel?
  // This device's preferences (SettingsSheet)
  @AppStorage(BoardPreferences.showCursors) private var showCursors = true
  @AppStorage(BoardPreferences.showViewports) private var showViewports = true
  @AppStorage(BoardPreferences.showAppTitles) private var showAppTitles = false
  @AppStorage(BoardPreferences.showGrid) private var showGrid = true
  @AppStorage(BoardPreferences.zoomToNewApps) private var zoomToNewApps = true
  // Apps last created from this device, and when: zoomed to once they arrive (zoomToNewApps)
  @State private var lastCreated: (ids: [String], at: Date)?
  @State private var confirmDelete: SageApp?
  // A link app opened: a board of this hub to enter, a file to share, or why not
  @State private var linkedBoard: Board?
  @State private var linkedBoardId: String?
  @State private var sharing: URL?
  @State private var linkProblem: String?
  @Environment(\.openURL) private var openURL
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
        if showGrid { BoardGrid(offset: offset, scale: scale) }
        ForEach(ordered.filter { isVisible($0, in: geometry.size) }) { app in
          let frame = screenFrame(app)
          let lifted = app.id == moving?.id
          AppTile(app: app, scale: scale, assets: assets, client: session.client, videos: videos, clock: videos.clock, texts: texts, screens: screens)
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
          if showAppTitles {
            // The app's title just above it, as the web's title bar
            Text(app.data.title.flatMap { $0.isEmpty ? nil : $0 } ?? app.data.type)
              .font(.caption.weight(.medium))
              .lineLimit(1)
              .frame(width: max(frame.width, 1), alignment: .leading)
              .position(x: frame.midX, y: frame.minY - 9)
              .allowsHitTesting(false)
          }
        }
        AnnotationLayer(annotations: annotations, offset: offset, scale: scale)
        PresenceLayer(
          presences: presences, users: users, me: session.user?.id, boardId: board.id, offset: offset, scale: scale,
          showCursors: showCursors, showViewports: showViewports
        )
      }
      .clipped()
      .overlay {
        BoardGestures(onTap: tap, onDoubleTap: doubleTap, onHold: hold, onPan: pan, onPinch: pinch)
      }
      .overlay {
        // Above the board's gestures: while annotating, touches draw (the board stays put)
        if annotating {
          AnnotateOverlay(annotations: annotations, userId: session.user?.id, userColor: session.user?.data.color, offset: offset, scale: scale) {
            annotating = false
          }
        }
      }
      .overlay {
        // Above the gestures, so its buttons get the touches
        if let ringAt {
          RadialMenu(center: ringAt, items: ringItems) { withAnimation(.easeOut(duration: 0.15)) { self.ringAt = nil } }
        }
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
      // The selected app's controls: always on screen, above the board's toolbar (none
      // to show, no toolbar)
      if let app = selected, moving == nil, resizing == nil {
        let pages = app.data.type == "PDFViewer" && session.canMoveApps
          ? AppToolbar.Pages(page: page(of: app), count: pageCount(of: app), shown: pagesShown(by: app)) { setPage(of: app, to: $0) }
          : nil
        let close: (() -> Void)? = session.canDeleteApps ? { confirmDelete = app } : nil
        let video = app.data.type == "VideoViewer" && session.canMoveApps ? videos.existing(app.id) : nil
        let actions = actions(for: app)
        if pages != nil || close != nil || video != nil || !actions.isEmpty {
          AppToolbar(pages: pages, video: video, actions: actions, onClose: close)
            .padding(.bottom, 12)
            .padding(.horizontal, 8)
        }
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
      ToolbarItem(placement: .primaryAction) {
        Button { showingSettings = true } label: { Label("Settings", systemImage: "person.crop.circle") }
      }
      ToolbarItemGroup(placement: .bottomBar) {
        Button { fitAll() } label: { Label("Show All Apps", systemImage: "arrow.up.left.and.arrow.down.right") }
        Button { zoom(by: 1 / 1.5) } label: { Label("Zoom Out", systemImage: "minus.magnifyingglass") }
        Button { zoom(by: 1.5) } label: { Label("Zoom In", systemImage: "plus.magnifyingglass") }
        Spacer()
        // The selected app's name
        if let app = selected {
          Text(app.data.title.flatMap { $0.isEmpty ? nil : $0 } ?? app.data.type)
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .truncationMode(.middle)
          Spacer()
        }
        if session.canAnnotate {
          Button { annotating.toggle() } label: { Label("Annotate", systemImage: annotating ? "pencil.tip.crop.circle.fill" : "pencil.tip.crop.circle") }
            .disabled(!annotations.live)
        }
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
    .navigationDestination(item: $linkedBoardId) { _ in
      if let linkedBoard { BoardView(session: session, board: linkedBoard) }
    }
    .sheet(item: $sharing) { url in
      ShareSheet(items: [url])
    }
    .alert("Can't Open the Link", isPresented: Binding(get: { linkProblem != nil }, set: { if !$0 { linkProblem = nil } })) {
      Button("OK", role: .cancel) {}
    } message: {
      Text(linkProblem ?? "")
    }
    .sheet(item: $editingStickie) { stickie in
      StickieEditor(app: stickie, texts: texts) { text in sendState(stickie.id, ["text": .string(text)]) }
        .presentationDetents([.medium, .large])
    }
    .sheet(item: $panel) { panel in
      switch panel {
      case .map:
        MinimapSheet(apps: apps.items, visible: visibleBoard) { center(on: $0) }
          .presentationDetents([.medium, .large])
      case .apps:
        NewAppsSheet(choices: newAppChoices) { add($0) }
          .presentationDetents([.medium])
      case .users:
        UsersSheet(presences: presences, users: users, me: session.user, boardId: board.id, go: { center(on: $0) }) { showingSettings = true }
          .presentationDetents([.medium, .large])
      }
    }
    .sheet(isPresented: $showingSettings) {
      SettingsSheet(session: session)
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
      texts.start(client: session.client, boardId: board.id, user: session.user)
      // Videos: our actions go to the board, and play in step with the hub's clock
      videos.send = { id, fields in sendState(id, fields) }
      Task { await videos.clock.start(session.client) }
      await apps.start(socket: session.socket, route: "/apps?boardId=\(board.id)") { try await session.client.apps(boardId: board.id) }
      if !fitted {
        fitted = true
        fitAll()
      }
      await users.start(socket: session.socket, route: "/users") { try await session.client.users() }
      await annotations.start(client: session.client, socket: session.socket, boardId: board.id)
      await presences.start(socket: session.socket, route: "/presence?boardId=\(board.id)") { try await session.client.presence(boardId: board.id) }
    }
    .onChange(of: apps.items.map(\.id)) { _, ids in
      // Players of deleted videos stop
      videos.keep(only: Set(ids))
      zoomToCreated()
    }
    .onChange(of: lastCreated?.at) { _, _ in
      // The apps may already be here when the hub's answer comes
      zoomToCreated()
    }
    .onChange(of: hasScreenShares, initial: true) { _, has in
      // In the board's LiveKit room only while it has shared screens (the video costs
      // battery and data)
      if has && session.hasLiveKit { screens.start(client: session.client, boardId: board.id) } else { screens.stop() }
    }
    .onChange(of: videoSyncs) { before, now in
      // Videos follow the board's play, pause and seek (ours too, once more)
      for (id, sync) in now where before[id] != sync { videos.existing(id)?.apply(sync) }
    }
    .onDisappear {
      videos.keep(only: [])
      texts.stop()
      screens.stop()
      apps.stop()
      presences.stop()
      users.stop()
      annotations.stop()
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
    Task { await create(documents) }
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
    fit(apps.items)
  }

  /// Frame apps at 75% of the view (the web's fitApps)
  private func fit(_ shown: [SageApp]) {
    guard viewSize.width > 0, viewSize.height > 0, !shown.isEmpty else { return }
    let frames = shown.map { CGRect(x: $0.data.position.x, y: $0.data.position.y, width: $0.data.size.width, height: $0.data.size.height) }
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
    if let target = app(at: location), ["WebpageLink", "BoardLink", "AssetLink"].contains(target.data.type) { return open(target) }
    if let target = app(at: location), target.data.type == "Stickie", canEditText(of: target) { return editingStickie = target }
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

  // MARK: The ring menu

  enum RingPanel: String, Identifiable {
    case map, apps, users
    var id: String { rawValue }
  }

  private var ringItems: [RadialMenu.Item] {
    [
      .init(label: "Files", symbol: "folder") { showingFiles = true },
      .init(label: "Map", symbol: "map") { panel = .map },
      .init(label: "Annotate", symbol: "pencil.tip.crop.circle", enabled: session.canAnnotate && annotations.live) { annotating = true },
      .init(label: "Apps", symbol: "square.grid.2x2", enabled: session.canMoveApps && !newAppChoices.isEmpty) { panel = .apps },
      .init(label: "Users", symbol: "person.2") { panel = .users },
    ]
  }

  /// The apps the menu adds: the ones this app can make, among those the hub offers
  private var newAppChoices: [NewApp] {
    NewApp.blankTypes
      .filter { session.offeredApps?.contains($0) ?? true }
      .compactMap { NewApp.blank($0, userName: session.user?.data.name ?? "") }
  }

  /// Add an app where the ring menu was opened, in the closest free spot
  private func add(_ app: NewApp) {
    let others = apps.items.map { CGRect(x: $0.data.position.x, y: $0.data.position.y, width: $0.data.size.width, height: $0.data.size.height) }
    let spot = Placement.find(view: visibleBoard, apps: others, size: app.size, target: ringBoardPoint)
    let document = app.document(at: spot, roomId: board.data.roomId, boardId: board.id)
    Task { await create([document]) }
  }

  // MARK: New apps

  /// Create apps on the board (one, or a batch), remembering them to zoom to them
  private func create(_ documents: [JSONValue]) async {
    guard !documents.isEmpty else { return }
    let body = documents.count == 1 ? documents[0] : .object(["batch": .array(documents)])
    guard let reply = try? await session.socket?.request("/apps", method: "POST", body: body),
          let answer = try? JSONDecoder().decode(APIReply<JSONValue>.self, from: reply), answer.success
    else { return }
    // The hub answers with the created documents (one, or a list)
    let docs = answer.data?.array ?? (answer.data.map { [$0] } ?? [])
    let ids = docs.compactMap { $0["_id"]?.string }
    if !ids.isEmpty { lastCreated = (ids, Date()) }
  }

  /// Zoom to the apps last created here once they're all on the board, as the web does with
  /// zoomToNewApps: framed at 75% of the view, half a second after they arrive, and selected
  /// (the first of them, when several). Apps not arriving within 10 s are left alone.
  private func zoomToCreated() {
    guard zoomToNewApps, let created = lastCreated else { return }
    guard Date().timeIntervalSince(created.at) < 10 else { return lastCreated = nil }
    let arrived = apps.items.filter { created.ids.contains($0.id) }
    guard arrived.count == created.ids.count else { return }
    lastCreated = nil
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
      fit(arrived)
      selectedId = arrived.first?.id
    }
  }

  /// Move the board so a point of it is in the middle of the screen
  private func center(on point: CGPoint) {
    withAnimation(.easeInOut(duration: 0.3)) {
      offset = CGPoint(x: viewSize.width / 2 / scale - point.x, y: viewSize.height / 2 / scale - point.y)
    }
  }

  // MARK: Clocks, timers, and links

  /// The selected app's own buttons, in its toolbar
  private func actions(for app: SageApp) -> [AppToolbar.Action] {
    switch app.data.type {
    case "Clock":
      guard session.canMoveApps else { return [] }
      let is24Hour = app.data.state?["is24Hour"] == .bool(true)
      return [.init(label: is24Hour ? "12-Hour Time" : "24-Hour Time", symbol: is24Hour ? "clock" : "24.circle") { sendState(app.id, ["is24Hour": .bool(!is24Hour)]) }]
    case "Timer":
      guard session.canMoveApps else { return [] }
      let timer = TimerState(app.data.state)
      // As the web's Timer: the minute buttons set the reset value too, and only while stopped
      let adjust = { (seconds: Int) in
        sendState(app.id, ["total": .number(Double(timer.total + seconds)), "originalTotal": .number(Double(timer.total + seconds))])
      }
      return [
        .init(label: "Minus a Minute", symbol: "minus", enabled: !timer.isRunning) { adjust(-60) },
        .init(label: "Plus a Minute", symbol: "plus", enabled: !timer.isRunning) { adjust(60) },
        .init(label: timer.isRunning ? "Pause" : "Start", symbol: timer.isRunning ? "pause.fill" : "play.fill") {
          let now = videos.clock.now
          sendState(app.id, [
            "clientStartTime": .number((now / 1000).rounded(.down)),
            "total": .number(Double(timer.remaining(at: now))),
            "isRunning": .bool(!timer.isRunning),
          ])
        },
        .init(label: "Reset", symbol: "arrow.counterclockwise") {
          sendState(app.id, ["isRunning": .bool(false), "total": .number(Double(timer.originalTotal))])
        },
      ]
    case "Stickie":
      guard session.canMoveApps else { return [] }
      // As the web's Stickie toolbar: font size by 8, and a lock that stops changes
      let locked = app.data.state?["lock"] == .bool(true)
      let fontSize = app.data.state?["fontSize"]?.number ?? 24
      return [
        .init(label: "Edit Text", symbol: "pencil", enabled: canEditText(of: app)) { editingStickie = app },
        .init(label: "Smaller Text", symbol: "textformat.size.smaller", enabled: !locked && fontSize > 8) { sendState(app.id, ["fontSize": .number(fontSize - 8)]) },
        .init(label: "Larger Text", symbol: "textformat.size.larger", enabled: !locked && fontSize <= 128) { sendState(app.id, ["fontSize": .number(fontSize + 8)]) },
        .init(label: locked ? "Unlock" : "Lock", symbol: locked ? "lock.fill" : "lock.open") { sendState(app.id, ["lock": .bool(!locked)]) },
      ]
    case "WebpageLink", "BoardLink":
      return [.init(label: "Open", symbol: "arrow.up.forward.square") { open(app) }]
    case "AssetLink":
      return [.init(label: "Share", symbol: "square.and.arrow.up") { open(app) }]
    default:
      return []
    }
  }

  /// A Stickie's text can change: the user may change apps, and it's not locked
  private func canEditText(of app: SageApp) -> Bool {
    session.canMoveApps && app.data.state?["lock"] != .bool(true)
  }

  /// Open a link app: a web page in Safari, a board of this hub here (another hub's in
  /// Safari), a file in the share sheet
  private func open(_ app: SageApp) {
    switch app.data.type {
    case "WebpageLink":
      if let url = app.data.state?["url"]?.string.flatMap(URL.init(string:)) { openURL(url) }
    case "BoardLink":
      guard let address = BoardLinkAddress(app.data.state?["url"]?.string) else { return linkProblem = "The board's address is not valid." }
      guard address.host == session.client.base.host else { return openURL(address.web) }
      Task {
        guard let board = try? await session.client.board(id: address.boardId) else { return linkProblem = "The board no longer exists." }
        if board.data.isPrivate == true && board.data.ownerId != session.user?.id {
          return linkProblem = "The board is private: open it from its room, with its PIN."
        }
        linkedBoard = board
        linkedBoardId = board.id
      }
    case "AssetLink":
      guard let asset = app.data.state?["assetid"]?.string.flatMap({ assets.asset($0) }) else { return }
      Task {
        do { sharing = try await session.client.download(asset) } catch { linkProblem = error.localizedDescription }
      }
    default:
      break
    }
  }

  private var hasScreenShares: Bool { apps.items.contains { $0.data.type == "LocalScreenshare" } }

  /// Every video's shared playback state
  private var videoSyncs: [String: VideoSync] {
    Dictionary(uniqueKeysWithValues: apps.items.filter { $0.data.type == "VideoViewer" }.map { ($0.id, VideoSync($0.data.state)) })
  }

  /// Send an app's state fields to the board (a video's play, a timer's start, ...), as
  /// the web's updateState: shown here at once, and undone if the hub refuses
  private func sendState(_ id: String, _ fields: [String: JSONValue]) {
    guard session.canMoveApps, let before = apps.items.first(where: { $0.id == id })?.data.state else { return }
    apps.updateLocally(id) { doc in
      for (key, value) in fields { doc.data.state = (doc.data.state ?? .object([:])).setting(key, to: value) }
    }
    let body = JSONValue.object(Dictionary(uniqueKeysWithValues: fields.map { ("state.\($0.key)", $0.value) }))
    Task {
      let reply = try? await session.socket?.request("/apps/\(id)", method: "PUT", body: body)
      let accepted = reply.flatMap { try? JSONDecoder().decode(APIReply<JSONValue>.self, from: $0) }?.success ?? false
      if !accepted { apps.updateLocally(id) { $0.data.state = before } }
    }
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
      guard !pinching, resizing == nil else { return }
      // On the background: the ring menu, there
      if app(at: start) == nil, !annotating {
        ringBoardPoint = boardPoint(start)
        withAnimation(.easeOut(duration: 0.15)) { ringAt = start }
        return UIImpactFeedbackGenerator(style: .medium).impactOccurred()
      }
      guard let target = app(at: start), canChange(target) else { return }
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

/// The selected app's toolbar, at the bottom of the board: its own controls (a PDF's
/// pages), and a close button that deletes it (its name is in the board's toolbar)
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

  var pages: Pages?
  /// A video's player on this device
  var video: VideoPlayback?
  /// The app's own buttons (a clock, a timer, a link)
  struct Action {
    var label: String
    var symbol: String
    var enabled = true
    var run: () -> Void
  }
  var actions: [Action] = []
  /// nil: this user may not delete apps
  var onClose: (() -> Void)?
  // On a phone, the first and last page buttons give way
  @Environment(\.horizontalSizeClass) private var sizeClass

  var body: some View {
    HStack(spacing: 2) {
      if let pages {
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
      if let video {
        button("Back to Start", "backward.end.fill", enabled: true) { video.restart() }
        button(video.loops ? "Stop Looping" : "Loop", video.loops ? "repeat.circle.fill" : "repeat", enabled: true) { video.toggleLoop() }
        button(video.isPlaying ? "Pause" : "Play", video.isPlaying ? "pause.fill" : "play.fill", enabled: true) { video.togglePlay() }
        button(video.isMuted ? "Unmute" : "Mute", video.isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill", enabled: true) { video.isMuted.toggle() }
      }
      ForEach(actions.indices, id: \.self) { index in
        let action = actions[index]
        button(action.label, action.symbol, enabled: action.enabled, action: action.run)
      }
      if let onClose {
        if pages != nil || video != nil || !actions.isEmpty { Divider().frame(height: 22) }
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
