# 👁️ Glance

> **Empowering digital independence with hands-free, gaze-driven web browsing and privacy-first on-device AI.**

Glance is an assistive browser extension that enables fully hands-free web navigation. By pairing client-side computer vision (468-point facial landmarks) with Chrome's on-device AI (Gemini Nano), Glance allows users with motor impairments, RSI, or temporary disabilities to navigate websites, switch tabs, scroll feeds, and consume content summaries using only natural head movements and facial gestures—with zero hardware cost and complete offline privacy.

---

## 🚀 Key Features

### 1. 🗂️ Hands-Free Virtual Tab Bar
- **Touchless Multi-Tab Switching:** Hover or dwell over the top-of-screen handle to reveal open browser tabs.
- **Dwell to Switch:** Dwell your head pointer over any tab chip for ~600ms to instantly switch to that tab.
- **Tab Controls:** Hands-free pin, close, and new-tab creation.
- **Seamless Camera Handover:** Intelligent visibility management pauses camera processing on background tabs and cleanly re-acquires the stream when you switch tabs without freezing or reloading neural models.

### 2. 🎯 Ultra-Low Latency, Jitter-Free Head Pointer
- **1:1 Responsive Tracking:** Optimized One-Euro signal filter (`minCutoff = 0.35`, `beta = 0.005`) provides instant, lag-free cursor tracking that directly mirrors your head movement.
- **Stationary Micro-Jitter Suppression:** Integrated velocity deadband filter eliminates involuntary tremors and optical noise when your head is stationary.
- **Topmost Z-Index Layering:** Cursor reticle guaranteed to render above all DOM elements, modals, iframes, and virtual UI components.

### 3. 📜 Deep Container & SPA Edge Scrolling
- **Intuitive Viewport Edge Scrolling:** Gently tilt your head toward the top or bottom 35% of the screen to smoothly scroll.
- **Deep DOM Traversal:** Automatically detects and scrolls nested scrollable containers (e.g., LinkedIn feed, Reddit threads, Twitter timelines, modals) where standard `window.scrollBy` fails.

### 4. 👄 Facial Gesture Interactions
- **Mouth-Open Click:** Open your mouth slightly to trigger an instant click on the element under the cursor.
- **Dwell Preview:** Dwell on links for ~600ms to open instant AI summary tooltips.
- **Five-Point Calibration:** Quick calibration wizard (`Alt+H`) maps your personal comfortable range of head motion.

### 5. 🧠 100% On-Device AI Summaries (Zero Telemetry)
- **Chrome Built-in AI (Gemini Nano):** Summarizes web articles, documentation, and Wikipedia entries directly inside the browser using the streaming Summarizer API.
- **YouTube Video Intelligence:** Analyzes transcripts and descriptions using the Prompt API to extract chapter timestamps, key takeaways, and core themes.
- **Total Privacy:** Camera frames are processed purely in-memory via WebGL; no video, telemetry, or user data ever leaves your machine.

---

## 🛠️ Architecture & Tech Stack

```text
┌─────────────────────────────────────────────────────────────┐
│                        User Webcam                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Local MediaStream
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Computer Vision (Human.js / WebGL)             │
│        - 468-point 3D facial mesh & head pose vector        │
│        - Mouth Aspect Ratio (MAR) gesture detection          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Raw coordinates
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Signal Processing & Assistive Harness              │
│        - One-Euro dynamic low-pass filter                   │
│        - Velocity-aware stationary deadband                 │
│        - Deep DOM container scroll resolver                 │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Virtual UI & Tab Manager   │ │     On-Device AI Engine    │
│  - Glassmorphic Tab Bar      │ │  - Chrome Summarizer API   │
│  - Cross-tab IPC via SW      │ │  - Gemini Nano Prompt API  │
│  - Reticle & Dwell Overlays  │ │  - Readability DOM parsing │
└──────────────────────────────┘ └────────────────────────────┘
```

