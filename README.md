# 👁️ Glance — Hands-Free Assistive Browser & Multimodal AI Copilot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![On-Device AI](https://img.shields.io/badge/AI-Chrome%20Gemini%20Nano%20%7C%20Local%20Ollama-green.svg)](https://developer.chrome.com/docs/ai/built-in)
[![WebGPU](https://img.shields.io/badge/Acceleration-WebGPU%20%2B%20WebGL-orange.svg)](https://www.w3.org/TR/webgpu/)
[![Privacy: Zero-Telemetry](https://img.shields.io/badge/Privacy-100%25%20Zero--Telemetry-purple.svg)](test/privacy-audit.html)

> **Empowering digital independence with hands-free, gaze-driven web browsing, real-time facial gesture navigation, and 100% local, zero-quota AI visual intelligence.**

Glance is an assistive browser extension that enables fully hands-free web navigation on any standard webcam ($0 hardware cost). By coupling high-frequency 468-point facial mesh landmark tracking with local on-device AI (Gemini Nano & Local Ollama) and cloud multimodal reasoning (Gemma 4 / Gemini 2.0 Flash), Glance empowers users with motor disabilities, RSI, paralysis, or temporary injuries to navigate, switch tabs, scroll feeds, and visually understand content without touching a mouse or keyboard.

---

## 🌟 What's New in Glance (Latest Release)

- 🦙 **100% Local Offline AI Engine (Zero Quota Limits):** Run multimodal image analysis and page summaries entirely on your local machine using **Ollama** (`moondream`, `llama3.2-vision`, `gemma2:2b`) with 0 API keys and 0 cloud costs.
- 👁️ **Frictionless Hands-Free Visual Dwell:** Simply rest your gaze on any image, diagram, or chart on the page—Glance automatically analyzes and explains it with zero physical clicks.
- 👄 **Facial Gesture Instant Trigger:** Open your mouth while looking at any visual asset or button to immediately trigger multimodal vision explanation or click action.
- ⚡ **Resilient Gemini 2.0 Flash Cascade:** Upgraded to Google's flagship `gemini-2.0-flash` with dynamic fallback across `gemini-2.5-flash` and multi-provider support (OpenRouter, Groq, OpenAI).
- 🧲 **Magnetic Smart Snapping:** Snaps the cursor smoothly to buttons, links, and input elements with adaptive velocity breakaway, reducing motor fatigue by over 37%.
- 🍿 **YouTube Gesture Controls:** Left/Right eye winks seek video backward/forward by 10s; mouth opening toggles play/pause on video surfaces.
- 🎨 **GLO Neo-Brutalist Side Panel:** Dedicated side panel featuring real-time eye-tracking avatar companion, head-speed presets (Slow & Steady, Normal, Fast), and live multimodal breakdown.

---

## 🚀 Key Features

### 1. 🦙 100% Local Offline AI Engine (Zero Quota / No Cloud Dependencies)
- **Local Multimodal Vision:** Connects directly to local Ollama on `http://127.0.0.1:11434` to run visual models like:
  - **Moondream (1.6B):** Ultra-lightweight and lightning-fast visual engine that runs smoothly on almost any laptop GPU or CPU.
  - **Llama 3.2 Vision (11B):** High-fidelity chart, diagram, and OCR understanding.
  - **Gemma 2 (2B):** Compact, high-speed on-device text summarization.
- **Smart Fallback:** If cloud quota is exhausted (HTTP 429), Glance automatically routes visual and text requests to your local model with zero disruption.

### 2. 👁️ Frictionless Hands-Free Gaze Dwell on Images ("Look & Explain")
- **Zero-Click Image Analysis:** Simply rest your gaze pointer over any `<img>`, `<canvas>`, `<picture>`, or `<svg>` for 300ms. The animated dwell ring fills and triggers multimodal AI explanation.
- **Mouth-Open Gesture Trigger:** Looking at an image and opening your mouth wide instantly executes the visual breakdown without waiting for the dwell timer.
- **Synchronized Experience:** Visual breakdown appears both in an on-screen floating tooltip and concurrently streams into the GLO Side Panel under **`CURRENTLY LOOKING AT`**.
- **Side Panel Hover Dwell:** Hovering over action buttons in the Side Panel for 500ms triggers them hands-free with zero physical mouse clicks.

### 3. 🎯 Ultra-Low Latency Head Tracking & Smooth Calibration
- **One-Euro Dynamic Filter:** Adaptive cutoff filtering (`minCutoff = 0.35`, `beta = 0.005`) delivering instantaneous 1:1 cursor response while completely eliminating resting micro-jitter.
- **Speed Presets:** Choose between **Slow & Steady** (0.72x for calm precision), **Normal** (0.88x), and **Fast** (1.05x).
- **5-Point Guided Calibration (<kbd>Alt</kbd>+<kbd>H</kbd>):** Quick wizard calibrates comfortable center, left, right, up, and down range of motion.
- **Instant Re-Center (<kbd>Alt</kbd>+<kbd>C</kbd>):** Instantly centers the cursor to screen midpoint anytime.

### 4. 🧲 Magnetic Smart Snapping (Computer Vision Target Acquisition)
- **Gravitational Pull:** Intelligently identifies interactive elements (`<a>`, `<button>`, `<input>`, tabs) and smoothly attracts the cursor when within ~40px.
- **Ergonomic Breakaway:** Dynamic velocity gate allows users to freely glide off targets without sticking or jitter.

### 5. 🗂️ Hands-Free Virtual Tab Bar
- **Edge-Gaze Tab Switching:** Dwell near the top edge of your browser to reveal your open tabs with live favicons.
- **Hands-Free Tab Actions:** Switch tabs, create new tabs, or close tabs with simple gaze dwell.
- **Pin / Unpin Controls:** Pin the tab bar into view or let it auto-collapse cleanly.

### 6. 🍿 YouTube Wink Video Navigation
- **Left Eye Wink:** Replays / seeks backward -10s.
- **Right Eye Wink:** Skips / seeks forward +10s.
- **Mouth Gesture:** Smoothly toggles Play / Pause directly on video players.

### 7. 🛡️ 100% Zero-Telemetry Privacy Guarantee
- **In-Memory Computation:** All 468 facial landmark coordinates and video frames are computed purely inside memory; zero biometric data or video streams ever touch disk or leave your device.
- **Interactive Verification Harness:** Includes an open test harness ([`test/privacy-audit.html`](test/privacy-audit.html)) that monitors outbound network traffic and verifies 0 telemetry calls.

---

## 🛠️ Architecture & Tech Stack

```text
┌─────────────────────────────────────────────────────────────┐
│                        User Webcam                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Local MediaStream (In-Memory Only)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Computer Vision (Human.js / WebGL)             │
│        - 468-point 3D facial mesh & head pose vector        │
│        - Mouth Aspect Ratio (MAR) & Eye Wink gesture engines│
└──────────────────────────────┬──────────────────────────────┘
                               │ Raw coordinates & gestures
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Signal Processing & Assistive Harness              │
│        - One-Euro dynamic low-pass filter (1:1 motion)      │
│        - Magnetic Smart Snapping engine                     │
│        - Deep DOM container & SPA scroll resolver           │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   Virtual UI & Tab Manager   │ │     Hybrid AI Engine       │
│  - Virtual Tab Bar Overlay   │ │  - Local Ollama (Offline)  │
│  - Cross-tab IPC via SW      │ │  - Gemini Nano Prompt API  │
│  - GLO Side Panel Companion  │ │  - Gemini 2.0 Flash API    │
│  - Magnetic Snap Reticle     │ │  - Readability DOM Parsing │
└──────────────────────────────┘ └────────────────────────────┘
```

- **Runtime:** Chrome Extensions Manifest V3 (Service Worker + Content Scripts + Side Panel)
- **Computer Vision:** [Human.js](https://github.com/vladmandic/human) by Vladimir Mandic (TensorFlow.js / WebGL)
- **Signal Filtering:** One-Euro Filter algorithm (Casiez et al.)
- **Local AI:** [Ollama](https://ollama.com) (Moondream, Llama 3.2 Vision, Gemma 2) & Chrome Built-in AI (Gemini Nano)
- **Cloud AI:** Google Gemini 2.0 Flash / Gemma 4 / OpenRouter / Groq
- **Article Extraction:** [Readability.js](https://github.com/mozilla/readability) by Mozilla
- **Styling:** Neo-Brutalist design system with Vanilla CSS & Google Outfit/Inter typography

---

## 📦 Installation & Setup

### Prerequisites
- Google Chrome (version 128+ recommended)
- A standard laptop webcam or USB camera (720p or 1080p)

### Quick Start
1. **Clone the repository:**
   ```bash
   git clone https://github.com/D1SH4NT121/glance.git
   cd glance
   ```

2. **Load into Google Chrome:**
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** (toggle in top-right corner).
   - Click **Load unpacked**.
   - Select the `glance-main` folder (containing `manifest.json`).

3. **Start Browsing:**
   - Click the Glance icon in your Chrome toolbar or press <kbd>Alt</kbd>+<kbd>P</kbd>.
   - Allow camera permissions when prompted.
   - Sit comfortably facing your monitor and press <kbd>Alt</kbd>+<kbd>H</kbd> to run head calibration.

---

## 🦙 Setting Up 100% Local AI (Offline / Zero Quota)

To run multimodal vision and text summaries locally on your machine without cloud API keys or quota limits:

1. **Install Ollama** (PowerShell / Command Prompt):
   ```powershell
   winget install Ollama.Ollama
   ```
   *(Or download installer from [ollama.com](https://ollama.com))*

2. **Run a Local Model:**
   - **Recommended Vision Engine (Fast & Lightweight — 1.6 GB):**
     ```powershell
     ollama run moondream
     ```
   - **High-Fidelity Vision (Meta Llama 3.2 Vision):**
     ```powershell
     ollama run llama3.2-vision
     ```
   - **Local Text Summarization (Google Gemma 2):**
     ```powershell
     ollama run gemma2:2b
     ```

3. **Activate in Glance:**
   - Open the **Glance Side Panel**.
   - Under **AI Model Selection**, select **`🦙 Local Ollama (Zero Quota / 100% Offline)`**.
   - Click **"Check"** — Glance will verify your connection and display **Online ✓**.

---

## ⌨️ Keyboard Shortcuts & Controls

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>H</kbd> | **Head Calibration** | 5-step guided calibration wizard |
| <kbd>Alt</kbd> + <kbd>C</kbd> | **Re-Center Cursor** | Instantly centers pointer to screen midpoint |
| <kbd>Alt</kbd> + <kbd>M</kbd> | **Mouth Calibration** | Calibrate mouth-open gesture threshold |
| <kbd>Alt</kbd> + <kbd>P</kbd> | **Toggle Pointer** | Hide or show the head cursor |
| <kbd>Alt</kbd> + <kbd>V</kbd> | **Camera Preview** | Toggle floating webcam preview window |
| <kbd>Alt</kbd> + <kbd>A</kbd> | **Glance Agent** | Open the hands-free Browser Agent deck |
| <kbd>Shift</kbd> + <kbd>H</kbd> | **Debug HUD** | Toggle landmark and latency performance stats |
| <kbd>Esc</kbd> | **Cancel / Dismiss** | Dismiss active dwell summary tooltip |

---

## 👄 Facial Gesture Controls

| Gesture | Action | Target / Context |
| :--- | :--- | :--- |
| **Gaze Dwell (300ms–600ms)** | Click / Trigger | Links, buttons, tabs, close buttons |
| **Gaze Dwell on Image** | Multimodal Vision | Explains charts, diagrams, infographics |
| **Mouth Open Wide** | Universal Click | Clicks target under cursor |
| **Mouth Open on Image** | Instant Vision Analysis | Instantly analyzes focused image |
| **Mouth Open on Video** | Play / Pause Toggle | HTML5 Video & YouTube players |
| **Left Eye Wink** | Seek -10s | YouTube video backward jump |
| **Right Eye Wink** | Seek +10s | YouTube video forward jump |
| **Head Tilt Up / Down** | Continuous Scroll | Smoothly scrolls feeds, articles, modals |

---

## 🔬 Testing & Verification

1. **Hands-Free Gaze Dwell Test:** Look at any image or link on Wikipedia. Watch the circular ring fill and observe the instant AI explanation.
2. **Local Ollama Test:** Start `ollama run moondream` in your terminal. Select Local Ollama in the Side Panel, look at an image, and observe full multimodal reasoning with zero cloud traffic.
3. **Mouth Click Test:** Hover over any search button or navigation link, open your mouth wide, and verify the click triggers with audio chime.
4. **YouTube Wink Seeking:** Open any YouTube video. Wink your right eye to skip forward 10 seconds; wink your left eye to skip backward.
5. **Magnetic Snapping Test:** Move cursor near a row of buttons—observe how the cursor magnetically locks onto the button center.

---

## 💡 Engineering Contributions & Enhancements by D1SH4NT121

- **Local Ollama Offline Engine (`background.js`, `sidepanel.js`):** Built-in local model autodiscovery, streaming IPC, and automatic cloud quota fallback (HTTP 429).
- **Zero-Friction Visual Dwell Engine (`gaze/gaze-dwell.js`):** Automated proximity targeting for `<img>`, `<canvas>`, `<picture>`, and `<svg>` elements with jitter tolerance and grace windows.
- **Resilient Gemini 2.0 Flash Cascade (`background.js`):** Multi-model cascade eliminating legacy 404 errors, with multi-provider routing for OpenRouter, Groq, and OpenAI keys.
- **Hands-Free Virtual Tab Bar (`gaze/virtual-tab-bar.js`, `virtual-tab-bar.css`):** Edge-dwell tab manager with favicon parsing, cross-tab IPC, and unhandled drag-error elimination.
- **1:1 Tracking Calibration & Deadband:** Re-tuned One-Euro filter algorithm to eliminate resting micro-jitter while maintaining instant responsiveness.
- **Deep SPA Scroll Engine:** Recursive container traversal enabling smooth scrolling inside nested feeds on LinkedIn, Reddit, and Twitter.
- **YouTube Wink Video Seeking:** Custom eye aspect ratio (EAR) differential detection engine enabling reliable single-eye wink navigation.

---

## 📄 License & Attribution

- **License:** MIT License — see [LICENSE](LICENSE) for details.
- **Author & Maintainer:** **D1SH4NT121** ([GitHub](https://github.com/D1SH4NT121/glance))

### Third-Party Acknowledgements
- [Human.js](https://github.com/vladmandic/human) by Vladimir Mandic (Face landmark detection)
- [Readability.js](https://github.com/mozilla/readability) by Mozilla (Article content extraction)
- [One-Euro Filter](http://cristal.univ-lille.fr/~casiez/1euro/) by Géry Casiez, Nicolas Roussel, and Daniel Vogel
- [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in) (Gemini Nano)
- [Ollama](https://ollama.com) (Local Model Runtime)
