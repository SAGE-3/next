/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import AVFoundation
import AVFoundation
import Observation
import SwiftUI
import UIKit

/// A VideoViewer's shared playback, the web's state fields: the video position
/// (currentTime, s) and server time (syncServerTime, ms) of the last play, pause or seek,
/// whether it's paused, and whether it loops
struct VideoSync: Equatable {
  var paused: Bool
  var currentTime: Double
  var syncServerTime: Double?
  var loop: Bool

  init(_ state: JSONValue?) {
    paused = state?["paused"] != .bool(false)
    currentTime = state?["currentTime"]?.number ?? 0
    syncServerTime = state?["syncServerTime"]?.number
    loop = state?["loop"] == .bool(true)
  }

  /// Where the video should be now (the web's calcTarget)
  func target(now: Double, duration: Double?) -> Double {
    guard let syncServerTime, !paused else { return currentTime }
    let raw = max(0, currentTime + (now - syncServerTime) / 1000)
    guard let duration, duration > 0 else { return raw }
    return loop ? raw.truncatingRemainder(dividingBy: duration) : min(raw, duration)
  }
}

/// The hub's clock, as the web's localServerEpoch: the offset to this device's clock,
/// read once from /api/time (0 until then)
@MainActor
final class ServerClock {
  private var offset: Double?

  /// Server time now, in ms
  var now: Double { Date().timeIntervalSince1970 * 1000 + (offset ?? 0) }

  func start(_ client: HubClient) async {
    guard offset == nil else { return }
    let before = Date().timeIntervalSince1970 * 1000
    guard let epoch = try? await client.serverEpoch() else { return }
    let after = Date().timeIntervalSince1970 * 1000
    // Against the middle of the request, to halve the network delay's error
    offset = epoch - (before + after) / 2
  }
}

/// One video's player, following the board's shared state like the web's VideoViewer:
/// our actions play at once here, then go to the board; everyone's changes (and our
/// own coming back) seek only when the video is off by more than a little
@MainActor
@Observable
final class VideoPlayback {
  let player: AVPlayer
  private(set) var isPlaying = false
  private(set) var loops = false
  // Sound is this device's choice, as on the web
  var isMuted = true {
    didSet { player.isMuted = isMuted }
  }
  @ObservationIgnored private let clock: ServerClock
  /// Sends state fields to the board
  @ObservationIgnored private let send: ([String: JSONValue]) -> Void
  @ObservationIgnored private var wanted: VideoSync?
  @ObservationIgnored private var ready = false
  @ObservationIgnored private var drift: Timer?
  @ObservationIgnored private var observers: [NSKeyValueObservation] = []
  @ObservationIgnored private var end: NSObjectProtocol?

