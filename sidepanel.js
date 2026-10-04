// ========================================================
// GLANCE & GLO — CHROME SIDE PANEL CONTROLLER
// Neo-brutalist sidekick interface, live GLO pupil physics,
// hands-free head tracking & on-device AI summarization.
// ========================================================

// State
let settings = {
  apiChoice: 'summarization',
  customPrompt: 'Summarize this article in 2-3 sentences',
  displayMode: 'both',
  gazeEnabled: true,
  gazeDwellMs: 600,
  headTrackingSpeed: 1, // 1: Slow & Steady, 2: Normal, 3: Fast
  headSpeedMultiplier: 0.72,
  mouthClickEnabled: true,
  magneticSnapEnabled: true,
  magneticSnapRadius: 40,
  winkSeekEnabled: true
};

let currentTab = {
  id: null,
  url: '',
  title: '',
  domain: ''
};

// Cute GLO quips
const GLO_QUIPS = [
  "✨ hey :) | ready when you are",
  "👀 tracking your gaze smoothly!",
  "👄 mouth click ready: open wide!",
  "⚡ Alt+C to re-center anytime",
  "🧠 100% on-device AI, zero telemetry!",
  "🎯 hold gaze on any link to preview",
  "💖 you're doing great, explorer!",
  "🍿 wink seek active on YouTube!"
];

let quipIndex = 0;

// DOM references
const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Sidepanel] Initializing GLO Side Panel...');

  try {
    cacheDomElements();
    await loadSettings();
    await updateActiveTabInfo();
    setupEventListeners();
    setupPupilTracking();
    setupTabListeners();
    checkWebGpuSupport();

    console.log('[Sidepanel] GLO Side Panel ready!');
  } catch (error) {
    console.error('[Sidepanel] Initialization error:', error);
  }
});

// Cache DOM elements
function cacheDomElements() {
  // Brand & Header
  elements.gazeStatusDot = document.getElementById('gaze-status-dot');
  elements.gazeStatusText = document.getElementById('gaze-status-text');
  elements.openShortcutsBtn = document.getElementById('open-shortcuts-btn');
  elements.openSettingsBtn = document.getElementById('open-settings-btn');
  elements.shortcutsModal = document.getElementById('shortcuts-modal');
  elements.closeShortcutsBtn = document.getElementById('close-shortcuts-btn');
  elements.settingsModal = document.getElementById('settings-modal');
  elements.closeSettingsBtn = document.getElementById('close-settings-btn');
  elements.saveCloseSettingsBtn = document.getElementById('save-close-settings-btn');

  // GLO Avatar & Speech
  elements.gloAvatar = document.getElementById('glo-avatar');
  elements.gloSpeechBubble = document.getElementById('glo-speech-bubble');
  elements.gloQuote = document.getElementById('glo-quote');
  elements.pupilL = document.getElementById('glo-pupil-l');
  elements.pupilR = document.getElementById('glo-pupil-r');
  elements.irisL = document.getElementById('glo-iris-l');
  elements.irisR = document.getElementById('glo-iris-r');

  // Quick Action Grid
  elements.quickGazeBtn = document.getElementById('quick-gaze-btn');
  elements.quickGazeVal = document.getElementById('quick-gaze-val');
  elements.quickMouthBtn = document.getElementById('quick-mouth-btn');
  elements.quickMouthVal = document.getElementById('quick-mouth-val');
  elements.quickAiBtn = document.getElementById('quick-ai-btn');
  elements.quickAiVal = document.getElementById('quick-ai-val');

  // Currently Looking At Card
  elements.pageDomain = document.getElementById('page-domain');
  elements.pageTitle = document.getElementById('page-title');
  elements.summarizePageBtn = document.getElementById('summarize-page-btn');
  elements.calibrateHeadQuickBtn = document.getElementById('calibrate-head-quick-btn');
  elements.recenterQuickBtn = document.getElementById('recenter-quick-btn');

  // Live Summary Area
  elements.contentArea = document.getElementById('content-area');
  elements.summaryTitle = document.getElementById('title');
  elements.aiSummary = document.getElementById('ai-summary');
  elements.copySummaryBtn = document.getElementById('copy-summary-btn');
  elements.toggleFullContent = document.getElementById('toggle-full-content');
  elements.fullContentSection = document.getElementById('full-content-section');
  elements.articleContent = document.getElementById('article-content');

  // Head Tracking Card
  elements.trackingModeBadge = document.getElementById('tracking-mode-badge');
  elements.gazeEnabled = document.getElementById('gaze-enabled');
  elements.dwellTime = document.getElementById('dwell-time');
  elements.dwellValue = document.getElementById('dwell-value');
  elements.headSpeedQuickSlider = document.getElementById('head-speed-quick-slider');
  elements.speedQuickBadge = document.getElementById('speed-quick-badge');
  elements.headSpeedSlider = document.getElementById('head-speed-slider');
  elements.speedVal = document.getElementById('speed-val');
  elements.magneticSnapEnabled = document.getElementById('magnetic-snap-enabled');
  elements.snapRadius = document.getElementById('snap-radius');
  elements.snapRadiusVal = document.getElementById('snap-radius-val');
  elements.calibrateBtn = document.getElementById('calibrate-btn');

  // Gestures Card
  elements.mouthStatusText = document.getElementById('mouth-status-text');
  elements.mouthClickEnabled = document.getElementById('mouth-click-enabled');
  elements.calibrateMouthBtn = document.getElementById('calibrate-mouth-btn');
  elements.winkSeekEnabled = document.getElementById('wink-seek-enabled');

  // Agent Card
  elements.launchAgentBtn = document.getElementById('launch-agent-btn');
  elements.quickGoalBtns = document.querySelectorAll('.quick-goal-btn');

  // AI Settings Card
  elements.gpuBadge = document.getElementById('gpu-badge');
  elements.displayMode = document.getElementById('display-mode');
  elements.radioSummarization = document.getElementById('radio-summarization');
  elements.radioPrompt = document.getElementById('radio-prompt');
  elements.radioOpenweights = document.getElementById('radio-openweights');
  elements.promptContainer = document.getElementById('prompt-container');
  elements.customPrompt = document.getElementById('custom-prompt');
}

