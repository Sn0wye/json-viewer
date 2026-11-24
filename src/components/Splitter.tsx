import { useEffect, useState } from 'react';

const STORAGE_KEY = 'json-viewer:editor-width';
const MIN = 240;
const defaultWidth = () => Math.round(window.innerWidth * 0.38);
const clampWidth = (w: number) => Math.max(MIN, Math.min(w, window.innerWidth - MIN));

/** Largura do painel esquerdo, salva entre sessões. */
export function useEditorWidth() {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return clampWidth(saved > 0 ? saved : defaultWidth());
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  useEffect(() => {
    const onResize = () => setWidth((w) => clampWidth(w));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return [width, setWidth] as const;
}

/** Divisor arrastável entre os painéis. Duplo clique volta ao tamanho padrão. */
export function Splitter({ onResize }: { onResize: (width: number) => void }) {
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const left = e.currentTarget.parentElement!.getBoundingClientRect().left;
    const body = document.body.style;
    body.cursor = 'col-resize';
    body.userSelect = 'none';
    const move = (ev: PointerEvent) => onResize(clampWidth(ev.clientX - left));
    const up = () => {
      body.cursor = '';
      body.userSelect = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Arraste para redimensionar. Duplo clique restaura o tamanho"
      onPointerDown={start}
      onDoubleClick={() => onResize(clampWidth(defaultWidth()))}
      className="group relative z-10 w-1 shrink-0 cursor-col-resize bg-omni-selection transition-colors hover:bg-omni-purple active:bg-omni-purple"
    >
      {/* Área de captura maior que a linha visível. */}
      <div className="absolute inset-y-0 -right-1.5 -left-1.5" />
    </div>
  );
}
