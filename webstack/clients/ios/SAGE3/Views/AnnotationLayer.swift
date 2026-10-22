/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

/// The whiteboard's shapes, drawn with Core Graphics the way the web whiteboard draws them
/// (Whiteboard/Line.tsx), above the apps: freehand lines as round strokes of their size,
/// rectangles and circles as outlines, arrows with triangular heads. Only the shapes on
/// screen are drawn.
struct AnnotationLayer: View {
  let annotations: AnnotationStore
  let offset: CGPoint
  let scale: CGFloat

  var body: some View {
    Canvas { context, size in
      let visible = CGRect(x: -offset.x, y: -offset.y, width: size.width / scale, height: size.height / scale)
      // Board coordinates to the screen
      context.scaleBy(x: scale, y: scale)
      context.translateBy(x: offset.x, y: offset.y)
      for shape in annotations.shapes where shape.bounds.intersects(visible) {
        draw(shape, in: &context)
      }
    }
    .allowsHitTesting(false)
  }

  private func draw(_ shape: AnnotationShape, in context: inout GraphicsContext) {
    let color = SageColor.person(shape.color ?? "red")
    let points = shape.points
    switch shape.kind {
    case .line:
      var path = Path()
      path.addLines(points)
      if points.count == 1, let point = points.first {
        path = Path(ellipseIn: CGRect(x: point.x - shape.size / 2, y: point.y - shape.size / 2, width: shape.size, height: shape.size))
        context.fill(path, with: .color(color.opacity(shape.alpha)))
      } else {
        context.stroke(path, with: .color(color.opacity(shape.alpha)), style: StrokeStyle(lineWidth: shape.size, lineCap: .round, lineJoin: .round))
      }
    case .rectangle:
      context.stroke(Path(boundingBox(points)), with: .color(color.opacity(shape.alpha)), style: StrokeStyle(lineWidth: shape.size, lineCap: .butt, lineJoin: .miter))
    case .circle:
      guard points.count >= 2 else { return }
      let box = boundingBox(Array(points.prefix(2)))
      context.stroke(Path(ellipseIn: box), with: .color(color.opacity(shape.alpha)), style: StrokeStyle(lineWidth: shape.size))
    case .arrow, .doubleArrow:
      guard points.count >= 2 else { return }
      let start = points[0], end = points[1]
      var layer = context
      layer.opacity = shape.alpha
      var line = Path()
      line.move(to: start)
      line.addLine(to: end)
      layer.stroke(line, with: .color(color), style: StrokeStyle(lineWidth: shape.size, lineCap: .round))
      layer.fill(arrowHead(at: end, from: start, size: shape.size), with: .color(color))
      if shape.kind == .doubleArrow {
        layer.fill(arrowHead(at: start, from: end, size: shape.size), with: .color(color))
      }
    }
  }

  private func boundingBox(_ points: [CGPoint]) -> CGRect {
    let xs = points.map(\.x), ys = points.map(\.y)
    return CGRect(x: xs.min() ?? 0, y: ys.min() ?? 0, width: (xs.max() ?? 0) - (xs.min() ?? 0), height: (ys.max() ?? 0) - (ys.min() ?? 0))
  }

  /// The web's SVG marker: a triangle 5 widths long and wide, centered on the end point
  private func arrowHead(at tip: CGPoint, from start: CGPoint, size: CGFloat) -> Path {
    let angle = atan2(tip.y - start.y, tip.x - start.x)
    let length = 5 * size
    let transform = CGAffineTransform(translationX: tip.x, y: tip.y).rotated(by: angle)
    var head = Path()
    head.move(to: CGPoint(x: length / 2, y: 0))
    head.addLine(to: CGPoint(x: -length / 2, y: -length / 2))
    head.addLine(to: CGPoint(x: -length / 2, y: length / 2))
    head.closeSubpath()
    return head.applying(transform)
  }
}