- **Runtime:** Chrome Manifest V3 Extension (Service Worker + Content Scripts + Side Panel)
- **Computer Vision:** [Human.js](https://github.com/vladmandic/human) by Vladimir Mandic (TensorFlow.js / WebGL offline bundle)
- **Signal Filtering:** One-Euro Filter algorithm (Casiez et al.)
- **On-Device AI:** Chrome Built-in AI APIs (Gemini Nano: Summarizer & Language Model)
- **DOM Parsing:** [Readability.js](https://github.com/mozilla/readability) by Mozilla
- **Styles:** Pure Vanilla CSS (CSP-compliant stylesheet injection)

---

## 📦 Installation & Setup

### Prerequisites
- Google Chrome (version 128+ recommended for Built-in AI features)
- A standard webcam (any 720p or 1080p camera)

### Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/D1SH4NT121/glance.git
   cd glance
   ```

2. **Load into Google Chrome:**
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** using the toggle in the top-right corner.
   - Click **Load unpacked**.
   - Select the `Glance` root folder (containing `manifest.json`).

3. **Enable Camera & Start Browsing:**
   - Click the Glance icon in your Chrome toolbar or open the side panel (`Alt+P` / click extension icon).
   - Allow camera permissions when prompted.
   - Sit comfortably facing your monitor and press **Alt+H** to calibrate your head range.

---

## ⌨️ Keyboard Shortcuts & Controls

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>H</kbd> | **Head Calibration** | 5-step wizard (Center, Left, Right, Up, Down) |
| <kbd>Alt</kbd> + <kbd>M</kbd> | **Mouth Calibration** | Calibrate mouth-open click threshold |
| <kbd>Alt</kbd> + <kbd>P</kbd> | **Toggle Pointer** | Hide or show the red head cursor |
| <kbd>Alt</kbd> + <kbd>V</kbd> | **Camera Preview** | Toggle floating webcam preview window |
| <kbd>Shift</kbd> + <kbd>H</kbd> | **Debug HUD** | Toggle landmark and latency performance stats |
| <kbd>Esc</kbd> | **Cancel / Dismiss** | Dismiss active dwell summary tooltip |

---

## 🔬 Testing & Verification

1. **Virtual Tab Bar Test:** Open multiple tabs in Chrome. Look at the top edge handle. Verify tabs populate with favicons. Dwell on a tab chip to switch. Click the 📌 Pin button to keep it docked.
2. **Jitter & Latency Test:** Move your head across the screen—observe instantaneous tracking. Stop moving your head—observe that the cursor remains rock-steady without drifting or shaking.
3. **LinkedIn / SPA Feed Scroll Test:** Navigate to `linkedin.com` or `reddit.com`. Tilt head slightly down to verify the nested feed container scrolls effortlessly.
4. **AI Summary Test:** Dwell over any Wikipedia or news article link for 600ms. Verify the streaming markdown summary appears in the glassmorphic tooltip.

---

## 💡 Original Contributions & Enhancements by D1SH4NT121

This project builds upon the foundational vision of the open-source *Nutshell* project and introduces substantial architectural upgrades and new capabilities:

1. **Hands-Free Virtual Tab Bar (`virtual-tab-bar.js`, `virtual-tab-bar.css`):**
   - Engineered a complete hands-free multi-tab switching system rendered directly in the content page.
   - Background service worker integration for tab discovery, creation, closing, and cross-tab switching (`chrome.tabs` messaging).
   - Glassmorphic UI with animated dwell progress rings, tab favicon detection, and pin/unpin controls.

2. **Tracking Pipeline Modernization & 1:1 Jitter Elimination:**
   - Optimized Human.js execution loop (disabling unneeded pipelines and tuning cache sensitivity) to achieve smooth 30+ FPS.
   - Re-tuned One-Euro filter parameters (`HEAD_FILTER_MIN_CUTOFF = 0.35`, `HEAD_FILTER_BETA = 0.005`) and eliminated redundant secondary lerp smoothing and CSS transition delays to deliver true 1:1 cursor response.
   - Introduced a velocity-aware stationary deadband gate to eliminate resting micro-jitter.

3. **Deep Container & SPA Scroll Engine:**
   - Overhauled edge scrolling from rigid `window.scrollBy` to a recursive DOM container traversal that detects and scrolls overflow containers across complex single-page apps (LinkedIn, Twitter/X, Reddit).
   - Lowered head tilt trigger thresholds from 0.65 to 0.35 for ergonomic comfort.

4. **Cross-Tab Camera Handover & Lifecycle Management:**
   - Implemented tab visibility observers (`handleVisibilityChange`) to pause video streams on hidden tabs without destroying WebGL neural models, enabling fast stream re-acquisition upon tab focus.

5. **Strict Content Security Policy (CSP) Bypass:**
   - Replaced inline stylesheet injection with dynamic web-accessible resource links (`chrome.runtime.getURL`), enabling Glance to operate seamlessly on high-security websites like LinkedIn.

---

## 🔮 Future Roadmap

- [ ] **WebLLM / WebGPU Open-Weight Models:** Support local open-weight models (Gemma-2B, SmolLM2) running directly in WebGPU for environments without Chrome Built-in AI.
- [ ] **Magnetic Element Snapping:** Spatial KD-tree targeting to pull the cursor magnetically toward nearby clickable buttons.
- [ ] **Voice + Gaze Multimodal Agent:** Say "Click" or "Summarize" while looking at an element.
- [ ] **On-Screen Dwell Keyboard:** Type text into search boxes and inputs without touching the physical keyboard.

---

## 📄 License & Attribution

- **License:** MIT License — see [LICENSE](LICENSE) for details.
- **Copyright:**
  - Copyright (c) 2026 **D1SH4NT121**
  

### Third-Party Acknowledgements
- [Human.js](https://github.com/vladmandic/human) by Vladimir Mandic (Face landmark detection)
- [Readability.js](https://github.com/mozilla/readability) by Mozilla (Article content extraction)
- [One-Euro Filter](http://cristal.univ-lille.fr/~casiez/1euro/) by Géry Casiez, Nicolas Roussel, and Daniel Vogel
- [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in) (Gemini Nano)
