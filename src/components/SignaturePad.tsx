import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  value?: string; // data URL da assinatura existente
  onChange: (dataUrl: string | null) => void;
  height?: number;
}

export function SignaturePad({ value, onChange, height = 160 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(!!value);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  // Marca quando a mudança em `value` veio do PRÓPRIO componente (após desenhar).
  // Evita que o useEffect de reload re-desenhe a imagem em cima do canvas
  // (causava o efeito de "zoom progressivo" a cada traço).
  const internalChange = useRef(false);

  // Carrega assinatura existente quando o valor muda EXTERNAMENTE
  useEffect(() => {
    if (!canvasRef.current) return;
    if (internalChange.current) {
      // mudança disparada pelo próprio componente — ignora
      internalChange.current = false;
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (value && value.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        // Reseta transform ANTES de desenhar — evita acumular scale(dpr).
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        setHasContent(true);
      };
      img.src = value;
    } else {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      setHasContent(false);
    }
  }, [value]);

  // Configura tamanho responsivo. Reseta transform antes de aplicar scale
  // pra não empilhar scale(dpr) em re-renders / resizes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset antes
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [height]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    setDrawing(true);
    lastPoint.current = getPos(e);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx || !lastPoint.current) return;
    const p = getPos(e);
    ctx.strokeStyle = '#0C97C4';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
    setHasContent(true);
  };

  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    lastPoint.current = null;
    if (canvasRef.current && hasContent) {
      // Marca como mudança interna pra o useEffect de reload não disparar
      internalChange.current = true;
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasContent(false);
    internalChange.current = true;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        className="w-full rounded-lg border-2 border-dashed border-input bg-background relative overflow-hidden"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          style={{ height }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        {!hasContent && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
            Assine aqui (opcional)
          </p>
        )}
      </div>
      {hasContent && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={clear} className="gap-1.5">
            <Eraser className="h-3.5 w-3.5" /> Limpar
          </Button>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Check className="h-3 w-3 text-green-600" /> Assinatura registrada
          </span>
        </div>
      )}
    </div>
  );
}