// Load settings from storage
async function loadSettings() {
  const stored = await chrome.storage.local.get([
    'apiChoice', 'customPrompt', 'displayMode', 'gazeEnabled', 'gazeDwellMs',
    'mouthClickEnabled', 'mouthCalV1', 'winkSeekEnabled', 'magneticSnapEnabled', 'magneticSnapRadius',
    'headTrackingSpeed', 'headSpeedMultiplier'
  ]);

  if (stored.apiChoice) settings.apiChoice = stored.apiChoice;
  if (stored.customPrompt) settings.customPrompt = stored.customPrompt;
  if (stored.displayMode) settings.displayMode = stored.displayMode;
  if (typeof stored.gazeEnabled === 'boolean') settings.gazeEnabled = stored.gazeEnabled;
  if (typeof stored.gazeDwellMs === 'number') settings.gazeDwellMs = stored.gazeDwellMs;
  if (typeof stored.headTrackingSpeed === 'number') settings.headTrackingSpeed = stored.headTrackingSpeed;
  if (typeof stored.headSpeedMultiplier === 'number') settings.headSpeedMultiplier = stored.headSpeedMultiplier;
  if (typeof stored.mouthClickEnabled === 'boolean') settings.mouthClickEnabled = stored.mouthClickEnabled;
  if (typeof stored.magneticSnapEnabled === 'boolean') settings.magneticSnapEnabled = stored.magneticSnapEnabled;
  if (typeof stored.magneticSnapRadius === 'number') settings.magneticSnapRadius = stored.magneticSnapRadius;
  if (typeof stored.winkSeekEnabled === 'boolean') settings.winkSeekEnabled = stored.winkSeekEnabled;

  // Sync checkboxes and inputs
  if (elements.gazeEnabled) elements.gazeEnabled.checked = settings.gazeEnabled;
  if (elements.dwellTime) elements.dwellTime.value = settings.gazeDwellMs;
  if (elements.dwellValue) elements.dwellValue.textContent = settings.gazeDwellMs;
  updateSpeedUI(settings.headTrackingSpeed || 1);
  if (elements.magneticSnapEnabled) elements.magneticSnapEnabled.checked = settings.magneticSnapEnabled;
  if (elements.snapRadius) elements.snapRadius.value = settings.magneticSnapRadius;
  if (elements.snapRadiusVal) elements.snapRadiusVal.textContent = settings.magneticSnapRadius;
  if (elements.mouthClickEnabled) elements.mouthClickEnabled.checked = settings.mouthClickEnabled;
  if (elements.winkSeekEnabled) elements.winkSeekEnabled.checked = settings.winkSeekEnabled;

  if (elements.displayMode) elements.displayMode.value = settings.displayMode;
  if (elements.customPrompt) elements.customPrompt.value = settings.customPrompt;

  // API choice radios
  if (settings.apiChoice === 'summarization' && elements.radioSummarization) elements.radioSummarization.checked = true;
  if (settings.apiChoice === 'prompt' && elements.radioPrompt) elements.radioPrompt.checked = true;
  if (settings.apiChoice === 'openweights' && elements.radioOpenweights) elements.radioOpenweights.checked = true;
  togglePromptContainer();

  // Sync quick action badges
  updateQuickBadges();

  // Mouth calibration status
  updateMouthStatus(Boolean(stored.mouthCalV1));
}

