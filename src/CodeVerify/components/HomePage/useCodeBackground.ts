import { useEffect, useRef, useState } from 'react';

export const useCodeBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸为窗口大小
    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 代码字符
    const codeChars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz(){}<>[]|;:,./?';
    
    // 粒子类
    class CodeParticle {
      x: number;
      y: number;
      char: string;
      size: number;
      speed: number;
      color: string;
      opacity: number;
      
      constructor() {
        this.x = Math.random() * (canvas?.width || 0);
        this.y = Math.random() * (canvas?.height || 0);
        this.char = codeChars[Math.floor(Math.random() * codeChars.length)];
        this.size = 12 + Math.random() * 8;
        this.speed = 0.5 + Math.random() * 2;
        this.color = `hsl(${210 + Math.random() * 40}, 70%, 60%)`;
        this.opacity = 0.1 + Math.random() * 0.7;
      }
      
      update() {
        this.y += this.speed;
        if (canvas && this.y > canvas.height) {
          this.y = 0;
          this.x = Math.random() * (canvas?.width || 0);
          this.char = codeChars[Math.floor(Math.random() * codeChars.length)];
        }
      }
      
      draw(ctx: CanvasRenderingContext2D) {
        ctx.font = `${this.size}px monospace`;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fillText(this.char, this.x, this.y);
        ctx.globalAlpha = 1;
      }
    }
    
    // 创建代码粒子
    const particles: CodeParticle[] = [];
    const particleCount = Math.floor((canvas.width * canvas.height) / 10000);
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new CodeParticle());
    }
    
    // 动画帧
    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.fillStyle = 'rgba(12, 15, 24, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.update();
        particle.draw(ctx);
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    // 加载动画完成
    setTimeout(() => setIsLoaded(true), 800);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return { canvasRef, isLoaded };
}; 