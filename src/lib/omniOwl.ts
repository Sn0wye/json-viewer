import * as monaco from './monaco';

/*
 * Tema "Omni Owl (Minimal Italics)" (extensão guilhermerodz.omni-owl 0.1.1 do VS Code),
 * restrito ao que aparece num editor de JSON.
 *
 * No VS Code, a gramática de JSON marca a chave como `support.type.property-name`. O tema não
 * dá cor a essa regra, então a chave herda a regra `support` (#988bc7). As aspas da chave têm
 * regra própria (#7159C1). Para separar as aspas da chave, este arquivo troca o tokenizer
 * nativo do Monaco por um Monarch. Validação, formatação e folding continuam no worker de JSON.
 */
export const OMNI_OWL = {
  bg: '#13111B',
  fg: '#E1E1E6',
  key: '#988bc7', // support
  keyQuote: '#7159C1', // punctuation.support.type.property-name.begin/end
  string: '#e7de79', // string
  constant: '#78D1E1', // constant: números, true, false, null
  escape: '#FF79C6', // constant.character.escape
  invalid: '#E96379', // invalid
};

const hex = (c: string) => c.replace('#', '');

monaco.json.jsonDefaults.setModeConfiguration({
  ...monaco.json.jsonDefaults.modeConfiguration,
  tokens: false,
});

monaco.languages.setMonarchTokensProvider('json', {
  defaultToken: 'invalid',
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
  ],
  tokenizer: {
    root: [
      [/\s+/, ''],
      [/(")((?:[^"\\]|\\.)*)(")(\s*)(:)/, ['key.quote', 'key', 'key.quote', '', 'delimiter']],
      [/"/, { token: 'string', next: '@string' }],
      [/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
      [/\b(?:true|false|null)\b/, 'constant'],
      [/[{}[\]]/, '@brackets'],
      [/[,:]/, 'delimiter'],
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})/, 'string.escape'],
      [/\\./, 'invalid'],
      [/"/, { token: 'string', next: '@pop' }],
    ],
  },
});

monaco.editor.defineTheme('omni-owl', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: hex(OMNI_OWL.fg), background: hex(OMNI_OWL.bg) },
    { token: 'key', foreground: hex(OMNI_OWL.key) },
    { token: 'key.quote', foreground: hex(OMNI_OWL.keyQuote) },
    { token: 'string', foreground: hex(OMNI_OWL.string) },
    { token: 'string.escape', foreground: hex(OMNI_OWL.escape) },
    { token: 'number', foreground: hex(OMNI_OWL.constant) },
    { token: 'constant', foreground: hex(OMNI_OWL.constant) },
    { token: 'delimiter', foreground: hex(OMNI_OWL.fg) },
    { token: 'invalid', foreground: hex(OMNI_OWL.invalid), fontStyle: 'underline' },
  ],
  // Cores de interface copiadas do tema. Os colchetes usam as cores padrão do VS Code,
  // porque o tema não define editorBracketHighlight.*.
  colors: {
    'editor.background': '#13111B',
    'editor.foreground': '#E1E1E6',
    'editorLineNumber.foreground': '#544776',
    'editorLineNumber.activeForeground': '#E1E1E6',
    'editor.selectionBackground': '#41414D',
    'editor.selectionHighlightBackground': '#3c3550',
    'editor.lineHighlightBackground': '#201B2D',
    'editor.lineHighlightBorder': '#13111B',
    'editor.findMatchBackground': '#E89E6450',
    'editor.findMatchHighlightBackground': '#E1E1E628',
    'editor.foldBackground': '#13111B',
    'editorIndentGuide.background1': '#FFFFFF1A',
    'editorIndentGuide.activeBackground1': '#E1E1E62d',
    'editorRuler.foreground': '#FFFFFF1A',
    'editorWidget.background': '#13111B',
    'editorWidget.border': '#3c3550',
    'input.background': '#13111B',
    focusBorder: '#5A4B81',
    'editorOverviewRuler.border': '#15121E',
    'editorOverviewRuler.errorForeground': '#E9637950',
    'editorError.foreground': '#E96379',
  },
});