// Update speed slider and badge text
function updateSpeedUI(level) {
  const labels = {
    1: 'Slow & Steady',
    2: 'Normal',
    3: 'Fast'
  };
  const label = labels[level] || 'Slow & Steady';
  if (elements.headSpeedQuickSlider) elements.headSpeedQuickSlider.value = level;
  if (elements.speedQuickBadge) elements.speedQuickBadge.textContent = label;
  if (elements.headSpeedSlider) elements.headSpeedSlider.value = level;
  if (elements.speedVal) elements.speedVal.textContent = label;
}

// Update quick buttons UI
function updateQuickBadges() {
  if (elements.quickGazeVal) {
    elements.quickGazeVal.textContent = settings.gazeEnabled ? 'ON' : 'OFF';
  }
  if (elements.quickGazeBtn) {
    elements.quickGazeBtn.classList.toggle('active-pink', settings.gazeEnabled);
  }

  if (elements.quickMouthVal) {
    elements.quickMouthVal.textContent = settings.mouthClickEnabled ? 'ON' : 'OFF';
  }
  if (elements.quickMouthBtn) {
    elements.quickMouthBtn.classList.toggle('active-mint', settings.mouthClickEnabled);
  }

  if (elements.trackingModeBadge) {
    elements.trackingModeBadge.textContent = settings.gazeEnabled ? 'Active' : 'Disabled';
  }
}

// Update active tab title and domain
async function updateActiveTabInfo() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      const tab = tabs[0];
      currentTab.id = tab.id;
      currentTab.url = tab.url || '';
      currentTab.title = tab.title || 'Untitled Page';

      try {
        const parsed = new URL(tab.url);
        currentTab.domain = parsed.hostname;
      } catch {
        currentTab.domain = 'local page';
      }

      if (elements.pageDomain) elements.pageDomain.textContent = currentTab.domain;
      if (elements.pageTitle) elements.pageTitle.textContent = currentTab.title;
    }
  } catch (e) {
    console.debug('[Sidepanel] Failed to query active tab:', e);
  }
}

function setupTabListeners() {
  chrome.tabs.onActivated.addListener(async () => {
    await updateActiveTabInfo();
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.title || changeInfo.url) {
      updateActiveTabInfo();
    }
  });
}

// Check WebGPU hardware support
async function checkWebGpuSupport() {
  if (navigator.gpu && elements.gpuBadge) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        elements.gpuBadge.textContent = 'WebGPU Active';
        elements.gpuBadge.style.background = '#ECFDF5';
        elements.gpuBadge.style.color = '#059669';
        if (elements.quickAiVal) elements.quickAiVal.textContent = 'READY';
      }
    } catch {
      elements.gpuBadge.textContent = 'WebGL Fallback';
    }
  }
}

