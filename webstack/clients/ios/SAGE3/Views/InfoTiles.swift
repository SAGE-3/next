/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */


import SwiftUI

// The Clock, the Timer, and the link apps (web page, board, file), drawn as the web
// client draws them. Their controls are in the selected app's toolbar (BoardView).

/// A Clock: the time in its time zone (the device's when it has none), in its color
struct ClockTile: View {
  let app: SageApp
  @Environment(\.colorScheme) private var colorScheme

  private var zone: TimeZone {
    app.data.state?["timeZone"]?.string.flatMap { TimeZone(identifier: $0) } ?? .current
  }
  private var is24Hour: Bool { app.data.state?["is24Hour"] == .bool(true) }

  var body: some View {
    GeometryReader { geometry in
      // The web's clock face is 320×132, scaled to fit
      let k = min(geometry.size.width / 320, geometry.size.height / 132)
      TimelineView(.everyMinute) { context in
        let parts = Calendar.current.dateComponents(in: zone, from: context.date)
        let hour = parts.hour ?? 0
        let shown = is24Hour ? hour : (hour % 12 == 0 ? 12 : hour % 12)
        // The rows at the web's clock face positions (time zone, time, date)
        let center = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)
        ZStack {
          Text(zone.identifier.replacingOccurrences(of: "_", with: " "))
            .font(.system(size: 14 * k, design: .monospaced))
            .position(x: center.x, y: center.y - 38 * k)
          HStack(alignment: .firstTextBaseline, spacing: 6 * k) {
            Text("\(shown):\(String(format: "%02d", parts.minute ?? 0))")
              .font(.system(size: 62 * k, weight: .semibold, design: .monospaced))
              .foregroundStyle(SageColor.person(app.data.state?["color"]?.string ?? "green"))
            Text(is24Hour ? "24H" : (hour >= 12 ? "PM" : "AM"))
              .font(.system(size: 16 * k, design: .monospaced))
          }
          .position(x: center.x, y: center.y + 2 * k)
          Text(context.date.formatted(Date.FormatStyle(date: .abbreviated, time: .omitted, timeZone: zone)))
            .font(.system(size: 14 * k, design: .monospaced))
            .position(x: center.x, y: center.y + 40 * k)
        }
        .lineLimit(1)
        .frame(width: geometry.size.width, height: geometry.size.height)
      }
      .background(Color(light: 0xFFFFFF, dark: 0x171923))
      .overlay(RoundedRectangle(cornerRadius: 14 * k).stroke(Color(light: 0xEEEEEE, dark: 0x2A2A2A), lineWidth: 2 * k).padding(6 * k))
    }
  }
}

/// A Timer's shared state, the web's fields: the seconds left when it was last started or
/// paused (total), that moment in server seconds (clientStartTime), and the reset value
struct TimerState {
  var total: Int
  var originalTotal: Int
  var clientStartTime: Int
  var isRunning: Bool

  init(_ state: JSONValue?) {
    total = Int(state?["total"]?.number ?? 300)
    originalTotal = Int(state?["originalTotal"]?.number ?? 300)
    clientStartTime = Int(state?["clientStartTime"]?.number ?? 0)
    isRunning = state?["isRunning"] == .bool(true)
  }

  /// Seconds left at a server time (ms); below zero once it's over
  func remaining(at now: Double) -> Int {
    isRunning ? total - (Int((now / 1000).rounded(.down)) - clientStartTime) : total
  }

  /// hh:mm:ss, as the web shows it (no sign past zero, in red instead)
  static func format(_ seconds: Int) -> String {
    let s = abs(seconds)
    return String(format: "%02d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
  }
}

/// A Timer: the time left, green, orange in the last minute, red past zero
struct TimerTile: View {
  let app: SageApp
  let clock: ServerClock?

  var body: some View {
    let timer = TimerState(app.data.state)
    GeometryReader { geometry in
      TimelineView(.periodic(from: .now, by: timer.isRunning ? 0.25 : 3600)) { _ in
        let left = timer.remaining(at: clock?.now ?? Date().timeIntervalSince1970 * 1000)
        Text(TimerState.format(left))
          .font(.system(size: geometry.size.width / 5.5, weight: .medium, design: .monospaced))
          .foregroundStyle(Color(hex: left < 0 ? 0xC53030 : left < 60 ? 0xC05621 : 0x2F855A))
          .lineLimit(1)
          .minimumScaleFactor(0.3)
          .padding(.horizontal, geometry.size.width * 0.04)
          .frame(width: geometry.size.width, height: geometry.size.height)
      }
    }
    .background(Color(light: 0xFFFFFF, dark: 0x2D3748))
  }
}

/// The link apps' card, as the web draws them: a colored picture on top (250 of 375
/// points), the title and a line below, all scaled to the app's size
private struct LinkCard<Picture: View>: View {
  let color: Color
  let title: String
  let subtitle: String
  @ViewBuilder let picture: () -> Picture

  var body: some View {
    GeometryReader { geometry in
      let k = geometry.size.width / 400
      VStack(spacing: 0) {
        ZStack { color; picture() }
          .frame(height: geometry.size.height * 250 / 375)
          .clipped()
        Rectangle().fill(Color(light: 0xCBD5E0, dark: 0x4A5568)).frame(height: 4 * k)
        VStack(alignment: .leading, spacing: 4 * k) {
          Text(title).font(.system(size: 26 * k, weight: .bold))
          Text(subtitle).font(.system(size: 16 * k)).foregroundStyle(.secondary)
        }
        .lineLimit(1)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(12 * k)
        .background(LinearGradient(colors: [Color(light: 0xFFFFFF, dark: 0x303030), Color(light: 0xF3F3F3, dark: 0x262626)], startPoint: .top, endPoint: .bottom))
      }
    }
  }
}

/// A white symbol in a card's picture, at the same share of it whatever the zoom
private struct CardSymbol: View {
  let name: String

