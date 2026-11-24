import { memo } from 'react';
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

function badge(node: TreeNode) {
  if (node.kind === 'array') return `array · ${node.size}`;
  if (node.kind === 'object') return `object · ${node.size}`;
  const v = node.rows[0].value;
  return v === null ? 'null' : typeof v;
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
        onClick={() => onCopy(node.path, 'Caminho')}
        className="flex cursor-pointer items-center gap-3 border-b border-omni-selection px-3 py-1.5"
        style={{ borderTop: `2px solid ${accent}`, background: `${accent}14` }}
      >
        <span className="truncate font-semibold" style={{ color: accent }}>
          {node.label}
        </span>
        <span className="ml-auto shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] tracking-wide text-omni-muted uppercase">
          {badge(node)}
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
              onClick={() => (child ? onFocusChild(child.id) : onCopy(text!, 'Valor'))}
              className="group flex min-w-0 cursor-pointer items-center gap-4 px-3 py-0.5 hover:bg-white/5"
            >
              {row.key !== null && <span className="shrink-0 text-omni-purple">{row.key}:</span>}
              <span className="ml-auto min-w-0 truncate text-right">
                {child ? (
                  <span className="text-omni-muted group-hover:text-omni-fg">
                    {child.kind === 'array'
                      ? `[${child.size} ${child.size === 1 ? 'item' : 'itens'}]`
                      : `{${child.size} ${child.size === 1 ? 'chave' : 'chaves'}}`}
                    <span className="ml-1 opacity-0 group-hover:opacity-100">→</span>
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
