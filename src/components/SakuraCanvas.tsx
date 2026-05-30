import { useEffect, useRef } from "react";

export const SakuraCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect users who prefer reduced motion — skip the falling petals entirely
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const petals: Petal[] = [];
    const petalCount = 30;

    class Petal {
      x: number;
      y: number;
      w: number;
      h: number;
      opacity: number;
      flip: number;
      flipSpeed: number;
      speedX: number;
      speedY: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height - height;
        this.w = 10 + Math.random() * 15;
        this.h = 10 + Math.random() * 10;
        this.opacity = Math.random();
        this.flip = Math.random();
        this.flipSpeed = Math.random() * 0.03;
        this.speedX = 1 + Math.random() * 2;
        this.speedY = 1 + Math.random() * 1.5;
      }

      draw() {
        if (!ctx) return;
        if (this.y > height || this.x > width) {
          this.x = -this.w;
          this.y = Math.random() * height;
        }

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.rotate(this.flip * Math.PI);
        ctx.beginPath();
        ctx.ellipse(0, 0, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 192, 203, ${this.opacity})`;
        ctx.fill();
        ctx.restore();

        this.x += this.speedX;
        this.y += this.speedY;
        this.flip += this.flipSpeed;
      }
    }

    for (let i = 0; i < petalCount; i++) {
      petals.push(new Petal());
    }

    let rafId = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      petals.forEach((p) => p.draw());
      rafId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 opacity-60"
    />
  );
};
