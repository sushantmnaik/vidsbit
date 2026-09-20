# VIDSBIT

### Free. Local-first. No watermark.

VIDSBIT is a browser-based video editor focused on making everyday video editing simple, accessible, and privacy-friendly — without forcing users into subscriptions, watermarks, or account-based workflows.

The project is being built with a **local-first approach**, keeping media and editing data on the user's device whenever possible.

> 🚧 **VIDSBIT is currently under active development.**

---

## ✨ Vision

Video editing shouldn't always require expensive software, powerful hardware, or uploading your media to a server.

VIDSBIT aims to provide a simple editing experience directly in the browser:

* 🎬 Essential video editing tools
* 🔒 Local-first media processing
* 💸 Free to use
* 🚫 No forced watermark
* 🌐 Browser-based
* 📁 Local project organization
* ⚡ Fast browser-based processing
* 📴 Core editing designed to work without depending on a server
* 🧩 Advanced features added gradually

The idea is simple:

> **Open VIDSBIT → import your media → edit → export.**

---

## 🎥 Features

### Current

* [x] Video importing
* [x] Audio importing
* [x] Image importing
* [x] Media library
* [x] Timeline
* [x] Video preview
* [x] Play / pause
* [x] Clip selection
* [x] Clip deletion
* [x] Clip reordering
* [x] Basic trimming
* [x] Clip splitting
* [x] Multi-clip timeline
* [x] Multi-clip export
* [x] MP4 export
* [x] Browser-based FFmpeg processing
* [x] Local project persistence
* [x] Multiple projects
* [x] Project folders
* [x] Automatic project saving
* [x] Undo / Redo
* [x] Keyboard shortcuts

### Planned

#### 🎬 Editing

* [ ] Drag-and-drop timeline editing
* [ ] Precise trim handles
* [ ] Clip duplication
* [ ] Timeline zoom
* [ ] Multiple video tracks
* [ ] Multiple audio tracks
* [ ] Snap-to-clip editing
* [ ] Transitions
* [ ] Picture-in-picture
* [ ] Text overlays
* [ ] Text animations
* [ ] Filters
* [ ] Crop and resize
* [ ] Rotation
* [ ] Speed control
* [ ] Volume control

#### 🎵 Audio

* [ ] Background music
* [ ] Audio trimming
* [ ] Fade in / fade out
* [ ] Multiple audio tracks
* [ ] Local music library
* [ ] Music search
* [ ] Mood-based music discovery
* [ ] Genre filters
* [ ] Language filters

#### 🤖 Advanced & AI Features

* [ ] Automatic captions
* [ ] Custom caption designs
* [ ] Animated captions
* [ ] Chroma key / green screen
* [ ] Video background removal
* [ ] Image background removal
* [ ] Advanced video effects
* [ ] AI-assisted editing tools

#### 📁 Project & Storage

* [x] Multiple projects
* [x] Project folders
* [x] Local project persistence
* [x] Automatic saving
* [ ] Local folder integration
* [ ] Project import / export
* [ ] Optional project backup
* [ ] Full project backup with media
* [ ] Improved offline support

---

## 🔐 Local-First

One of the main ideas behind VIDSBIT is that your videos shouldn't have to leave your device just to perform basic editing.

VIDSBIT is being designed to use browser technologies such as:

* **IndexedDB**
* **File System Access API**
* **Web Workers**
* **WebAssembly**
* **WebCodecs**
* **WebGPU / WebGL**

This allows supported editing and processing tasks to happen directly in the browser.

### Why?

Video files can be very large. Uploading them to a server can mean:

* Long upload times
* Increased bandwidth usage
* Server storage requirements
* Additional processing costs
* Privacy concerns
* Dependence on an internet connection

VIDSBIT aims to minimize these requirements by processing as much as reasonably possible on the user's device.

> Local-first does not mean every future feature will necessarily work completely offline. Features such as online music discovery, external services, or certain AI models may require an internet connection.

---

## ⚡ Editing Philosophy

VIDSBIT follows a simple processing principle:

### Cheap edits first. Expensive processing last.

A typical workflow can look like:

```text
Import
   ↓
Trim unwanted sections
   ↓
Delete unnecessary clips
   ↓
Arrange the timeline
   ↓
Add basic edits
   ↓
Apply expensive effects
   ↓
Generate captions / AI processing
   ↓
Export
```

This approach helps avoid spending processing power on media that the user eventually removes.

---

## 🧠 Architecture

VIDSBIT is being developed as a modular browser-based editor.

```text
VIDSBIT
│
├── Editor UI
│   ├── Media Panel
│   ├── Preview
│   ├── Timeline
│   ├── Editing Controls
│   └── Export Dialog
│
├── Editor State
│   ├── Media
│   ├── Timeline Clips
│   ├── Selection
│   └── Playback
│
├── Project System
│   ├── Projects
│   ├── Folders
│   └── Local Persistence
│
├── Processing
│   ├── FFmpeg
│   ├── WebAssembly
│   └── Web Workers
│
└── Future Processing
    ├── WebCodecs
    ├── WebGPU
    ├── Captions
    ├── Background Removal
    └── AI Features
```

---

## 🛠️ Tech Stack

