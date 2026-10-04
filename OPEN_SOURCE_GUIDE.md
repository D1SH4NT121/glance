# 🌐 Glance Open-Source Developer Guide

Welcome to the **Glance Open-Source Developer & Extensibility Guide**. Glance was engineered as a modular, open platform empowering the assistive computing community to build hands-free neural interfaces and browser agents.

---

## 🏗️ End-to-End Architecture Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Webcam Stream                            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ 720p / 1080p @ 30-60fps
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Computer Vision Pipeline (Human.js / WebGL)                │
│       • 468-point 3D facial mesh & head pose rotation vector             │
│       • Mouth Aspect Ratio (MAR) & facial landmark extraction            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Raw coordinates & facial geometry
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Signal Processing & Assistive Harness                    │
│       • One-Euro Dynamic Low-Pass Filter (minCut=0.35, beta=0.005)       │
│       • Velocity-Aware Stationary Deadband (< 2.8px noise gate)         │
│       • 🧲 Magnetic Smart Snapping (gravitational target attraction)    │
└──────────────────┬──────────────────────────────────┬───────────────────┘
                   │                                  │
                   ▼                                  ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│ 🔌 Open Gesture & Action SDK      │ │ 🤖 Agent Skill Open Standard      │
│   • Brow raise -> Virtual Tab Bar │ │   • ASOS v1.0 Compliant Manifest  │
│   • Head nod -> Confirm click     │ │   • Goal Planner & DOM Executor   │
│   • Head shake -> Dismiss/Back    │ │   • Click, scroll, type, navigate │
│   • Community custom plugins      │ │   • Alt+A Hands-Free Goal Palette │
└──────────────────┬────────────────┘ └─────────────────┬─────────────────┘
                   │                                    │
                   ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             🧠 100% In-Browser On-Device AI Engine                      │
│       • Open-Weights WebGPU Engine (SmolLM2 / Llama 3.2 / Gemma)         │
│       • Chrome Built-in AI (Gemini Nano Summarizer & Prompt APIs)       │
│       • TextRank Graph Centrality Local Extractive Summarizer           │
│       • 🛡️ Zero-Telemetry Privacy Verifier (100% In-Memory Guarantee)  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 1. Developing Custom Gestures with the Plugin SDK

Anyone can create assistive plugins with just a few lines of code using `window.GlanceSDK` or `window.Glance`:

```javascript
// Register a custom wink or smile gesture
Glance.registerGesture({
  id: 'double_blink',
  name: 'Double Blink',
  description: 'Triggers context menu on double blink',
  cooldownMs: 1500,
  trigger: (landmarks, annotations, pose, helpers) => {
    // Access full 468 facial mesh coordinates or high-level annotations
    const leftEye = annotations.leftEye;
    const rightEye = annotations.rightEye;
    // Return true when condition is met
    return detectBlink(leftEye) && detectBlink(rightEye);
  },
  action: (eventData) => {
    console.log('Double blink triggered action!', eventData);
  }
});
```

---

## 🤖 2. Extending the Agent Skill Open Standard (ASOS)

Glance implements the **Agent Skill Open Standard v1.0**. You can inspect and extend registered actions in `gaze/agent-skill-harness.js`:

```javascript
// Example: Custom Agent Skill Action
GlanceAgent.executeAction('scroll', {
  direction: 'down',
  amount: 600,
  container: '.reddit-comment-tree'
});
```

### Supported Standard Actions:
1. `click`: `{ selector, text, coords }` - Assistive target click with magnetic alignment.
2. `scroll`: `{ direction: 'down'|'up'|'top'|'bottom', amount, container }` - Deep viewport or container scroll.
3. `type`: `{ selector, text, pressEnter }` - Hands-free text entry.
4. `navigate`: `{ url, action: 'back'|'forward'|'reload' }` - Page & history navigation.
5. `extract`: `{ selector, maxWords }` - Clean readable DOM extraction.
6. `summarize`: `{ target: 'article'|'page' }` - On-device neural summarization.

---

## 🛡️ 3. Zero-Telemetry Privacy Audit Suite

Run the automated privacy verification suite in your browser:
```bash
python -m http.server 8000
```
Navigate to: [`http://localhost:8000/test/privacy-audit.html`](http://localhost:8000/test/privacy-audit.html)

The audit harness continuously verifies:
* Network request interception (`fetch`, `xhr`, `sendBeacon`, `WebSocket`).
* 0 outbound telemetry packets sent by Glance subsystems.
* All facial mesh computations remain in local WebGL/GPU buffers.
