/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import SwiftUI

/// The board's background grid: a line every 100 board units, 1 point wide on screen,
/// like the web client. Zoomed far out, where lines would be closer than 8 points, it
/// draws every 1,000 units instead (then 10,000), rather than a solid wash of lines.
struct BoardGrid: View {
  let offset: CGPoint
  let scale: CGFloat

  var body: some View {
    Canvas { context, size in
      context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(BoardColors.background))
      var step: CGFloat = 100
      while step * scale < 8 { step *= 10 }
      var lines = Path()
      // Board x of the first line at or left of the view: a multiple of step
      var x = (floor(-offset.x / step) * step + offset.x) * scale
      while x <= size.width {
        lines.addRect(CGRect(x: x, y: 0, width: 1, height: size.height))
        x += step * scale
      }
      var y = (floor(-offset.y / step) * step + offset.y) * scale
      while y <= size.height {
        lines.addRect(CGRect(x: 0, y: y, width: size.width, height: 1))
        y += step * scale
      }
      context.fill(lines, with: .color(BoardColors.grid))
    }
  }
}
