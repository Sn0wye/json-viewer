import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { layout, type Layout, type Measure } from '../lib/layout';
import type { Tree } from '../lib/tree';
import { NodeCard, type CopyFn } from './NodeCard';

interface View {
  x: number;
  y: number;
  k: number;
}

const MIN_K = 0.1;
const MAX_K = 3;
const PAD = 40;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function fitView(l: Layout, vp: HTMLElement): View {
  const vw = vp.clientWidth;
  const vh = vp.clientHeight;
  const k = clamp(Math.min((vw - PAD * 2) / l.width, (vh - PAD * 2) / l.height, 1), MIN_K, 1);
  return { k, x: Math.max(PAD, (vw - l.width * k) / 2), y: Math.max(PAD, (vh - l.height * k) / 2) };
}

export function Diagram({ tree, onCopy }: { tree: Tree | null; onCopy: CopyFn }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef(new Map<number, HTMLDivElement>());
  const lastCount = useRef(-1);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const layRef = useRef<Layout | null>(null);
  const pendingFit = useRef(false);

  const [lay, setLay] = useState<Layout | null>(null);
  const [view, setView] = useState<View>({ x: PAD, y: PAD, k: 1 });
  const [highlight, setHighlight] = useState<number | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const anim = useRef(0);
  const highlightTimer = useRef<number>(undefined);

  const register = useCallback((id: number, el: HTMLDivElement | null) => {
    if (el) nodeEls.current.set(id, el);
    else nodeEls.current.delete(id);
  }, []);

  // Mede os blocos já renderizados (invisíveis) e posiciona antes do paint.
  useLayoutEffect(() => {
    if (!tree) {
      setLay(null);
      lastCount.current = -1;
      return;
    }
    const measures: Measure[] = tree.nodes.map((n) => {
      const el = nodeEls.current.get(n.id)!;
      const head = el.querySelector<HTMLElement>('[data-head]')!;
      const rowY = new Map<number, number>();
      el.querySelectorAll<HTMLElement>('[data-child]').forEach((r) => {
        rowY.set(Number(r.dataset.child), r.offsetTop + r.offsetHeight / 2);
      });
      return { w: el.offsetWidth, h: el.offsetHeight, headH: head.offsetHeight, rowY };
    });
    const l = layout(tree, measures);
    layRef.current = l;
    setLay(l);
    // Só reenquadra quando a estrutura muda, para não pular enquanto digita.
    if (lastCount.current !== tree.nodes.length) {
      pendingFit.current = true;
      tryFit();
    }
    lastCount.current = tree.nodes.length;
  }, [tree]);

  // Viewport sem tamanho (aba oculta, primeiro paint) adia o enquadramento até ganhar tamanho.
  const tryFit = () => {
    const vp = viewportRef.current;
    if (!pendingFit.current || !vp || !layRef.current || !vp.clientWidth || !vp.clientHeight) return;
    pendingFit.current = false;
    setView(fitView(layRef.current, vp));
  };
  const tryFitRef = useRef(tryFit);
  tryFitRef.current = tryFit;

  useEffect(() => {
    const ro = new ResizeObserver(() => tryFitRef.current());
    ro.observe(viewportRef.current!);
    return () => ro.disconnect();
  }, []);

  const zoomAt = useCallback((mx: number, my: number, factor: number) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K);
      const r = k / v.k;
      return { k, x: mx - (mx - v.x) * r, y: my - (my - v.y) * r };
    });
  }, []);

  const zoomCenter = (factor: number) => {
    const vp = viewportRef.current!;
    zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, factor);
  };

  useEffect(() => {
    const vp = viewportRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      const r = vp.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      d.moved = moved.current = true;
      d.x = e.clientX;
      d.y = e.clientY;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // Clique só copia se não foi fim de arraste.
  const copyIfClick = useCallback<CopyFn>(
    (text, what) => {
      if (!moved.current) onCopy(text, what);
    },
    [onCopy],
  );

  /** Anima a câmera até o bloco do filho e destaca o bloco por um instante. */
  const focusNode = useCallback((id: number) => {
    const vp = viewportRef.current;
    const box = layRef.current?.boxes[id];
    if (moved.current || !vp || !box) return;

    const from = viewRef.current;
    const k = Math.max(from.k, 0.6);
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    // Bloco mais alto que a tela: alinha pelo topo em vez de centralizar.
    const y = box.h * k > vh - PAD * 2 ? PAD - box.y * k : vh / 2 - (box.y + box.h / 2) * k;
    const to: View = { k, x: vw / 2 - (box.x + box.w / 2) * k, y };

    cancelAnimationFrame(anim.current);
    const start = performance.now();
    const DURATION = 350;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const e = 1 - (1 - t) ** 3; // ease-out cubic
      setView({
        k: from.k + (to.k - from.k) * e,
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
      });
      if (t < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);

    setHighlight(id);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlight(null), 1500);
  }, []);

  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  const current = lay && lay.tree === tree ? lay : null;
  const grid = 22 * view.k;

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div
        ref={viewportRef}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          cancelAnimationFrame(anim.current);
          drag.current = { x: e.clientX, y: e.clientY, moved: false };
          moved.current = false;
        }}
        className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
        style={{
          backgroundImage: 'radial-gradient(circle, rgb(255 255 255 / 0.07) 1px, transparent 1px)',
          backgroundSize: `${grid}px ${grid}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          {current && (
            <svg
              className="pointer-events-none absolute top-0 left-0 overflow-visible"
              width={current.width}
              height={current.height}
            >
              {current.edges.map((e) => (
                <path key={e.id} d={e.d} fill="none" stroke="rgb(152 139 199 / 0.45)" strokeWidth={1.5} />
              ))}
            </svg>
          )}
          {tree?.nodes.map((n) => (
            <NodeCard
              key={n.id}
              node={n}
              box={current?.boxes[n.id]}
              highlighted={highlight === n.id}
              register={register}
              onCopy={copyIfClick}
              onFocusChild={focusNode}
            />
          ))}
        </div>
      </div>

      {!tree && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-omni-muted">
          Cole um JSON à esquerda.
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-omni-selection bg-omni-light/90 p-1 text-sm text-omni-fg shadow-lg backdrop-blur">
        <ToolButton onClick={() => zoomCenter(1 / 1.2)} title="Diminuir zoom">−</ToolButton>
        <span className="w-12 text-center tabular-nums">{Math.round(view.k * 100)}%</span>
        <ToolButton onClick={() => zoomCenter(1.2)} title="Aumentar zoom">+</ToolButton>
        <ToolButton
          onClick={() => current && setView(fitView(current, viewportRef.current!))}
          title="Ajustar à tela"
        >
          Ajustar
        </ToolButton>
        {tree && <span className="px-2 text-xs text-omni-muted">{tree.nodes.length} blocos</span>}
      </div>
    </div>
  );
}

function ToolButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="rounded px-2.5 py-1 hover:bg-white/10" />;
}
