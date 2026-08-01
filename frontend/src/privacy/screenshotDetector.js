/**
 * best-effort Screenshot & Screen-capture attempt detector for Swaply.
 * Note: due to browser security sandboxing, detecting all OS-level capture methods is not possible.
 * We monitor key PrintScreen keys, window focus loss, visibility toggles, and screen-sharing events.
 */

let lastTriggerTime = 0;
const DEDUPLICATE_WINDOW_MS = 2500;

export function startScreenshotDetection(onDetect) {
  if (typeof window === 'undefined') return () => {};

  const triggerDetection = (source, metadata = {}) => {
    const now = Date.now();
    if (now - lastTriggerTime < DEDUPLICATE_WINDOW_MS) {
      return; // Deduplicate rapid events
    }
    lastTriggerTime = now;

    // Detect browser environment
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    onDetect({
      source,
      browser,
      platform: navigator.platform || 'web',
      timestamp: new Date().toISOString(),
      metadata
    });
  };

  // 1. Keyboard shortcut monitoring
  const handleKeyDown = (e) => {
    // PrintScreen key is reported as "PrintScreen"
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      triggerDetection('SCREENSHOT_KEY', { detail: 'PrintScreen Key' });
    }
    
    // Windows Snipping Tool shortcut (Win + Shift + S) or MacOS screenshot shortcuts
    const isWinSnipping = e.key === 'S' && e.shiftKey && e.metaKey;
    const isMacScreenshot = (e.key === '3' || e.key === '4' || e.key === '5') && e.shiftKey && (e.metaKey || e.ctrlKey);

    if (isWinSnipping || isMacScreenshot) {
      triggerDetection('SCREENSHOT_KEY', { detail: 'OS Screen Capture Shortcut Combo', key: e.key });
    }
  };

  // 2. Visibility change monitoring (switching tabs/minimizing)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      triggerDetection('VISIBILITY_CHANGE');
    }
  };

  // 3. Window blur monitoring (focus lost to OS tool or screenshot overlay)
  const handleBlur = () => {
    triggerDetection('FOCUS_LOST');
  };

  // Attach event listeners
  window.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);

  // Return unsubscribe/cleanup method
  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
  };
}
