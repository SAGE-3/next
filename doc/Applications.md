# Applications

SAGE3 provides a variety of applications that can be placed on the infinite canvas of a board. Each application runs inside a resizable window and is synchronized across all connected users in real time.

**Default Toolbar:** Every application includes a default toolbar with buttons to **Zoom to App**, **Duplicate**, and **Close**. The toolbars listed below describe the additional controls specific to each application.

---

## AssetLink

> *Opens automatically when files that are not natively supported by SAGE3 are dropped onto the board.*

Displays a download button to a file stored in the asset manager. Clicking the download icon will download the file locally to the user's computer. AssetLinks backgroudn are always orange. 

![AssetLink](images/applications/applications_assetlink.jpeg)

![AssetLinkToolbar](images/applications/applications_assetlink_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Download Asset | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download the linked file |

---

## BoardLink

Paste a SAGE3 board URL onto the canvas to create a BoardLink. It displays a minimap preview of the linked board, giving you a visual snapshot of its layout. Click `Enter Board` to navigate directly to that board. Useful for organizing multi-board workflows or linking related workspaces. BoardLinks are easy to identify by their blue backgrounds.

<!-- TODO: Screenshot of BoardLink app -->
![BoardLink](images/applications/applications_boardlink.jpeg)

<!-- TODO: Screenshot of BoardLink toolbar -->
![BoardLinkToolbar](images/applications/applications_boardlink_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Enter Board | Button |  | Navigate to the linked board |
| Update Board Name | Text Input | | Edit the displayed board name (other-server links only) |
| Update | Button | | Submit the updated board name (other-server links only) |

---

## Calculator

A simple calculator for performing basic arithmetic. Supports addition, subtraction, multiplication, and division. A built-in history lets you review past calculations.

![Calculator](images/applications/applications_calculator.jpeg)

![CalculatorToolbar](images/applications/applications_calculator_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| View History | Button | <img src="icons/applications/MdList.svg" width="20"> | Opens a drawer showing past calculations |
| Copy Result | Button | <img src="icons/applications/MdCopyAll.svg" width="20"> | Copies the current result to your clipboard |

---

## Chat

A messaging application for communicating with other users on the board. Chat windows can be placed anywhere on the canvas, letting you organize multiple conversations spatially alongside your other work.


![Chat](images/applications/applications_chat.jpeg)

![ChatToolbar](images/applications/applications_chat_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Download Transcript | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Downloads the full chat history as a `.txt` file |

---

## Clock

Displays the current time for any timezone. Useful for distributed teams working across different time zones or for displaying clocks on shared display walls.

![Clock](images/applications/applications_clock.jpeg)

![ClockToolbar](images/applications/applications_clock_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Timezone | Dropdown | | Select a timezone |
| 24 Hour | Toggle | | Switch between 12-hour and 24-hour format | 
| Color | Color Picker | | Change the clock digit color |

---

## CoBrowser

A shared web browser that streams a live Firefox session to all users on the board. Unlike a standard Webview (where each user loads the page independently), CoBrowser gives everyone a synchronized view of the same browser instance, including scroll position, interactions, and audio. The owner can choose to let all users control the browser, or lock it so only they can interact. Works in both the Electron desktop client and standard web browsers.

> **Note:** CoBrowser requires a VEO server to be configured on the SAGE3 server. Contact your server administrator if it is unavailable.

<!-- TODO: Screenshot of CoBrowser app -->
![CoBrowser](images/applications/applications_cobrowser.jpeg)

<!-- TODO: Screenshot of CoBrowser toolbar -->
![CoBrowserToolbar](images/applications/applications_cobrowser_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Lock / Unlock Control | Toggle | | (Owner only) When locked, only the owner can interact with the browser. When unlocked, all users can control it. |
| Paste Clipboard | Button | | Pastes your local clipboard text into the browser session |
| Toggle Audio | Toggle | <img src="icons/applications/MdVolumeUp.svg" width="20"> <img src="icons/applications/MdVolumeOff.svg" width="20"> | Enable or disable audio from the browser session |

---

## CodeEditor

A collaborative code editor for writing and reviewing code in real time. Changes are synchronized across all users, making it ideal for pair programming, code reviews, or group problem-solving. Supports many languages including Python, JavaScript, TypeScript, C/C++, Java, HTML, CSS, JSON, Markdown, R, and YAML.


![CodeEditor](images/applications/applications_codeeditor.jpeg)

![CodeEditorToolbar](images/applications/applications_codeeditor_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Language | Dropdown | | Select the programming language |
| Font Size - | Button | <img src="icons/applications/MdRemove.svg" width="20"> | Decrease the font size |
| Font Size + | Button | <img src="icons/applications/MdAdd.svg" width="20"> | Increase the font size |
| Read Only / Edit | Toggle | <img src="icons/applications/MdLock.svg" width="20"> <img src="icons/applications/MdLockOpen.svg" width="20"> | Toggle between locked and editable modes |
| Save to Asset Manager | Button | <img src="icons/applications/MdFileUpload.svg" width="20"> | Upload the code to the server's asset manager |
| Download | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download the code as a file |
| Preview | Button | <img src="icons/applications/MdSlideshow.svg" width="20"> | For Markdown or HTML, opens a rendered preview |

---

## CSVViewer

> *Opens automatically when a CSV file is uploaded to the board.*

A tabular viewer for CSV files. The table is rendered using virtualization for efficient handling of large datasets. View-only -- data manipulation is not supported.

<!-- TODO: Screenshot of CSVViewer app -->
![CSVViewer](images/applications/applications_csvviewer.jpeg)

<!-- TODO: Screenshot of CSVViewer toolbar -->
![CSVViewerToolbar](images/applications/applications_csvviewer_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Download CSV | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download the original CSV file |

---

## DeepZoomImage

> *Opens automatically when a large image is uploaded and processed into DeepZoom format.*

A viewer for DeepZoom images -- a tiled format for displaying extremely large, high-resolution images efficiently. Large images uploaded to the asset manager are processed and converted to DeepZoom format automatically. Pan and zoom smoothly through the image at any scale.

<!-- TODO: Screenshot of DeepZoomImage app -->
![DeepZoomImage](images/applications/applications_deepzoomimage.jpeg)

**Toolbar:** Default toolbar only (Zoom to App, Duplicate, Close).

---

## Drawing

A collaborative drawing application built on the TLDraw library. Draw freehand, create shapes, and add text on a shared canvas. All actions are synchronized in real time across users, making it great for brainstorming, sketching diagrams, or visual communication.

<!-- TODO: Screenshot of Drawing app -->
![Drawing](images/applications/applications_drawing.jpeg)

<!-- TODO: Screenshot of Drawing toolbar -->
![DrawingToolbar](images/applications/applications_drawing_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Undo | Button | <img src="icons/applications/MdUndo.svg" width="20"> | Undo the last action |
| Redo | Button | <img src="icons/applications/MdRedo.svg" width="20"> | Redo the last undone action |
| Zoom to Fit | Button | <img src="icons/applications/MdZoomInMap.svg" width="20"> | Fit the entire canvas into the window |
| Zoom to 100% | Button | <img src="icons/applications/MdZoomOutMap.svg" width="20"> | Reset zoom level |
| Follow Me | Toggle | <img src="icons/applications/RiUserFollowFill.svg" width="20"> | Other users' views follow your camera position |
| Export Image | Button | <img src="icons/applications/MdSaveAlt.svg" width="20"> | Export the drawing as an image on the board |

---

## ImageViewer

> *Opens automatically when an image is uploaded to the board.*

Displays uploaded images in common formats (JPEG, PNG, etc.). After uploading, images are scaled to multiple resolutions and converted to WebP for fast display. The viewer dynamically selects the best resolution based on window size, display DPI, and board zoom level. The original file is preserved for download. Supports AI-generated annotation overlays when available.

<!-- TODO: Screenshot of ImageViewer app -->
![ImageViewer](images/applications/applications_imageviewer.jpeg)

<!-- TODO: Screenshot of ImageViewer toolbar -->
![ImageViewerToolbar](images/applications/applications_imageviewer_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Download Image | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download the original image file |
| Annotations | Toggle | <img src="icons/applications/HiPencilAlt.svg" width="20"> | Toggle AI-generated annotation boxes (when available) |

---

## Map

An interactive map powered by MapGL. Navigate by panning and zooming with the mouse or keyboard. Navigation is synchronized across all users so everyone sees the same view. Switch between street and satellite views, search for locations by address, and overlay GeoJSON or GeoTIFF data layers from uploaded assets.

<!-- TODO: Screenshot of Map app -->
![Map](images/applications/applications_map.jpeg)

<!-- TODO: Screenshot of Map toolbar -->
![MapToolbar](images/applications/applications_map_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Address Search | Text Input | | Search for a place or address to center the map |
| Street Map | Button | <img src="icons/applications/MdMap.svg" width="20"> | Switch to the OpenStreetMap base layer |
| Satellite Map | Button | <img src="icons/applications/MdTerrain.svg" width="20"> | Switch to the satellite imagery base layer |
| Add Layer | Button | <img src="icons/applications/MdAdd.svg" width="20"> | Overlay GeoJSON or GeoTIFF data from the asset manager |

---

## Notepad

A collaborative rich-text editor for writing formatted documents together in real time. Supports text styling (bold, italic, underline, strikethrough), font sizes, colors, alignment, and lists. Edits from all users are merged seamlessly. The finished document can be downloaded as an HTML file.

<!-- TODO: Screenshot of Notepad app -->
![Notepad](images/applications/applications_notepad.jpeg)

<!-- TODO: Screenshot of Notepad toolbar -->
![NotepadToolbar](images/applications/applications_notepad_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Bold | Toggle | | Toggle bold formatting |
| Italic | Toggle | | Toggle italic formatting |
| Underline | Toggle | | Toggle underline formatting |
| Strikethrough | Toggle | | Toggle strikethrough formatting |
| Font Size | Dropdown | | Select text size: Small, Medium, or Large |
| Font Color | Dropdown | | Change the text color |
| Background Color | Dropdown | | Change the text highlight color |
| Align Left | Button | <img src="icons/applications/MdFormatAlignLeft.svg" width="20"> | Align text to the left |
| Align Center | Button | <img src="icons/applications/MdFormatAlignCenter.svg" width="20"> | Center the text |
| Align Right | Button | <img src="icons/applications/MdFormatAlignRight.svg" width="20"> | Align text to the right |
| Justify | Button | <img src="icons/applications/MdFormatAlignJustify.svg" width="20"> | Justify the text |
| Bullet List | Toggle | <img src="icons/applications/MdOutlineList.svg" width="20"> | Toggle bullet list formatting |
| Numbered List | Toggle | <img src="icons/applications/MdOutlineFormatListNumbered.svg" width="20"> | Toggle numbered list formatting |
| Download as HTML | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Export the document as an `.html` file |
| Reconnect | Button | <img src="icons/applications/MdRefresh.svg" width="20"> | Re-establish the collaboration connection |

---

## PDFViewer

> *Opens automatically when a PDF is uploaded to the board.*

View PDF documents uploaded to the asset manager. PDFs are processed server-side into images at multiple resolutions for fast display. Navigate through pages, display multiple pages simultaneously to maximize screen space, and download the original PDF.

<!-- TODO: Screenshot of PDFViewer app -->
![PDFViewer](images/applications/applications_pdfviewer.jpeg)

<!-- TODO: Screenshot of PDFViewer toolbar -->
![PDFViewerToolbar](images/applications/applications_pdfviewer_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Remove Page | Button | <img src="icons/applications/MdRemove.svg" width="20"> | Decrease the number of visible pages |
| Add Page | Button | <img src="icons/applications/MdAdd.svg" width="20"> | Increase the number of visible pages |
| First Page | Button | <img src="icons/applications/MdSkipPrevious.svg" width="20"> | Jump to the first page |
| Previous Page | Button | <img src="icons/applications/MdNavigateBefore.svg" width="20"> | Go to the previous page |
| Next Page | Button | <img src="icons/applications/MdNavigateNext.svg" width="20"> | Go to the next page |
| Last Page | Button | <img src="icons/applications/MdSkipNext.svg" width="20"> | Jump to the last page |
| Back 10 | Button | <img src="icons/applications/MdFastRewind.svg" width="20"> | Jump 10 pages backward |
| Forward 10 | Button | <img src="icons/applications/MdFastForward.svg" width="20"> | Jump 10 pages forward |
| Download PDF | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download the original PDF file |

---

## Poll

Create polls and vote on options in real time. Set a question, add multiple answer choices, and let participants vote. Results are displayed as a horizontal bar graph that updates live as votes come in.

<!-- TODO: Screenshot of Poll app -->
![Poll](images/applications/applications_poll.jpeg)

**Toolbar:** Default toolbar only (Zoom to App, Duplicate, Close).

---

## SageCell

A computational code cell backed by a Jupyter kernel. Write and execute Python, R, or Julia code with results displayed directly in the cell. Supports rich output formats including text, Markdown, images, PDF, HTML, and Plotly visualizations. Cells can be resized, moved, and duplicated for rapid prototyping. Code is synchronized across users. Uses the Monaco editor for a modern coding experience.

<!-- TODO: Screenshot of SageCell app -->
![SageCell](images/applications/applications_sagecell.jpeg)

<!-- TODO: Screenshot of SageCell toolbar -->
![SageCellToolbar](images/applications/applications_sagecell_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Create Kernel | Button | <img src="icons/applications/MdAdd.svg" width="20"> | Create a new Jupyter kernel |
| Select Kernel | Dropdown | <img src="icons/applications/MdArrowDropDown.svg" width="20"> | Choose an existing kernel (Python, R, Julia) |
| Run | Button | <img src="icons/applications/MdPlayArrow.svg" width="20"> | Execute the current cell |
| Run All | Button | <img src="icons/applications/VscRunAll.svg" width="20"> | Execute all SageCell apps on the board |
| Run To Here | Button | <img src="icons/applications/VscRunAbove.svg" width="20"> | Execute all cells ranked above this one |
| Run From Here | Button | <img src="icons/applications/VscRunBelow.svg" width="20"> | Execute all cells ranked below this one |
| Stop | Button | <img src="icons/applications/MdStop.svg" width="20"> | Interrupt the running execution |
| Help | Button | <img src="icons/applications/MdHelp.svg" width="20"> | Open the SageCell help reference |
| Font Size - | Button | <img src="icons/applications/MdRemove.svg" width="20"> | Decrease the font size |
| Font Size + | Button | <img src="icons/applications/MdAdd.svg" width="20"> | Increase the font size |
| Save to Asset Manager | Button | <img src="icons/applications/MdFileUpload.svg" width="20"> | Upload the code to the asset manager |
| Download | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download the code as a `.py`, `.R`, or `.jl` file |

---

## Screenshare

Share your screen or a specific application window with everyone on the board. Multiple users can share simultaneously, and each stream appears as its own resizable window on the canvas. Video quality adjusts automatically to available bandwidth. Sessions are limited to 75 minutes by default, but a new session can be started immediately.

<!-- TODO: Screenshot of Screenshare app -->
![Screenshare](images/applications/applications_screenshare.jpeg)

<!-- TODO: Screenshot of Screenshare toolbar -->
![ScreenshareToolbar](images/applications/applications_screenshare_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Stop Stream | Button | <img src="icons/applications/MdScreenShare.svg" width="20"> | End the screen sharing session (visible to the stream owner only) |

---

## Stickie

Virtual sticky notes for quick text entry. Choose from multiple colors, resize the note, and adjust the font size. Notes can be locked to prevent editing by other users. Content can be saved or downloaded as Markdown. Uploading a `.md` file from the asset manager will open it as a new Stickie.

<!-- TODO: Screenshot of Stickie app -->
![Stickie](images/applications/applications_stickie.jpeg)

<!-- TODO: Screenshot of Stickie toolbar -->
![StickieToolbar](images/applications/applications_stickie_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Font Size - | Button | <img src="icons/applications/MdRemove.svg" width="20"> | Decrease the font size |
| Font Size + | Button | <img src="icons/applications/MdAdd.svg" width="20"> | Increase the font size |
| Lock / Unlock | Toggle | <img src="icons/applications/MdLock.svg" width="20"> <img src="icons/applications/MdLockOpen.svg" width="20"> | Prevent or allow editing by other users (owner only) |
| Color | Color Picker | <img src="icons/applications/MdStickyNote2.svg" width="20"> | Change the stickie color |
| Save to Asset Manager | Button | <img src="icons/applications/MdFileUpload.svg" width="20"> | Upload the note as a `.md` file |
| Download as Markdown | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download the note as a `.md` file |

---

## Timer

A countdown timer synchronized across all users. Set a duration, then start, pause, or reset the timer. Changes are reflected immediately for all participants. Useful for timeboxing activities, presentations, or group exercises. Multiple timers can run simultaneously.

<!-- TODO: Screenshot of Timer app -->
![Timer](images/applications/applications_timer.jpeg)

**Toolbar:** Default toolbar only (Zoom to App, Duplicate, Close).

---

## VideoViewer

> *Opens automatically when a video is uploaded to the board.*

Play web-compatible video files (MP4 preferred). Playback position is synchronized across users on a best-effort basis. Videos are muted by default to prevent audio feedback. You can capture a frame as a screenshot, which creates a new ImageViewer on the board.

<!-- TODO: Screenshot of VideoViewer app -->
![VideoViewer](images/applications/applications_videoviewer.jpeg)

<!-- TODO: Screenshot of VideoViewer toolbar -->
![VideoViewerToolbar](images/applications/applications_videoviewer_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Play / Pause | Toggle | <img src="icons/applications/MdPlayArrow.svg" width="20"> <img src="icons/applications/MdPause.svg" width="20"> | Control playback |
| Loop | Toggle | <img src="icons/applications/MdLoop.svg" width="20"> | Toggle looping |
| Mute / Unmute | Toggle | <img src="icons/applications/MdVolumeOff.svg" width="20"> <img src="icons/applications/MdVolumeUp.svg" width="20"> | Toggle audio |
| Seek | Slider | <img src="icons/applications/MdGraphicEq.svg" width="20"> | Scrub through the video with time display |
| Download Video | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download the original video file |
| Screenshot | Button | <img src="icons/applications/MdScreenshotMonitor.svg" width="20"> | Capture the current frame as an image on the board |
| Info | Button | <img src="icons/applications/MdInfoOutline.svg" width="20"> | View file metadata |

---

## WebpageLink

Paste a URL onto the board to create a WebpageLink. It fetches and displays metadata from the URL (title, description, and preview image), giving you context about the linked content. From there, you can open the page in a Webview on the board, in your system browser, or copy the URL.

<!-- TODO: Screenshot of WebpageLink app -->
![WebpageLink](images/applications/applications_webpagelink.jpeg)

<!-- TODO: Screenshot of WebpageLink toolbar -->
![WebpageLinkToolbar](images/applications/applications_webpagelink_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Open in SAGE3 | Button | <img src="icons/applications/MdWeb.svg" width="20"> | Open the URL in a new Webview app on the board |
| Stream Webview | Button | <img src="icons/applications/MdViewSidebar.svg" width="20"> | Stream the webview content (Electron client) |
| Open in Desktop | Button | <img src="icons/applications/MdDesktopMac.svg" width="20"> | Open the URL in your system browser |
| Copy URL | Button | <img src="icons/applications/MdCopyAll.svg" width="20"> | Copy the URL to your clipboard |
| Save to Asset Manager | Button | <img src="icons/applications/MdFileUpload.svg" width="20"> | Save the link as a `.url` file |
| Download Link | Button | <img src="icons/applications/MdFileDownload.svg" width="20"> | Download as a `.url` file |

---

## Webview

An embedded web browser within the board. Enter any URL to load a web page directly on the canvas. Navigation (back, forward, URL changes) is synchronized across users, though scroll position is local to each user. Webviews are muted by default. Hold `Ctrl` (or `Cmd` on Mac) and click a link to open it in a new Webview. Best used with public content such as dashboards, documentation, or Google Docs.

<!-- TODO: Screenshot of Webview app -->
![Webview](images/applications/applications_webview.jpeg)

**Toolbar (Electron client):**

<!-- TODO: Screenshot of Webview toolbar -->
![WebviewToolbar](images/applications/applications_webview_toolbar.jpeg)

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Back | Button | <img src="icons/applications/MdArrowBack.svg" width="20"> | Navigate back |
| Forward | Button | <img src="icons/applications/MdArrowForward.svg" width="20"> | Navigate forward |
| Reload | Button | <img src="icons/applications/MdRefresh.svg" width="20"> | Refresh the current page |
| URL Bar | Text Input | | View or change the current URL |
| Revert to Shared URL | Button | <img src="icons/applications/MdCallReceived.svg" width="20"> | Reset to the URL shared with all users |
| Update Shared URL | Button | <img src="icons/applications/MdCallMade.svg" width="20"> | Push your current URL to all users |
| Zoom In | Button | <img src="icons/applications/MdAdd.svg" width="20"> | Increase the page zoom level |
| Zoom Out | Button | <img src="icons/applications/MdRemove.svg" width="20"> | Decrease the page zoom level |
| Mute | Toggle | <img src="icons/applications/MdVolumeOff.svg" width="20"> | Toggle audio |
| Save URL | Button | <img src="icons/applications/MdFileUpload.svg" width="20"> | Save the URL to the asset manager |
| Copy URL | Button | <img src="icons/applications/MdCopyAll.svg" width="20"> | Copy the URL to your clipboard |
| Open in Desktop | Button | <img src="icons/applications/MdOpenInNew.svg" width="20"> | Open the URL in your system browser |

**Toolbar (Web browser client):**

| Name | Type | Icon | Description |
|------|------|------|-------------|
| Open | Button | <img src="icons/applications/MdOpenInNew.svg" width="20"> | Open the URL in a new browser tab |
| Copy URL | Button | <img src="icons/applications/MdCopyAll.svg" width="20"> | Copy the URL to your clipboard |
