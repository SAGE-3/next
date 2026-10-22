/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import PencilKit
import SwiftUI
import UIKit

/// Drawing on the board with PencilKit (Apple Pencil pressure and palm rejection, or a
/// finger). Each finished stroke becomes a shape in the web whiteboard's format and goes to
/// the board's annotations for everyone; the canvas only shows the stroke being drawn.
/// With the eraser, tapping a shape erases it, as on the web.
struct AnnotateOverlay: View {
  let annotations: AnnotationStore
  let userId: String?
  /// The user's color: the pen's first color, as on the web
  var userColor: String?
  let offset: CGPoint
  let scale: CGFloat
  let done: () -> Void

  // The marker, remembered between boards (the web's defaults: red, 8, 60%)
  @AppStorage("sage3.marker.color") private var color = ""
  @AppStorage("sage3.marker.size") private var size = 8.0
  @AppStorage("sage3.marker.opacity") private var opacity = 0.6
  @State private var erasing = false
  // On a phone, the colors fold into a menu
  @Environment(\.horizontalSizeClass) private var sizeClass
  // The web whiteboard's choices (Interactionbar.tsx)
  private static let sizes: [Double] = [1, 3, 5, 8, 12, 20, 32, 60, 90, 120]
  private static let opacities: [Double] = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

  /// The pen's color: the one picked, else the user's (as on the web), else red
  private var penColor: String {
    if !color.isEmpty { return color }
    if let userColor, SageColor.names.contains(userColor) { return userColor }
    return "red"
  }

  var body: some View {
    ZStack(alignment: .top) {
      if erasing {
        Color.clear
          .contentShape(Rectangle())
          .onTapGesture { erase(at: $0) }
      } else {
        PencilCanvas(color: SageColor.person(penColor).opacity(opacity), width: size * scale) { stroke in
          commit(stroke)
        }
      }
      palette.padding(.top, 8)
    }
  }

  private var palette: some View {
    HStack(spacing: 10) {
      if sizeClass == .compact {
        Menu {
          ForEach(SageColor.names, id: \.self) { name in
            Button {
              color = name
              erasing = false
            } label: {
              Label(name.capitalized, systemImage: penColor == name ? "checkmark.circle.fill" : "circle.fill")
            }
          }
        } label: {
          Circle()
            .fill(SageColor.person(penColor))
            .frame(width: 26, height: 26)
            .overlay(Circle().strokeBorder(.primary, lineWidth: erasing ? 0 : 2))
        }
        .accessibilityLabel("Color")
      } else {
        ForEach(SageColor.names, id: \.self) { name in
          Button {
            color = name
            erasing = false
          } label: {
            Circle()
              .fill(SageColor.person(name))
              .frame(width: 24, height: 24)
              .overlay(Circle().strokeBorder(.primary, lineWidth: penColor == name && !erasing ? 3 : 0))
          }
          .accessibilityLabel(name.capitalized)
        }
      }
      Divider().frame(height: 24)
      Menu {
        Picker("Size", selection: $size) {
          ForEach(Self.sizes, id: \.self) { value in Text("\(Int(value))").tag(value) }
        }
      } label: {
        HStack(spacing: 3) {
          Image(systemName: "lineweight")
          Text("\(Int(size))").font(.caption.monospacedDigit())
        }
        .frame(height: 28)
      }
      .accessibilityLabel("Size")
      Menu {
        Picker("Opacity", selection: $opacity) {
          ForEach(Self.opacities, id: \.self) { value in Text("\(Int((value * 100).rounded()))%").tag(value) }
        }
      } label: {
        HStack(spacing: 3) {
          Image(systemName: "circle.lefthalf.filled")
          Text("\(Int((opacity * 100).rounded()))%").font(.caption.monospacedDigit())
        }
        .frame(height: 28)
      }
      .accessibilityLabel("Opacity")
      Button { erasing.toggle() } label: {
        Image(systemName: "eraser").frame(width: 28, height: 28)
          .background(erasing ? Color.accentColor.opacity(0.25) : .clear, in: RoundedRectangle(cornerRadius: 6))
      }
      .accessibilityLabel("Eraser")
      Divider().frame(height: 24)
      Button("Done", action: done).font(.headline)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(.regularMaterial, in: Capsule())
    .shadow(color: .black.opacity(0.2), radius: 4, y: 2)
  }

  // MARK: Strokes

  /// A finished stroke, in screen points: to board coordinates, simplified and rounded as
  /// the web whiteboard does (simplify-js at 0.5 screen pixels, then 0.1 board units)
  private func commit(_ screen: [CGPoint]) {
    guard !screen.isEmpty else { return }
    let board = screen.map { CGPoint(x: $0.x / scale - offset.x, y: $0.y / scale - offset.y) }
    let simplified = board.count > 2 ? Simplify.douglasPeucker(board, tolerance: 0.5 / scale) : board
    let flat = simplified.flatMap { [round1($0.x), round1($0.y)] }
    let shape = JSONValue.object([
      "id": .string(Self.newId()),
      "type": .string("line"),
      "points": .array(flat.map { JSONValue.number($0) }),
      "userColor": .string(penColor),
      "alpha": .number(opacity),
      "size": .number(size),
      "isComplete": .bool(true),
      "userId": userId.map { JSONValue.string($0) } ?? .null,
      "text": .string(""),
    ])
    annotations.add(shape)
  }

  private func round1(_ value: CGFloat) -> Double { (Double(value) * 10).rounded() / 10 }

  /// The web whiteboard's ids: time and randomness in base 36
  private static func newId() -> String {
    let time = String(Int(Date().timeIntervalSince1970 * 1000), radix: 36)
    let random = (0..<8).map { _ in String("0123456789abcdefghijklmnopqrstuvwxyz".randomElement()!) }.joined()
    return "\(time)-\(random)"
  }

  /// Erase the topmost shape under a tap
  private func erase(at location: CGPoint) {
    let point = CGPoint(x: location.x / scale - offset.x, y: location.y / scale - offset.y)
    let slack = 10 / scale
    let hit = annotations.shapes.last { shape in
      guard shape.bounds.insetBy(dx: -slack, dy: -slack).contains(point) else { return false }
      return shape.distance(to: point) <= shape.size / 2 + slack
    }
    if let hit { annotations.remove(id: hit.id) }
  }
}

/// A transparent PencilKit canvas: shows the stroke being drawn and hands each finished
/// one over, as screen points, then clears it
private struct PencilCanvas: UIViewRepresentable {
  let color: Color
  let width: CGFloat
  let finished: ([CGPoint]) -> Void

