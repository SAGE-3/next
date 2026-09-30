/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import Foundation
import JavaScriptCore

/// The web client's Yjs (Resources/yjs-bridge.js, built from YjsBridge/bridge.js) in
/// JavaScriptCore: one board's annotations document. It turns the server's messages into
/// replies and changes, and local changes into messages; the websocket is YjsRoom's.
final class YjsEngine {
  private let context: JSContext
  private let bridge: JSValue
  /// A message to send to the server
  var onSend: ((Data) -> Void)?
  /// The shapes changed (locally or from the server)
  var onChange: (() -> Void)?

  init?(script: String) {
    guard let context = JSContext() else { return nil }
    self.context = context
    context.exceptionHandler = { _, exception in
      print("Yjs> JavaScript error:", exception?.toString() ?? "?")
    }
    // What the browser would provide: random bytes (Yjs client ids), base64
    context.evaluateScript("""
      globalThis.crypto = {
        subtle: {},
        getRandomValues(array) {
          for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 4294967296);
          return array;
        },
      };
      """)
    let btoa: @convention(block) (String) -> String = { binary in
      Data(binary.unicodeScalars.map { UInt8(truncatingIfNeeded: $0.value) }).base64EncodedString()
    }
    let atob: @convention(block) (String) -> String = { base64 in
      guard let data = Data(base64Encoded: base64) else { return "" }
      return String(data.map { Character(Unicode.Scalar($0)) })
    }
    context.setObject(btoa, forKeyedSubscript: "btoa" as NSString)
    context.setObject(atob, forKeyedSubscript: "atob" as NSString)
    // The bridge's callbacks, forwarded to whoever listens
    let hooks = Hooks()
    let send: @convention(block) (String) -> Void = { base64 in
      if let data = Data(base64Encoded: base64) { hooks.send?(data) }
    }
    let changed: @convention(block) () -> Void = { hooks.changed?() }
    context.setObject(send, forKeyedSubscript: "__send" as NSString)
    context.setObject(changed, forKeyedSubscript: "__changed" as NSString)
    context.evaluateScript(script)
    guard let bridge = context.objectForKeyedSubscript("YjsBridge"), !bridge.isUndefined else { return nil }
    self.bridge = bridge
    self.hooks = hooks
    hooks.send = { [weak self] data in self?.onSend?(data) }
    hooks.changed = { [weak self] in self?.onChange?() }
  }

  /// The bundled script, from the app's resources
  convenience init?() {
    guard let url = Bundle.main.url(forResource: "yjs-bridge", withExtension: "js"), let script = try? String(contentsOf: url, encoding: .utf8) else { return nil }
    self.init(script: script)
  }

  private final class Hooks {
    var send: ((Data) -> Void)?
    var changed: (() -> Void)?
  }
  private let hooks: Hooks

  /// The first message of a connection
  func start() -> Data {
    Data(base64Encoded: bridge.invokeMethod("start", withArguments: []).toString()) ?? Data()
  }

  /// A server message; returns the reply to send, if any
  func receive(_ message: Data) -> Data? {
    let reply = bridge.invokeMethod("receive", withArguments: [message.base64EncodedString()]).toString() ?? ""
    return reply.isEmpty ? nil : Data(base64Encoded: reply)
  }

  var isSynced: Bool { bridge.invokeMethod("isSynced", withArguments: []).toBool() }

  /// The shapes, as the web whiteboard stores them
  func lines() -> [JSONValue] {
    guard let json = bridge.invokeMethod("lines", withArguments: []).toString(), let data = json.data(using: .utf8) else { return [] }
    return (try? JSONDecoder().decode([JSONValue].self, from: data)) ?? []
  }

  /// Add a shape; returns it as stored (for the saved copy)
  func add(_ shape: JSONValue) -> JSONValue? {
    guard let data = try? JSONEncoder().encode(shape), let json = String(data: data, encoding: .utf8) else { return nil }
    guard let stored = bridge.invokeMethod("add", withArguments: [json]).toString(), let out = stored.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(JSONValue.self, from: out)
  }

  @discardableResult
  func remove(id: String) -> Bool {
    bridge.invokeMethod("remove", withArguments: [id]).toBool()
  }

  // MARK: Awareness (the apps room)

  /// Announce us in the room (the web's awareness 'user': name, color, uid); the message to send
  func announce(name: String, color: String, uid: String) -> Data? {
    guard let data = try? JSONEncoder().encode(["user": ["name": name, "color": color, "uid": uid]]), let json = String(data: data, encoding: .utf8) else { return nil }
    return Data(base64Encoded: bridge.invokeMethod("announce", withArguments: [json]).toString())
  }

  /// Our awareness again (every 15 s, before the server forgets it); nil if not announced
  func renew() -> Data? {
    let message = bridge.invokeMethod("renew", withArguments: []).toString() ?? ""
    return message.isEmpty ? nil : Data(base64Encoded: message)
  }

  /// Leave the room's awareness; the message to send
  func leave() -> Data? {
    Data(base64Encoded: bridge.invokeMethod("leave", withArguments: []).toString())
  }

  /// How many other people are in the room
  var peers: Int { Int(bridge.invokeMethod("peers", withArguments: []).toInt32()) }

  // MARK: Texts (the apps room)

  /// An app's text (a Stickie's)
  func text(_ id: String) -> String {
    bridge.invokeMethod("text", withArguments: [id]).toString() ?? ""
  }

  /// Change an app's text, as one edit where it differs
  func setText(_ id: String, _ value: String) {
    bridge.invokeMethod("setText", withArguments: [id, value])
  }

  /// Load saved shapes into an empty document
  @discardableResult
  func hydrate(_ saved: [JSONValue]) -> Bool {
    guard let data = try? JSONEncoder().encode(saved), let json = String(data: data, encoding: .utf8) else { return false }
    return bridge.invokeMethod("hydrate", withArguments: [json]).toBool()
  }
}
