import React from 'react';

export default function SwaplyLogo({ size = 48, className = '', style = {} }) {
  return (
    <img 
      src="/swaply-favicon-bgl.png" 
      alt="Swaply Logo" 
      width={size} 
      height={size} 
      className={className} 
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, objectFit: 'contain', ...style }}
    />
  );
}
