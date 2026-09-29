/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import CoreGraphics
import Foundation

/// The app that shows a file, as the web client makes it (libs/frontend/src/lib/utils/
/// setupAppForFiles.ts): its type, size, and initial state (each app's init in
/// libs/applications). Files the web client reads the contents of (Markdown, code,
/// notebooks, ...) open as an AssetLink here for now, like files it has no viewer for.
struct NewApp {
  var type: String
  var title: String
  var size: CGSize
  var state: [String: JSONValue]

  static func showing(_ asset: Asset) -> NewApp {
    let mime = asset.data.mimetype ?? ""
    let title = asset.data.originalfilename ?? "Asset"
    let id = JSONValue.string(asset.id)
    let noExecute: JSONValue = .object(["executeFunc": .string(""), "params": .object([:])])
    let derived = asset.data.derived
    if mime.hasPrefix("image/") && mime != "image/heic" {
      let ratio = max(derived?["aspectRatio"]?.number ?? 1, 0.01)
      return NewApp(type: "ImageViewer", title: title, size: CGSize(width: 400, height: 400 / ratio),
                    state: ["executeInfo": noExecute, "assetid": id, "annotations": .bool(false), "boxes": .array([])])
    }
    if ["video/mp4", "video/webm", "video/ogg", "video/quicktime"].contains(mime) {
      let ratio = max(derived?["aspectRatio"]?.number ?? 1, 0.01)
      let size = ratio > 1 ? CGSize(width: 800, height: (800 / ratio).rounded()) : CGSize(width: (450 * ratio).rounded(), height: 450)
      return NewApp(type: "VideoViewer", title: title, size: size,
                    state: ["assetid": id, "currentTime": .number(0), "paused": .bool(true), "loop": .bool(false)])
    }
    if mime == "application/pdf" {
      var ratio = 1.0
      if let first = derived?.array?.first?.array?.first, let w = first["width"]?.number, let h = first["height"]?.number, h > 0 { ratio = w / h }
      return NewApp(type: "PDFViewer", title: title, size: CGSize(width: 400, height: 400 / ratio),
                    state: ["assetid": id, "currentPage": .number(0), "numPages": .number(1), "displayPages": .number(1),
                            "executeInfo": noExecute, "analyzed": .string(""), "client": .string("")])
    }
    if mime == "text/csv" {
      return NewApp(type: "CSVViewer", title: title, size: CGSize(width: 800, height: 400), state: ["assetid": id])
    }
    if mime == "application/vnd.openxmlformats-officedocument.presentationml.presentation" {
      return NewApp(type: "PPTXViewer", title: title, size: CGSize(width: 960, height: 540),
                    state: ["assetid": id, "currentSlide": .number(0), "numSlides": .number(0), "mediaKey": .string(""),
                            "mediaPlaying": .bool(false), "showThumbnails": .bool(true), "displaySlides": .number(1)])
    }
    if mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" {
      return NewApp(type: "DOCXViewer", title: title, size: CGSize(width: 612, height: 792),
                    state: ["assetid": id, "currentPage": .number(0), "numPages": .number(0), "displayPages": .number(1)])
    }
    return NewApp(type: "AssetLink", title: "Asset", size: CGSize(width: 400, height: 375), state: ["assetid": id])
  }

  /// The document the hub creates (POST /apps)
  func document(at origin: CGPoint, roomId: String, boardId: String) -> JSONValue {
    .object([
      "title": .string(title),
      "roomId": .string(roomId),
      "boardId": .string(boardId),
      "position": .object(["x": .number(origin.x.rounded()), "y": .number(origin.y.rounded()), "z": .number(0)]),
      "size": .object(["width": .number(size.width.rounded()), "height": .number(size.height.rounded()), "depth": .number(0)]),
      "rotation": .object(["x": .number(0), "y": .number(0), "z": .number(0)]),
      "type": .string(type),
      "state": .object(state),
      "raised": .bool(true),
      "dragging": .bool(false),
      "pinned": .bool(false),
    ])
  }
}
