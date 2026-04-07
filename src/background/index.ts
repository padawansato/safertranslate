/**
 * Background Service Worker
 * Handles extension lifecycle and message routing
 */

import { runtime } from '@/lib/browser';

// Extension installed/updated
runtime.onInstalled.addListener((details) => {
  console.log('[SaferTranslate] Extension installed:', details.reason);
});

// Message relay (if needed for cross-context communication)
runtime.onMessage.addListener((message, sender, _sendResponse) => {
  console.log('[SaferTranslate] Background received message:', message, 'from:', sender);

  // For now, just pass through - direct popup->content communication works
  // This handler can be extended for background processing if needed

  return false; // No async response from background
});

console.log('[SaferTranslate] Background service worker started');
