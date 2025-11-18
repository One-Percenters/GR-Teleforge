'use client';

import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;
    
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseSpeed: number;

      constructor(canvasWidth: number, canvasHeight: number) {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const scatterRadius = Math.min(canvasWidth, canvasHeight) * 0.6; 
        const scatterAngle = Math.random() * Math.PI * 2;
        
        this.x = centerX + Math.cos(scatterAngle) * (Math.random() * scatterRadius);
        this.y = centerY + Math.sin(scatterAngle) * (Math.random() * scatterRadius);
        
        const angle = Math.random() * Math.PI * 2; 
        this.baseSpeed = 0.2 + Math.random() * 0.3; 
        
        this.vx = Math.cos(angle) * this.baseSpeed; 
        this.vy = Math.sin(angle) * this.baseSpeed;
        this.radius = 4;
      }
      
      update(canvasWidth: number, canvasHeight: number) {
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off edges with increased speed
        if (this.x <= 0 || this.x >= canvasWidth) {
          this.vx *= -1;
          // Boost speed on bounce (2.5x the base speed)
          const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
          if (currentSpeed < this.baseSpeed * 2.5) {
            const boostFactor = (this.baseSpeed * 2.5) / currentSpeed;
            this.vx *= boostFactor;
            this.vy *= boostFactor;
          }
          this.x = Math.max(0, Math.min(canvasWidth, this.x));
        }
        
        if (this.y <= 0 || this.y >= canvasHeight) {
          this.vy *= -1;
          // Boost speed on bounce (2.5x the base speed)
          const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
          if (currentSpeed < this.baseSpeed * 2.5) {
            const boostFactor = (this.baseSpeed * 2.5) / currentSpeed;
            this.vx *= boostFactor;
            this.vy *= boostFactor;
          }
          this.y = Math.max(0, Math.min(canvasHeight, this.y));
        }
        
        // Gradually slow down to base speed (friction effect)
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > this.baseSpeed) {
          const dampening = 0.98; // Slow decay factor
          this.vx *= dampening;
          this.vy *= dampening;
        }
      }
      
      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    const particleCount = 150;
    particlesRef.current = Array.from({ length: particleCount }, () => new Particle(width, height));

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach(particle => particle.update(width, height));

      // Draw connection lines
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            const opacity = 1 - distance / 150;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particlesRef.current.forEach(particle => particle.draw(ctx));

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default ParticleBackground;