| Technology             | Purpose                             |
| ---------------------- | ----------------------------------- |
| **TypeScript**         | Main programming language           |
| **React**              | User interface                      |
| **Next.js**            | Application framework               |
| **Tailwind CSS**       | Styling foundation                  |
| **FFmpeg WebAssembly** | Video processing and export         |
| **IndexedDB**          | Local project persistence           |
| **Web Workers**        | Background processing               |
| **Web APIs**           | Local file and browser capabilities |
| **WebCodecs**          | Future media processing             |
| **WebGPU / WebGL**     | Future accelerated effects          |

---

## ⌨️ Keyboard Shortcuts

| Shortcut           | Action               |
| ------------------ | -------------------- |
| `Space`            | Play / Pause         |
| `Ctrl + Z`         | Undo                 |
| `Ctrl + Shift + Z` | Redo                 |
| `Ctrl + Y`         | Redo                 |
| `Delete`           | Delete selected clip |
| `Backspace`        | Delete selected clip |
| `S`                | Split selected clip  |
| `←`                | Seek backward        |
| `→`                | Seek forward         |
| `Shift + ←`        | Seek backward faster |
| `Shift + →`        | Seek forward faster  |
| `Home`             | Go to timeline start |
| `End`              | Go to timeline end   |
| `Ctrl + S`         | Save project         |
| `Ctrl + O`         | Open projects        |
| `Ctrl + Enter`     | Export               |
| `Esc`              | Close active dialog  |

---

## 🚀 Getting Started

### Requirements

* Node.js
* npm
* A modern web browser
* Git *(recommended)*

### Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/vidsbit.git
cd vidsbit
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 📦 Production Build

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

---

## 📁 Project Structure

```text
vidsbit/
│
├── public/
│   └── ffmpeg/
│       ├── const.js
│       ├── errors.js
│       ├── worker.js
│       └── core/
│           ├── ffmpeg-core.js
│           └── ffmpeg-core.wasm
│
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   └── editor/
│   │       ├── ExportDialog.tsx
│   │       ├── MediaPanel.tsx
│   │       ├── Preview.tsx
│   │       └── Timeline.tsx
│   │
│   ├── lib/
│   │   ├── exportVideo.ts
│   │   ├── projectStorage.ts
│   │   └── useEditorHistory.ts
│   │
│   └── types/
│       └── editor.ts
│
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

---

## 🧪 Development Status

VIDSBIT is currently in the **early development stage**.

The current version focuses on building the core editing foundation before adding more expensive and complex features.

### Current focus

* Editor stability
* Timeline improvements
* Better trimming
* Better project management
* Local file handling
* Export reliability
* Performance improvements

---

## 🗺️ Roadmap

### Phase 1 — Editor Foundation

* [x] Project setup
* [x] Media importing
* [x] Media library
* [x] Video preview
* [x] Timeline
* [x] Basic trimming
* [x] Splitting
* [x] Reordering
* [x] Undo / Redo
* [x] Local projects
* [x] Project folders
* [x] Basic export

### Phase 2 — Better Editing

* [ ] Drag-and-drop timeline
* [ ] Precise trimming
* [ ] Multiple tracks
* [ ] Audio editing
* [ ] Text overlays
* [ ] Transitions
* [ ] Filters
* [ ] Speed controls
* [ ] Better timeline controls

### Phase 3 — Advanced Video Tools

* [ ] Picture-in-picture
* [ ] Chroma key
* [ ] Background removal
* [ ] Advanced effects
* [ ] Custom animations
* [ ] Better color controls

### Phase 4 — Creator Tools

* [ ] Automatic captions
* [ ] Caption animations
* [ ] Caption styling
* [ ] AI-assisted editing
* [ ] Smart background removal
* [ ] Creator-focused tools

### Phase 5 — Local Workspace

* [ ] Local folder integration
* [ ] Improved project management
* [ ] Project import / export
* [ ] Optional backup
* [ ] Better offline support
* [ ] Improved large-file handling

---

## 🌐 Browser Compatibility

VIDSBIT relies on modern browser capabilities.

The best experience is expected with recent versions of:

* Google Chrome
* Microsoft Edge
* Other Chromium-based browsers

Some advanced features may depend on browser support for APIs such as File System Access, WebCodecs, WebGPU, and WebAssembly.

---

## 🔒 Privacy

VIDSBIT is designed around a local-first workflow.

The intention is to avoid uploading user media to a server for ordinary editing operations.

However, privacy behavior can differ for future online features such as:

* Online music search
* External APIs
* Optional cloud backup
* AI services that require remote processing

Such features should be clearly separated from local editing functionality.

---

## 🤝 Contributing

VIDSBIT is an evolving project, and ideas, bug reports, and contributions are welcome.

If you find a bug:

1. Open an issue.
2. Explain what happened.
3. Provide steps to reproduce it.
4. Include screenshots or recordings when useful.

For larger features, discussing the idea before implementation can help keep the project architecture consistent.

---

## 📜 License

License information will be added as VIDSBIT approaches its public release.

---

## 💡 Philosophy

VIDSBIT isn't intended to become another unnecessarily complicated professional editing suite.

The goal is to build something that is:

```text
Simple enough to start.
Powerful enough to create.
Local enough to trust.
Free enough to use.
```

---

## 👨‍💻 Created by

**Sushant Naik**

Built as an independent project with a focus on **web development, browser-based media processing, and local-first applications**.

---

### VIDSBIT

**Video editing, without the unnecessary baggage.**
