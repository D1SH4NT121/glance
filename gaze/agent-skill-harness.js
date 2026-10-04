/**
 * Glance - Agent Skill Open Standard Harness
 * 
 * Complies with the Agent Skill Open Standard (ASOS) specification v1.0.
 * Fully Hands-Free Browser Agency: on-screen dwellable command deck,
 * speech recognition, DOM planning, and step execution with ZERO keyboard typing.
 */
(function() {
  'use strict';

  if (window.__glanceAgentHarnessInitialized) {
    return;
  }
  window.__glanceAgentHarnessInitialized = true;

  // Agent Skill Open Standard Manifest
  const AGENT_SKILL_MANIFEST = {
    schema_version: '1.0.0',
    skill_id: 'org.glance.browser-agent',
    name: 'Glance Hands-Free Browser Agent',
    version: '1.2.0',
    description: 'Assistive hands-free browser agent for touchless navigation, semantic interaction, and on-device comprehension.',
    author: 'Glance Open Source Community',
    license: 'MIT',
    capabilities: [
      'dom_manipulation',
      'deep_scrolling',
      'semantic_extraction',
      'hands_free_control',
      'speech_intent_recognition',
      'on_device_summarization'
    ],
    actions: [
      {
        id: 'click',
        name: 'Click Element',
        description: 'Simulates assistive click on target matching selector, text, or coordinates'
      },
      {
        id: 'scroll',
        name: 'Scroll Viewport or Container',
        description: 'Smoothly scrolls viewport or deep nested container'
      },
      {
        id: 'auto_scroll',
        name: 'Hands-Free Auto-Scroll',
        description: 'Continuous slow reading scroll'
      },
      {
        id: 'toggle_video',
        name: 'Toggle Video Playback',
        description: 'Play/pause active video stream'
      },
      {
        id: 'navigate',
        name: 'Navigate Browser',
        description: 'Navigates to URL or navigates history'
      },
      {
        id: 'extract',
        name: 'Extract Content',
        description: 'Extracts clean readable text from document'
      },
      {
        id: 'summarize',
        name: 'Summarize Content',
        description: 'Generates on-device AI summary for selected section or entire page'
      }
    ]
  };

  let executionHud = null;
  let isExecuting = false;
  let activePlan = null;
  let currentStepIdx = 0;

  // Hands-free Deck & Launcher state
  let agentLauncher = null;
  let agentDeck = null;
  let dwellingTile = null;
  let dwellStartTime = 0;
  let launcherDwellStart = 0;
  const DECK_DWELL_MS = 600;

  // ==========================================
  // CORE ACTION IMPLEMENTATIONS
  // ==========================================

  const actionHandlers = {
    async click({ selector, text, coords }) {
      let target = null;
      if (selector) {
        target = document.querySelector(selector);
      } else if (text) {
        const xpath = `//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]`;
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        target = result.singleNodeValue;
      } else if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
        target = document.elementFromPoint(coords.x, coords.y);
      }

      if (!target) {
        throw new Error(`Target element not found (selector: "${selector || ''}", text: "${text || ''}")`);
      }

      highlightActionTarget(target);
      await delay(250);

      const interactive = target.closest('a, button, [role="button"], [role="link"], input, summary, select, textarea, .tab-chip, [tabindex]') || target;
      if (typeof interactive.click === 'function') {
        interactive.click();
      }
      return { success: true, clicked: interactive.tagName };
    },

    async scroll({ direction = 'down', amount = 450, container }) {
      let target = window;
      let el = null;
      if (container) {
        el = document.querySelector(container);
        if (el) target = el;
      }

      let deltaY = 0;
      let deltaX = 0;
      if (direction === 'down') deltaY = amount;
      else if (direction === 'up') deltaY = -amount;
      else if (direction === 'top') {
        if (target === window) window.scrollTo({ top: 0, behavior: 'smooth' });
        else el.scrollTo({ top: 0, behavior: 'smooth' });
        return { success: true };
      } else if (direction === 'bottom') {
        if (target === window) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        return { success: true };
      }

      if (target === window) {
        window.scrollBy({ top: deltaY, left: deltaX, behavior: 'smooth' });
      } else {
        el.scrollBy({ top: deltaY, left: deltaX, behavior: 'smooth' });
      }

      await delay(350);
      return { success: true, scrolled: deltaY };
    },

    async auto_scroll({ durationMs = 12000, speed = 2 }) {
      const startTime = performance.now();
      return new Promise((resolve) => {
        function step() {
          if (!isExecuting || performance.now() - startTime >= durationMs) {
            resolve({ success: true });
            return;
          }
          window.scrollBy(0, speed);
          requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    },

    async toggle_video() {
      const ytPlayBtn = document.querySelector('.ytp-play-button');
      if (ytPlayBtn && typeof ytPlayBtn.click === 'function') {
        ytPlayBtn.click();
        return { success: true };
      }
      const vid = document.querySelector('video');
      if (vid && typeof vid.play === 'function') {
        if (vid.paused) vid.play().catch(() => {});
        else vid.pause();
        return { success: true };
      }
      return { success: false };
    },

    async type({ selector, text, pressEnter }) {
      const input = document.querySelector(selector);
      if (!input) throw new Error(`Input element "${selector}" not found`);

      highlightActionTarget(input);
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      if (pressEnter) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
      }
      return { success: true, textEntered: text };
    },

    async navigate({ url, action }) {
      if (action === 'back') {
        window.history.back();
        return { success: true };
      } else if (action === 'forward') {
        window.history.forward();
        return { success: true };
      } else if (action === 'reload') {
        window.location.reload();
        return { success: true };
      } else if (url) {
        window.location.href = url;
        return { success: true, redirected: url };
      }
      throw new Error('Missing navigate target');
    },

    async extract({ selector, maxWords = 500 }) {
      let content = '';
      if (selector) {
        const el = document.querySelector(selector);
        content = el ? el.innerText : '';
      } else {
        content = document.body.innerText;
      }
      const words = content.trim().split(/\s+/).slice(0, maxWords).join(' ');
      return { success: true, length: words.length, excerpt: words.slice(0, 150) + '...' };
    },

    async summarize({ target = 'page' }) {
      const event = new CustomEvent('glance:agent-summarize', { detail: { target } });
      window.dispatchEvent(event);
      return { success: true, requested: target };
    }
  };

  // ==========================================
  // GOAL PLANNER & EXECUTION RUNNER
  // ==========================================

  function planGoal(goal) {
    const text = goal.trim().toLowerCase();
    const steps = [];

    if (text.includes('pause') || text.includes('play') || text.includes('video')) {
      steps.push({ action: 'toggle_video', params: {} });
    } else if (text.includes('auto') && text.includes('scroll')) {
      steps.push({ action: 'auto_scroll', params: { durationMs: 14000, speed: 2 } });
    } else if (text.includes('comment') || text.includes('discussion')) {
      steps.push({ action: 'scroll', params: { direction: 'down', amount: 800 } });
      steps.push({ action: 'scroll', params: { direction: 'down', amount: 650 } });
    } else if (text.includes('summarize') || text.includes('summary') || text.includes('read') || text.includes('takeaway')) {
      steps.push({ action: 'extract', params: { maxWords: 600 } });
      steps.push({ action: 'summarize', params: { target: 'article' } });
    } else if (text.includes('scroll down') || text.includes('next page') || text.includes('down')) {
      steps.push({ action: 'scroll', params: { direction: 'down', amount: 550 } });
    } else if (text.includes('scroll up') || text.includes('back to top') || text.includes('top')) {
      steps.push({ action: 'scroll', params: { direction: 'top' } });
    } else if (text.includes('price') || text.includes('pricing') || text.includes('plan') || text.includes('buy')) {
      steps.push({ action: 'click', params: { text: 'pricing' } });
    } else if (text.includes('back')) {
      steps.push({ action: 'navigate', params: { action: 'back' } });
    } else {
      steps.push({ action: 'extract', params: { maxWords: 350 } });
      steps.push({ action: 'summarize', params: { target: 'page' } });
    }

    return {
      goal,
      createdAt: Date.now(),
      steps
    };
  }

  async function executePlan(plan) {
    if (!plan || !plan.steps || plan.steps.length === 0) return;
    isExecuting = true;
    activePlan = plan;
    currentStepIdx = 0;

    renderExecutionHud(plan.goal, plan.steps.length);

    for (let i = 0; i < plan.steps.length; i++) {
      if (!isExecuting) break;
      currentStepIdx = i;
      const step = plan.steps[i];
      updateHudStep(i + 1, plan.steps.length, `${step.action}`);

      const handler = actionHandlers[step.action];
      if (handler) {
        try {
          await handler(step.params);
          await delay(600);
        } catch (err) {
          console.warn(`[GlanceAgent] Step ${i + 1} warning:`, err);
        }
      }
    }

    finishExecutionHud();
    isExecuting = false;
    activePlan = null;
  }

  // ==========================================
  // HANDS-FREE ASSISTIVE ACTION DECK
  // ==========================================

  function ensureAgentLauncher() {
    if (agentLauncher || !document.body) return agentLauncher;
    agentLauncher = document.createElement('div');
    agentLauncher.id = 'glance-agent-launcher';
    agentLauncher.innerHTML = '<span>🤖</span> <span>Agent (Alt+A)</span>';
    document.body.appendChild(agentLauncher);

    agentLauncher.addEventListener('click', () => {
      openAgentDeck();
    });

    return agentLauncher;
  }

  function ensureAgentDeck() {
    if (agentDeck || !document.body) return agentDeck;
    agentDeck = document.createElement('div');
    agentDeck.id = 'glance-agent-deck';
    document.body.appendChild(agentDeck);
    return agentDeck;
  }

  function openAgentDeck() {
    const deck = ensureAgentDeck();
    if (!deck) return;
    renderDeckContent(deck);
    deck.style.display = 'flex';
  }

  function closeAgentDeck() {
    if (agentDeck) {
      agentDeck.style.display = 'none';
      dwellingTile = null;
    }
  }

  function renderDeckContent(deck) {
    const isYouTube = window.location.hostname.includes('youtube.com');
    const isReddit = window.location.hostname.includes('reddit.com');

    let goalTiles = [];
    if (isYouTube) {
      goalTiles = [
        { icon: '🎬', title: 'Summarize Video', desc: 'AI key points & takeaways', goal: 'summarize video' },
        { icon: '💬', title: 'Video Comments', desc: 'Scroll down to discussion', goal: 'scroll to comments' },
        { icon: '⏯️', title: 'Play / Pause', desc: 'Toggle video playback', goal: 'pause video' },
        { icon: '🔝', title: 'Back to Top', desc: 'Return to video player', goal: 'back to top' }
      ];
    } else if (isReddit) {
      goalTiles = [
        { icon: '💬', title: 'Read Discussion', desc: 'Top comments & debate', goal: 'summarize discussion' },
        { icon: '📜', title: 'Scroll Comments', desc: 'Deep scroll thread', goal: 'scroll to comments' },
        { icon: '🏷️', title: 'Auto-Scroll', desc: 'Hands-free reading stream', goal: 'auto scroll' },
        { icon: '🔝', title: 'Back to Top', desc: 'Return to post top', goal: 'back to top' }
      ];
    } else {
      goalTiles = [
        { icon: '📄', title: 'Summarize Article', desc: 'Extract key points with AI', goal: 'summarize article' },
        { icon: '💬', title: 'Find Discussion', desc: 'Scroll to comments section', goal: 'scroll to comments' },
        { icon: '🏷️', title: 'Find Pricing', desc: 'Locate pricing & plans', goal: 'pricing' },
        { icon: '📜', title: 'Hands-Free Scroll', desc: 'Slow, comfortable reading flow', goal: 'auto scroll' },
        { icon: '🔝', title: 'Back to Top', desc: 'Return to top of page', goal: 'back to top' }
      ];
    }

    goalTiles.push({
      icon: '🎤',
      title: 'Speak Goal',
      desc: 'Say any command hands-free',
      isVoice: true
    });

    const tilesHtml = goalTiles.map(t => `
      <div class="glance-deck-tile" data-goal="${t.goal || ''}" data-voice="${t.isVoice ? 'true' : 'false'}">
        <div class="glance-tile-progress"></div>
        <div class="glance-tile-icon">${t.icon}</div>
        <div class="glance-tile-title">${t.title}</div>
        <div class="glance-tile-desc">${t.desc}</div>
      </div>
    `).join('');

    deck.innerHTML = `
      <div class="glance-deck-container">
        <div class="glance-deck-header">
          <h2><span>🤖</span> Glance Hands-Free Browser Agent</h2>
          <p>Dwell cursor on any card (~600ms) or open mouth to trigger immediately. Zero typing required.</p>
        </div>
        <div class="glance-deck-grid">
          ${tilesHtml}
        </div>
        <div class="glance-voice-box" id="glance-voice-box">
          🎙️ Listening... Speak your goal clearly (e.g. "summarize", "scroll down", "pricing")...
        </div>
        <div class="glance-deck-footer">
          <button class="glance-deck-dismiss" id="glance-deck-close-btn">✕ Dismiss Deck</button>
        </div>
      </div>
    `;

    deck.querySelectorAll('.glance-deck-tile').forEach(tile => {
      tile.addEventListener('click', () => handleTileSelection(tile));
    });

    const closeBtn = document.getElementById('glance-deck-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeAgentDeck);
  }

  function handleTileSelection(tile) {
    if (!tile) return;
    const isVoice = tile.getAttribute('data-voice') === 'true';
    const goal = tile.getAttribute('data-goal');

    if (isVoice) {
      startVoiceListening();
      return;
    }

    if (goal) {
      closeAgentDeck();
      const plan = planGoal(goal);
      executePlan(plan);
    }
  }

  function resetTileProgress(tile) {
    if (!tile) return;
    tile.classList.remove('glance-dwelling');
    const bar = tile.querySelector('.glance-tile-progress');
    if (bar) bar.style.width = '0%';
  }

  function startVoiceListening() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceBox = document.getElementById('glance-voice-box');
    if (!SpeechRec) {
      if (voiceBox) {
        voiceBox.style.display = 'block';
        voiceBox.textContent = 'Voice recognition not supported in this browser.';
        setTimeout(() => { if (voiceBox) voiceBox.style.display = 'none'; }, 2500);
      }
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = false;

      if (voiceBox) {
        voiceBox.style.display = 'block';
        voiceBox.textContent = '🎙️ Listening... Speak your goal clearly now...';
      }

      rec.onresult = (event) => {
        const spoken = event.results[0][0].transcript;
        console.log('[GlanceAgent] Voice recognized:', spoken);
        if (voiceBox) {
          voiceBox.textContent = `✓ Recognized: "${spoken}"`;
        }
        setTimeout(() => {
          closeAgentDeck();
          const plan = planGoal(spoken);
          executePlan(plan);
        }, 600);
      };

      rec.onerror = (err) => {
        console.warn('[GlanceAgent] Voice error:', err);
        if (voiceBox) voiceBox.textContent = '⚠️ Could not understand speech. Try again.';
        setTimeout(() => { if (voiceBox) voiceBox.style.display = 'none'; }, 2000);
      };

      rec.onend = () => {
        setTimeout(() => { if (voiceBox) voiceBox.style.display = 'none'; }, 2000);
      };

      rec.start();
    } catch (e) {
      console.warn('[GlanceAgent] Failed to start speech recognition:', e);
    }
  }

  // ==========================================
  // DWELL & POINT TRACKING FOR AGENT DECK
  // ==========================================

  window.addEventListener('gaze:point', (e) => {
    const { x, y } = e.detail || {};
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    // 1. Launcher Dwell
    if (agentLauncher && (!agentDeck || agentDeck.style.display !== 'flex')) {
      const rect = agentLauncher.getBoundingClientRect();
      const isInside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      if (isInside) {
        if (!agentLauncher.classList.contains('glance-dwell-active')) {
          agentLauncher.classList.add('glance-dwell-active');
          launcherDwellStart = performance.now();
        } else if (performance.now() - launcherDwellStart > 500) {
          agentLauncher.classList.remove('glance-dwell-active');
          openAgentDeck();
        }
      } else {
        agentLauncher.classList.remove('glance-dwell-active');
      }
    }

    // 2. Deck Tiles Dwell
    if (agentDeck && agentDeck.style.display === 'flex') {
      const tiles = agentDeck.querySelectorAll('.glance-deck-tile, .glance-deck-dismiss');
      let hovered = null;
      tiles.forEach(tile => {
        const rect = tile.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          hovered = tile;
        }
      });

      if (hovered) {
        if (dwellingTile !== hovered) {
          if (dwellingTile) resetTileProgress(dwellingTile);
          dwellingTile = hovered;
          dwellStartTime = performance.now();
          hovered.classList.add('glance-dwelling');
        } else {
          const elapsed = performance.now() - dwellStartTime;
          const pct = Math.min(100, (elapsed / DECK_DWELL_MS) * 100);
          const bar = hovered.querySelector('.glance-tile-progress');
          if (bar) bar.style.width = `${pct}%`;

          if (elapsed >= DECK_DWELL_MS) {
            resetTileProgress(hovered);
            if (hovered.classList.contains('glance-deck-dismiss')) {
              closeAgentDeck();
            } else {
              handleTileSelection(hovered);
            }
          }
        }
      } else {
        if (dwellingTile) {
          resetTileProgress(dwellingTile);
          dwellingTile = null;
        }
      }
    }
  });

  // ==========================================
  // HUD & UI VISUALS
  // ==========================================

  function ensureExecutionHud() {
    if (executionHud) return executionHud;
    executionHud = document.createElement('div');
    executionHud.id = 'glance-agent-hud';
    executionHud.innerHTML = `
      <div class="glance-agent-pill">
        <span class="glance-agent-indicator"></span>
        <span class="glance-agent-label">Agent:</span>
        <span class="glance-agent-goal"></span>
        <span class="glance-agent-step"></span>
        <button class="glance-agent-close" title="Dismiss">✕</button>
      </div>
    `;
    document.documentElement.appendChild(executionHud);

    executionHud.querySelector('.glance-agent-close').addEventListener('click', () => {
      isExecuting = false;
      executionHud.style.display = 'none';
    });

    return executionHud;
  }

  function renderExecutionHud(goal, totalSteps) {
    const hud = ensureExecutionHud();
    hud.querySelector('.glance-agent-goal').textContent = `"${goal}"`;
    hud.querySelector('.glance-agent-step').textContent = `(0/${totalSteps})`;
    hud.style.display = 'block';
  }

  function updateHudStep(current, total, detail) {
    if (!executionHud) return;
    executionHud.querySelector('.glance-agent-step').textContent = `(${current}/${total}) - ${detail}`;
  }

  function finishExecutionHud() {
    if (!executionHud) return;
    executionHud.querySelector('.glance-agent-step').textContent = '✓ Complete';
    setTimeout(() => {
      if (executionHud && !isExecuting) executionHud.style.display = 'none';
    }, 2800);
  }

  function highlightActionTarget(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const ring = document.createElement('div');
    const rect = el.getBoundingClientRect();
    ring.className = 'glance-agent-action-highlight';
    ring.style.cssText = `
      position: fixed;
      left: ${rect.left - 4}px;
      top: ${rect.top - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      pointer-events: none;
      z-index: 2147483647;
      border: 2px solid #10b981;
      border-radius: 6px;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
      animation: glance-agent-pulse 0.6s ease-out forwards;
    `;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 750);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Keyboard shortcut: Alt+A toggles the Hands-Free Command Deck (NO prompt typing!)
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (agentDeck && agentDeck.style.display === 'flex') {
        closeAgentDeck();
      } else {
        openAgentDeck();
      }
    }
  });

  // Initialize launcher button on document ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureAgentLauncher);
  } else {
    ensureAgentLauncher();
  }

  window.GlanceAgent = {
    manifest: AGENT_SKILL_MANIFEST,
    planGoal,
    executePlan,
    openDeck: openAgentDeck,
    closeDeck: closeAgentDeck,
    executeAction: async (action, params) => {
      const handler = actionHandlers[action];
      if (!handler) throw new Error(`Unknown action: ${action}`);
      return handler(params);
    },
    isExecuting: () => isExecuting
  };

  console.log('[GlanceAgent] Truly Hands-Free Agent Skill Harness loaded (Deck + Voice + Gaze Dwell)');
})();
