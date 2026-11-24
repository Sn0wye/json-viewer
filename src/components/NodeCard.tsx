import { Braces, Brackets, ChevronRight, Copy } from 'lucide-react';
import { memo, type MouseEvent } from 'react';
import type { Box } from '../lib/layout';
import type { Primitive, TreeNode } from '../lib/tree';

// Paleta Omni.
const ACCENTS = ['#988bc7', '#ff79c6', '#e7de79', '#67e480', '#78d1e1', '#e89e64', '#e96379'];
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export type CopyFn = (text: string, what: string) => void;

function Value({ v }: { v: Primitive }) {
  if (v === null) return <span className="text-omni-cyan">null</span>;
  if (typeof v === 'boolean') return <span className="text-omni-cyan">{String(v)}</span>;
  if (typeof v === 'number') return <span className="text-omni-cyan">{v}</span>;
  return (
    <span className="text-omni-yellow">
      {HEX_COLOR.test(v) && (
        <span
          className="mr-1.5 inline-block size-2.5 rounded-sm border border-white/20 align-middle"
          style={{ background: v }}
        />
      )}
      {v}
    </span>
  );
}

function Badge({ node }: { node: TreeNode }) {
  if (node.kind === 'value') {
    const v = node.rows[0].value;
    return <span className="text-omni-muted">{v === null ? 'null' : typeof v}</span>;
  }
  const Icon = node.kind === 'array' ? Brackets : Braces;
  const noun = node.kind === 'array' ? (node.size === 1 ? 'item' : 'itens') : node.size === 1 ? 'chave' : 'chaves';
  return (
    <span className="flex items-center gap-1 text-omni-muted" title={`${node.size} ${noun}`}>
      <Icon className="size-3" aria-hidden />
      <span className="tabular-nums">{node.size}</span>
    </span>
  );
}

/** Reinicia a animação de "copiado" na linha clicada. */
function flash(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove('row-copied');
  void el.offsetWidth;
  el.classList.add('row-copied');
}

interface Props {
  node: TreeNode;
  box?: Box;
  highlighted: boolean;
  register: (id: number, el: HTMLDivElement | null) => void;
  onCopy: CopyFn;
  onFocusChild: (id: number) => void;
}

export const NodeCard = memo(function NodeCard({ node, box, highlighted, register, onCopy, onFocusChild }: Props) {
  const accent = ACCENTS[node.depth % ACCENTS.length];

  return (
    <div
      ref={(el) => register(node.id, el)}
      className={`absolute top-0 left-0 w-max max-w-[380px] min-w-44 overflow-hidden rounded-lg border border-omni-selection bg-omni-light font-mono text-xs shadow-lg shadow-black/40 ${box ? '' : 'invisible'}`}
      style={{
        transform: box ? `translate(${box.x}px, ${box.y}px)` : undefined,
        boxShadow: highlighted ? `0 0 0 2px ${accent}, 0 0 28px ${accent}66` : undefined,
        transition: 'box-shadow 300ms',
      }}
    >
      <div
        data-head
        title={`${node.path} (clique para copiar o caminho)`}
        onClick={(e) => {
          flash(e);
          onCopy(node.path, 'Caminho');
        }}
        className="group/head flex cursor-pointer items-center gap-2 border-b border-omni-selection px-3 py-1.5"
        style={{ borderTop: `2px solid ${accent}`, background: `${accent}14` }}
      >
        <span className="truncate font-semibold" style={{ color: accent }}>
          {node.label}
        </span>
        <Copy
          className="size-3 shrink-0 text-omni-muted opacity-0 transition-opacity group-hover/head:opacity-100"
          aria-hidden
        />
        <span className="ml-auto shrink-0 pl-2 text-[11px]">
          <Badge node={node} />
        </span>
      </div>

      <div className="py-1">
        {node.rows.length === 0 && <div className="px-3 py-0.5 text-omni-muted italic">vazio</div>}
        {node.rows.map((row, i) => {
          const child = row.child;
          const text = child
            ? null
            : row.value === null || typeof row.value !== 'string'
              ? String(row.value)
              : row.value;
          return (
            <div
              key={i}
              data-child={child?.id}
              title={child ? `Ir para ${child.path}` : text!}
              onClick={(e) => {
                if (child) return onFocusChild(child.id);
                flash(e);
                onCopy(text!, 'Valor');
              }}
              className="group flex min-w-0 cursor-pointer items-center gap-4 px-3 py-0.5 hover:bg-white/5"
            >
              {row.key !== null && <span className="shrink-0 text-omni-purple">{row.key}:</span>}
              <span className="ml-auto min-w-0 truncate text-right">
                {child ? (
                  <span className="inline-flex items-center text-omni-muted group-hover:text-omni-fg">
                    {child.kind === 'array'
                      ? `[${child.size} ${child.size === 1 ? 'item' : 'itens'}]`
                      : `{${child.size} ${child.size === 1 ? 'chave' : 'chaves'}}`}
                    <ChevronRight
                      className="-mr-1 ml-0.5 size-3 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                ) : (
                  <Value v={row.value!} />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
