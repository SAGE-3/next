/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI
import UIKit

/// The SAGE3 colors (libs/shared/src/lib/ui/colors.ts) at the shades the web client uses
enum SageColor {
  /// Stickie backgrounds: Chakra's default .200 shade
  static func light(_ name: String?) -> Color {
    let hex = [
      "red": 0xFEB2B2, "orange": 0xFBD38D, "yellow": 0xFAF089, "green": 0x9AE6B4, "teal": 0x81E6D9,
      "blue": 0x90CDF4, "cyan": 0x9DECF9, "purple": 0xD6BCFA, "pink": 0xFBB6CE,
    ][name ?? ""] ?? 0xE2E8F0
    return Color(hex: hex)
  }

  /// Room and board colors (getHexColor)
  static func strong(_ name: String?) -> Color {
    let hex = [
      "red": 0xE53E3E, "orange": 0xDD6B20, "yellow": 0xD69E2E, "green": 0x38A169, "teal": 0x319795,
      "blue": 0x3182CE, "cyan": 0x00B5D8, "purple": 0xBEC6DC, "pink": 0xD53F8C,
    ][name ?? ""] ?? 0x718096
    return Color(hex: hex)
  }

  static let names = ["red", "orange", "yellow", "green", "teal", "blue", "cyan", "purple", "pink"]

  /// A person's color, as the web client draws cursors and viewports: the .400 shade of
  /// a SAGE color (useHexColor), or the color itself when it's a hex code
  static func person(_ name: String?) -> Color {
    if let name, name.hasPrefix("#"), let hex = Int(name.dropFirst().prefix(6), radix: 16) { return Color(hex: hex) }
    let hex = [
      "red": 0xF56565, "orange": 0xED8936, "yellow": 0xECC94B, "green": 0x48BB78, "teal": 0x38B2AC,
      "blue": 0x4299E1, "cyan": 0x0BC5EA, "purple": 0x9F7AEA, "pink": 0xED64A6,
    ][name ?? ""] ?? 0xA0AEC0
    return Color(hex: hex)
  }
}

/// The board's background and grid, as the web client draws them (Background.tsx, theme.ts)
enum BoardColors {
  /// Page background: gray.50 in light mode, #323232 in dark mode
  static let background = Color(light: 0xF7FAFC, dark: 0x323232)
  /// Grid lines: gray.100 in light mode, gray.700 in dark mode
  static let grid = Color(light: 0xEDF2F7, dark: 0x2D3748)
}

extension Color {
  /// A color that follows light and dark mode
  init(light: Int, dark: Int) {
    self.init(UIColor { traits in UIColor(Color(hex: traits.userInterfaceStyle == .dark ? dark : light)) })
  }

  init(hex: Int) {
    self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
  }
}