// GLO Eye Pupil Physics (interactive organic follow)
function setupPupilTracking() {
  const leftEyeCenter = { x: 56, y: 78 };
  const rightEyeCenter = { x: 104, y: 78 };
  const maxTravel = 5.5;

  let targetOffset = { x: 0, y: 0 };
  let currentOffset = { x: 0, y: 0 };

  window.addEventListener('pointermove', (e) => {
    if (!elements.gloAvatar) return;
    const rect = elements.gloAvatar.getBoundingClientRect();
    const avatarCenterX = rect.left + rect.width / 2;
    const avatarCenterY = rect.top + rect.height / 2;

    const dx = e.clientX - avatarCenterX;
    const dy = e.clientY - avatarCenterY;
    const dist = Math.hypot(dx, dy) || 1;

    const angle = Math.atan2(dy, dx);
    const mag = Math.min(maxTravel, dist / 25);

    targetOffset = {
      x: Math.cos(angle) * mag,
      y: Math.sin(angle) * mag
    };
  });

  function animatePupils() {
    currentOffset.x += (targetOffset.x - currentOffset.x) * 0.2;
    currentOffset.y += (targetOffset.y - currentOffset.y) * 0.2;

    if (elements.pupilL) {
      elements.pupilL.setAttribute('cx', String(leftEyeCenter.x + currentOffset.x));
      elements.pupilL.setAttribute('cy', String(leftEyeCenter.y + currentOffset.y));
    }
    if (elements.pupilR) {
      elements.pupilR.setAttribute('cx', String(rightEyeCenter.x + currentOffset.x));
      elements.pupilR.setAttribute('cy', String(rightEyeCenter.y + currentOffset.y));
    }
    requestAnimationFrame(animatePupils);
  }
  requestAnimationFrame(animatePupils);
}

