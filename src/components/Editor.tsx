import MonacoEditor, { loader, type OnMount } from '@monaco-editor/react';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';
import { useRef } from 'react';
import * as monaco from '../lib/monaco';
import '../lib/omniOwl';

// Monaco empacotado localmente (sem CDN). Workers servem validação/formatação de JSON.
self.MonacoEnvironment = {
  getWorker: (_id, label) => (label === 'json' ? new JsonWorker() : new EditorWorker()),
};
loader.config({ monaco: monaco as never });

const FONT = "'JetBrainsMono Nerd Font', 'JetBrains Mono', ui-monospace, monospace";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Chamado quando uma colagem substitui o editor inteiro. */
  onPasteAll: (text: string) => void;
  onFormat: () => void;
}

export function Editor({ value, onChange, onPasteAll, onFormat }: Props) {
  // onMount roda uma vez; refs evitam closures velhas.
  const props = useRef({ onPasteAll, onFormat });
  props.current = { onPasteAll, onFormat };

  const handleMount: OnMount = (editor, m) => {
    editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => props.current.onFormat());
    editor.onDidPaste((e) => {
      const model = editor.getModel();
      if (model && e.range.equalsRange(model.getFullModelRange())) {
        props.current.onPasteAll(model.getValue());
      }
    });
    editor.focus();
  };

  return (
    <div className="min-h-0 flex-1">
      <MonacoEditor
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        language="json"
        theme="omni-owl"
        options={{
          // Mesmas opções do settings.json do VS Code local.
          fontFamily: FONT,
          fontSize: 14,
          fontLigatures: true,
          lineHeight: 1.8,
          tabSize: 2,
          rulers: [80, 120],
          renderLineHighlight: 'gutter',
          matchBrackets: 'never',
          bracketPairColorization: { enabled: true },
          guides: {
            indentation: true,
            bracketPairs: true,
            highlightActiveIndentation: false,
            highlightActiveBracketPair: false,
          },
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          formatOnPaste: false,
          stickyScroll: { enabled: false },
        }}
      />
    </div>
  );
}
