import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

export function AccessibilityProvider({ children }) {
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('swaply_high_contrast') === 'true';
  });

  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('swaply_font_size') || 'medium'; // small, medium, large, xl
  });

  const [screenReaderAnnounce, setScreenReaderAnnounce] = useState('');

  useEffect(() => {
    localStorage.setItem('swaply_high_contrast', highContrast);
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('swaply_font_size', fontSize);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [fontSize]);

  const announceToScreenReader = (message) => {
    setScreenReaderAnnounce(message);
    setTimeout(() => setScreenReaderAnnounce(''), 3000);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        setHighContrast,
        fontSize,
        setFontSize,
        announceToScreenReader
      }}
    >
      <div className={highContrast ? 'high-contrast-mode' : ''}>
        {children}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {screenReaderAnnounce}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
