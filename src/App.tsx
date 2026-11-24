import { CircleAlert, CircleCheck, CircleDashed, Copy, Eraser, FoldHorizontal, Sprout, WandSparkles, type LucideIcon } from 'lucide-react';
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
  const [toast, setToast] = useState<{ msg: string; ok: boolean; id: number } | null>(null);
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

  const notify = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok, id: Date.now() });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  const copy = useCallback(
    async (value: string, what: string) => {
      try {
        await navigator.clipboard.writeText(value);
        notify(`${what} copiado`);
      } catch {
        notify('Não foi possível copiar', false);
      }
    },
    [notify],
  );

  const reformat = (indent: number | undefined) => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, indent));
    } catch {
      notify('JSON inválido: corrija antes de formatar', false);
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

  const lines = text.split('\n').length;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="flex h-full flex-col bg-omni-bg text-omni-fg">
      <header className="flex items-center gap-3 border-b border-omni-selection px-3 py-2">
        <h1 className="mr-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo />
          <span>JSON Viewer</span>
        </h1>
        <div className="flex items-center gap-1">
          <Btn icon={WandSparkles} onClick={() => reformat(2)} title={`Formatar (${isMac ? '⌘' : 'Ctrl'}+Enter)`}>
            Formatar
            <kbd className="ml-1 rounded border border-omni-selection px-1 font-sans text-[11px] leading-4 text-omni-muted">
              {isMac ? '⌘↵' : 'Ctrl ↵'}
            </kbd>
          </Btn>
          <Btn icon={FoldHorizontal} onClick={() => reformat(undefined)}>
            Minificar
          </Btn>
          <Btn icon={Copy} onClick={() => copy(text, 'JSON')}>
            Copiar
          </Btn>
        </div>
        <span className="h-5 w-px bg-omni-selection" aria-hidden />
        <div className="flex items-center gap-1">
          <Btn icon={Eraser} onClick={() => setText('')}>
            Limpar
          </Btn>
          <Btn icon={Sprout} onClick={() => setText(SAMPLE)}>
            Exemplo
          </Btn>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="flex shrink-0 flex-col overflow-hidden" style={{ width: editorWidth }}>
          <Editor value={text} onChange={setText} onPasteAll={pasteAll} onFormat={() => reformat(2)} />
          <footer
            role="status"
            className={`flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap border-t border-omni-selection px-3 py-1.5 font-mono text-xs ${
              !parsed.ok ? 'bg-omni-red/8 text-omni-red' : parsed.tree ? 'text-omni-green' : 'text-omni-muted'
            }`}
          >
            {parsed.ok ? (
              parsed.tree ? (
                <>
                  <CircleCheck className="size-3.5 shrink-0" aria-hidden />
                  <span>JSON válido</span>
                  <span className="ml-auto truncate text-omni-muted tabular-nums">
                    {lines} {lines === 1 ? 'linha' : 'linhas'}
                    <span className="mx-2 text-omni-selection">/</span>
                    {text.length.toLocaleString('pt-BR')} caracteres
                  </span>
                </>
              ) : (
                <>
                  <CircleDashed className="size-3.5 shrink-0" aria-hidden />
                  <span>Editor vazio</span>
                </>
              )
            ) : (
              <>
                <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate" title={parsed.error}>
                  {parsed.error}
                </span>
              </>
            )}
          </footer>
        </section>

        <Splitter onResize={setEditorWidth} />

        <Diagram tree={tree} onCopy={copy} onSample={() => setText(SAMPLE)} />
      </main>

      {toast && (
        <div
          key={toast.id}
          role="status"
          className={`toast fixed top-14 right-4 flex items-center gap-2 rounded-md border bg-omni-lighter py-1.5 pr-3 pl-2.5 text-sm shadow-lg shadow-black/40 ${
            toast.ok ? 'border-omni-green/30' : 'border-omni-red/40'
          }`}
        >
          {toast.ok ? (
            <CircleCheck className="size-4 text-omni-green" aria-hidden />
          ) : (
            <CircleAlert className="size-4 text-omni-red" aria-hidden />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/** Marca: chaves com um nó no meio, o JSON virando diagrama. */
function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
      <path
        d="M8 3.5c-2 0-2.75 1-2.75 2.75v2.5C5.25 10.5 4.5 12 3 12c1.5 0 2.25 1.5 2.25 3.25v2.5c0 1.75.75 2.75 2.75 2.75M16 3.5c2 0 2.75 1 2.75 2.75v2.5c0 1.75.75 3.25 2.25 3.25-1.5 0-2.25 1.5-2.25 3.25v2.5c0 1.75-.75 2.75-2.75 2.75"
        className="stroke-omni-purple"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.25" className="fill-omni-pink" />
    </svg>
  );
}

function Btn({ icon: Icon, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon }) {
  return (
    <button
      {...props}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-omni-fg/85 transition-colors hover:bg-omni-light hover:text-omni-fg focus-visible:outline-2 focus-visible:outline-omni-purple active:bg-omni-lighter"
    >
      <Icon className="size-3.5 text-omni-muted" strokeWidth={2} aria-hidden />
      {children}
    </button>
  );
}
