(function() {
  'use strict';

  if (window.__nutshellVirtualTabBarInitialized) {
    return;
  }
  window.__nutshellVirtualTabBarInitialized = true;

  const CONTAINER_ID = 'nutshell-virtual-tab-bar-container';
  const TRIGGER_HANDLE_ID = 'nutshell-virtual-tab-bar-handle';
  const DWELL_DURATION_MS = 550; // Dwell time on tab before switching
  const TOP_TRIGGER_ZONE_PX = 50; // Looking in top 50px reveals bar
  const LEAVE_HIDE_DELAY_MS = 1200; // Delay before hiding when moving away

  let tabs = [];
  let isBarVisible = false;
  let isPinned = false;
  let hideTimer = null;
  let currentDwellTarget = null;
  let dwellStartTime = 0;
  let dwellRaf = null;
  let audioCtx = null;

  // Sound feedback for successful dwell activation
  function playClickChime() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (_) {}
  }

  // Inject Styles via external stylesheet (bypasses CSP on sites like LinkedIn)
  function injectStyles() {
    if (document.getElementById('nutshell-tab-bar-styles')) return;
    try {
      const url = chrome.runtime.getURL('gaze/virtual-tab-bar.css');
      const link = document.createElement('link');
      link.id = 'nutshell-tab-bar-styles';
      link.rel = 'stylesheet';
      link.href = url;
      document.documentElement.appendChild(link);
    } catch (e) {
      console.warn('[VirtualTabBar] Failed to inject styles link:', e);
    }
  }

  // Create or retrieve elements
  let containerEl = null;
  let handleEl = null;
  let trackEl = null;

  function ensureElements() {
    injectStyles();

    if (!handleEl) {
      handleEl = document.createElement('div');
      handleEl.id = TRIGGER_HANDLE_ID;
      handleEl.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v4h16V5H4zm0 6v8h16v-8H4z"/></svg>
        <span>📑 Tabs</span>
      `;
      handleEl.title = 'Virtual Tab Bar (Look up or dwell to open)';
      handleEl.addEventListener('mouseenter', () => showBar());
      handleEl.addEventListener('click', () => toggleBar());
      document.documentElement.appendChild(handleEl);
    }

    if (!containerEl) {
      containerEl = document.createElement('div');
      containerEl.id = CONTAINER_ID;
      containerEl.innerHTML = `
        <div class="nutshell-tab-bar-header">
          <span>Hands-Free Tab Bar</span>
          <div class="nutshell-tab-bar-controls">
            <button class="nutshell-tab-bar-btn" id="nutshell-pin-btn" title="Pin tab bar open">📌 Pin</button>
            <button class="nutshell-tab-bar-btn" id="nutshell-close-bar-btn" title="Close tab bar">✕</button>
          </div>
        </div>
        <div class="nutshell-tabs-track" id="nutshell-tabs-track"></div>
      `;

      containerEl.addEventListener('mouseenter', () => {
        clearTimeout(hideTimer);
      });
      containerEl.addEventListener('mouseleave', () => {
        if (!isPinned) {
          scheduleHide(LEAVE_HIDE_DELAY_MS);
        }
      });

      const pinBtn = containerEl.querySelector('#nutshell-pin-btn');
      pinBtn.addEventListener('click', () => {
        isPinned = !isPinned;
        pinBtn.classList.toggle('pinned', isPinned);
      });

      const closeBtn = containerEl.querySelector('#nutshell-close-bar-btn');
      closeBtn.addEventListener('click', () => {
        hideBar();
      });

      trackEl = containerEl.querySelector('#nutshell-tabs-track');
      document.documentElement.appendChild(containerEl);
    }
  }

  function showBar() {
    clearTimeout(hideTimer);
    ensureElements();
    if (!isBarVisible) {
      isBarVisible = true;
      containerEl.classList.add('visible');
      handleEl.classList.add('active');
      fetchTabs();
    }
  }

  function hideBar() {
    if (isPinned) return;
    cancelDwell();
    if (containerEl && isBarVisible) {
      isBarVisible = false;
      containerEl.classList.remove('visible');
      if (handleEl) handleEl.classList.remove('active');
    }
  }

  function toggleBar() {
    if (isBarVisible) {
      hideBar();
    } else {
      showBar();
    }
  }

  function scheduleHide(delayMs) {
    if (isPinned) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      hideBar();
    }, delayMs);
  }

  // Fetch tabs from background
  function fetchTabs() {
    try {
      chrome.runtime.sendMessage({ type: 'GET_ALL_TABS' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.tabs) {
          tabs = response.tabs;
          renderTabs();
        }
      });
    } catch (_) {}
  }

  // Render open tabs into track
  function renderTabs() {
    if (!trackEl) return;
    trackEl.innerHTML = '';

    tabs.forEach((tab) => {
      const chip = document.createElement('div');
      chip.className = `nutshell-tab-chip ${tab.active ? 'active' : ''}`;
      chip.dataset.tabId = tab.id;
      chip.title = tab.title + '\n' + tab.url;

      // Favicon
      const icon = document.createElement('img');
      icon.className = 'nutshell-tab-favicon';
      icon.src = tab.favIconUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
      icon.onerror = () => {
        icon.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
      };

      // Title
      const titleSpan = document.createElement('span');
      titleSpan.className = 'nutshell-tab-title';
      titleSpan.textContent = tab.title || 'Tab';

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'nutshell-tab-close-btn';
      closeBtn.innerHTML = '✕';
      closeBtn.title = 'Close tab';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tab.id);
      });

      // Dwell progress bar
      const dwellContainer = document.createElement('div');
      dwellContainer.className = 'nutshell-dwell-ring-container';
      const dwellBar = document.createElement('div');
      dwellBar.className = 'nutshell-dwell-bar';
      dwellContainer.appendChild(dwellBar);

      chip.appendChild(icon);
      chip.appendChild(titleSpan);
      chip.appendChild(closeBtn);
      chip.appendChild(dwellContainer);

      // Mouse click
      chip.addEventListener('click', () => {
        switchToTab(tab.id);
      });

      // Mouse hover dwell
      chip.addEventListener('mouseenter', () => {
        startDwell(chip, () => switchToTab(tab.id));
      });
      chip.addEventListener('mouseleave', () => {
        if (currentDwellTarget === chip) {
          cancelDwell();
        }
      });

      trackEl.appendChild(chip);
    });

    // Add "+ New Tab" button
    const newTabBtn = document.createElement('div');
    newTabBtn.className = 'nutshell-new-tab-btn';
    newTabBtn.innerHTML = `<span>+ New Tab</span>`;
    newTabBtn.addEventListener('click', () => createNewTab());
    newTabBtn.addEventListener('mouseenter', () => {
      startDwell(newTabBtn, () => createNewTab());
    });
    newTabBtn.addEventListener('mouseleave', () => {
      if (currentDwellTarget === newTabBtn) cancelDwell();
    });
    trackEl.appendChild(newTabBtn);
  }

  function switchToTab(tabId) {
    cancelDwell();
    playClickChime();
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ type: 'SWITCH_TAB', tabId: Number(tabId) }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    } catch (_) {}
  }

  function closeTab(tabId) {
    cancelDwell();
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId: Number(tabId) }, () => {
          if (chrome.runtime.lastError) return;
          fetchTabs();
        });
      }
    } catch (_) {}
  }

  function createNewTab() {
    cancelDwell();
    playClickChime();
    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ type: 'CREATE_TAB' }, () => {
          if (chrome.runtime.lastError) {}
        });
      }
    } catch (_) {}
  }

  // Dwell Engine for Virtual Tab Bar
  function startDwell(element, onComplete) {
    if (currentDwellTarget === element) return;
    cancelDwell();

    currentDwellTarget = element;
    dwellStartTime = performance.now();
    element.classList.add('dwelling');

    const bar = element.querySelector('.nutshell-dwell-bar');

    function step(now) {
      if (currentDwellTarget !== element) return;
      const elapsed = now - dwellStartTime;
      const progress = Math.min(1, elapsed / DWELL_DURATION_MS);

      if (bar) {
        bar.style.width = (progress * 100) + '%';
      }

      if (progress >= 1) {
        cancelDwell();
        onComplete();
      } else {
        dwellRaf = requestAnimationFrame(step);
      }
    }

    dwellRaf = requestAnimationFrame(step);
  }

  function cancelDwell() {
    if (currentDwellTarget) {
      currentDwellTarget.classList.remove('dwelling');
      const bar = currentDwellTarget.querySelector('.nutshell-dwell-bar');
      if (bar) bar.style.width = '0%';
      currentDwellTarget = null;
    }
    if (dwellRaf) {
      cancelAnimationFrame(dwellRaf);
      dwellRaf = null;
    }
  }

  // Gaze Point Listener (Hands-Free Head Tracking Integration)
  window.addEventListener('gaze:point', (e) => {
    if (!e || !e.detail) return;
    const { x, y } = e.detail;

    // Reveal virtual tab bar if looking near top edge
    if (y <= TOP_TRIGGER_ZONE_PX) {
      showBar();
    } else if (y > 150 && isBarVisible && !isPinned) {
      scheduleHide(LEAVE_HIDE_DELAY_MS);
    }

    // If bar is visible, check if gaze is over a tab chip
    if (isBarVisible && containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      if (x >= containerRect.left && x <= containerRect.right && y >= containerRect.top && y <= containerRect.bottom) {
        clearTimeout(hideTimer);

        // Find which tab chip gaze is hovering
        const chips = containerEl.querySelectorAll('.nutshell-tab-chip, .nutshell-new-tab-btn');
        let hitElement = null;

        for (const chip of chips) {
          const rect = chip.getBoundingClientRect();
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            hitElement = chip;
            break;
          }
        }

        if (hitElement) {
          if (hitElement !== currentDwellTarget) {
            if (hitElement.classList.contains('nutshell-new-tab-btn')) {
              startDwell(hitElement, () => createNewTab());
            } else {
              const tabId = hitElement.dataset.tabId;
              startDwell(hitElement, () => switchToTab(tabId));
            }
          }
        } else {
          cancelDwell();
        }
      } else {
        cancelDwell();
      }
    }
  });

  // Listen for real-time tab updates from background.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TABS_UPDATED' && message.tabs) {
      tabs = message.tabs;
      if (isBarVisible) {
        renderTabs();
      }
    }
  });

  // Initialize
  ensureElements();
})();