// Set up UI Event Listeners
function setupEventListeners() {
  // GLO Avatar & Speech Bubble clicks
  const cycleQuip = () => {
    quipIndex = (quipIndex + 1) % GLO_QUIPS.length;
    if (elements.gloQuote) {
      elements.gloQuote.textContent = GLO_QUIPS[quipIndex];
    }
  };
  if (elements.gloAvatar) elements.gloAvatar.addEventListener('click', cycleQuip);
  if (elements.gloSpeechBubble) elements.gloSpeechBubble.addEventListener('click', cycleQuip);

  // Quick Action Buttons
  if (elements.quickGazeBtn) {
    elements.quickGazeBtn.addEventListener('click', () => {
      if (elements.gazeEnabled) {
        elements.gazeEnabled.checked = !elements.gazeEnabled.checked;
        elements.gazeEnabled.dispatchEvent(new Event('change'));
      }
    });
  }

  if (elements.quickMouthBtn) {
    elements.quickMouthBtn.addEventListener('click', () => {
      if (elements.mouthClickEnabled) {
        elements.mouthClickEnabled.checked = !elements.mouthClickEnabled.checked;
        elements.mouthClickEnabled.dispatchEvent(new Event('change'));
      }
    });
  }

  if (elements.quickAiBtn) {
    elements.quickAiBtn.addEventListener('click', () => {
      showGloMessage("✨ On-device AI engine is active and ready!");
    });
  }

  // Summarize This Page Button
  if (elements.summarizePageBtn) {
    elements.summarizePageBtn.addEventListener('click', handleSummarizeActivePage);
  }

  // Calibrate & Re-Center Quick Buttons
  if (elements.calibrateHeadQuickBtn) {
    elements.calibrateHeadQuickBtn.addEventListener('click', triggerHeadCalibration);
  }
  if (elements.calibrateBtn) {
    elements.calibrateBtn.addEventListener('click', triggerHeadCalibration);
  }

  if (elements.recenterQuickBtn) {
    elements.recenterQuickBtn.addEventListener('click', triggerRecenter);
  }

  // Copy Summary Button
  if (elements.copySummaryBtn) {
    elements.copySummaryBtn.addEventListener('click', () => {
      if (!elements.aiSummary) return;
      const text = elements.aiSummary.innerText || elements.aiSummary.textContent;
      navigator.clipboard.writeText(text).then(() => {
        elements.copySummaryBtn.textContent = 'Copied! ✓';
        setTimeout(() => {
          elements.copySummaryBtn.textContent = '📋 Copy';
        }, 2000);
      });
    });
  }

  // Toggle Full Content Button
  if (elements.toggleFullContent) {
    elements.toggleFullContent.addEventListener('click', () => {
      if (elements.fullContentSection) {
        const isHidden = elements.fullContentSection.classList.toggle('hidden');
        elements.toggleFullContent.textContent = isHidden ? 'View Full Content' : 'Hide Full Content';
      }
    });
  }

  // Head Tracking Toggle
  if (elements.gazeEnabled) {
    elements.gazeEnabled.addEventListener('change', async (e) => {
      settings.gazeEnabled = e.target.checked;
      await chrome.storage.local.set({ gazeEnabled: settings.gazeEnabled });
      updateQuickBadges();

      broadcastToActiveTab({
        type: 'GAZE_ENABLED_CHANGED',
        gazeEnabled: settings.gazeEnabled
      });

      showGloMessage(settings.gazeEnabled ? "👀 Head tracking activated!" : "🌙 Head tracking paused");
    });
  }

  // Dwell Time Slider
  if (elements.dwellTime) {
    elements.dwellTime.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      settings.gazeDwellMs = val;
      if (elements.dwellValue) elements.dwellValue.textContent = val;
      chrome.storage.local.set({ gazeDwellMs: val });
    });
  }

  // Head Tracking Speed Sliders (Slow & Steady, Normal, Fast)
  const handleSpeedChange = (e) => {
    const val = parseInt(e.target.value, 10);
    settings.headTrackingSpeed = val;
    const multipliers = { 1: 0.72, 2: 0.88, 3: 1.05 };
    settings.headSpeedMultiplier = multipliers[val] || 0.72;
    updateSpeedUI(val);
    chrome.storage.local.set({
      headTrackingSpeed: val,
      headSpeedMultiplier: settings.headSpeedMultiplier
    });
    if (val === 1) showGloMessage("🐢 Calm & slow cursor movement enabled!");
    else if (val === 2) showGloMessage("⚡ Normal cursor speed enabled!");
    else if (val === 3) showGloMessage("🚀 Fast cursor speed enabled!");
  };

  if (elements.headSpeedQuickSlider) {
    elements.headSpeedQuickSlider.addEventListener('input', handleSpeedChange);
  }
  if (elements.headSpeedSlider) {
    elements.headSpeedSlider.addEventListener('input', handleSpeedChange);
  }

  // Magnetic Snapping
  if (elements.magneticSnapEnabled) {
    elements.magneticSnapEnabled.addEventListener('change', (e) => {
      settings.magneticSnapEnabled = e.target.checked;
      chrome.storage.local.set({ magneticSnapEnabled: settings.magneticSnapEnabled });
    });
  }

  if (elements.snapRadius) {
    elements.snapRadius.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      settings.magneticSnapRadius = val;
      if (elements.snapRadiusVal) elements.snapRadiusVal.textContent = val;
      chrome.storage.local.set({ magneticSnapRadius: val });
    });
  }

  // Mouth Click
  if (elements.mouthClickEnabled) {
    elements.mouthClickEnabled.addEventListener('change', (e) => {
      settings.mouthClickEnabled = e.target.checked;
      chrome.storage.local.set({ mouthClickEnabled: settings.mouthClickEnabled });
      updateQuickBadges();
      showGloMessage(settings.mouthClickEnabled ? "👄 Mouth click active: open wide to click!" : "Mouth click disabled");
    });
  }

  if (elements.calibrateMouthBtn) {
    elements.calibrateMouthBtn.addEventListener('click', triggerMouthCalibration);
  }

  // YouTube Wink Seek
  if (elements.winkSeekEnabled) {
    elements.winkSeekEnabled.addEventListener('change', (e) => {
      settings.winkSeekEnabled = e.target.checked;
      chrome.storage.local.set({ winkSeekEnabled: settings.winkSeekEnabled });
    });
  }

  // Agent Controls
  if (elements.launchAgentBtn) {
    elements.launchAgentBtn.addEventListener('click', () => {
      broadcastScriptToTab(() => {
        if (window.GlanceAgent && typeof window.GlanceAgent.openDeck === 'function') {
          window.GlanceAgent.openDeck();
        }
      });
    });
  }

  if (elements.quickGoalBtns) {
    elements.quickGoalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const goal = btn.getAttribute('data-goal');
        if (goal) dispatchAgentGoal(goal);
      });
    });
  }

  // Display Mode & AI Models
  if (elements.displayMode) {
    elements.displayMode.addEventListener('change', (e) => {
      settings.displayMode = e.target.value;
      chrome.storage.local.set({ displayMode: settings.displayMode });
    });
  }

  document.querySelectorAll('input[name="api-choice"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      settings.apiChoice = e.target.value;
      togglePromptContainer();
      chrome.storage.local.set({ apiChoice: settings.apiChoice });
    });
  });

  if (elements.customPrompt) {
    elements.customPrompt.addEventListener('input', (e) => {
      settings.customPrompt = e.target.value;
      chrome.storage.local.set({ customPrompt: settings.customPrompt });
    });
  }

  // Modals
  if (elements.openShortcutsBtn && elements.shortcutsModal) {
    elements.openShortcutsBtn.addEventListener('click', () => elements.shortcutsModal.classList.remove('hidden'));
  }
  if (elements.closeShortcutsBtn && elements.shortcutsModal) {
    elements.closeShortcutsBtn.addEventListener('click', () => elements.shortcutsModal.classList.add('hidden'));
  }

  if (elements.openSettingsBtn && elements.settingsModal) {
    elements.openSettingsBtn.addEventListener('click', () => elements.settingsModal.classList.remove('hidden'));
  }
  if (elements.closeSettingsBtn && elements.settingsModal) {
    elements.closeSettingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));
  }
  if (elements.saveCloseSettingsBtn && elements.settingsModal) {
    elements.saveCloseSettingsBtn.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));
  }
}

