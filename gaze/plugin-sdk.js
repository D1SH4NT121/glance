/**
 * Glance - Open Modular Gesture & Action Plugin SDK
 * 
 * Provides an open developer interface for creating, registering,
 * and executing custom facial/head gestures, macro actions, and accessibility plugins.
 */
(function() {
  'use strict';

  if (window.GlanceSDK) {
    return;
  }

  const gestures = new Map();
  const actions = new Map();
  const listeners = new Map();
  const gestureCooldowns = new Map();

  // Motion history buffers for temporal gestures (nod, shake)
  const pitchHistory = [];
  const yawHistory = [];
  const HISTORY_MAX_LEN = 25;

  const GlanceSDK = {
    version: '1.2.0',

    /**
     * Register a new gesture definition
     * @param {Object} spec
     * @param {string} spec.id - Unique ID (e.g. 'brow_raise')
     * @param {string} spec.name - Human-readable name
     * @param {string} spec.description - Purpose of gesture
     * @param {Function} spec.trigger - (landmarks, annotations, pose) => boolean
     * @param {number} [spec.cooldownMs=1000] - Minimum delay between triggers
     * @param {Function} [spec.action] - Callback when gesture triggers
     */
    registerGesture(spec) {
      if (!spec || !spec.id || typeof spec.trigger !== 'function') {
        throw new Error('[GlanceSDK] Invalid gesture specification');
      }
      gestures.set(spec.id, {
        id: spec.id,
        name: spec.name || spec.id,
        description: spec.description || '',
        trigger: spec.trigger,
        cooldownMs: spec.cooldownMs || 1000,
        action: spec.action || null,
        enabled: spec.enabled !== false
      });
      console.log(`[GlanceSDK] Registered gesture plugin: "${spec.name}" (${spec.id})`);
      this.emit('plugin:registered', { type: 'gesture', id: spec.id });
    },

    unregisterGesture(id) {
      gestures.delete(id);
      gestureCooldowns.delete(id);
    },

    getRegisteredGestures() {
      return Array.from(gestures.values()).map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        enabled: g.enabled
      }));
    },

    /**
     * Register an actionable capability
     * @param {Object} spec
     * @param {string} spec.id
     * @param {string} spec.name
     * @param {Function} spec.handler - (context) => void
     */
    registerAction(spec) {
      if (!spec || !spec.id || typeof spec.handler !== 'function') {
        throw new Error('[GlanceSDK] Invalid action specification');
      }
      actions.set(spec.id, {
        id: spec.id,
        name: spec.name || spec.id,
        description: spec.description || '',
        handler: spec.handler
      });
      console.log(`[GlanceSDK] Registered action plugin: "${spec.name}" (${spec.id})`);
      this.emit('plugin:registered', { type: 'action', id: spec.id });
    },

    executeAction(id, context = {}) {
      const action = actions.get(id);
      if (action && typeof action.handler === 'function') {
        try {
          action.handler(context);
          this.emit('action:executed', { id, context });
          return true;
        } catch (e) {
          console.error(`[GlanceSDK] Error executing action ${id}:`, e);
        }
      }
      return false;
    },

    getRegisteredActions() {
      return Array.from(actions.values()).map(a => ({
        id: a.id,
        name: a.name,
        description: a.description
      }));
    },

    /**
     * Process face detection frame and evaluate all active gesture plugins
     */
    evaluateFrame(face, headFrame, now = performance.now()) {
      if (!face || gestures.size === 0) return;

      const landmarks = face.mesh || [];
      const annotations = face.annotations || {};
      const pose = {
        yawDeg: (headFrame && headFrame.yawDeg) || 0,
        pitchDeg: (headFrame && headFrame.pitchDeg) || 0,
        nx: (headFrame && headFrame.nx) || 0,
        ny: (headFrame && headFrame.ny) || 0
      };

      // Update motion histories
      pitchHistory.push({ val: pose.pitchDeg, t: now });
      yawHistory.push({ val: pose.yawDeg, t: now });
      if (pitchHistory.length > HISTORY_MAX_LEN) pitchHistory.shift();
      if (yawHistory.length > HISTORY_MAX_LEN) yawHistory.shift();

      for (const [id, gesture] of gestures.entries()) {
        if (!gesture.enabled) continue;

        const lastTrigger = gestureCooldowns.get(id) || 0;
        if (now - lastTrigger < gesture.cooldownMs) continue;

        try {
          const triggered = gesture.trigger(landmarks, annotations, pose, {
            pitchHistory,
            yawHistory
          });

          if (triggered) {
            gestureCooldowns.set(id, now);
            console.log(`[GlanceSDK] ⚡ Gesture Triggered: ${gesture.name} (${id})`);

            const eventData = { id, name: gesture.name, time: now, pose };
            window.dispatchEvent(new CustomEvent('glance:gesture', { detail: eventData }));
            this.emit('gesture:triggered', eventData);

            if (typeof gesture.action === 'function') {
              gesture.action(eventData);
            }
          }
        } catch (err) {
          console.warn(`[GlanceSDK] Error evaluating gesture ${id}:`, err);
        }
      }
    },

    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(callback);
    },

    emit(event, data) {
      const cbs = listeners.get(event);
      if (cbs) {
        cbs.forEach(cb => {
          try { cb(data); } catch (e) { console.error(e); }
        });
      }
    }
  };

  // ==========================================
  // BUILT-IN CORE ACCESSIBILITY PLUGINS
  // ==========================================

  // 1. Brow Raise Plugin: Opens Virtual Tab Bar hands-free
  GlanceSDK.registerGesture({
    id: 'brow_raise',
    name: 'Eyebrow Raise',
    description: 'Raise both eyebrows to reveal the Virtual Tab Bar hands-free',
    cooldownMs: 1400,
    trigger: (landmarks, annotations) => {
      // Annotations for eyebrows vs eyes
      const leftBrow = annotations.leftEyeBrow || annotations.leftEyebrow;
      const leftEye = annotations.leftEyeUpper0 || annotations.leftEye;
      if (!leftBrow || !leftEye || leftBrow.length === 0 || leftEye.length === 0) return false;

      // Distance between center of eyebrow and center of eye
      const browY = leftBrow[Math.floor(leftBrow.length / 2)][1];
      const eyeY = leftEye[Math.floor(leftEye.length / 2)][1];
      const diff = eyeY - browY; // Higher brow means larger positive diff in screen coords

      return diff > 24; // Eyebrows noticeably elevated
    },
    action: () => {
      window.dispatchEvent(new CustomEvent('virtual-tab-bar:toggle'));
    }
  });

  // 2. Head Nod Plugin: Triggers click at current cursor
  GlanceSDK.registerGesture({
    id: 'head_nod',
    name: 'Head Nod (Confirm/Click)',
    description: 'Quick vertical head nod down-and-up to trigger a click',
    cooldownMs: 1200,
    trigger: (landmarks, annotations, pose, helpers) => {
      const history = helpers.pitchHistory;
      if (history.length < 8) return false;
      
      const oldest = history[0].val;
      const current = history[history.length - 1].val;
      let minPitch = Infinity;

      for (let i = 0; i < history.length; i++) {
        if (history[i].val < minPitch) minPitch = history[i].val;
      }

      // Check for rapid dip down and return
      const downwardDip = oldest - minPitch;
      const returned = current - minPitch;
      return downwardDip > 6.5 && returned > 4.0;
    },
    action: () => {
      window.dispatchEvent(new CustomEvent('smile:click', { detail: { source: 'nod' } }));
    }
  });

  // 3. Head Shake Plugin: Dismisses tooltips / navigates back
  GlanceSDK.registerGesture({
    id: 'head_shake',
    name: 'Head Shake (Dismiss/Back)',
    description: 'Quick lateral shake to dismiss open tooltips or popups',
    cooldownMs: 1500,
    trigger: (landmarks, annotations, pose, helpers) => {
      const history = helpers.yawHistory;
      if (history.length < 10) return false;

      let minYaw = Infinity;
      let maxYaw = -Infinity;
      for (let i = 0; i < history.length; i++) {
        if (history[i].val < minYaw) minYaw = history[i].val;
        if (history[i].val > maxYaw) maxYaw = history[i].val;
      }

      return (maxYaw - minYaw) > 16; // Noticeable head shake
    },
    action: () => {
      const closeBtn = document.getElementById('gaze-summary-close');
      if (closeBtn) closeBtn.click();
      const tooltip = document.getElementById('gaze-summary-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    }
  });

  // 4. Smile Action Plugin: Triggers Page Bookmark / Upvote
  GlanceSDK.registerGesture({
    id: 'smile_detect',
    name: 'Smile / Broad Smile',
    description: 'Smile broadly to trigger a favorite/like action on supported sites',
    cooldownMs: 2000,
    trigger: (landmarks, annotations) => {
      const lipsUpper = annotations.lipsUpperOuter;
      const lipsLower = annotations.lipsLowerOuter;
      if (!lipsUpper || !lipsLower) return false;

      const leftCorner = lipsUpper[0];
      const rightCorner = lipsUpper[lipsUpper.length - 1];
      if (!leftCorner || !rightCorner) return false;

      const mouthWidth = Math.hypot(rightCorner[0] - leftCorner[0], rightCorner[1] - leftCorner[1]);
      return mouthWidth > 72; // Wide smile detected
    },
    action: () => {
      // Find like or bookmark buttons
      const likeBtn = document.querySelector('button[aria-label*="Like" i], button[aria-label*="Upvote" i], [data-testid="like"]');
      if (likeBtn) {
        likeBtn.click();
        console.log('[GlanceSDK] Smile triggered Like/Upvote!');
      }
    }
  });

  // 5. Left Wink Plugin: Rewind video 10 seconds (-10s)
  GlanceSDK.registerGesture({
    id: 'left_wink',
    name: 'Left Wink (Rewind -10s)',
    description: 'Wink left eye to rewind video playback by 10 seconds',
    cooldownMs: 800,
    trigger: () => false, // Evaluated continuously with temporal verification in gaze-core
    action: () => {
      window.dispatchEvent(new CustomEvent('video:seek', { detail: { seconds: -10, direction: 'left' } }));
    }
  });

  // 6. Right Wink Plugin: Fast-Forward video 10 seconds (+10s)
  GlanceSDK.registerGesture({
    id: 'right_wink',
    name: 'Right Wink (Forward +10s)',
    description: 'Wink right eye to fast-forward video playback by 10 seconds',
    cooldownMs: 800,
    trigger: () => false, // Evaluated continuously with temporal verification in gaze-core
    action: () => {
      window.dispatchEvent(new CustomEvent('video:seek', { detail: { seconds: 10, direction: 'right' } }));
    }
  });

  window.GlanceSDK = GlanceSDK;
  window.Glance = GlanceSDK; // convenient alias
  console.log('[GlanceSDK] Open Modular Gesture & Action Plugin SDK initialized with 6 built-in plugins');
})();
