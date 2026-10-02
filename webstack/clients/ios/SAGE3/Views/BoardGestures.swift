/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI
import UIKit

/// The board's touch handling, with UIKit's gesture recognizers (exact timing, and pinch
/// and pan together): tap, double tap, touch-and-hold then drag, one-finger pan, pinch.
/// Points are in the layer's coordinates, which match the board view's.
struct BoardGestures: UIViewRepresentable {
  enum Phase { case began, changed, ended }

  var onTap: (CGPoint) -> Void
  var onDoubleTap: (CGPoint) -> Void
  /// Touch and hold, then drag: where it started, and how far it has moved
  var onHold: (Phase, CGPoint, CGSize) -> Void
  /// One-finger pan: the movement since the last call, and where the finger is
  var onPan: (Phase, CGSize, CGPoint) -> Void
  /// Pinch: the zoom factor since the last call, around a point
  var onPinch: (Phase, CGFloat, CGPoint) -> Void

  /// How long to hold before an app is picked up
  static let holdDuration: TimeInterval = 0.3

  func makeUIView(context: Context) -> UIView {
    let view = UIView()
    view.backgroundColor = .clear
    let coordinator = context.coordinator

    let tap = UITapGestureRecognizer(target: coordinator, action: #selector(Coordinator.tap(_:)))
    let doubleTap = UITapGestureRecognizer(target: coordinator, action: #selector(Coordinator.doubleTap(_:)))
    doubleTap.numberOfTapsRequired = 2
    let hold = UILongPressGestureRecognizer(target: coordinator, action: #selector(Coordinator.hold(_:)))
    hold.minimumPressDuration = Self.holdDuration
    hold.allowableMovement = 10
    let pan = UIPanGestureRecognizer(target: coordinator, action: #selector(Coordinator.pan(_:)))
    pan.maximumNumberOfTouches = 1
    let pinch = UIPinchGestureRecognizer(target: coordinator, action: #selector(Coordinator.pinch(_:)))
    for recognizer in [tap, doubleTap, hold, pan, pinch] as [UIGestureRecognizer] {
      recognizer.delegate = coordinator
      view.addGestureRecognizer(recognizer)
    }
    return view
  }

  func updateUIView(_ view: UIView, context: Context) {
    context.coordinator.gestures = self
  }

  func makeCoordinator() -> Coordinator { Coordinator(self) }

  final class Coordinator: NSObject, UIGestureRecognizerDelegate {
    var gestures: BoardGestures
    private var holdStart = CGPoint.zero
    private var panLast = CGPoint.zero

    init(_ gestures: BoardGestures) {
      self.gestures = gestures
    }

    @objc func tap(_ recognizer: UITapGestureRecognizer) {
      gestures.onTap(recognizer.location(in: recognizer.view))
    }

    @objc func doubleTap(_ recognizer: UITapGestureRecognizer) {
      gestures.onDoubleTap(recognizer.location(in: recognizer.view))
    }

    @objc func hold(_ recognizer: UILongPressGestureRecognizer) {
      let location = recognizer.location(in: recognizer.view)
      switch recognizer.state {
      case .began:
        holdStart = location
        gestures.onHold(.began, location, .zero)
      case .changed:
        gestures.onHold(.changed, holdStart, CGSize(width: location.x - holdStart.x, height: location.y - holdStart.y))
      case .ended, .cancelled, .failed:
        gestures.onHold(.ended, holdStart, CGSize(width: location.x - holdStart.x, height: location.y - holdStart.y))
      default:
        break
      }
    }

    @objc func pan(_ recognizer: UIPanGestureRecognizer) {
      let translation = recognizer.translation(in: recognizer.view)
      let location = recognizer.location(in: recognizer.view)
      switch recognizer.state {
      case .began:
        panLast = translation
        gestures.onPan(.began, .zero, location)
      case .changed:
        gestures.onPan(.changed, CGSize(width: translation.x - panLast.x, height: translation.y - panLast.y), location)
        panLast = translation
      case .ended, .cancelled, .failed:
        gestures.onPan(.ended, .zero, location)
      default:
        break
      }
    }

    @objc func pinch(_ recognizer: UIPinchGestureRecognizer) {
      let location = recognizer.location(in: recognizer.view)
      switch recognizer.state {
      case .began:
        gestures.onPinch(.began, recognizer.scale, location)
        recognizer.scale = 1
      case .changed:
        gestures.onPinch(.changed, recognizer.scale, location)
        recognizer.scale = 1
      case .ended, .cancelled, .failed:
        gestures.onPinch(.ended, 1, location)
      default:
        break
      }
    }

    // Pinch and pan together; but a hold and a pan exclude each other: whichever starts
    // first wins, so moving an app never pans the board, and panning never picks one up
    // (only the board's own gestures: not the navigation's swipe back)
    func gestureRecognizer(_ recognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
      guard other.view === recognizer.view else { return false }
      let pair = [recognizer, other]
      let holdAndPan = pair.contains { $0 is UILongPressGestureRecognizer } && pair.contains { $0 is UIPanGestureRecognizer }
      return !holdAndPan
    }

    // The navigation's swipe back from anywhere on the screen (iOS 26) waits for the
    // board's gestures, so a drag on the board pans it; a swipe from the left edge still
    // goes back
    func gestureRecognizer(_ recognizer: UIGestureRecognizer, shouldBeRequiredToFailBy other: UIGestureRecognizer) -> Bool {
      guard #available(iOS 26.0, *), let navigation = navigationController(of: recognizer.view) else { return false }
      return other === navigation.interactiveContentPopGestureRecognizer
    }

    private func navigationController(of view: UIView?) -> UINavigationController? {
      guard let view else { return nil }
      return sequence(first: view as UIResponder, next: { $0.next }).lazy.compactMap { $0 as? UINavigationController }.first
    }
  }
}
