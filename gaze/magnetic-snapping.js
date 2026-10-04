/**
 * Glance - Magnetic Smart Snapping Harness
 * 
 * Provides spatial gravitational attraction to interactive DOM elements
 * (buttons, links, inputs, tabs) to counteract involuntary tremors and micro-jitter.
 */
(function() {
  'use strict';

  if (window.__glanceMagnetInitialized) {
    return;
  }
  window.__glanceMagnetInitialized = true;

  const DEFAULT_SNAP_RADIUS = 28; // px radius for subtle magnetic attraction
  const HARD_LOCK_RADIUS = 10;    // px radius for soft snap
  const BREAKAWAY_VELOCITY = 45;  // px/frame to break lock cleanly during face movement
  const SCAN_INTERVAL_MS = 250;   // Viewport candidate refresh
  const SELECTOR = 'a[href], button, input, textarea, select, [role="button"], [role="link"], [role="checkbox"], [tabindex]:not([tabindex="-1"]), .tab-chip, .ytp-button, #gaze-summary-close';

  let enabled = true;
  let snapRadius = DEFAULT_SNAP_RADIUS;
  let cachedTargets = [];
  let lastScanTime = 0;
  let currentLockedElement = null;
  let lastX = 0;
  let lastY = 0;

  // Load user settings
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['magneticSnapEnabled', 'magneticSnapRadius'], (res) => {
        if (typeof res.magneticSnapEnabled === 'boolean') {
          enabled = res.magneticSnapEnabled;
        }
        if (typeof res.magneticSnapRadius === 'number') {
          snapRadius = res.magneticSnapRadius;
        }
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.magneticSnapEnabled) enabled = Boolean(changes.magneticSnapEnabled.newValue);
          if (changes.magneticSnapRadius) snapRadius = Number(changes.magneticSnapRadius.newValue) || DEFAULT_SNAP_RADIUS;
        }
      });
    }
  } catch (e) {
    // Ignore storage issues in test harnesses
  }

  function refreshCandidates() {
    const now = performance.now();
    if (now - lastScanTime < SCAN_INTERVAL_MS && cachedTargets.length > 0) {
      return;
    }
    lastScanTime = now;

    const elements = document.querySelectorAll(SELECTOR);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const candidates = [];

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      // Skip hidden, zero-size, or Glance HUD/pointer elements
      if (el.id === 'gaze-pointer' || el.id === 'gaze-cam' || el.closest('#gaze-debug-hud')) {
        continue;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      // Viewport clipping check
      if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) {
        continue;
      }

      candidates.push({
        element: el,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        rect: rect
      });
    }

    cachedTargets = candidates;
  }

  /**
   * Distance from point (px, py) to closest point on axis-aligned rect
   */
  function distanceToRect(px, py, rect) {
    const clampX = Math.max(rect.left, Math.min(px, rect.right));
    const clampY = Math.max(rect.top, Math.min(py, rect.bottom));
    return {
      distance: Math.hypot(px - clampX, py - clampY),
      closestX: clampX,
      closestY: clampY,
      isInside: px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom
    };
  }

  /**
   * Snap raw coordinate to the nearest interactive element using gravitational pull
   */
  function snap(rawX, rawY) {
    if (!enabled || !Number.isFinite(rawX) || !Number.isFinite(rawY)) {
      if (currentLockedElement) {
        clearLock(currentLockedElement);
        currentLockedElement = null;
      }
      return { x: rawX, y: rawY, isSnapped: false, target: null };
    }

    // Velocity check for quick break-away
    const velocity = Math.hypot(rawX - lastX, rawY - lastY);
    lastX = rawX;
    lastY = rawY;

    if (velocity > BREAKAWAY_VELOCITY) {
      if (currentLockedElement) {
        clearLock(currentLockedElement);
        currentLockedElement = null;
      }
      return { x: rawX, y: rawY, isSnapped: false, target: null };
    }

    refreshCandidates();

    let bestTarget = null;
    let minDistance = Infinity;
    let bestPoint = null;

    for (let i = 0; i < cachedTargets.length; i++) {
      const candidate = cachedTargets[i];
      const res = distanceToRect(rawX, rawY, candidate.rect);
      
      if (res.distance < minDistance) {
        minDistance = res.distance;
        bestTarget = candidate;
        bestPoint = res;
      }
    }

    if (bestTarget && minDistance <= snapRadius) {
      const targetEl = bestTarget.element;
      
      // Smooth quadratic attraction: gentle onset at perimeter, stable near target
      const normDist = Math.min(1.0, minDistance / snapRadius);
      const pullFactor = Math.pow(1.0 - normDist, 2) * 0.60;

      let snappedX, snappedY;
      if (minDistance <= 8 || bestPoint.isInside) {
        // Subtle soft-lock to center when already inside or very close
        snappedX = bestTarget.cx;
        snappedY = bestTarget.cy;
      } else {
        // Smooth gentle guide toward target
        const targetX = bestPoint.closestX * 0.35 + bestTarget.cx * 0.65;
        const targetY = bestPoint.closestY * 0.35 + bestTarget.cy * 0.65;
        snappedX = rawX + (targetX - rawX) * pullFactor;
        snappedY = rawY + (targetY - rawY) * pullFactor;
      }

      if (currentLockedElement !== targetEl) {
        if (currentLockedElement) clearLock(currentLockedElement);
        currentLockedElement = targetEl;
        applyLock(targetEl);
      }

      return {
        x: snappedX,
        y: snappedY,
        isSnapped: true,
        target: targetEl,
        distance: minDistance
      };
    }

    if (currentLockedElement) {
      clearLock(currentLockedElement);
      currentLockedElement = null;
    }

    return { x: rawX, y: rawY, isSnapped: false, target: null };
  }

  function applyLock(el) {
    try {
      el.classList.add('glance-magnetic-locked');
      window.dispatchEvent(new CustomEvent('gaze:magnetic-lock', {
        detail: { element: el, time: performance.now() }
      }));
    } catch (e) {}
  }

  function clearLock(el) {
    try {
      el.classList.remove('glance-magnetic-locked');
      window.dispatchEvent(new CustomEvent('gaze:magnetic-release', {
        detail: { element: el, time: performance.now() }
      }));
    } catch (e) {}
  }

  window.GlanceMagnet = {
    snap,
    setEnabled(val) { enabled = Boolean(val); },
    setRadius(r) { snapRadius = Math.max(10, Math.min(100, Number(r) || DEFAULT_SNAP_RADIUS)); },
    isEnabled() { return enabled; },
    getRadius() { return snapRadius; },
    getLockedTarget() { return currentLockedElement; }
  };

  console.log('[GlanceMagnet] Smart Magnetic Snapping Harness initialized (radius: ' + snapRadius + 'px)');
})();
