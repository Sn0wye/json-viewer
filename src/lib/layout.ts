import type { Tree, TreeNode } from './tree';

export interface Measure {
  w: number;
  h: number;
  /** Altura do cabeçalho do bloco. */
  headH: number;
  /** id do filho -> centro vertical da linha que aponta para ele. */
  rowY: Map<number, number>;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Edge {
  id: string;
  d: string;
}

export interface Layout {
  tree: Tree;
  boxes: Box[];
  edges: Edge[];
  width: number;
  height: number;
}

const GAP_X = 90;
const GAP_Y = 20;

/** Árvore da esquerda para a direita: uma coluna por nível, pai centralizado nos filhos. */
export function layout(tree: Tree, m: Measure[]): Layout {
  const colW: number[] = [];
  for (const n of tree.nodes) colW[n.depth] = Math.max(colW[n.depth] ?? 0, m[n.id].w);

  const colX: number[] = [];
  let acc = 0;
  for (let d = 0; d < colW.length; d++) {
    colX[d] = acc;
    acc += colW[d] + GAP_X;
  }

  const subCache = new Map<number, number>();
  const kidsH = (n: TreeNode) =>
    n.children.reduce((s, c) => s + subH(c), 0) + GAP_Y * Math.max(0, n.children.length - 1);
  const subH = (n: TreeNode): number => {
    let h = subCache.get(n.id);
    if (h === undefined) {
      h = Math.max(m[n.id].h, kidsH(n));
      subCache.set(n.id, h);
    }
    return h;
  };

  const boxes: Box[] = [];
  const place = (n: TreeNode, top: number) => {
    const sh = subH(n);
    const { w, h } = m[n.id];
    boxes[n.id] = { x: colX[n.depth], y: top + (sh - h) / 2, w, h };
    let cy = top + (sh - kidsH(n)) / 2;
    for (const c of n.children) {
      place(c, cy);
      cy += subH(c) + GAP_Y;
    }
  };
  place(tree.root, 0);

  const edges: Edge[] = [];
  for (const n of tree.nodes) {
    const a = boxes[n.id];
    for (const c of n.children) {
      const b = boxes[c.id];
      const x1 = a.x + a.w;
      const y1 = a.y + (m[n.id].rowY.get(c.id) ?? a.h / 2);
      const x2 = b.x;
      const y2 = b.y + m[c.id].headH / 2;
      const mx = (x1 + x2) / 2;
      edges.push({ id: `${n.id}-${c.id}`, d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` });
    }
  }

  return { tree, boxes, edges, width: acc - GAP_X, height: subH(tree.root) };
}
