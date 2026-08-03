import React, { useEffect, useRef } from 'react';

export default function PaperInteractiveCanvas({ vortexActive = false, onVortexComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Warm organic ink particles (Terracotta, Sage, Espresso, Gold)
    const count = Math.min(width > 768 ? 60 : 30, 70);
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 3 + 2,
      alpha: Math.random() * 0.25 + 0.1,
      color: ['#D45B3E', '#4A6E53', '#E5A93C', '#2A2723'][Math.floor(Math.random() * 4)]
    }));

    let vortexTimer = 0;

    const render = () => {
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Subtle Cursor Ink Spotlight
      const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 250);
      mouseGrad.addColorStop(0, 'rgba(212, 91, 62, 0.06)');
      mouseGrad.addColorStop(1, 'rgba(250, 246, 238, 0)');
      ctx.fillStyle = mouseGrad;
      ctx.fillRect(0, 0, width, height);

      if (vortexActive) {
        vortexTimer += 0.025;
        if (vortexTimer >= 1.0 && onVortexComplete) {
          onVortexComplete();
        }
      }

      const centerX = width / 2;
      const centerY = height / 2;

      particles.forEach((p) => {
        if (vortexActive) {
          const pdx = centerX - p.x;
          const pdy = centerY - p.y;
          const dist = Math.sqrt(pdx * pdx + pdy * pdy);
          const angle = Math.atan2(pdy, pdx) + 0.2;
          p.x += Math.cos(angle) * (8 + (1 - dist / width) * 10);
          p.y += Math.sin(angle) * (8 + (1 - dist / width) * 10);
        } else {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [vortexActive, onVortexComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}
