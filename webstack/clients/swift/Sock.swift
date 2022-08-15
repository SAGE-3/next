//
//  Sock.swift
//  SageDraw
//
//  Created by Luc Renambot on 8/13/22.
//

import Combine
import Foundation

final class SocketModel: ObservableObject {
    @Published private(set) var messages: [ReceiveMessage] = []
    private var webSocketTask: URLSessionWebSocketTask?
    private var token = ""
    
    func connect() {
        let url = URL(string: "ws://127.0.0.1:3333/api")!
        var request = URLRequest(url: url)
        request.addValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        webSocketTask = URLSession.shared.webSocketTask(with: request)
        webSocketTask?.receive(completionHandler: onReceive)
        webSocketTask?.resume()
    }
    
    func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
    }
    
    private func onReceive(incoming: Result<URLSessionWebSocketTask.Message, Error>) {
        webSocketTask?.receive(completionHandler: onReceive)
        if case .success(let message) = incoming {
            onMessage(message: message)
        }
        else if case .failure(let error) = incoming {
            print("Sock> Error", error)
        }
    }
    
    private func onMessage(message: URLSessionWebSocketTask.Message) {
        if case .string(let text) = message {
            guard let data = text.data(using: .utf8) else {
                print("Recv> error", message)
                return
            }
            print("Recv>", message)
            do {
                let msg = try JSONDecoder().decode(ReceiveMessage.self, from: data)
                print("Recv> JSON", msg)
                let boards = msg.data
                print("JSON> boards #", boards.count)
                for b in boards {
                    print("  board", b.id, b.data.name)
                }
                DispatchQueue.main.async {
                    self.messages.append(msg)
                }
                
            } catch let error {
                print("Error", error)
            }
                        
        }
    }
    
    func send(route: String) {
        let message = SendMessage(route: route, method: "GET", id: UUID())
        guard let json = try? JSONEncoder().encode(message),
              let jsonString = String(data: json, encoding: .utf8)
        else {
            return
        }
        print("Send>", jsonString)
        webSocketTask?.send(.string(jsonString)) { error in
            if let error = error {
                print("Error sending message", error)
            }
        }
    }
    
    deinit {
        disconnect()
    }
    
    
}

struct SendMessage: Encodable {
    let route: String
    let method: String
    let id: UUID
}

struct ReceiveMessage: Decodable, Identifiable {
    let id: String
    let success: Bool
    let message: String?
    let data: [BoardData]
}

struct BoardData: Decodable, Identifiable {
    var id: String { return _id }
    let _id: String
    let _createdAt: Int
    let _createdBy: String
    let _updatedAt: Int
    let _updatedBy: String
    let data: Board
}

struct Board: Decodable {
    let name: String
    let description: String
    let color: String
    let roomId: String
    let ownerId: String
    let isPrivate: Bool
}

