/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI
import UIKit

/// One app on the board. Images and stickies are drawn; every other app is a labeled
/// rectangle for now.
struct AppTile: View {
  let app: SageApp
  let scale: CGFloat
  let assets: AssetCache
  let client: HubClient

  var body: some View {
    switch app.data.type {
    case "Stickie": StickieTile(state: app.data.state, scale: scale)
    case "ImageViewer": ImageTile(app: app, scale: scale, assets: assets, client: client)
    default: PlaceholderTile(app: app, scale: scale)
    }
  }
}

/// A Stickie: its saved text on its color (live typing by others shows up once saved)
private struct StickieTile: View {
  let state: JSONValue?
  let scale: CGFloat

  var body: some View {
    let fontSize = (state?["fontSize"]?.number ?? 24) * scale
    ZStack(alignment: .topLeading) {
      SageColor.light(state?["color"]?.string ?? "yellow")
      if fontSize >= 2 {
        Text(state?["text"]?.string ?? "")
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
        Image(uiImage: image).resizable().scaledToFill()
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