  init(url: URL, clock: ServerClock, send: @escaping ([String: JSONValue]) -> Void) {
    self.clock = clock
    self.send = send
    // Video files need the login's session cookie
    let cookies = HTTPCookieStorage.shared.cookies(for: url) ?? []
    let item = AVPlayerItem(asset: AVURLAsset(url: url, options: [AVURLAssetHTTPCookiesKey: cookies]))
    player = AVPlayer(playerItem: item)
    player.isMuted = true
    player.actionAtItemEnd = .pause
    observers.append(player.observe(\.timeControlStatus, options: [.initial, .new]) { [weak self] player, _ in
      let playing = player.timeControlStatus != .paused
      Task { @MainActor in self?.isPlaying = playing }
    })
    // The board's state waits for the video's length and seekable ranges
    observers.append(item.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
      let isReady = item.status == .readyToPlay
      Task { @MainActor in
        guard let self, isReady, !self.ready else { return }
        self.ready = true
        self.applyWanted()
      }
    })
    end = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main) { [weak self] _ in
      Task { @MainActor in self?.ended() }
    }
  }

  private var position: Double {
    let seconds = player.currentTime().seconds
    return seconds.isFinite ? seconds : 0
  }

  private var duration: Double? {
    guard let duration = player.currentItem?.duration, duration.isNumeric else { return nil }
    return duration.seconds
  }

  private func seek(to seconds: Double) {
    player.seek(to: CMTime(seconds: seconds, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
  }

  // MARK: The board's state

  /// Follow the board's state (at once, or once the video is ready)
  func apply(_ sync: VideoSync) {
    wanted = sync
    loops = sync.loop
    if ready { applyWanted() }
  }

  private func applyWanted() {
    guard let sync = wanted else { return }
    drift?.invalidate()
    drift = nil
    if sync.paused {
      player.pause()
      if abs(position - sync.currentTime) > 0.2 { seek(to: sync.currentTime) }
    } else {
      let target = sync.target(now: clock.now, duration: duration)
      if abs(position - target) > 0.3 { seek(to: target) }
      player.play()
      // Players drift apart (buffering, a busy device): check every 5 s, fix past 1 s
      guard sync.syncServerTime != nil else { return }
      drift = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
        Task { @MainActor in self?.correctDrift() }
      }
    }
  }

  private func correctDrift() {
    guard let sync = wanted, !sync.paused, player.timeControlStatus != .paused else { return }
    let target = sync.target(now: clock.now, duration: duration)
    if abs(position - target) > 1.0 { seek(to: target) }
  }

  private func ended() {
    if loops {
      seek(to: 0)
      player.play()
    } else {
      // Back to the start, paused, for everyone (as the web does)
      send(["paused": .bool(true), "currentTime": .number(0), "syncServerTime": .number(clock.now)])
    }
  }

  // MARK: Our actions: here first, then the board

  func togglePlay() {
    if isPlaying {
      player.pause()
      send(["paused": .bool(true), "currentTime": .number(position), "syncServerTime": .number(clock.now)])
    } else {
      // At the end: start again
      var from = position
      if let duration, from >= duration - 0.05 {
        from = 0
        seek(to: 0)
      }
      player.play()
      send(["paused": .bool(false), "currentTime": .number(from), "syncServerTime": .number(clock.now)])
    }
  }

  /// Seek to the start, keeping it playing or paused
  func restart() {
    seek(to: 0)
    send(["currentTime": .number(0), "syncServerTime": .number(clock.now)])
  }

  func toggleLoop() {
    send(["loop": .bool(!loops)])
  }

  func stop() {
    player.pause()
    drift?.invalidate()
    observers.removeAll()
    if let end { NotificationCenter.default.removeObserver(end) }
  }
}

/// The board's video players, one per VideoViewer, kept while the board is open so a
/// video keeps playing (and following the board) when it scrolls off screen and back
@MainActor
final class VideoPlayers {
  let clock = ServerClock()
  /// Sends an app's state fields to the board (set by the board)
  var send: (_ appId: String, _ fields: [String: JSONValue]) -> Void = { _, _ in }
  private var playbacks: [String: VideoPlayback] = [:]

  func playback(for appId: String, url: URL, sync: VideoSync) -> VideoPlayback {
    if let playback = playbacks[appId] { return playback }
    let playback = VideoPlayback(url: url, clock: clock) { [weak self] fields in self?.send(appId, fields) }
    playback.apply(sync)
    playbacks[appId] = playback
    return playback
  }

  func existing(_ appId: String) -> VideoPlayback? { playbacks[appId] }

  /// Stop the players of apps no longer on the board (or all of them)
  func keep(only ids: Set<String>) {
    for (id, playback) in playbacks where !ids.contains(id) {
      playback.stop()
      playbacks[id] = nil
    }
  }
}
/// A player's picture, filling its tile (the video keeps its shape, like the web's)
struct PlayerLayerView: UIViewRepresentable {
  let player: AVPlayer

  func makeUIView(context: Context) -> PlayerUIView {
    let view = PlayerUIView()
    view.playerLayer.player = player
    view.playerLayer.videoGravity = .resizeAspect
    view.isUserInteractionEnabled = false
    return view
  }

  func updateUIView(_ view: PlayerUIView, context: Context) {
    if view.playerLayer.player !== player { view.playerLayer.player = player }
  }

  final class PlayerUIView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
  }
}
