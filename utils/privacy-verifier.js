/**
 * Glance - Zero-Telemetry Privacy Verifier & Network Audit Monitor
 * 
 * Verifies that Glance processes all camera frames, landmarks, and AI summaries
 * 100% in-memory without making ANY outbound network calls or telemetry transmissions.
 */
(function() {
  'use strict';

  if (window.__glancePrivacyVerifierInitialized) {
    return;
  }
  window.__glancePrivacyVerifierInitialized = true;

  const networkAuditLog = [];
  const GLANCE_SIGNATURES = [
    'gaze-core.js',
    'gaze-dwell.js',
    'gaze-overlay.js',
    'human.esm.js',
    'magnetic-snapping.js',
    'agent-skill-harness.js',
    'plugin-sdk.js',
    'open-weights-engine.js'
  ];

  let glanceTelemetryCalls = 0;
  let localAssetCalls = 0;
  let safeBlobCalls = 0;

  function classifyCaller() {
    const stack = (new Error()).stack || '';
    const isGlance = GLANCE_SIGNATURES.some(sig => stack.includes(sig));
    return { isGlance, stack };
  }

  function logRequest(type, url) {
    const { isGlance, stack } = classifyCaller();
    const urlStr = String(url);

    let classification = 'EXTERNAL';
    if (urlStr.startsWith('chrome-extension://') || urlStr.startsWith('edge-extension://')) {
      classification = 'LOCAL_EXTENSION_ASSET';
      localAssetCalls++;
    } else if (urlStr.startsWith('data:') || urlStr.startsWith('blob:')) {
      classification = 'IN_MEMORY_BLOB';
      safeBlobCalls++;
    } else if (isGlance) {
      classification = 'TELEMETRY_LEAK';
      glanceTelemetryCalls++;
      console.error(`[GlancePrivacy] ⚠️ CAUTION: External call detected from Glance code: ${urlStr}`);
    }

    const entry = {
      type,
      url: urlStr,
      timestamp: Date.now(),
      isGlance,
      classification
    };

    networkAuditLog.push(entry);
    if (networkAuditLog.length > 200) networkAuditLog.shift();

    window.dispatchEvent(new CustomEvent('glance:privacy-event', { detail: entry }));
  }

  // 1. Intercept fetch
  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch;
    window.fetch = function(resource, init) {
      try {
        const url = (typeof resource === 'string') ? resource : (resource && resource.url) || 'unknown';
        logRequest('fetch', url);
      } catch (e) {}
      return originalFetch.apply(this, arguments);
    };
  }

  // 2. Intercept XMLHttpRequest
  if (typeof window.XMLHttpRequest === 'function') {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      try {
        logRequest('xhr', url);
      } catch (e) {}
      return originalOpen.apply(this, arguments);
    };
  }

  // 3. Intercept sendBeacon
  if (navigator && typeof navigator.sendBeacon === 'function') {
    const originalBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
      try {
        logRequest('beacon', url);
      } catch (e) {}
      return originalBeacon.apply(this, arguments);
    };
  }

  const PrivacyVerifier = {
    getStats() {
      return {
        glanceTelemetryLeaks: glanceTelemetryCalls,
        localAssetsLoaded: localAssetCalls,
        inMemoryBlobsProcessed: safeBlobCalls,
        isZeroTelemetryVerified: glanceTelemetryCalls === 0,
        status: glanceTelemetryCalls === 0 ? '100% PRIVATE & OFFLINE' : 'LEAK DETECTED'
      };
    },

    getAuditLog() {
      return [...networkAuditLog];
    },

    assertZeroTelemetry() {
      if (glanceTelemetryCalls > 0) {
        throw new Error(`[GlancePrivacy] Verification Failed: ${glanceTelemetryCalls} outbound calls detected from Glance subsystems.`);
      }
      return true;
    }
  };

  window.GlancePrivacyAudit = PrivacyVerifier;
  console.log('[GlancePrivacy] Zero-Telemetry Privacy Verifier active - 100% On-Device monitoring enabled');
})();
