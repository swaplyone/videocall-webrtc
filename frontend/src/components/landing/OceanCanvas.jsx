import React, { useEffect, useRef } from 'react';

export default function OceanCanvas({ vortexActive = false, onVortexComplete }) {
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

    // Mouse tracker
    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Particle pool
    const particleCount = Math.min(width > 768 ? 120 : 60, 150);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.3 - Math.random() * 0.7,
      radius: Math.random() * 2.5 + 1,
      alpha: Math.random() * 0.6 + 0.2,
      color: ['#06B6D4', '#2563EB', '#60A5FA', '#38BDF8'][Math.floor(Math.random() * 4)],
      angle: Math.random() * Math.PI * 2,
      angularSpeed: (Math.random() - 0.5) * 0.02
    }));

    // Light rays
    let time = 0;

    let vortexProgress = 0;

    const render = () => {
      time += 0.015;

      // Mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Deep ocean gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0B132B');
      bgGrad.addColorStop(1, '#050816');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Light Rays
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const rayGrad = ctx.createLinearGradient(width * (0.2 + i * 0.2), 0, width * (0.3 + i * 0.2), height);
        const opacity = 0.04 + Math.sin(time + i) * 0.02;
        rayGrad.addColorStop(0, `rgba(56, 189, 248, ${opacity})`);
        rayGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(width * (0.15 + i * 0.25) + Math.sin(time + i) * 30, 0);
        ctx.lineTo(width * (0.25 + i * 0.25) + Math.cos(time + i) * 30, 0);
        ctx.lineTo(width * (0.35 + i * 0.25) + Math.sin(time + i) * 50, height);
        ctx.lineTo(width * (0.1 + i * 0.25) + Math.cos(time + i) * 50, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Mouse reactive spotlight glow
      const spotGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 350);
      spotGrad.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
      spotGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.05)');
      spotGrad.addColorStop(1, 'rgba(5, 8, 22, 0)');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, width, height);

      // Vortex effect during Beta Tester CTA click
      if (vortexActive) {
        vortexProgress = Math.min(vortexProgress + 0.02, 1);
        if (vortexProgress >= 0.98 && onVortexComplete) {
          onVortexComplete();
        }
      }

      // Render Particles / Bubbles
      const centerX = width / 2;
      const centerY = height / 2;

      particles.forEach((p) => {
        if (vortexActive) {
          // Swirling vortex math
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) + 0.15 * (1 + (1 - dist / width));
          const speed = 6 + (1 - dist / width) * 10;

          p.x += Math.cos(angle) * speed;
          p.y += Math.sin(angle) * speed;
          p.radius = Math.max(0.5, p.radius * 0.98);
        } else {
          // Normal ambient ocean particle floating
          p.angle += p.angularSpeed;
          p.x += Math.cos(p.angle) * 0.4 + p.vx;
          p.y += p.vy;

          // Mouse proximity reaction
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 120) {
            const force = (120 - mdist) / 120;
            p.x += (mdx / mdist) * force * 3;
            p.y += (mdy / mdist) * force * 3;
          }

          // Wrap around screen boundaries
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        // Draw particle
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
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
