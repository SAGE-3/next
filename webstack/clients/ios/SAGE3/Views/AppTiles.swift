/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI
import UIKit

/// One app on the board. Images, PDFs, videos, stickies, clocks, timers, and links are
/// drawn; every other app is a labeled rectangle for now.
struct AppTile: View {
  let app: SageApp
  let scale: CGFloat
  let assets: AssetCache
  let client: HubClient
  var videos: VideoPlayers?
  /// The hub's clock (timers)
  var clock: ServerClock?
  /// The board's live app texts (Stickies)
  var texts: AppTextStore?
  /// The board's shared screens
  var screens: ScreenShareStore?

  var body: some View {
    switch app.data.type {
    case "Stickie": StickieTile(id: app.id, state: app.data.state, scale: scale, texts: texts)
    case "ImageViewer": ImageTile(app: app, scale: scale, assets: assets, client: client)
    case "PDFViewer": PDFTile(app: app, scale: scale, assets: assets, client: client)
    case "VideoViewer":
      if let videos { VideoTile(app: app, scale: scale, assets: assets, client: client, videos: videos) } else { PlaceholderTile(app: app, scale: scale) }
    case "Clock": ClockTile(app: app)
    case "Timer": TimerTile(app: app, clock: clock)
    case "WebpageLink": WebpageLinkTile(app: app)
    case "BoardLink": BoardLinkTile(app: app, client: client)
    case "AssetLink": AssetLinkTile(app: app, assets: assets)
    case "LocalScreenshare": ScreenShareTile(app: app, screens: screens)
    default: PlaceholderTile(app: app, scale: scale)
    }
  }
}

/// A Stickie: its text on its color, live as people type (the saved text until then)
private struct StickieTile: View {
  let id: String
  let state: JSONValue?
  let scale: CGFloat
  let texts: AppTextStore?

  var body: some View {
    let fontSize = (state?["fontSize"]?.number ?? 24) * scale
    // Redrawn at each change in the room
    let _ = texts?.version
    let text = texts?.text(id) ?? state?["text"]?.string ?? ""
    ZStack(alignment: .topLeading) {
      SageColor.light(state?["color"]?.string ?? "yellow")
      if fontSize >= 2 {
        Text(text)
          .font(.system(size: fontSize))
          .foregroundStyle(.black)
          .padding(12 * scale)
      }
    }
    .clipShape(RoundedRectangle(cornerRadius: 4 * scale))
  }
}

/// An ImageViewer: the image size that fits how large it is on screen
private struct ImageTile: View {
  let app: SageApp
  let scale: CGFloat
  let assets: AssetCache
  let client: HubClient
  @Environment(\.displayScale) private var displayScale

  var body: some View {
    let needed = app.data.size.width * scale * displayScale
    RemoteImage(url: imageURL(pixels: needed))
      .background(Color(.systemGray5))
  }

  /// assetid is an asset's id, or else a plain image URL (ImageViewer.tsx)
  private func imageURL(pixels: Double) -> URL? {
    guard let assetId = app.data.state?["assetid"]?.string, !assetId.isEmpty else { return nil }
    guard UUID(uuidString: assetId) != nil else { return URL(string: assetId) }
    guard let asset = assets.asset(assetId) else { return nil }
    // The smallest of the server's resized copies that is at least as wide as needed
    let sizes = (asset.data.derived?["sizes"]?.array ?? []).compactMap { size -> (width: Double, url: String)? in
      guard let width = size["width"]?.number, let url = size["url"]?.string else { return nil }
      return (width, url)
    }.sorted { $0.width < $1.width }
    let path = sizes.first(where: { $0.width >= pixels })?.url ?? sizes.last?.url ?? "/api/assets/static/\(asset.data.file)"
    if path.hasPrefix("http") { return URL(string: path) }
    return client.url(path)
  }
}

/// A PDFViewer: the pages the server made images of when the PDF was uploaded, as the web
/// client shows them (PDFViewer.tsx): displayPages pages side by side from currentPage,
/// each on a white card, each the image closest to the width it takes on screen
private struct PDFTile: View {
  let app: SageApp
  let scale: CGFloat
  let assets: AssetCache
  let client: HubClient
  @Environment(\.displayScale) private var displayScale

