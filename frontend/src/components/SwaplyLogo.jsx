import React from 'react';

export default function SwaplyLogo({ size = 48, className = '', style = {} }) {
  const scaledSize = Math.round(size * 1.15);
  return (
    <img 
      src="/swaply-favicon-bgl.png" 
      alt="Swaply Logo" 
      width={scaledSize} 
      height={scaledSize} 
      className={className} 
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, objectFit: 'contain', ...style }}
    />
  );
}
