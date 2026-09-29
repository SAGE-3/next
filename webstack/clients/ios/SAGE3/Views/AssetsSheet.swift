/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import PhotosUI
import SwiftUI
import UIKit
import UniformTypeIdentifiers

/// A room's files: open one on the board, share or save it, or upload new ones from
/// Photos, the camera, or Files (each opens on the board once uploaded)
struct AssetsSheet: View {
  let session: Session
  let roomId: String
  /// Put these assets on the board
  let open: ([Asset]) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var assets = LiveCollection<AssetData>()
  @State private var search = ""
  @State private var photos: [PhotosPickerItem] = []
  @State private var pickingPhotos = false
  @State private var pickingFiles = false
  @State private var takingPhoto = false
  @State private var uploading: String?
  @State private var sharing: URL?
  @State private var error: String?

  private var sorted: [Asset] {
    assets.items
      .filter { search.isEmpty || ($0.data.originalfilename ?? "").localizedCaseInsensitiveContains(search) }
      .sorted { ($0.data.dateAdded ?? "") > ($1.data.dateAdded ?? "") }
  }

  var body: some View {
    NavigationStack {
      List {
        if let uploading {
          HStack(spacing: 12) {
            ProgressView()
            Text(uploading).foregroundStyle(.secondary)
          }
        }
        if let error {
          Text(error).foregroundStyle(.red)
        }
        Section {
          ForEach(sorted) { asset in
            Button {
              open([asset])
              dismiss()
            } label: {
              AssetRow(asset: asset)
            }
            .foregroundStyle(.primary)
            .contextMenu {
              Button { open([asset]); dismiss() } label: { Label("Open on Board", systemImage: "rectangle.badge.plus") }
              Button { Task { await share(asset) } } label: { Label("Share or Save…", systemImage: "square.and.arrow.up") }
            }
            .swipeActions {
              Button { Task { await share(asset) } } label: { Label("Share", systemImage: "square.and.arrow.up") }.tint(.blue)
            }
          }
        } footer: {
          if !session.canUpload { Text("Guests can open and download files, but not upload them.") }
        }
      }
      .overlay {
        if assets.loaded && sorted.isEmpty {
          ContentUnavailableView(search.isEmpty ? "No Files" : "No Matching Files", systemImage: "folder", description: Text(assets.error ?? ""))
        } else if !assets.loaded {
          ProgressView()
        }
      }
      .searchable(text: $search, prompt: "Search files")
      .navigationTitle("Files")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
        ToolbarItem(placement: .primaryAction) {
          Menu {
            Button { pickingPhotos = true } label: { Label("Photo Library", systemImage: "photo.on.rectangle") }
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
              Button { takingPhoto = true } label: { Label("Take Photo", systemImage: "camera") }
            }
            Button { pickingFiles = true } label: { Label("Files", systemImage: "folder") }
          } label: {
            Label("Upload", systemImage: "square.and.arrow.up.on.square")
          }
          .disabled(!session.canUpload || uploading != nil)
        }
      }
      .photosPicker(isPresented: $pickingPhotos, selection: $photos, matching: .any(of: [.images, .videos]))
      .onChange(of: photos) { _, items in
        guard !items.isEmpty else { return }
        photos = []
        Task { await upload(await files(from: items)) }
      }
      .fileImporter(isPresented: $pickingFiles, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in
        guard case .success(let urls) = result else { return }
        Task { await upload(files(from: urls)) }
      }
      .fullScreenCover(isPresented: $takingPhoto) {
        CameraPicker { image in
          guard let data = image.jpegData(compressionQuality: 0.9) else { return }
          Task { await upload([HubClient.Upload(filename: "\(Self.photoName()).jpg", mimetype: "image/jpeg", data: data)]) }
        }
        .ignoresSafeArea()
      }
      .sheet(item: $sharing) { url in
        ShareSheet(items: [url])
      }
    }
    .task(id: session.socket == nil) {
      await assets.start(socket: session.socket, route: "/assets?room=\(roomId)") { try await session.client.assets(roomId: roomId) }
    }
    .onDisappear { assets.stop() }
  }

  // MARK: Upload

  /// Upload, then open the new files on the board
  private func upload(_ files: [HubClient.Upload]) async {
    guard !files.isEmpty else { return }
    uploading = files.count == 1 ? "Uploading \(files[0].filename)…" : "Uploading \(files.count) files…"
    error = nil
    defer { uploading = nil }
    do {
      let ids = try await session.client.upload(files, roomId: roomId)
      var uploaded: [Asset] = []
      for id in ids {
        if let asset = try? await session.client.asset(id: id) { uploaded.append(asset) }
      }
      if !uploaded.isEmpty {
        open(uploaded)
        dismiss()
      }
    } catch {
      self.error = error.localizedDescription
    }
  }

  /// Photos as JPEG (the web client doesn't show HEIC images), videos as they are
  private func files(from items: [PhotosPickerItem]) async -> [HubClient.Upload] {
    var files: [HubClient.Upload] = []
    for (index, item) in items.enumerated() {
      guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
      let name = Self.photoName() + (items.count > 1 ? " \(index + 1)" : "")
      if item.supportedContentTypes.contains(where: { $0.conforms(to: .movie) }) {
        let isMP4 = item.supportedContentTypes.contains { $0.conforms(to: .mpeg4Movie) }
        files.append(HubClient.Upload(filename: name + (isMP4 ? ".mp4" : ".mov"), mimetype: isMP4 ? "video/mp4" : "video/quicktime", data: data))
      } else if let image = UIImage(data: data), let jpeg = image.jpegData(compressionQuality: 0.9) {
        files.append(HubClient.Upload(filename: name + ".jpg", mimetype: "image/jpeg", data: jpeg))
      }
    }
    return files
  }

  private func files(from urls: [URL]) -> [HubClient.Upload] {
    urls.compactMap { url in
      let scoped = url.startAccessingSecurityScopedResource()
      defer { if scoped { url.stopAccessingSecurityScopedResource() } }
      guard let data = try? Data(contentsOf: url) else { return nil }
      let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
      return HubClient.Upload(filename: url.lastPathComponent, mimetype: mime, data: data)
    }
  }

  private static func photoName() -> String {
    let format = DateFormatter()
    format.dateFormat = "yyyy-MM-dd 'at' HH.mm.ss"
    return "Photo " + format.string(from: Date())
  }

  // MARK: Share

  private func share(_ asset: Asset) async {
    do {
      sharing = try await session.client.download(asset)
    } catch {
      self.error = error.localizedDescription
    }
  }
}