  var body: some View {
    let state = app.data.state
    let first = max(0, Int(state?["currentPage"]?.number ?? 0))
    let count = max(1, Int(state?["displayPages"]?.number ?? 1))
    let pages = pageImages()
    let shown = Array(pages.dropFirst(first).prefix(count))
    // Each page's share of the window, in device pixels
    let pagePixels = app.data.size.width / Double(count) * scale * displayScale
    if shown.isEmpty {
      // Not loaded yet, or its file is gone: the placeholder, not an empty white box
      PlaceholderTile(app: app, scale: scale)
    } else {
      HStack(spacing: 4 * scale) {
        ForEach(shown.indices, id: \.self) { index in
          RemoteImage(url: url(closestTo: pagePixels, in: shown[index]), fit: true)
            .padding(4 * scale)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 6 * scale))
            .shadow(color: .black.opacity(0.15), radius: 2 * scale, y: scale)
        }
      }
      .padding(4 * scale)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(Color.white.opacity(0.7))
    }
  }

  /// derived: one array of images (url, width) per page
  private func pageImages() -> [[(width: Double, url: String)]] {
    guard let assetId = app.data.state?["assetid"]?.string, let asset = assets.asset(assetId) else { return [] }
    return (asset.data.derived?.array ?? []).map { page in
      (page.array ?? []).compactMap { image in
        guard let width = image["width"]?.number, let url = image["url"]?.string else { return nil }
        return (width, url)
      }
    }
  }

  private func url(closestTo pixels: Double, in images: [(width: Double, url: String)]) -> URL? {
    guard let best = images.min(by: { abs($0.width - pixels) < abs($1.width - pixels) }) else { return nil }
    return best.url.hasPrefix("http") ? URL(string: best.url) : client.url(best.url)
  }
}

/// A VideoViewer: the server's copy of the video (derived.url), playing in step with the
/// board (controls in the selected app's toolbar)
private struct VideoTile: View {
  let app: SageApp
  let scale: CGFloat
  let assets: AssetCache
  let client: HubClient
  let videos: VideoPlayers

  var body: some View {
    if let url = videoURL() {
      let playback = videos.playback(for: app.id, url: url, sync: VideoSync(app.data.state))
      ZStack {
        Color.black
        PlayerLayerView(player: playback.player)
        if !playback.isPlaying {
          Image(systemName: "play.fill")
            .font(.system(size: max(12, min(app.data.size.width, app.data.size.height) * scale * 0.18)))
            .foregroundStyle(.white.opacity(0.85))
            .shadow(radius: 4)
        }
      }
    } else {
      PlaceholderTile(app: app, scale: scale)
    }
  }

  private func videoURL() -> URL? {
    guard let id = app.data.state?["assetid"]?.string, let asset = assets.asset(id) else { return nil }
    let path = asset.data.derived?["url"]?.string ?? "/api/assets/static/\(asset.data.file)"
    return path.hasPrefix("http") ? URL(string: path) : client.url(path)
  }
}

/// Any other app: its type and title, until it has a real view
private struct PlaceholderTile: View {
  let app: SageApp
  let scale: CGFloat

  private var symbol: String {
    switch app.data.type {
    case "VideoViewer": return "play.rectangle"
    case "PDFViewer", "DOCXViewer": return "doc.richtext"
    case "PPTXViewer": return "rectangle.on.rectangle"
    case "SageCell", "CodeEditor": return "chevron.left.forwardslash.chevron.right"
    case "Chat": return "bubble.left.and.bubble.right"
    case "WebpageLink", "Webview": return "globe"
    case "Screenshare", "LocalScreenshare": return "display"
    case "Map": return "map"
    case "Clock", "Timer": return "clock"
    case "AssetLink": return "doc"
    default: return "square.dashed"
    }
  }

  var body: some View {
    let size = max(10, min(app.data.size.width, app.data.size.height) * scale * 0.12)
    RoundedRectangle(cornerRadius: 6 * scale)
      .fill(Color(.systemGray5))  // opaque: apps underneath must not show through
      .overlay(RoundedRectangle(cornerRadius: 6 * scale).strokeBorder(Color.secondary.opacity(0.4), lineWidth: 1))
      .overlay {
        if size >= 11 {
          VStack(spacing: size * 0.3) {
            Image(systemName: symbol).font(.system(size: size * 1.4))
            Text(app.data.type).font(.system(size: size, weight: .semibold))
            if let title = app.data.title, !title.isEmpty, title != app.data.type {
              Text(title).font(.system(size: size * 0.8)).lineLimit(2).multilineTextAlignment(.center)
            }
          }
          .foregroundStyle(.secondary)
          .padding(size)
        }
      }
  }
}

/// An image loaded with the hub's session cookie. Keeps showing the current image while
/// a sharper one loads (zooming in picks a larger copy), and caches images in memory.
struct RemoteImage: View {
  let url: URL?
  /// Fit the whole image (PDF pages), rather than fill the frame (images, which the web
  /// client shows in a window of their own shape)
  var fit = false
  @State private var image: UIImage?
  @State private var loadedURL: URL?

  private static let cache: NSCache<NSURL, UIImage> = {
    let cache = NSCache<NSURL, UIImage>()
    cache.totalCostLimit = 150 * 1024 * 1024
    return cache
  }()

  var body: some View {
    ZStack {
      if let image {
        Image(uiImage: image).resizable().aspectRatio(contentMode: fit ? .fit : .fill)
      }
    }
    .clipped()
    .task(id: url) {
      guard let url, url != loadedURL else { return }
      if let cached = Self.cache.object(forKey: url as NSURL) {
        image = cached
        loadedURL = url
        return
      }
      guard let (data, _) = try? await URLSession.shared.data(from: url), let loaded = UIImage(data: data) else { return }
      Self.cache.setObject(loaded, forKey: url as NSURL, cost: data.count)
      image = loaded
      loadedURL = url
    }
  }
}