function showGloMessage(msg) {
  if (elements.gloQuote) {
    elements.gloQuote.textContent = msg;
  }
}

function togglePromptContainer() {
  if (elements.promptContainer) {
    elements.promptContainer.classList.toggle('hidden', settings.apiChoice !== 'prompt');
  }
}

// Summarize current active webpage
async function handleSummarizeActivePage() {
  if (!currentTab.id || !currentTab.url) {
    showGloMessage("⚠️ Please open a webpage to summarize!");
    return;
  }

  showGloMessage("📖 Reading & summarizing this page...");
  if (elements.contentArea) elements.contentArea.classList.remove('hidden');
  if (elements.summaryTitle) elements.summaryTitle.textContent = currentTab.title;
  if (elements.aiSummary) {
    elements.aiSummary.innerHTML = '<div style="padding:14px;text-align:center;font-weight:700;color:#71717A;">Extracting page content and generating AI summary... ✦</div>';
  }

  try {
    // Send fetch message to background
    const fetchResponse = await chrome.runtime.sendMessage({
      type: 'FETCH_CONTENT',
      url: currentTab.url
    });

    if (!fetchResponse || fetchResponse.error) {
      const err = fetchResponse?.message || fetchResponse?.error || 'Unable to fetch page';
      if (elements.aiSummary) {
        elements.aiSummary.innerHTML = `<div style="padding:10px;background:#FEE2E2;border-radius:8px;color:#991B1B;font-weight:600;">${err}</div>`;
      }
      showGloMessage("⚠️ Could not summarize this page");
      return;
    }

    // Parse with DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(fetchResponse.html, 'text/html');
    let textContent = '';

    // Extract text
    const paragraphs = Array.from(doc.querySelectorAll('article p, main p, p'));
    textContent = paragraphs.map(p => p.textContent.trim()).filter(Boolean).slice(0, 30).join('\n\n');

    if (!textContent || textContent.length < 80) {
      textContent = doc.body ? doc.body.innerText.substring(0, 3000) : 'No readable content';
    }

    if (elements.articleContent) {
      elements.articleContent.textContent = textContent;
    }

    // Call SUMMARIZE_CONTENT
    const summaryResponse = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_CONTENT',
      url: currentTab.url,
      title: currentTab.title,
      textContent: textContent
    });

    if (summaryResponse && summaryResponse.summary) {
      renderSummaryText(summaryResponse.summary);
      showGloMessage("🎉 Summary ready! Cooked fresh for you ✦");
    } else {
      if (elements.aiSummary) {
        elements.aiSummary.innerHTML = '<div style="padding:10px;background:#FEF3C7;border-radius:8px;color:#92400E;">Summary generation completed. Check tooltip or retry.</div>';
      }
    }
  } catch (error) {
    console.error('[Sidepanel] Summarize failed:', error);
    if (elements.aiSummary) {
      elements.aiSummary.innerHTML = `<div style="padding:10px;background:#FEE2E2;border-radius:8px;color:#991B1B;">${error.message || 'Summarization failed'}</div>`;
    }
    showGloMessage("⚠️ Summary interrupted");
  }
}