  var body: some View {
    GeometryReader { geometry in
      let side = min(geometry.size.width, geometry.size.height) * 0.45
      Image(systemName: name)
        .resizable()
        .scaledToFit()
        .foregroundStyle(.white)
        .frame(width: side, height: side)
        .frame(width: geometry.size.width, height: geometry.size.height)
    }
  }
}

/// A web page link: its preview picture, title, and description (the page's metadata)
struct WebpageLinkTile: View {
  let app: SageApp

  var body: some View {
    let meta = app.data.state?["meta"]
    let url = app.data.state?["url"]?.string ?? ""
    LinkCard(color: Color(hex: 0xF56565), title: meta?["title"]?.string ?? url, subtitle: meta?["description"]?.string ?? "No Description") {
      if let image = meta?["image"]?.string.flatMap(URL.init(string:)) {
        AsyncImage(url: image) { picture in
          picture.resizable().scaledToFit()
        } placeholder: {
          ProgressView()
        }
      } else {
        CardSymbol(name: "safari")
      }
    }
  }
}

/// A board link's address: the hub, and the room and board it enters
/// (https://host/#/enter/<room>/<board>, or sage3://)
struct BoardLinkAddress {
  var host: String
  var roomId: String
  var boardId: String
  var web: URL

  init?(_ link: String?) {
    guard let link, let web = URL(string: link.replacingOccurrences(of: "sage3://", with: "https://")), let host = web.host else { return nil }
    let path = (web.fragment ?? web.path).split(separator: "/").map(String.init)
    guard let enter = path.firstIndex(of: "enter"), path.count > enter + 2 else { return nil }
    self.host = host
    self.web = web
    roomId = path[enter + 1]
    boardId = path[enter + 2]
  }
}

/// A board link: the board's apps as a map (a lock when private), its name and description
struct BoardLinkTile: View {
  let app: SageApp
  let client: HubClient
  @State private var board: Board?
  @State private var apps: [SageApp] = []

  private var address: BoardLinkAddress? { BoardLinkAddress(app.data.state?["url"]?.string) }
  private var here: Bool { address?.host == client.base.host }

  var body: some View {
    let title = here ? (board?.data.name ?? app.data.state?["cardTitle"]?.string ?? "Board") : (app.data.state?["cardTitle"]?.string ?? "Board")
    let subtitle = here ? (board?.data.description ?? "") : "On \(address?.host ?? "another hub")"
    LinkCard(color: Color(hex: 0x4299E1), title: title, subtitle: subtitle) {
      if !here {
        CardSymbol(name: "arrow.up.forward.app")
      } else if board?.data.isPrivate == true {
        CardSymbol(name: "lock.fill")
      } else {
        BoardMap(apps: apps).padding(8)
      }
    }
    .task(id: address?.boardId) {
      guard here, let id = address?.boardId else { return }
      board = try? await client.board(id: id)
      if board?.data.isPrivate != true { apps = (try? await client.apps(boardId: id)) ?? [] }
    }
  }
}

/// A board's apps as light rectangles, fitted in the space
private struct BoardMap: View {
  let apps: [SageApp]

  var body: some View {
    GeometryReader { geometry in
      let frames = apps.map { CGRect(x: $0.data.position.x, y: $0.data.position.y, width: $0.data.size.width, height: $0.data.size.height) }
      if let all = frames.reduce(nil, { ($0 ?? $1).union($1) as CGRect? }), all.width > 0, all.height > 0 {
        let k = min(geometry.size.width / all.width, geometry.size.height / all.height)
        let dx = (geometry.size.width - all.width * k) / 2
        let dy = (geometry.size.height - all.height * k) / 2
        ForEach(frames.indices, id: \.self) { index in
          let frame = frames[index]
          RoundedRectangle(cornerRadius: 2)
            .fill(Color(hex: 0xEDF2F7))
            .overlay(RoundedRectangle(cornerRadius: 2).stroke(.gray, lineWidth: 1))
            .frame(width: frame.width * k, height: frame.height * k)
            .position(x: dx + (frame.midX - all.minX) * k, y: dy + (frame.midY - all.minY) * k)
        }
      } else {
        Text("This board has no opened applications.")
          .font(.headline)
          .foregroundStyle(.white)
          .multilineTextAlignment(.center)
          .frame(width: geometry.size.width, height: geometry.size.height)
      }
    }
  }
}

/// A file link: the file's kind, name, and size
struct AssetLinkTile: View {
  let app: SageApp
  let assets: AssetCache

  var body: some View {
    let asset = app.data.state?["assetid"]?.string.flatMap { assets.asset($0) }
    let size = asset?.data.size.map { ByteCountFormatter.string(fromByteCount: Int64($0), countStyle: .file) }
    LinkCard(color: Color(hex: 0xED8936), title: asset?.data.originalfilename ?? "File", subtitle: size.map { "Size: \($0)" } ?? "") {
      CardSymbol(name: asset?.symbol ?? "doc")
    }
  }
}
