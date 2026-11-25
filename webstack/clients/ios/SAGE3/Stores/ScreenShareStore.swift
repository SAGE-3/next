/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */


import Foundation
import LiveKit
import Observation

/// The board's shared screens (LocalScreenshare apps), watched as the web client watches
/// them (libs/frontend/src/lib/stores/screenshare.ts): the board's LiveKit room on the
/// hub's own SFU (/sfu), joined with a token from /livekit/token. Each shared screen is a
/// video track named after its app's id. This device only watches; it doesn't share.
@MainActor
@Observable
final class ScreenShareStore {
  /// The shared screens by app id
  private(set) var tracks: [String: VideoTrack] = [:]
  /// Why the room couldn't be joined, if it couldn't
  private(set) var problem: String?
  @ObservationIgnored private var room: LiveKit.Room?
  @ObservationIgnored private var listener: Listener?
  @ObservationIgnored private var joining: Task<Void, Never>?
  /// This app's part of the participant identity, as the web's accessId (one per tab)
  @ObservationIgnored private let accessId = UUID().uuidString

  /// Join the board's room (again, if already in one)
  func start(client: HubClient, boardId: String) {
    stop()
    joining = Task { [weak self] in
      guard let self else { return }
      do {
        let token = try await client.liveKitToken(room: boardId, accessId: self.accessId)
        guard !Task.isCancelled, let url = Self.sfuURL(client.base) else { return }
        let listener = Listener(store: self)
        // As the web: each viewer gets the resolution its view needs; unwatched layers pause
        let room = LiveKit.Room(delegate: listener, roomOptions: RoomOptions(adaptiveStream: true, dynacast: true))
        self.listener = listener
        self.room = room
        try await room.connect(url: url, token: token)
        self.problem = nil
      } catch {
        guard !Task.isCancelled else { return }
        self.problem = "Screen sharing is not available: \(error.localizedDescription)"
      }
    }
  }

  func stop() {
    joining?.cancel()
    joining = nil
    if let room { Task { await room.disconnect() } }
    room = nil
    listener = nil
    tracks = [:]
  }

  /// The hub's SFU: ws(s)://<hub>/sfu
  private static func sfuURL(_ base: URL) -> String? {
    guard var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return nil }
    components.scheme = components.scheme == "https" ? "wss" : "ws"
    components.path = (components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path) + "/sfu"
    return components.url?.absoluteString
  }

  fileprivate func subscribed(_ publication: RemoteTrackPublication) {
    guard let track = publication.track as? VideoTrack else { return }
    tracks[publication.name] = track
  }

  fileprivate func unsubscribed(_ publication: RemoteTrackPublication) {
    tracks[publication.name] = nil
  }

  /// The room's events (on LiveKit's threads), handed to the store on the main actor
  // (its only state, the weak store, is set once and read on the main actor)
  private final class Listener: NSObject, RoomDelegate, @unchecked Sendable {
    weak var store: ScreenShareStore?

    init(store: ScreenShareStore) {
      self.store = store
    }

    func room(_ room: LiveKit.Room, participant: RemoteParticipant, didSubscribeTrack publication: RemoteTrackPublication) {
      Task { @MainActor [weak self] in self?.store?.subscribed(publication) }
    }

    func room(_ room: LiveKit.Room, participant: RemoteParticipant, didUnsubscribeTrack publication: RemoteTrackPublication) {
      Task { @MainActor [weak self] in self?.store?.unsubscribed(publication) }
    }
  }
}
