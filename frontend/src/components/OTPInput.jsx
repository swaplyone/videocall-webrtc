import React, { useRef, useEffect } from 'react';
import OTPBox from './OTPBox';

export default function OTPInput({
  value = '',
  onChange,
  onComplete,
  isLocked = false,
  length = 6
}) {
  const hiddenInputRef = useRef(null);

  // Focus hidden input on mount or when clicking container
  useEffect(() => {
    if (!isLocked && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [isLocked]);

  const handleChange = (e) => {
    if (isLocked) return;
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(rawVal);
    if (rawVal.length === length && onComplete) {
      onComplete(rawVal);
    }
  };

  const handlePaste = (e) => {
    if (isLocked) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      if (pastedData.length === length && onComplete) {
        onComplete(pastedData);
      }
    }
  };

  const digits = value.split('');
  const activeIndex = Math.min(digits.length, length - 1);

  return (
    <div
      onClick={() => {
        if (!isLocked && hiddenInputRef.current) {
          hiddenInputRef.current.focus();
        }
      }}
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        gap: '0.6rem',
        padding: '0.5rem 0'
      }}
    >
      {/* Hidden input element for native keyboard, focus & SMS autofill */}
      <input
        ref={hiddenInputRef}
        type="text"
        pattern="[0-9]*"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        disabled={isLocked}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: '1px',
          height: '1px'
        }}
      />

      {Array.from({ length }).map((_, index) => (
        <OTPBox
          key={index}
          index={index}
          digit={digits[index] || ''}
          isActive={!isLocked && index === activeIndex}
          isLocked={isLocked}
          onClick={() => {
            if (!isLocked && hiddenInputRef.current) {
              hiddenInputRef.current.focus();
            }
          }}
        />
      ))}
    </div>
  );
}
