import React, { useEffect, useRef } from 'react';

export default function AbyssalFluidCanvas({ vortexActive = false, onVortexComplete }) {
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

    // Mouse tracking with inertia
    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2, vx: 0, vy: 0 };
    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Bioluminescent Particle Orbs
    const count = Math.min(width > 768 ? 100 : 50, 120);
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      radius: Math.random() * 3 + 1.5,
      alpha: Math.random() * 0.7 + 0.3,
      color: ['#06B6D4', '#2563EB', '#38BDF8', '#10B981', '#8B5CF6'][Math.floor(Math.random() * 5)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03
    }));

    let vortexTimer = 0;

    const render = () => {
      // Calculate mouse velocity for fluid displacement
      const dx = mouse.targetX - mouse.x;
      const dy = mouse.targetY - mouse.y;
      mouse.vx = dx * 0.08;
      mouse.vy = dy * 0.08;
      mouse.x += mouse.vx;
      mouse.y += mouse.vy;

      // Abyssal Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0B132B');
      bgGrad.addColorStop(1, '#050816');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Bioluminescent Mouse Spotlight
      const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 380);
      mouseGrad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
      mouseGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.06)');
      mouseGrad.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = mouseGrad;
      ctx.fillRect(0, 0, width, height);

      // Vortex Mode Acceleration
      if (vortexActive) {
        vortexTimer += 0.02;
        if (vortexTimer >= 1.0 && onVortexComplete) {
          onVortexComplete();
        }
      }

      const centerX = width / 2;
      const centerY = height / 2;

      // Render Bioluminescent Particles
      particles.forEach((p) => {
        p.pulse += p.pulseSpeed;
        const currentRadius = p.radius + Math.sin(p.pulse) * 0.8;

        if (vortexActive) {
          // Swirling spiral into core
          const pdx = centerX - p.x;
          const pdy = centerY - p.y;
          const dist = Math.sqrt(pdx * pdx + pdy * pdy);
          const angle = Math.atan2(pdy, pdx) + 0.2 * (1 + (1 - dist / width));
          const speed = 8 + (1 - dist / width) * 12;

          p.x += Math.cos(angle) * speed;
          p.y += Math.sin(angle) * speed;
          p.radius = Math.max(0.5, p.radius * 0.97);
        } else {
          p.x += p.vx;
          p.y += p.vy;

          // Mouse Fluid Push
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 140) {
            const pushFactor = (140 - mdist) / 140;
            p.x += (mdx / mdist) * pushFactor * 4;
            p.y += (mdy / mdist) * pushFactor * 4;
          }

          // Boundary Wrap
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }

        // Draw Glow & Particle
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.2, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 15;
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
