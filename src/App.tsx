import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { Diagram } from './components/Diagram';
import { Editor } from './components/Editor';
import { Splitter, useEditorWidth } from './components/Splitter';
import { buildTree, type Tree } from './lib/tree';

const STORAGE_KEY = 'json-viewer:input';

const SAMPLE = JSON.stringify(
  {
    estufa: 'Varanda',
    ativa: true,
    plantas: [
      { nome: 'Costela-de-adão', cor: '#4ade80', rega: { diasEntre: 7, ultima: null } },
      { nome: 'Lírio-da-paz', cor: '#a78bfa', rega: { diasEntre: 3, ultima: '2026-11-20' } },
    ],
    ambiente: { luz: { horas: 6, tipo: 'indireta' }, umidade: { minima: 40.5 } },
  },
  null,
  2,
);

type Parsed = { ok: true; tree: Tree | null; count: number } | { ok: false; error: string };

/** Acrescenta linha/coluna quando o navegador só informa a posição. */
function describeError(err: unknown, text: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  const pos = /position (\d+)/.exec(msg);
  if (!pos || /line \d+/.test(msg)) return msg;
  const before = text.slice(0, Number(pos[1])).split('\n');
  return `${msg} — linha ${before.length}, coluna ${before[before.length - 1].length + 1}`;
}

function parse(text: string): Parsed {
  if (!text.trim()) return { ok: true, tree: null, count: 0 };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: describeError(e, text) };
  }
  try {
    const tree = buildTree(value);
    return { ok: true, tree, count: tree.nodes.length };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export default function App() {
  const [text, setText] = useState(() => localStorage.getItem(STORAGE_KEY) ?? SAMPLE);
  const [parsed, setParsed] = useState<Parsed>(() => parse(text));
  const [tree, setTree] = useState<Tree | null>(() => (parsed.ok ? parsed.tree : null));
  const [toast, setToast] = useState<string | null>(null);
  const [editorWidth, setEditorWidth] = useEditorWidth();
  const toastTimer = useRef<number>(undefined);

  // Reparse com debounce; em erro mantém o último diagrama válido.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const p = parse(text);
      setParsed(p);
      if (p.ok) setTree(p.tree);
      localStorage.setItem(STORAGE_KEY, text);
    }, 200);
    return () => window.clearTimeout(t);
  }, [text]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  const copy = useCallback(
    async (value: string, what: string) => {
      try {
        await navigator.clipboard.writeText(value);
        notify(`${what} copiado`);
      } catch {
        notify('Não foi possível copiar');
      }
    },
    [notify],
  );

  const reformat = (indent: number | undefined) => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, indent));
    } catch {
      notify('JSON inválido — corrija antes de formatar');
    }
  };

  const pasteAll = (pasted: string) => {
    try {
      setText(JSON.stringify(JSON.parse(pasted), null, 2));
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex h-full flex-col bg-omni-bg text-omni-fg">
      <header className="flex items-center gap-2 border-b border-omni-selection px-4 py-2">
        <h1 className="mr-4 font-mono text-sm font-semibold text-omni-purple">{'{ }'} JSON Viewer</h1>
        <Btn onClick={() => reformat(2)} title="Ctrl+Enter">Formatar</Btn>
        <Btn onClick={() => reformat(undefined)}>Minificar</Btn>
        <Btn onClick={() => copy(text, 'JSON')}>Copiar</Btn>
        <Btn onClick={() => setText('')}>Limpar</Btn>
        <Btn onClick={() => setText(SAMPLE)}>Exemplo</Btn>
        <span className="ml-auto text-xs text-omni-muted">
          Arraste para mover · roda do mouse para zoom · clique num campo para ir até o bloco · num valor para copiar
        </span>
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="flex shrink-0 flex-col overflow-hidden" style={{ width: editorWidth }}>
          <Editor value={text} onChange={setText} onPasteAll={pasteAll} onFormat={() => reformat(2)} />
          <footer
            className={`shrink-0 border-t border-omni-selection px-3 py-1.5 font-mono text-xs ${parsed.ok ? 'text-omni-green' : 'text-omni-red'}`}
          >
            {parsed.ok
              ? parsed.tree
                ? `✓ JSON válido · ${text.split('\n').length} linhas · ${text.length} caracteres`
                : 'Vazio'
              : `✗ ${parsed.error}`}
          </footer>
        </section>

        <Splitter onResize={setEditorWidth} />

        <Diagram tree={tree} onCopy={copy} />
      </main>

      {toast && (
        <div className="fixed top-14 right-4 rounded-md border border-omni-selection bg-omni-lighter px-3 py-1.5 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Btn(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-md border border-omni-selection bg-omni-light px-3 py-1 text-sm hover:border-omni-purple/60 hover:bg-omni-lighter"
    />
  );
}
