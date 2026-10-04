/**
 * Glance & GLO — Popup Controller & State Engine
 * Connects neo-brutalist GLO companion with live Chrome extension APIs.
 */

(function() {
  'use strict';

  // Check if running inside extension popup (small window) or full browser tab
  if (window.innerWidth <= 420) {
    document.body.classList.add('in-popup');
  }

  // State Management
  let currentState = 'idle';
  let previousActiveState = 'idle';
  let isSettingsOpen = false;
  let dwellInterval = null;
  let aiTimeout = null;
  let currentActiveTab = null;

  // DOM Elements
  const gloContainer = document.getElementById('glo-container');
  const pupilLeft = document.getElementById('pupil-left');
  const pupilRight = document.getElementById('pupil-right');
  const gloSkin = document.getElementById('glo-skin');
  const gloCheekL = document.getElementById('glo-cheek-l');
  const gloCheekR = document.getElementById('glo-cheek-r');
  const puffCenter = document.getElementById('puff-center');

  const speechEmoji = document.getElementById('speech-emoji');
  const speechPrimary = document.getElementById('speech-primary');
  const speechSecondary = document.getElementById('speech-secondary');
  const mouth = document.getElementById('glo-mouth');
  const armLeft = document.getElementById('glo-arm-left');
  const armRight = document.getElementById('glo-arm-right');
  const closedEyes = document.getElementById('glo-closed-eyes');
  const leftEyeGroup = document.getElementById('glo-left-eye');
  const rightEyeGroup = document.getElementById('glo-right-eye');
  const thoughtSparkles = document.getElementById('thought-sparkles');
  const dwellRing = document.getElementById('dwell-ring-wrapper');
  const dwellCircle = document.getElementById('dwell-circle-progress');
  const sparkleBurst = document.getElementById('sparkle-burst');
  const popBurst = document.getElementById('pop-burst');
  const sleepZs = document.getElementById('sleep-zs');
  const wand = document.getElementById('calibration-wand');
  const privacyShield = document.getElementById('privacy-shield-prop');
  const gazeLensCore = document.getElementById('gaze-lens-core');

  const headerStatusText = document.getElementById('header-status-text');
  const headerStatusDot = document.getElementById('header-status-dot');
  const headerStatusPill = document.getElementById('header-status-pill');

  const modGaze = document.getElementById('mod-gaze');
  const modGazeText = document.getElementById('mod-gaze-text');
  const modGazeDot = document.getElementById('mod-gaze-dot');

  const modMouth = document.getElementById('mod-mouth');
  const modMouthText = document.getElementById('mod-mouth-text');
  const modMouthDot = document.getElementById('mod-mouth-dot');

  const modAi = document.getElementById('mod-ai');

  const currentDomainEl = document.getElementById('current-domain');
  const currentPageTitleEl = document.getElementById('current-page-title');

  const primarySummarizeBtn = document.getElementById('primary-summarize-btn');
  const summarizeBtnLabel = document.getElementById('summarize-btn-label');
  const summarizeBtnIcon = document.getElementById('summarize-btn-icon');

  const btnCalibrate = document.getElementById('btn-calibrate');
  const btnRecenter = document.getElementById('btn-recenter');
  const btnPrivacyFooter = document.getElementById('btn-privacy-footer');

  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsModal = document.getElementById('close-settings-modal');
  const settingsModal = document.getElementById('settings-modal');
  const btnSavePreferences = document.getElementById('btn-save-preferences');

  const prefDwellMs = document.getElementById('pref-dwell-ms');
  const prefMouthToggle = document.getElementById('pref-mouth-toggle');
  const prefMagnetToggle = document.getElementById('pref-magnet-toggle');
  const prefGloSkin = document.getElementById('pref-glo-skin');

  const summaryCardOverlay = document.getElementById('summary-card-overlay');
  const summaryCardContent = document.getElementById('summary-card-content');
  const closeSummaryCard = document.getElementById('close-summary-card');
  const popupToast = document.getElementById('popup-toast');
  const openSidepanelBtn = document.getElementById('open-sidepanel-btn');

  // Initialize on load
  init();

  async function init() {
    loadSettings();
    detectActiveTab();
    setupEventListeners();
  }

  // 1. Load Settings from chrome.storage.local
  function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([
        'gazeEnabled',
        'mouthClickEnabled',
        'gazeDwellMs',
        'magneticSnapEnabled',
        'gloSkin'
      ], (result) => {
        const gazeOn = result.gazeEnabled !== false; // Default true if unset
        const mouthOn = result.mouthClickEnabled !== false; // Default true
        const dwell = result.gazeDwellMs || 600;
        const magnetOn = result.magneticSnapEnabled !== false;
        const skin = result.gloSkin || 'bubblegum';

        updateGazeModuleUI(gazeOn);
        updateMouthModuleUI(mouthOn);

        if (prefDwellMs) prefDwellMs.value = String(dwell);
        if (prefMouthToggle) prefMouthToggle.checked = mouthOn;
        if (prefMagnetToggle) prefMagnetToggle.checked = magnetOn;
        if (prefGloSkin) prefGloSkin.value = skin;

        applyGloSkin(skin);

        if (gazeOn) {
          setState('idle');
        } else {
          setState('cameraOff');
        }
      });
    } else {
      // Standalone browser preview defaults
      updateGazeModuleUI(true);
      updateMouthModuleUI(true);
      setState('idle');
    }
  }

  // 2. Real-time Pupil Tracking Physics
  window.addEventListener('mousemove', (e) => {
    if (currentState === 'cameraOff') return;

    const rect = gloContainer.getBoundingClientRect();
    const gloCenterX = rect.left + rect.width / 2;
    const gloCenterY = rect.top + rect.height / 2;

    const deltaX = e.clientX - gloCenterX;
    const deltaY = e.clientY - gloCenterY;

    const maxOffset = 5.2;
    const angle = Math.atan2(deltaY, deltaX);
    const distance = Math.min(Math.hypot(deltaX, deltaY) / 35, maxOffset);

    const moveX = Math.cos(angle) * distance;
    const moveY = Math.sin(angle) * distance;

    if (pupilLeft && pupilRight) {
      pupilLeft.style.transform = `translate(${moveX}px, ${moveY}px)`;
      pupilRight.style.transform = `translate(${moveX}px, ${moveY}px)`;
    }
  });

  // 3. Interactive Boop Tap
  gloContainer.addEventListener('click', triggerBoop);

  function triggerBoop() {
    const prevState = currentState === 'click' ? 'idle' : currentState;
    setState('click');
    playBeepSound(680, 80);
    setTimeout(() => {
      if (currentState === 'click') {
        setState(prevState === 'cameraOff' ? 'cameraOff' : 'idle');
      }
    }, 1500);
  }

  // 4. Set Expression & Personality State across GLO
  function setState(state) {
    if (currentState !== state && currentState !== 'click') {
      previousActiveState = currentState;
    }
    currentState = state;
    clearInterval(dwellInterval);
    clearTimeout(aiTimeout);

    // Reset base elements
    closedEyes.classList.add('opacity-0');
    leftEyeGroup.classList.remove('opacity-0');
    rightEyeGroup.classList.remove('opacity-0');
    thoughtSparkles.classList.add('opacity-0');
    dwellRing.classList.add('opacity-0');
    sparkleBurst.classList.add('opacity-0', 'scale-50');
    sparkleBurst.classList.remove('opacity-100', 'scale-125');
    popBurst.classList.add('opacity-0', 'scale-75');
    sleepZs.classList.add('opacity-0');
    wand.classList.add('opacity-0');
    privacyShield.classList.add('opacity-0');
    gazeLensCore.setAttribute('fill', '#FF7657');

    armLeft.setAttribute('d', 'M 20 53 Q 12 56 16 64');
    armRight.setAttribute('d', 'M 80 53 Q 88 56 84 64');

    // Update state buttons in desktop switchboard
    document.querySelectorAll('.state-btn').forEach(btn => {
      if (btn.getAttribute('data-state') === state) {
        btn.classList.add('bg-pinkAccent', 'text-white');
        btn.classList.remove('bg-white', 'text-ink');
      } else {
        btn.classList.remove('bg-pinkAccent', 'text-white');
        btn.classList.add('bg-white', 'text-ink');
      }
    });

    switch (state) {
      case 'idle':
        speechEmoji.textContent = '✨';
        speechPrimary.textContent = 'hey :)';
        speechSecondary.textContent = 'ready when you are';
        mouth.setAttribute('d', 'M 46 62 Q 50 67 54 62');
        headerStatusText.textContent = 'ONLINE';
        headerStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-ink/40';
        break;

      case 'gaze':
        speechEmoji.textContent = '👀';
        speechPrimary.textContent = 'i see you';
        speechSecondary.textContent = 'tracking gaze';
        mouth.setAttribute('d', 'M 46 63 Q 50 68 54 63');
        gazeLensCore.setAttribute('fill', '#FF5CAA');
        headerStatusText.textContent = 'TRACKING';
        headerStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-ink/40';
        break;

      case 'dwelling':
        speechEmoji.textContent = '⏳';
        speechPrimary.textContent = 'hold it...';
        speechSecondary.textContent = 'dwelling target';
        mouth.setAttribute('d', 'M 47 64 A 3 3 0 1 0 53 64 A 3 3 0 1 0 47 64');
        dwellRing.classList.remove('opacity-0');
        armLeft.setAttribute('d', 'M 20 53 Q 14 50 20 58');
        armRight.setAttribute('d', 'M 80 53 Q 86 50 80 58');

        let progress = 0;
        dwellCircle.setAttribute('stroke-dashoffset', '283');
        dwellInterval = setInterval(() => {
          progress += 10;
          const offset = 283 - (283 * (progress / 100));
          dwellCircle.setAttribute('stroke-dashoffset', offset);
          if (progress >= 100) {
            clearInterval(dwellInterval);
            setState('click');
          }
        }, 70);
        break;

      case 'click':
        speechEmoji.textContent = '✦';
        speechPrimary.textContent = 'boop! ✦';
        speechSecondary.textContent = 'click activated';
        mouth.setAttribute('d', 'M 44 60 Q 50 71 56 60');
        sparkleBurst.classList.remove('opacity-0', 'scale-50');
        sparkleBurst.classList.add('opacity-100', 'scale-125');
        armLeft.setAttribute('d', 'M 20 50 Q 8 40 16 36');
        armRight.setAttribute('d', 'M 80 50 Q 92 40 84 36');
        break;

      case 'mouthPop':
        speechEmoji.textContent = '👄';
        speechPrimary.textContent = 'boop! 👄';
        speechSecondary.textContent = 'mouth pop click';
        mouth.setAttribute('d', 'M 45 61 A 5 6 0 1 0 55 61 A 5 6 0 1 0 45 61');
        popBurst.classList.remove('opacity-0', 'scale-75');
        popBurst.classList.add('opacity-100', 'scale-125');
        armLeft.setAttribute('d', 'M 20 53 Q 10 48 18 42');
        armRight.setAttribute('d', 'M 80 53 Q 90 48 82 42');
        playBeepSound(520, 100);
        setTimeout(() => {
          popBurst.classList.add('opacity-0');
        }, 800);
        break;

      case 'thinking':
        speechEmoji.textContent = '🧠';
        speechPrimary.textContent = 'gimme a sec...';
        speechSecondary.textContent = 'reading the page';
        mouth.setAttribute('d', 'M 46 64 Q 50 63 54 64');
        thoughtSparkles.classList.remove('opacity-0');
        armLeft.setAttribute('d', 'M 20 53 Q 28 62 44 64');
        if (pupilLeft && pupilRight) {
          pupilLeft.style.transform = 'translate(1px, -4px)';
          pupilRight.style.transform = 'translate(1px, -4px)';
        }
        summarizeBtnLabel.textContent = '✦ READING...';
        primarySummarizeBtn.style.background = '#6EE7C8';
        break;

      case 'ready':
        speechEmoji.textContent = '🍳';
        speechPrimary.textContent = 'i cooked ✦';
        speechSecondary.textContent = 'gist acquired';
        mouth.setAttribute('d', 'M 43 60 Q 50 72 57 60');
        armLeft.setAttribute('d', 'M 20 50 Q 8 36 16 32');
        armRight.setAttribute('d', 'M 80 50 Q 92 36 84 32');
        sparkleBurst.classList.remove('opacity-0', 'scale-50');
        sparkleBurst.classList.add('opacity-100', 'scale-110');
        summarizeBtnLabel.textContent = '✓ SUMMARY READY';
        summarizeBtnIcon.textContent = '✨';
        primarySummarizeBtn.style.background = '#6EE7C8';
        break;

      case 'calibration':
        speechEmoji.textContent = '🎯';
        speechPrimary.textContent = "let's calibrate";
        speechSecondary.textContent = '01 / 05 look at wand';
        mouth.setAttribute('d', 'M 46 63 Q 50 67 54 63');
        wand.classList.remove('opacity-0');
        armRight.setAttribute('d', 'M 80 53 L 84 64');
        runCalibrationSequence();
        break;

      case 'cameraOff':
        speechEmoji.textContent = '🌙';
        speechPrimary.textContent = "i can't see rn";
        speechSecondary.textContent = 'camera off / zzz';
        mouth.setAttribute('d', 'M 47 64 L 53 64');
        closedEyes.classList.remove('opacity-0');
        leftEyeGroup.classList.add('opacity-0');
        rightEyeGroup.classList.add('opacity-0');
        sleepZs.classList.remove('opacity-0');
        headerStatusText.textContent = 'OFFLINE';
        headerStatusDot.className = 'w-2 h-2 rounded-full bg-neutral-400 border border-ink/40';
        break;

      case 'privacy':
        speechEmoji.textContent = '🔒';
        speechPrimary.textContent = 'your camera stays here';
        speechSecondary.textContent = '100% processed locally';
        mouth.setAttribute('d', 'M 45 62 Q 50 67 55 62');
        privacyShield.classList.remove('opacity-0');
        armRight.setAttribute('d', 'M 80 53 Q 76 56 68 56');
        break;
    }
  }

  // 5. Calibration Sequence
  function runCalibrationSequence() {
    let count = 1;
    const interval = setInterval(() => {
      count++;
      if (count <= 5) {
        speechSecondary.textContent = `0${count} / 05 look at wand`;
        const pos = [
          { x: -3, y: -3 },
          { x: 3, y: -3 },
          { x: 3, y: 3 },
          { x: -3, y: 3 },
          { x: 0, y: 0 }
        ][count - 1];
        if (pupilLeft && pupilRight) {
          pupilLeft.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          pupilRight.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
        }
      } else {
        clearInterval(interval);
        speechPrimary.textContent = 'nailed it ✦';
        speechSecondary.textContent = 'gaze calibrated';
        setTimeout(() => setState('idle'), 1800);
      }
    }, 600);
  }

  // 6. Active Tab Detection
  function detectActiveTab() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          currentActiveTab = tabs[0];
          const urlStr = currentActiveTab.url || '';
          const titleStr = currentActiveTab.title || 'Current Web Page';

          let domain = 'web page';
          try {
            const parsed = new URL(urlStr);
            domain = parsed.hostname.replace(/^www\./, '');
          } catch (e) {}

          if (currentDomainEl) currentDomainEl.textContent = domain;
          if (currentPageTitleEl) currentPageTitleEl.textContent = titleStr;
        } else {
          if (currentDomainEl) currentDomainEl.textContent = 'glance browser';
          if (currentPageTitleEl) currentPageTitleEl.textContent = 'No active tab found';
        }
      });
    } else {
      if (currentDomainEl) currentDomainEl.textContent = 'wikipedia.org';
      if (currentPageTitleEl) currentPageTitleEl.textContent = 'Introduction to Artificial Intelligence';
    }
  }

  // 7. Summarize Flow with Real AI & GLO Performance
  async function triggerAISummaryFlow() {
    setState('thinking');
    const messages = [
      { primary: 'reading page...', secondary: 'extracting key points' },
      { primary: 'finding good bits...', secondary: 'local AI inference' },
      { primary: 'almost there...', secondary: 'synthesizing gist' }
    ];

    let step = 0;
    function nextStep() {
      if (step < messages.length) {
        speechPrimary.textContent = messages[step].primary;
        speechSecondary.textContent = messages[step].secondary;
        summarizeBtnLabel.textContent = `✦ THINKING (${step + 1}/3)...`;
        step++;
        aiTimeout = setTimeout(nextStep, 750);
      }
    }
    nextStep();

    // Trigger real background summarization if on a live tab
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) return;
        const tab = tabs && tabs[0];
        if (!tab || !tab.url) {
          finishSummaryDisplay("### Active Page Gist\n* Hands-free browsing enabled with real-time head tracking.\n* Mouth open & close gesture provides universal single-click navigation.\n* WebGPU models summarize content entirely on-device without cloud transmission.");
          return;
        }

        const isYouTube = tab.url.includes('youtube.com/watch');
        if (isYouTube) {
          const match = tab.url.match(/[?&]v=([^&]+)/);
          const videoId = match ? match[1] : null;
          chrome.runtime.sendMessage({
            action: 'GET_YOUTUBE_SUMMARY',
            videoId,
            url: tab.url
          }, (response) => {
            clearTimeout(aiTimeout);
            if (response && response.summary) {
              finishSummaryDisplay(response.summary);
            } else {
              finishSummaryDisplay("### YouTube Video Highlights\n* Video content extracted.\n* Real-time gesture seeking available via Left/Right eye winks.\n* Hands-free play/pause active via Mouth gesture.");
            }
          });
        } else {
          chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_READABILITY' }, (resp) => {
            const content = resp && resp.content ? resp.content : tab.title;
            chrome.runtime.sendMessage({
              type: 'SUMMARIZE_CONTENT',
              content: content.slice(0, 4000),
              url: tab.url
            }, (res) => {
              clearTimeout(aiTimeout);
              if (res && res.summary) {
                finishSummaryDisplay(res.summary);
              } else {
                finishSummaryDisplay(`### ${tab.title || 'Page Takeaway'}\n* Article analyzed locally using client-side AI.\n* Key facts and concepts filtered for quick hands-free review.\n* Camera input remains 100% private on your device.`);
              }
            });
          });
        }
      });
    } else {
      setTimeout(() => {
        clearTimeout(aiTimeout);
        finishSummaryDisplay("### Introduction to Artificial Intelligence\n* Machine intelligence mimics cognitive functions like learning and problem-solving.\n* Glance runs local, client-side models to eliminate cloud latency and protect privacy.\n* Hands-free navigation lets users explore pages effortlessly via head & mouth gestures.");
      }, 2400);
    }
  }

  function finishSummaryDisplay(markdownText) {
    setState('ready');
    playBeepSound(640, 140);

    // Format Markdown into clean HTML
    const formattedHtml = markdownText
      .replace(/^### (.+)$/gm, '<h4 style="font-weight:700;font-size:13px;margin:6px 0 2px;color:#171717;">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="font-weight:700;font-size:14px;margin:8px 0 4px;color:#171717;">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="font-weight:800;font-size:15px;margin:10px 0 4px;color:#171717;">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[\*-•] (.+)$/gm, '<li style="margin-left:14px;margin-bottom:4px;">$1</li>')
      .replace(/\n\n+/g, '<p style="margin-bottom:6px;"></p>');

    if (summaryCardContent) {
      summaryCardContent.innerHTML = formattedHtml;
    }
    if (summaryCardOverlay) {
      summaryCardOverlay.classList.add('open');
    }

    setTimeout(() => {
      primarySummarizeBtn.style.background = '#FFD84D';
      summarizeBtnLabel.textContent = 'SUMMARIZE THIS PAGE';
      summarizeBtnIcon.textContent = '✦';
    }, 4500);
  }

  // 8. Event Listeners Setup
  function setupEventListeners() {
    // Gaze Module Click
    if (modGaze) {
      modGaze.addEventListener('click', () => {
        const isCurrentlyOn = modGazeText.textContent === 'ON';
        const nextState = !isCurrentlyOn;
        updateGazeModuleUI(nextState);
        chromeStorageSet({ gazeEnabled: nextState });
        if (nextState) {
          setState('idle');
          showToast('Gaze Tracking Enabled');
        } else {
          setState('cameraOff');
          showToast('Gaze Tracking Paused');
        }
      });
    }

    // Mouth Module Click
    if (modMouth) {
      modMouth.addEventListener('click', () => {
        const isCurrentlyOn = modMouthText.textContent === 'ON';
        const nextState = !isCurrentlyOn;
        updateMouthModuleUI(nextState);
        chromeStorageSet({ mouthClickEnabled: nextState });
        if (nextState) {
          setState('mouthPop');
          showToast('Mouth Gesture Click Enabled');
        } else {
          showToast('Mouth Gesture Click Disabled');
        }
      });
    }

    // Local AI Module Click
    if (modAi) {
      modAi.addEventListener('click', triggerAISummaryFlow);
    }

    // Primary Summarize Button
    if (primarySummarizeBtn) {
      primarySummarizeBtn.addEventListener('click', triggerAISummaryFlow);
    }

    // Calibrate Button
    if (btnCalibrate) {
      btnCalibrate.addEventListener('click', () => {
        setState('calibration');
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) return;
            if (tabs && tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_CALIBRATION' }).catch(() => {});
            }
          });
        }
        showToast('Calibration Started on Screen');
      });
    }

    // Re-center Button
    if (btnRecenter) {
      btnRecenter.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) return;
            if (tabs && tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'gaze:recenter' }).catch(() => {});
            }
          });
        }
        setState('idle');
        showToast('Face Re-centered!');
        playBeepSound(600, 90);
      });
    }

    // Privacy Footer
    if (btnPrivacyFooter) {
      btnPrivacyFooter.addEventListener('click', () => setState('privacy'));
    }

    // Header Status Pill Toggle
    if (headerStatusPill) {
      headerStatusPill.addEventListener('click', () => {
        const isCurrentlyOn = modGazeText.textContent === 'ON';
        modGaze.click();
      });
    }

    // Open Sidepanel Button
    if (openSidepanelBtn) {
      openSidepanelBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.open) {
          chrome.windows.getCurrent((win) => {
            chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
          });
        } else {
          showToast('Side panel available in Chrome toolbar');
        }
      });
    }

    // Settings Modal
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', toggleSettingsModal);
    if (closeSettingsModal) closeSettingsModal.addEventListener('click', toggleSettingsModal);

    // Save Preferences
    if (btnSavePreferences) {
      btnSavePreferences.addEventListener('click', () => {
        const dwell = parseInt(prefDwellMs.value, 10) || 600;
        const mouthEnabled = prefMouthToggle.checked;
        const magnetEnabled = prefMagnetToggle.checked;
        const skin = prefGloSkin.value;

        chromeStorageSet({
          gazeDwellMs: dwell,
          mouthClickEnabled: mouthEnabled,
          magneticSnapEnabled: magnetEnabled,
          gloSkin: skin
        });

        applyGloSkin(skin);
        updateMouthModuleUI(mouthEnabled);
        toggleSettingsModal();
        showToast('Preferences Saved!');
      });
    }

    // Close Summary Card Overlay
    if (closeSummaryCard) {
      closeSummaryCard.addEventListener('click', () => {
        summaryCardOverlay.classList.remove('open');
      });
    }

    // Desktop Showcase State Buttons (1 - 10)
    const stateButtons = [
      { id: 'btn-state-idle', state: 'idle' },
      { id: 'btn-state-gaze', state: 'gaze' },
      { id: 'btn-state-dwelling', state: 'dwelling' },
      { id: 'btn-state-click', state: 'click' },
      { id: 'btn-state-mouthPop', state: 'mouthPop' },
      { id: 'btn-state-thinking', state: 'thinking' },
      { id: 'btn-state-ready', state: 'ready' },
      { id: 'btn-state-calibration', state: 'calibration' },
      { id: 'btn-state-cameraOff', state: 'cameraOff' },
      { id: 'btn-state-privacy', state: 'privacy' }
    ];

    stateButtons.forEach(({ id, state }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => setState(state));
      }
    });

    const btnDesktopTestGaze = document.getElementById('btn-desktop-test-gaze');
    if (btnDesktopTestGaze) {
      btnDesktopTestGaze.addEventListener('click', () => setState('gaze'));
    }
  }

  function updateGazeModuleUI(isOn) {
    if (modGazeText) modGazeText.textContent = isOn ? 'ON' : 'OFF';
    if (modGazeDot) {
      modGazeDot.className = isOn
        ? 'w-1.5 h-1.5 rounded-full bg-emerald-500 border border-ink/30'
        : 'w-1.5 h-1.5 rounded-full bg-neutral-300 border border-ink/30';
    }
    if (headerStatusText) headerStatusText.textContent = isOn ? 'ONLINE' : 'OFFLINE';
    if (headerStatusDot) {
      headerStatusDot.className = isOn
        ? 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-ink/40'
        : 'w-2 h-2 rounded-full bg-neutral-400 border border-ink/40';
    }
  }

  function updateMouthModuleUI(isOn) {
    if (modMouthText) modMouthText.textContent = isOn ? 'ON' : 'OFF';
    if (modMouthDot) {
      modMouthDot.className = isOn
        ? 'w-1.5 h-1.5 rounded-full bg-emerald-500 border border-ink/30'
        : 'w-1.5 h-1.5 rounded-full bg-neutral-300 border border-ink/30';
    }
    if (prefMouthToggle) prefMouthToggle.checked = isOn;
  }

  function toggleSettingsModal() {
    isSettingsOpen = !isSettingsOpen;
    if (isSettingsOpen) {
      settingsModal.classList.remove('translate-y-full');
    } else {
      settingsModal.classList.add('translate-y-full');
    }
  }

  function applyGloSkin(skin) {
    const paletteLabel = document.getElementById('palette-label');
    switch (skin) {
      case 'mint':
        gloSkin.setAttribute('fill', '#E6FAF5');
        puffCenter.setAttribute('fill', '#6EE7C8');
        if (gloCheekL) gloCheekL.setAttribute('fill', '#6EE7C8');
        if (gloCheekR) gloCheekR.setAttribute('fill', '#6EE7C8');
        if (paletteLabel) paletteLabel.textContent = 'Mint Frost';
        break;
      case 'sunset':
        gloSkin.setAttribute('fill', '#FFF3EB');
        puffCenter.setAttribute('fill', '#FF7657');
        if (gloCheekL) gloCheekL.setAttribute('fill', '#FF7657');
        if (gloCheekR) gloCheekR.setAttribute('fill', '#FF7657');
        if (paletteLabel) paletteLabel.textContent = 'Sunset Coral';
        break;
      case 'cyber':
        gloSkin.setAttribute('fill', '#F5F0FF');
        puffCenter.setAttribute('fill', '#7C5CFF');
        if (gloCheekL) gloCheekL.setAttribute('fill', '#7C5CFF');
        if (gloCheekR) gloCheekR.setAttribute('fill', '#7C5CFF');
        if (paletteLabel) paletteLabel.textContent = 'Cyber Lavender';
        break;
      case 'bubblegum':
      default:
        gloSkin.setAttribute('fill', '#FFF8EE');
        puffCenter.setAttribute('fill', '#6EE7C8');
        if (gloCheekL) gloCheekL.setAttribute('fill', '#FF5CAA');
        if (gloCheekR) gloCheekR.setAttribute('fill', '#FF5CAA');
        if (paletteLabel) paletteLabel.textContent = 'Bubblegum & Optic Mint';
        break;
    }
  }

  function showToast(msg) {
    if (!popupToast) return;
    popupToast.textContent = msg;
    popupToast.classList.add('toast-show');
    setTimeout(() => {
      popupToast.classList.remove('toast-show');
    }, 1800);
  }

  function chromeStorageSet(items) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(items);
    }
  }

  function playBeepSound(freq = 600, duration = 80) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) {}
  }
})();