  func makeUIView(context: Context) -> PKCanvasView {
    let canvas = PKCanvasView()
    canvas.backgroundColor = .clear
    canvas.isOpaque = false
    canvas.drawingPolicy = .anyInput  // a finger draws too
    canvas.isScrollEnabled = false
    canvas.delegate = context.coordinator
    canvas.tool = PKInkingTool(.pen, color: UIColor(color), width: width)
    return canvas
  }

  func updateUIView(_ canvas: PKCanvasView, context: Context) {
    context.coordinator.finished = finished
    canvas.tool = PKInkingTool(.pen, color: UIColor(color), width: width)
  }

  func makeCoordinator() -> Coordinator { Coordinator(finished: finished) }

  final class Coordinator: NSObject, PKCanvasViewDelegate {
    var finished: ([CGPoint]) -> Void

    init(finished: @escaping ([CGPoint]) -> Void) {
      self.finished = finished
    }

    func canvasViewDrawingDidChange(_ canvas: PKCanvasView) {
      let strokes = canvas.drawing.strokes
      guard !strokes.isEmpty else { return }
      for stroke in strokes {
        finished(stroke.path.map { $0.location.applying(stroke.transform) })
      }
      // The room draws it from now on
      canvas.drawing = PKDrawing()
    }
  }
}

/// Ramer–Douglas–Peucker, as simplify-js does with highQuality (no radial pass)
enum Simplify {
  static func douglasPeucker(_ points: [CGPoint], tolerance: CGFloat) -> [CGPoint] {
    guard points.count > 2 else { return points }
    var keep = [Bool](repeating: false, count: points.count)
    keep[0] = true
    keep[points.count - 1] = true
    var stack = [(0, points.count - 1)]
    let squared = tolerance * tolerance
    while let (first, last) = stack.popLast() {
      var farthest = 0
      var maxDistance: CGFloat = 0
      if last - first > 1 {
        for index in (first + 1)..<last {
          let distance = segmentDistanceSquared(points[index], points[first], points[last])
          if distance > maxDistance {
            maxDistance = distance
            farthest = index
          }
        }
      }
      if maxDistance > squared {
        keep[farthest] = true
        stack.append((first, farthest))
        stack.append((farthest, last))
      }
    }
    return points.indices.filter { keep[$0] }.map { points[$0] }
  }

  static func segmentDistanceSquared(_ p: CGPoint, _ a: CGPoint, _ b: CGPoint) -> CGFloat {
    var x = a.x, y = a.y
    let dx = b.x - x, dy = b.y - y
    if dx != 0 || dy != 0 {
      let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy)
      if t > 1 {
        x = b.x
        y = b.y
      } else if t > 0 {
        x += dx * t
        y += dy * t
      }
    }
    return (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y)
  }
}
