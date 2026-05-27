import React, { useEffect, useRef } from 'react';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
};

const ProtectedImage: React.FC<Props> = ({ src, alt = '', className = '', width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // helper to draw image covering the canvas (like object-fit: cover)
    const drawCover = (imgEl: HTMLImageElement | ImageBitmap) => {
      if (cancelled) return;
      const dpr = window.devicePixelRatio || 1;
      const sourceW = imgEl instanceof ImageBitmap ? imgEl.width : imgEl.naturalWidth;
      const sourceH = imgEl instanceof ImageBitmap ? imgEl.height : imgEl.naturalHeight;
      const clientW = width || (container ? container.clientWidth : sourceW);
      const clientH = height || (container ? container.clientHeight : sourceH);
      const w = Math.max(1, Math.round(clientW));
      const h = Math.max(1, Math.round(clientH));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.style.borderRadius = 'inherit';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // ensure high-quality scaling
      try {
        ctx.imageSmoothingEnabled = true;
        // @ts-ignore
        ctx.imageSmoothingQuality = 'high';
      } catch (err) {}

      // compute cover sizing
      const imgW = sourceW;
      const imgH = sourceH;
      const scale = Math.max(w / imgW, h / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const dx = (w - drawW) / 2;
      const dy = (h - drawH) / 2;
      ctx.drawImage(imgEl as any, dx, dy, drawW, drawH);
    };

    // Load image and draw to canvas (prevents simple right-click -> save-as on <img>)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        if (typeof createImageBitmap !== 'undefined') {
          const bitmap = await createImageBitmap(img);
          drawCover(bitmap);
        } else {
          drawCover(img);
        }
      } catch (err) {
        drawCover(img);
      }
    };
    img.onerror = () => {
      // fallback: try fetch->blob->createObjectURL
      fetch(src, { mode: 'cors' })
        .then((r) => r.blob())
        .then((blob) => {
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          img.src = url;
        })
        .catch(() => {
          /* ignore */
        });
    };

    // start by assigning src (will trigger onload or onerror path)
    img.src = src;

    // observe container resize to redraw canvas appropriately
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      ro = new ResizeObserver(() => {
        // redraw using same image if already loaded
        if (img.complete && img.naturalWidth) drawCover(img);
      });
      ro.observe(container);
    }

    return () => {
      cancelled = true;
      if (ro && container) ro.unobserve(container);
    };
  }, [src, width, height]);

  return (
    <div ref={containerRef} className={className} style={{ display: 'inline-block', position: 'relative', width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        draggable={false}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
      />
      {/* transparent overlay to block pointer interactions */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, zIndex: 2 }}
        onMouseDown={(e) => e.preventDefault()}
        onTouchStart={(e) => e.preventDefault()}
      />
    </div>
  );
};

export default ProtectedImage;
