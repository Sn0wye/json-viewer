export type Primitive = string | number | boolean | null;

export interface Row {
  key: string | number | null;
  value?: Primitive;
  child?: TreeNode;
}

export interface TreeNode {
  id: number;
  label: string;
  path: string;
  depth: number;
  kind: 'object' | 'array' | 'value';
  size: number;
  rows: Row[];
  children: TreeNode[];
}

export interface Tree {
  root: TreeNode;
  nodes: TreeNode[];
}

export const MAX_NODES = 1500;

export class TooBigError extends Error {}

const isContainer = (v: unknown): v is object => v !== null && typeof v === 'object';

const IDENT = /^[A-Za-z_$][\w$]*$/;

function childPath(parent: string, key: string | number): string {
  if (typeof key === 'number') return `${parent}[${key}]`;
  return IDENT.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

export function buildTree(value: unknown): Tree {
  const nodes: TreeNode[] = [];

  const make = (val: unknown, label: string, path: string, depth: number): TreeNode => {
    if (nodes.length >= MAX_NODES) {
      throw new TooBigError(`JSON grande demais para o diagrama (mais de ${MAX_NODES} blocos).`);
    }
    const node: TreeNode = {
      id: nodes.length,
      label,
      path,
      depth,
      kind: Array.isArray(val) ? 'array' : isContainer(val) ? 'object' : 'value',
      size: 0,
      rows: [],
      children: [],
    };
    nodes.push(node);

    if (!isContainer(val)) {
      node.rows.push({ key: null, value: val as Primitive });
      return node;
    }

    const isArr = Array.isArray(val);
    const entries: [string | number, unknown][] = isArr
      ? val.map((v, i) => [i, v])
      : Object.entries(val);
    node.size = entries.length;

    for (const [k, v] of entries) {
      if (isContainer(v)) {
        const child = make(v, isArr ? `${label}[${k}]` : String(k), childPath(path, k), depth + 1);
        node.children.push(child);
        node.rows.push({ key: k, child });
      } else {
        node.rows.push({ key: k, value: v as Primitive });
      }
    }
    return node;
  };

  const root = make(value, 'root', '$', 0);
  return { root, nodes };
}
