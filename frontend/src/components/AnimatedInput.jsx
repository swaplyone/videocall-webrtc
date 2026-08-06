import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export default function AnimatedInput({
  id,
  type = 'text',
  placeholderExamples = [],
  placeholder = '',
  value,
  onChange,
  required = false,
  style = {},
  icon,
  rightElement,
  ...props
}) {
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const examplesKey = Array.isArray(placeholderExamples) ? placeholderExamples.join('|') : '';

  // Typewriter effect when placeholderExamples are supplied
  useEffect(() => {
    if (!placeholderExamples || placeholderExamples.length === 0) {
      setAnimatedPlaceholder(placeholder);
      return;
    }

    let isSubscribed = true;
    let exampleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;

    const typeEffect = () => {
      if (!isSubscribed) return;
      const currentText = placeholderExamples[exampleIndex];
      if (!currentText) return;

      if (isDeleting) {
        setAnimatedPlaceholder(currentText.substring(0, charIndex - 1));
        charIndex--;
        if (charIndex === 0) {
          isDeleting = false;
          exampleIndex = (exampleIndex + 1) % placeholderExamples.length;
          timeoutId = setTimeout(typeEffect, 500);
          return;
        }
        timeoutId = setTimeout(typeEffect, 40);
      } else {
        setAnimatedPlaceholder(currentText.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex === currentText.length) {
          isDeleting = true;
          timeoutId = setTimeout(typeEffect, 1800);
          return;
        }
        timeoutId = setTimeout(typeEffect, 80);
      }
    };

    typeEffect();

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
    };
  }, [examplesKey, placeholder]);

  return (
    <motion.div
      animate={{
        scale: isFocused ? 1.015 : 1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        borderRadius: '6px',
        border: '3px solid #111827',
        background: '#FFFDF9',
        boxShadow: isFocused ? '4px 4px 0px var(--color-primary)' : '2px 2px 0px #111827',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        ...style
      }}
    >
      {icon && (
        <div style={{ paddingLeft: '0.75rem', display: 'flex', alignItems: 'center', color: isFocused ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
          {icon}
        </div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={value ? '' : (placeholderExamples.length > 0 ? `${animatedPlaceholder}` : placeholder)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        style={{
          width: '100%',
          padding: '0.65rem 0.75rem',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          color: 'var(--text-primary)',
        }}
        {...props}
      />
      {rightElement && (
        <div style={{ paddingRight: '0.6rem', display: 'flex', alignItems: 'center' }}>
          {rightElement}
        </div>
      )}
    </motion.div>
  );
}
