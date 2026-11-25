/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import CoreGraphics

/// Where to put a new app: the free spot closest to the center of the view (or a target
/// point), keeping `margin` around it and with at least half of it in view; in the
/// center when there's no such spot. A port of findAppPlacement in
/// libs/shared/src/lib/utils/placement.ts, so apps land where the web client would put them.
enum Placement {
  static let margin: CGFloat = 40
  static let minVisible: CGFloat = 0.5
  // Most rings of the outward search around the center
  private static let maxRings: CGFloat = 40

  static func find(view: CGRect, apps: [CGRect], size: CGSize, target: CGPoint? = nil) -> CGPoint {
    let center = target ?? CGPoint(x: view.midX, y: view.midY)
    let centered = CGPoint(x: (center.x - size.width / 2).rounded(), y: (center.y - size.height / 2).rounded())
    guard size.width > 0, size.height > 0 else { return centered }

    // Apps around the view, grown by the margin; one covering the whole view (a backdrop)
    // is ignored, or nothing would ever fit
    let reach = view.insetBy(dx: -size.width, dy: -size.height)
    let obstacles = apps
      .filter { !$0.contains(view) }
      .map { $0.insetBy(dx: -margin, dy: -margin) }
      .filter { $0.intersects(reach) }

    func isFree(_ spot: CGRect) -> Bool {
      let visible = spot.intersection(view)
      let share = visible.isNull ? 0 : (visible.width * visible.height) / (spot.width * spot.height)
      return share >= minVisible && !obstacles.contains { $0.intersects(spot) }
    }

    // Candidates: the center first; next to each app, just outside each of its sides
    // (lined up with its edges, centered on it, or level with the center); then rings
    // of positions around the center
    var candidates = [centered]
    for o in obstacles {
      let xs = [o.minX, o.maxX - size.width, o.minX + (o.width - size.width) / 2, centered.x]
      let ys = [o.minY, o.maxY - size.height, o.minY + (o.height - size.height) / 2, centered.y]
      for y in ys { candidates += [CGPoint(x: o.minX - size.width, y: y), CGPoint(x: o.maxX, y: y)] }
      for x in xs { candidates += [CGPoint(x: x, y: o.minY - size.height), CGPoint(x: x, y: o.maxY)] }
    }
    let radius = max(view.width, view.height) / 2
    let step = max(min(size.width, size.height) / 4, radius / maxRings, 10)
    var ring: CGFloat = 1
    while ring * step <= radius {
      let d = ring * step
      for k in stride(from: -ring, through: ring, by: 1) {
        let t = k * step
        candidates += [
          CGPoint(x: centered.x + t, y: centered.y - d), CGPoint(x: centered.x + t, y: centered.y + d),
          CGPoint(x: centered.x - d, y: centered.y + t), CGPoint(x: centered.x + d, y: centered.y + t),
        ]
      }
      ring += 1
    }

    // The free candidate closest to the center (the first one on a tie)
    var best: CGPoint?
    var bestDistance = CGFloat.infinity
    for candidate in candidates {
      let spot = CGRect(origin: CGPoint(x: candidate.x.rounded(), y: candidate.y.rounded()), size: size)
      let distance = hypot(spot.midX - center.x, spot.midY - center.y)
      if distance < bestDistance, isFree(spot) {
        best = spot.origin
        bestDistance = distance
      }
    }
    return best ?? centered
  }
}
