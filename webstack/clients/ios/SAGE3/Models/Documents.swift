/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Foundation

// The server's data, as sent by the homebase REST and websocket APIs. Field names match
// the zod schemas in libs/shared (rooms, boards, assets, users) and libs/applications
// (apps). Only what this client uses is decoded; unknown fields are ignored, and fields
// that older documents may lack are optional.

/// A document of a collection: its id and metadata, and the collection's own data
struct SBDoc<T: Codable>: Codable, Identifiable {
  let _id: String
  let _createdAt: Double?
  let _createdBy: String?
  let _updatedAt: Double?
  var data: T

  var id: String { _id }
}

struct RoomData: Codable {
  var name: String
  var description: String?
  var color: String?
  var ownerId: String?
  var isPrivate: Bool?
  var privatePin: String?
  var isListed: Bool?
}

struct BoardData: Codable {
  var name: String
  var description: String?
  var color: String?
  var roomId: String
  var ownerId: String?
  var isPrivate: Bool?
  var privatePin: String?
  var code: String?
  var executeInfo: JSONValue?
}

struct Position: Codable, Hashable {
  var x: Double
  var y: Double
  var z: Double?
}

struct Size: Codable, Hashable {
  var width: Double
  var height: Double
  var depth: Double?
}

/// An app on a board: where it is, its type, and its type-specific state
struct AppData: Codable {
  var title: String?
  var roomId: String?
  var boardId: String?
  var position: Position
  var size: Size
  var type: String
  var state: JSONValue?
  /// A pinned app can't be moved
  var pinned: Bool?
}

struct AssetData: Codable {
  var file: String
  var originalfilename: String?
  var mimetype: String?
  var room: String?
  var owner: String?
  /// In bytes
  var size: Double?
  var dateAdded: String?
  /// Files the server made from the upload: image sizes, video info, PDF pages, ...
  var derived: JSONValue?
}

struct UserData: Codable {
  var name: String
  var email: String
  var color: String
  var profilePicture: String
  var userType: String
  var userRole: String
  var savedBoards: [String]?
  var recentBoards: [String]?
}

/// Where someone is: their board, cursor, and view (libs/shared/src/lib/types/schemas/presence.ts)
struct PresenceData: Codable {
  struct Viewport: Codable {
    var position: Position
    var size: Size
  }
  var userId: String
  var status: String?
  var boardId: String?
  var cursor: Position?
  var viewport: Viewport?
}

/// A board's saved annotations (libs/shared/src/lib/types/schemas/annotation.ts): the
/// whiteboard's shapes, each { id, type, points: [x, y, x, y, ...], userColor, alpha,
/// size, userId, ... } as the web whiteboard stores them
struct AnnotationData: Codable {
  var whiteboardLines: [JSONValue]?
}

typealias Room = SBDoc<RoomData>
typealias Board = SBDoc<BoardData>
typealias SageApp = SBDoc<AppData>
typealias Asset = SBDoc<AssetData>
typealias User = SBDoc<UserData>
typealias Presence = SBDoc<PresenceData>

/// GET /api/info: public, no login needed
struct ServerInfo: Codable {
  var serverName: String?
  var version: String?
  var production: Bool?
  var logins: [String]?
  var isSage3: Bool?
  var onlineUsers: Int?
}

/// GET /api/configuration: the part this client uses
struct ServerConfiguration: Codable {
  struct Features: Codable {
    /// The apps a production hub offers in its Applications menu
    var apps: [String]?
  }
  /// Namespace of the uuid v5 hashes that protect private rooms and boards
  var namespace: String?
  var features: Features?
}

/// GET /auth/verify
struct AuthVerify: Codable {
  struct Auth: Codable {
    var id: String
    var provider: String
  }
  var success: Bool
  var authentication: Bool?
  var auth: Auth?
}

/// The REST API's reply: { success, data } or { success: false, message }
struct APIReply<T: Codable>: Codable {
  var success: Bool
  var data: T?
  var message: String?
}

/// A change pushed on a websocket subscription
struct SubscriptionMessage<T: Codable>: Codable {
  struct Event: Codable {
    var type: String  // CREATE, UPDATE, DELETE
    var col: String?
    var doc: [SBDoc<T>]
  }
  var id: String
  var event: Event
}