// Render formatted summary text with simple Markdown parsing
function renderSummaryText(text) {
  if (!elements.aiSummary) return;

  const html = text
    .replace(/^### (.*$)/gim, '<h3 style="font-size:13px;font-weight:800;margin:8px 0 4px 0;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:14px;font-weight:800;margin:10px 0 6px 0;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\* (.*$)/gim, '<li style="margin-left:14px;margin-bottom:4px;">$1</li>')
    .replace(/\n\n/g, '<p style="margin-bottom:8px;"></p>');

  elements.aiSummary.innerHTML = `<div style="font-size:12.5px;line-height:1.6;color:#18181B;">${html}</div>`;
}

// Trigger Head Calibration on active tab
function triggerHeadCalibration() {
  broadcastToActiveTab({ type: 'TRIGGER_CALIBRATION' });
  showGloMessage("🎯 Calibrating head pointer: hold still & look straight!");
}

// Trigger Recenter Gaze
function triggerRecenter() {
  broadcastScriptToTab(() => {
    window.dispatchEvent(new CustomEvent('gaze:recenter'));
  });
  showGloMessage("⚡ Cursor re-centered to screen midpoint!");
}

// Trigger Mouth Calibration on active tab
function triggerMouthCalibration() {
  broadcastToActiveTab({ type: 'TRIGGER_MOUTH_CALIBRATION' });
  showGloMessage("👄 Calibrating mouth: open wide when prompted!");
}

function updateMouthStatus(calibrated) {
  if (elements.mouthStatusText) {
    elements.mouthStatusText.textContent = calibrated ? 'Calibrated ✓' : 'Ready';
  }
}

// Run Browser Agent goal
function dispatchAgentGoal(goal) {
  broadcastScriptToTab((targetGoal) => {
    if (window.GlanceAgent) {
      const plan = window.GlanceAgent.planGoal(targetGoal);
      window.GlanceAgent.executePlan(plan);
    } else {
      alert('Glance Agent not ready on this tab. Refresh page to activate.');
    }
  }, [goal]);
  showGloMessage(`🤖 Agent running goal: "${goal}"`);
}

// Broadcast message to active tab
function broadcastToActiveTab(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, msg).catch(() => {});
    }
  });
}

function broadcastScriptToTab(func, args = []) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func,
        args
      }).catch(() => {});
    }
  });
}

// Listen for background streaming messages & status updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STREAMING_UPDATE') {
    if (elements.contentArea) elements.contentArea.classList.remove('hidden');
    renderSummaryText(message.content);
  }

  if (message.type === 'DISPLAY_CACHED_SUMMARY') {
    if (elements.contentArea) elements.contentArea.classList.remove('hidden');
    if (elements.summaryTitle) elements.summaryTitle.textContent = message.title || 'Summary';
    renderSummaryText(message.summary || '');
  }

  if (message.type === 'GAZE_STATUS') {
    if (elements.gazeStatusText) {
      elements.gazeStatusText.textContent = message.phase === 'live' ? 'ONLINE' : (message.note || message.phase || 'ONLINE');
    }
  }
});

// Storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.mouthCalV1) {
    updateMouthStatus(Boolean(changes.mouthCalV1.newValue));
  }
});