/// A file: its kind, name, size, and when it was added
private struct AssetRow: View {
  let asset: Asset

  private var symbol: String {
    let mime = asset.data.mimetype ?? ""
    if mime.hasPrefix("image/") { return "photo" }
    if mime.hasPrefix("video/") { return "film" }
    if mime.hasPrefix("audio/") { return "waveform" }
    if mime == "application/pdf" { return "doc.richtext" }
    if mime.contains("presentationml") { return "rectangle.on.rectangle" }
    if mime.contains("wordprocessingml") { return "doc.text" }
    if mime == "text/csv" || mime.contains("spreadsheet") { return "tablecells" }
    return "doc"
  }

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: symbol).font(.title3).foregroundStyle(.tint).frame(width: 28)
      VStack(alignment: .leading, spacing: 2) {
        Text(asset.data.originalfilename ?? asset.data.file).lineLimit(2)
        Text(details).font(.caption).foregroundStyle(.secondary)
      }
    }
  }

  private var details: String {
    var parts: [String] = []
    if let size = asset.data.size { parts.append(ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)) }
    // An ISO 8601 date, with milliseconds
    if let added = asset.data.dateAdded, let date = try? Date(added, strategy: .iso8601.year().month().day().time(includingFractionalSeconds: true)) {
      parts.append(date.formatted(date: .abbreviated, time: .shortened))
    }
    return parts.joined(separator: " · ")
  }
}

/// The camera, returning the photo taken
struct CameraPicker: UIViewControllerRepresentable {
  let taken: (UIImage) -> Void
  @Environment(\.dismiss) private var dismiss

  func makeUIViewController(context: Context) -> UIImagePickerController {
    let picker = UIImagePickerController()
    picker.sourceType = .camera
    picker.delegate = context.coordinator
    return picker
  }

  func updateUIViewController(_ picker: UIImagePickerController, context: Context) {}

  func makeCoordinator() -> Coordinator { Coordinator(self) }

  final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    let parent: CameraPicker

    init(_ parent: CameraPicker) {
      self.parent = parent
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
      if let image = info[.originalImage] as? UIImage { parent.taken(image) }
      parent.dismiss()
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
      parent.dismiss()
    }
  }
}

/// The system share sheet (save to Files or Photos, AirDrop, Mail, ...)
struct ShareSheet: UIViewControllerRepresentable {
  let items: [Any]

  func makeUIViewController(context: Context) -> UIActivityViewController {
    UIActivityViewController(activityItems: items, applicationActivities: nil)
  }

  func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

extension URL: @retroactive Identifiable {
  public var id: String { absoluteString }
}
