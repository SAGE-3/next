//
//  ContentView.swift
//  SageDraw
//
//  Created by Luc Renambot on 8/12/22.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var sock = SocketModel()
    @State private var message = ""
    
    var body: some View {
        NavigationView {
            VStack {
                Text("SAGE Draw")
                    .fontWeight(.medium)
                    .multilineTextAlignment(.center)
                    .padding()
                    .font(.largeTitle)
                    .foregroundColor(.accentColor)
                Spacer()
                VStack {
                    // Reactive display of messages
                    ForEach(sock.messages) { m in
                        ForEach(m.data) { b in
                            // Build a link for each board
                            NavigationLink(destination: RectsView()) {
                                Text(b.data.name).font(.largeTitle).fontWeight(.semibold)
                            }
                            
                        }
                    }
                }
                Spacer()
                Divider()
                HStack {
                    Text("An application for SAGE3")
                        .font(.subheadline)
                    Text("-")
                    Text("2022")
                }
            }
        }
        .navigationTitle("SAGE Draw")
        .navigationViewStyle(StackNavigationViewStyle())
        // Connect socket when view loaded
        .onAppear(perform: onAppear)
        // Disconnect
        .onDisappear(perform: onDisappear)
    }
    
    // view loaded
    private func onAppear() {
        // socket connecting to SAGE3 server
        sock.connect()
        // Requesting the list of files
        sock.send(route: "/api/boards")
    }
    // view unloaded
    private func onDisappear() {
        sock.disconnect()
    }
    
    
}


struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ContentView()
        }
    }
}
