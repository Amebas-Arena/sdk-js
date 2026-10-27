// O sistema de comandos do chat ("!gols 5"): a define de cada comando (args, cooldown, permissão), o parser padrão, as
// respostas prontas (uso errado, cooldown, sem permissão) e o !ajuda gerado sozinho. É o mesmo contrato do script do
// painel e dos SDKs de Python e Go; os casos de commands/conformance.json (pacote do protocolo) valem pros quatro.
// Não depende do bot: dá pra usar a classe Commands sozinha, com outro transporte.

export type Role = 'player' | 'staff' | 'owner';
export type Permission = 'all' | 'staff' | 'owner';

/** quem está na sala, como o argumento `player` devolve */
export interface PersonRef {
  id: number;
  nick: string;
  accountId: string | null;
}

/** quem mandou o comando: o PersonRef e o papel na sala (dono, staff ou jogador) */
export interface CommandPlayer extends PersonRef {
  role: Role;
}

export interface CooldownOptions {
  /** segundos entre dois usos da mesma pessoa (segue a conta; visitante, o nick) */
  player?: number;
  /** segundos entre dois usos de qualquer pessoa na sala */
  room?: number;
  /** staff e dono não esperam; padrão true */
  exemptStaff?: boolean;
}

/**
 * As respostas prontas, com {command} (!gols), {nick}, {usage} (!gols <n>) e, em cada uma: {reason} no usage,
 * {left} (9s, 1min 5s) no cooldown e {who} (a staff, o dono da sala) no permission.
 */
export interface CommandMessages {
  usage?: string;
  cooldown?: string;
  permission?: string;
}

export const DEFAULT_MESSAGES: Required<CommandMessages> = {
  usage: '{reason}. Uso: {usage}',
  cooldown: 'Espere {left} pra usar {command} de novo.',
  permission: 'Só {who} pode usar {command}.',
};

export type ArgType = 'int' | 'number' | 'text' | 'rest' | 'bool' | 'player' | 'team';

/** o argumento por extenso; a forma curta ('int:1..20?') vira isto */
export interface ArgObject {
  /** um dos tipos, ou 'choice' com `choices` */
  type: ArgType | 'choice';
  /** faixa: valor (int, number) ou tamanho (text) */
  min?: number;
  max?: number;
  choices?: readonly string[];
  optional?: boolean;
  /** valor quando falta (já deixa opcional) */
  default?: unknown;
}

/**
 * Um argumento: a forma curta ou o objeto. Forma curta: `tipo[:faixa][?|=padrão]`.
 * int, int:1..20, int:1.., int:..10, number:0..1, text, text:3..16, rest (o resto da linha, por último), bool,
 * player (#id, @nick, nick ou começo do nick), team (a ou b), azul|vermelho (uma das opções).
 * `?` deixa opcional (vem null); `=5` dá o padrão.
 */
export type ArgSpec = string | ArgObject;
export type ArgsSpec = Readonly<Record<string, ArgSpec>>;

/** o que o parse próprio recebe: o texto depois do nome, já em palavras */
export interface ParseInput {
  rest: string;
  words: string[];
  player: CommandPlayer;
  players: readonly PersonRef[];
}

/** O que serve de padrão (defaults) e de define: dá pra guardar numa const e espalhar ({ ...STAFF, args }). */
export interface CommandOptions {
  /** segundos por pessoa, ou { player, room, exemptStaff } */
  cooldown?: number | CooldownOptions;
  permission?: Permission;
  messages?: CommandMessages;
}

export interface CommandDefaults extends CommandOptions {
  /** o que vem antes do nome; padrão '!' */
  prefix?: string;
  /** o !ajuda (com !help e !comandos) embutido; padrão true */
  help?: boolean;
}

export interface CommandDefine<A extends ArgsSpec = ArgsSpec> extends CommandOptions {
  aliases?: readonly string[];
  /** a linha do !ajuda */
  description?: string;
  /** fora do !ajuda */
  hidden?: boolean;
  args?: A;
  /** troca o parser padrão: devolve os args, ou lança CommandError com o motivo (vira a resposta de uso) */
  parse?: (input: ParseInput) => unknown;
}

// --- os tipos dos args a partir da define (a forma curta é lida pelo próprio TypeScript) ---
type Split<S extends string> = S extends `${infer H}|${infer T}` ? H | Split<T> : S;
type Base<S extends string> = S extends `${infer B}=${string}` ? B : S extends `${infer B}?` ? B : S;
type ValueOfBase<B extends string> = B extends `${string}|${string}`
  ? Split<B>
  : B extends `int${'' | `:${string}`}` | `number${'' | `:${string}`}`
    ? number
    : B extends 'bool'
      ? boolean
      : B extends 'player'
        ? PersonRef
        : B extends 'team'
          ? 'a' | 'b'
          : string;
type ValueOfObject<O extends ArgObject> = O['type'] extends 'int' | 'number'
  ? number
  : O['type'] extends 'bool'
    ? boolean
    : O['type'] extends 'player'
      ? PersonRef
      : O['type'] extends 'team'
        ? 'a' | 'b'
        : O['type'] extends 'choice'
          ? O['choices'] extends readonly (infer C)[]
            ? C
            : string
          : string;
type ValueOf<S> = S extends string
  ? S extends `${string}=${string}`
    ? ValueOfBase<Base<S>>
    : S extends `${string}?`
      ? ValueOfBase<Base<S>> | null
      : ValueOfBase<S>
  : S extends ArgObject
    ? S extends { default: unknown }
      ? ValueOfObject<S>
      : S extends { optional: true }
        ? ValueOfObject<S> | null
        : ValueOfObject<S>
    : unknown;

/** os args que o handler recebe, tipados pela define */
export type ArgsOf<D> = D extends { parse: (input: ParseInput) => infer R }
  ? R
  : D extends { args: infer A }
    ? { -readonly [K in keyof A]: ValueOf<A[K]> }
    : Record<string, never>;

/** o que o handler recebe */
export interface CommandContext<Args = Record<string, unknown>> {
  /** quem mandou */
  player: CommandPlayer;
  /** os argumentos já convertidos */
  args: Args;
  /** o nome registrado (sem o prefixo) */
  command: string;
  /** o que a pessoa digitou no lugar do nome (o próprio nome ou um atalho) */
  alias: string;
  /** o texto depois do nome, em palavras e inteiro */
  words: string[];
  rest: string;
  /** responde pra quem mandou */
  reply(text: string): unknown;
}

/** devolver false = não contou (o cooldown não começa) */
export type CommandHandler<Args = Record<string, unknown>> = (
  ctx: CommandContext<Args>,
) => unknown | Promise<unknown>;

/** o motivo de um argumento ruim: o parse próprio lança isto, e a pessoa recebe a resposta de uso */
export class CommandError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'CommandError';
  }
}

/** o que fazer com uma mensagem: rodar um comando (e depois dizer se contou) ou responder */
export type CommandMatch =
  | {
      kind: 'run';
      command: string;
      alias: string;
      args: Record<string, unknown>;
      words: string[];
      rest: string;
      /** fecha o uso: counted false devolve o cooldown */
      finish(counted: boolean): void;
      /** a resposta de uso com o motivo (o CommandError que o handler lançou) */
      usage(reason: string): string;
    }
  | { kind: 'reply'; replies: string[] };

/** a entrada de match: a mensagem, quem mandou, o relógio (ms) e quem está na sala (pro argumento player) */
export interface MatchInput {
  text: string;
  player: CommandPlayer;
  now: number;
  players?: readonly PersonRef[];
}

// --- a implementação ---

interface ParsedArg {
  name: string;
  type: ArgType | 'choice';
  min: number | null;
  max: number | null;
  choices: string[];
  optional: boolean;
  hasDefault: boolean;
  default: unknown;
}

interface Registered {
  name: string;
  define: CommandDefine;
  args: ParsedArg[];
  handler: CommandHandler<never>;
  // os relógios do cooldown: até quando cada pessoa (e a sala) espera
  players: Map<string, number>;
  room: number;
}

interface Resolved {
  prefix: string;
  help: boolean;
  cooldown: Required<CooldownOptions>;
  permission: Permission;
  messages: Required<CommandMessages>;
}

const NAME = /^[a-z0-9_-]{1,24}$/;
const HELP_NAMES = ['ajuda', 'help', 'comandos'];
const TYPES: readonly string[] = ['int', 'number', 'text', 'rest', 'bool', 'player', 'team'];
const TRUE_WORDS = ['sim', 's', 'yes', 'y', 'true', '1', 'on', 'liga'];
const FALSE_WORDS = ['não', 'nao', 'n', 'no', 'false', '0', 'off', 'desliga'];
const MAX_CHAT = 200;

const cooldownOf = (c: number | CooldownOptions | undefined): CooldownOptions =>
  typeof c === 'number' ? { player: c } : (c ?? {});

/** o número como a pessoa lê (vírgula decimal) */
const show = (n: number) => String(n).replace('.', ',');

/** 9s, 1min, 1min 5s (sempre arredondando pra cima: "espere 1s" e não "0s") */
export function formatWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m}min ${s % 60}s` : `${m}min`;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);
}

function devError(command: string, problem: string): Error {
  return new Error(`comando !${command}: ${problem}`);
}

/** a forma curta ou o objeto, na forma completa (erro de dev diz o que está errado e o jeito certo) */
export function parseArgSpec(command: string, name: string, spec: ArgSpec): ParsedArg {
  if (typeof spec !== 'string') {
    const type = spec.type;
    if (type !== 'choice' && !TYPES.includes(type))
      throw devError(
        command,
        `o tipo de "${name}" (${String(type)}) não existe; use ${TYPES.join(', ')} ou choice`,
      );
    if (type === 'choice' && !spec.choices?.length)
      throw devError(command, `"${name}" é choice e precisa de choices: ['a', 'b']`);
    const hasDefault = spec.default !== undefined;
    return {
      name,
      type,
      min: spec.min ?? null,
      max: spec.max ?? null,
      choices: [...(spec.choices ?? [])],
      optional: hasDefault || spec.optional === true,
      hasDefault,
      default: spec.default ?? null,
    };
  }
  let base = spec.trim();
  let rawDefault: string | null = null;
  const eq = base.indexOf('=');
  if (eq >= 0) {
    rawDefault = base.slice(eq + 1);
    base = base.slice(0, eq);
  }
  let optional = rawDefault !== null;
  if (base.endsWith('?')) {
    optional = true;
    base = base.slice(0, -1);
  }
  const arg: ParsedArg = {
    name,
    type: 'text',
    min: null,
    max: null,
    choices: [],
    optional,
    hasDefault: false,
    default: null,
  };
  if (base.includes('|')) {
    arg.type = 'choice';
    arg.choices = base.split('|').map((c) => c.trim());
    if (arg.choices.some((c) => !c)) throw devError(command, `"${name}": opção vazia em '${spec}'`);
  } else {
    const colon = base.indexOf(':');
    const type = colon < 0 ? base : base.slice(0, colon);
    if (!TYPES.includes(type))
      throw devError(
        command,
        `o tipo de "${name}" ('${spec}') não existe; use ${TYPES.join(', ')}, ou opções como 'azul|vermelho'`,
      );
    arg.type = type as ArgType;
    if (colon >= 0) {
      const m = /^(-?\d+(?:\.\d+)?)?\.\.(-?\d+(?:\.\d+)?)?$/.exec(base.slice(colon + 1));
      if (!m || (m[1] === undefined && m[2] === undefined) || !['int', 'number', 'text'].includes(type))
        throw devError(
          command,
          `faixa inválida em "${name}" ('${spec}'); o jeito é 'int:1..20', 'int:1..' ou 'int:..20'`,
        );
      arg.min = m[1] === undefined ? null : Number(m[1]);
      arg.max = m[2] === undefined ? null : Number(m[2]);
    }
  }
  if (rawDefault !== null) {
    if (arg.type === 'player' || arg.type === 'rest')
      throw devError(command, `"${name}" (${arg.type}) não aceita valor padrão; use '?' pra deixar opcional`);
    const v = convert(arg, rawDefault);
    if (typeof v === 'object' && v !== null && 'reason' in v)
      throw devError(command, `o padrão de "${name}" ('${rawDefault}') não vale: ${v.reason}`);
    arg.hasDefault = true;
    arg.default = v;
  }
  return arg;
}

function rangeText(arg: ParsedArg): string {
  if (arg.min !== null && arg.max !== null) return ` de ${show(arg.min)} a ${show(arg.max)}`;
  if (arg.min !== null) return ` a partir de ${show(arg.min)}`;
  if (arg.max !== null) return ` até ${show(arg.max)}`;
  return '';
}

/** o que o argumento espera, pra resposta de valor inválido */
function expectText(arg: ParsedArg): string {
  switch (arg.type) {
    case 'int':
      return `um número inteiro${rangeText(arg)}`;
    case 'number':
      return `um número${rangeText(arg)}`;
    case 'text':
      return arg.min === null && arg.max === null ? 'um texto' : `um texto${rangeText(arg)} letras`;
    case 'bool':
      return 'sim ou não';
    case 'team':
      return 'a ou b';
    default:
      return `uma destas opções: ${arg.choices.join(', ')}`;
  }
}

const inRange = (arg: ParsedArg, n: number) =>
  (arg.min === null || n >= arg.min) && (arg.max === null || n <= arg.max);

type Converted = unknown | { reason: string };

/** uma palavra no valor do argumento (o player é resolvido à parte, porque precisa de quem está na sala) */
function convert(arg: ParsedArg, word: string): Converted {
  const bad = { reason: `Valor inválido pra ${arg.name}: ${expectText(arg)}` };
  const lower = word.toLowerCase();
  switch (arg.type) {
    case 'int': {
      if (!/^[+-]?\d{1,15}$/.test(word)) return bad;
      const n = Number(word);
      return inRange(arg, n) ? n : bad;
    }
    case 'number': {
      if (!/^[+-]?\d{1,15}([.,]\d{1,15})?$/.test(word)) return bad;
      const n = Number(word.replace(',', '.'));
      return inRange(arg, n) ? n : bad;
    }
    case 'text': {
      const len = [...word].length;
      return inRange(arg, len) ? word : bad;
    }
    case 'bool':
      if (TRUE_WORDS.includes(lower)) return true;
      if (FALSE_WORDS.includes(lower)) return false;
      return bad;
    case 'team':
      return lower === 'a' || lower === 'b' ? lower : bad;
    case 'choice':
      return arg.choices.find((c) => c.toLowerCase() === lower) ?? bad;
    default:
      return word;
  }
}

/** #id, @nick, nick (sem diferença de maiúscula) ou o começo do nick, se só um combinar */
function findPlayer(word: string, players: readonly PersonRef[]): PersonRef | { reason: string } {
  const ref = (p: PersonRef): PersonRef => ({ id: p.id, nick: p.nick, accountId: p.accountId });
  if (/^#\d+$/.test(word)) {
    const id = Number(word.slice(1));
    const p = players.find((x) => x.id === id);
    return p ? ref(p) : { reason: `Ninguém na sala com o id ${word}` };
  }
  const typed = word.startsWith('@') ? word.slice(1) : word;
  const lower = typed.toLowerCase();
  const exact = players.find((p) => p.nick.toLowerCase() === lower);
  if (exact) return ref(exact);
  const starts = players.filter((p) => p.nick.toLowerCase().startsWith(lower));
  if (starts.length === 1) return ref(starts[0]!);
  if (starts.length > 1) {
    const names = starts.slice(0, 5).map((p) => p.nick);
    return {
      reason: `Mais de um jogador combina com "${typed}": ${names.join(', ')}${starts.length > 5 ? '...' : ''}`,
    };
  }
  return { reason: `Ninguém na sala com o nick "${typed}"` };
}

/** as palavras do texto, com onde cada uma começa (o rest guarda o espaçamento original) */
function splitWords(text: string): { word: string; start: number }[] {
  const out: { word: string; start: number }[] = [];
  const re = /\S+/g;
  for (let m = re.exec(text); m; m = re.exec(text)) out.push({ word: m[0], start: m.index });
  return out;
}

const usageOf = (prefix: string, c: Registered) =>
  [
    `${prefix}${c.name}`,
    ...c.args.map((a) => {
      const label = a.type === 'rest' ? `${a.name}...` : a.name;
      return a.optional ? `[${label}]` : `<${label}>`;
    }),
  ].join(' ');

const roleRank: Record<Role, number> = { player: 0, staff: 1, owner: 2 };
const permissionRank: Record<Permission, number> = { all: 0, staff: 1, owner: 2 };

/** os comandos de uma sala (ou de um bot): registra, decide o que cada mensagem é e guarda os cooldowns */
export class Commands {
  private base: CommandDefaults = {};
  private readonly list: Registered[] = [];
  private readonly byName = new Map<string, Registered>();

  /** os padrões de todos os comandos (a define de cada um sobrescreve campo a campo) */
  defaults(defaults: CommandDefaults): this {
    if (defaults.prefix !== undefined && !/^\S{1,3}$/.test(defaults.prefix))
      throw new Error(
        `defaults: prefix tem que ter de 1 a 3 caracteres sem espaço (veio '${defaults.prefix}')`,
      );
    this.base = {
      ...this.base,
      ...defaults,
      cooldown: { ...cooldownOf(this.base.cooldown), ...cooldownOf(defaults.cooldown) },
      messages: { ...this.base.messages, ...defaults.messages },
    };
    return this;
  }

  /**
   * Registra um comando; o mesmo nome de novo substitui o anterior.
   *   commands.add('regras', (ctx) => ctx.reply('...'))
   *   commands.add('gols', { args: { n: 'int:1..20' }, cooldown: 10 }, (ctx) => ctx.args.n)
   */
  add(name: string, handler: CommandHandler<Record<string, never>>): this;
  add<const D extends CommandDefine>(name: string, define: D, handler: CommandHandler<ArgsOf<D>>): this;
  add(
    name: string,
    defineOrHandler: CommandDefine | CommandHandler<never>,
    maybeHandler?: CommandHandler<never>,
  ): this {
    const define = typeof defineOrHandler === 'function' ? {} : defineOrHandler;
    const handler = typeof defineOrHandler === 'function' ? defineOrHandler : maybeHandler;
    const n = normalizeName(name);
    if (!NAME.test(n))
      throw new Error(`nome de comando inválido: '${name}' (letras minúsculas, números, _ ou -, até 24)`);
    if (typeof handler !== 'function')
      throw devError(n, "a função do comando está faltando: add('nome', define, (ctx) => { ... })");
    const args = Object.entries(define.args ?? {}).map(([k, spec]) => parseArgSpec(n, k, spec));
    const restAt = args.findIndex((a) => a.type === 'rest');
    if (restAt >= 0 && restAt !== args.length - 1)
      throw devError(n, `"${args[restAt]!.name}" é rest (o resto da linha) e tem que ser o último argumento`);
    const aliases = (define.aliases ?? []).map(normalizeName);
    for (const a of aliases)
      if (!NAME.test(a))
        throw devError(n, `atalho inválido: '${a}' (letras minúsculas, números, _ ou -, até 24)`);
    const old = this.byName.get(n);
    if (old) this.remove(old);
    const c: Registered = {
      name: n,
      define: { ...define, aliases },
      args,
      handler,
      players: new Map(),
      room: 0,
    };
    this.list.push(c);
    for (const key of [n, ...aliases]) this.byName.set(key, c);
    return this;
  }

  /** os nomes registrados (sem prefixo), na ordem */
  names(): string[] {
    return this.list.map((c) => c.name);
  }

  private remove(c: Registered): void {
    this.list.splice(this.list.indexOf(c), 1);
    for (const [k, v] of this.byName) if (v === c) this.byName.delete(k);
  }

  private resolve(c: Registered | null): Resolved {
    const d = c?.define ?? {};
    return {
      prefix: this.base.prefix ?? '!',
      help: this.base.help ?? true,
      cooldown: {
        player: 0,
        room: 0,
        exemptStaff: true,
        ...cooldownOf(this.base.cooldown),
        ...cooldownOf(d.cooldown),
      },
      permission: d.permission ?? this.base.permission ?? 'all',
      messages: { ...DEFAULT_MESSAGES, ...this.base.messages, ...d.messages },
    };
  }

  /** decide o que a mensagem é: null = não é comando daqui */
  match(input: MatchInput): CommandMatch | null {
    const { prefix } = this.resolve(null);
    const text = input.text.trim();
    if (!text.startsWith(prefix)) return null;
    const words = splitWords(text.slice(prefix.length));
    const first = words[0];
    if (first?.start !== 0) return null;
    const alias = first.word.toLowerCase();
    const after = text.slice(prefix.length);
    const restWords = words.slice(1);
    const rest = restWords.length ? after.slice(restWords[0]!.start).trim() : '';
    const c = this.byName.get(alias);
    if (!c) return this.helpFor(alias, input, restWords);

    const r = this.resolve(c);
    const values = {
      command: `${r.prefix}${c.name}`,
      nick: input.player.nick,
      usage: usageOf(r.prefix, c),
    };
    const reply = (template: string, extra: Record<string, string>): CommandMatch => ({
      kind: 'reply',
      replies: [fill(template, { ...values, ...extra })],
    });

    if (roleRank[input.player.role] < permissionRank[r.permission])
      return reply(r.messages.permission, { who: r.permission === 'owner' ? 'o dono da sala' : 'a staff' });

    let args: Record<string, unknown>;
    const plain = restWords.map((w) => w.word);
    try {
      args = c.define.parse
        ? (c.define.parse({
            rest,
            words: plain,
            player: input.player,
            players: input.players ?? [],
          }) as Record<string, unknown>)
        : this.parseArgs(c, restWords, after, input.players ?? []);
    } catch (err) {
      if (err instanceof CommandError) return reply(r.messages.usage, { reason: err.message });
      throw err;
    }

    const staff = roleRank[input.player.role] >= roleRank.staff;
    const cd = r.cooldown;
    const key = input.player.accountId
      ? `acc:${input.player.accountId}`
      : `nick:${input.player.nick.toLowerCase()}`;
    if (!(staff && cd.exemptStaff)) {
      const waits = [(c.players.get(key) ?? 0) - input.now, c.room - input.now];
      const wait = waits.find((w) => w > 0);
      if (wait !== undefined) return reply(r.messages.cooldown, { left: formatWait(wait) });
    }
    // o cooldown começa já (dois !comando seguidos não passam juntos) e volta atrás se o handler não contar
    const before = { player: c.players.get(key), room: c.room };
    const counts = !(staff && cd.exemptStaff);
    if (counts) {
      if (cd.player > 0) c.players.set(key, input.now + cd.player * 1000);
      if (cd.room > 0) c.room = input.now + cd.room * 1000;
    }
    return {
      kind: 'run',
      command: c.name,
      alias,
      args,
      words: plain,
      rest,
      usage: (reason) => fill(r.messages.usage, { ...values, reason }),
      finish: (counted) => {
        if (counted || !counts) return;
        if (before.player === undefined) c.players.delete(key);
        else c.players.set(key, before.player);
        c.room = before.room;
      },
    };
  }

  /**
   * Roda a mensagem: responde (reply) ou chama o handler do comando e fecha o cooldown. Devolve se era comando.
   * O handler que lança CommandError vira a resposta de uso (e não conta); outro erro devolve o cooldown e sobe.
   */
  async dispatch(input: MatchInput, reply: (text: string) => unknown): Promise<boolean> {
    const m = this.match(input);
    if (!m) return false;
    if (m.kind === 'reply') {
      for (const text of m.replies) await reply(text);
      return true;
    }
    let counted = false;
    try {
      counted = (await this.handlerOf(m)(this.context(m, input, reply))) !== false;
    } catch (err) {
      if (!(err instanceof CommandError)) throw err;
      await reply(m.usage(err.message));
    } finally {
      m.finish(counted);
    }
    return true;
  }

  /** o mesmo dispatch, sem Promise: pra quem roda sem fila de tarefas (o script do painel). Handler async é erro */
  dispatchSync(input: MatchInput, reply: (text: string) => unknown): boolean {
    const m = this.match(input);
    if (!m) return false;
    if (m.kind === 'reply') {
      for (const text of m.replies) reply(text);
      return true;
    }
    let counted = false;
    try {
      const result = this.handlerOf(m)(this.context(m, input, reply));
      if (result instanceof Promise) throw devError(m.command, 'aqui o handler não pode ser async');
      counted = result !== false;
    } catch (err) {
      if (!(err instanceof CommandError)) throw err;
      reply(m.usage(err.message));
    } finally {
      m.finish(counted);
    }
    return true;
  }

  /** tudo que dispara um comando daqui, com o prefixo: nomes, atalhos e o !ajuda embutido (o servidor esconde) */
  triggers(): string[] {
    const r = this.resolve(null);
    const out = [...this.byName.keys()];
    if (r.help) for (const h of HELP_NAMES) if (!this.byName.has(h)) out.push(h);
    return out.map((n) => r.prefix + n);
  }

  private handlerOf(m: { command: string }): CommandHandler {
    return this.byName.get(m.command)!.handler as CommandHandler;
  }

  private context(
    m: Extract<CommandMatch, { kind: 'run' }>,
    input: MatchInput,
    reply: (text: string) => unknown,
  ): CommandContext {
    return {
      player: input.player,
      args: m.args,
      command: m.command,
      alias: m.alias,
      words: m.words,
      rest: m.rest,
      reply,
    };
  }

  private parseArgs(
    c: Registered,
    words: { word: string; start: number }[],
    after: string,
    players: readonly PersonRef[],
  ): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    let i = 0;
    for (const arg of c.args) {
      if (arg.type === 'rest') {
        const value = i < words.length ? after.slice(words[i]!.start).trim() : '';
        i = words.length;
        if (value) args[arg.name] = value;
        else if (arg.optional) args[arg.name] = null;
        else throw new CommandError(`Faltou ${arg.name}`);
        continue;
      }
      const w = words[i++];
      if (!w) {
        if (!arg.optional) throw new CommandError(`Faltou ${arg.name}`);
        args[arg.name] = arg.hasDefault ? arg.default : null;
        continue;
      }
      const v = arg.type === 'player' ? findPlayer(w.word, players) : convert(arg, w.word);
      if (typeof v === 'object' && v !== null && 'reason' in v)
        throw new CommandError((v as { reason: string }).reason);
      args[arg.name] = v;
    }
    return args;
  }

  /** o !ajuda embutido (quando não é um comando registrado com esse nome) */
  private helpFor(alias: string, input: MatchInput, words: { word: string }[]): CommandMatch | null {
    const r = this.resolve(null);
    if (!r.help || !HELP_NAMES.includes(alias)) return null;
    const p = r.prefix;
    const canUse = (c: Registered) =>
      !c.define.hidden && roleRank[input.player.role] >= permissionRank[this.resolve(c).permission];
    const asked = words[0]?.word;
    if (asked) {
      const name = normalizeName(asked.startsWith(p) ? asked.slice(p.length) : asked);
      const c = this.byName.get(name);
      if (!c || !canUse(c))
        return { kind: 'reply', replies: [`Não tem o comando ${p}${name}. Use ${p}ajuda pra ver a lista.`] };
      const cd = this.resolve(c).cooldown;
      let line = usageOf(p, c);
      if (c.define.description) line += `: ${c.define.description}`;
      if (c.define.aliases?.length) line += ` Atalhos: ${c.define.aliases.map((a) => p + a).join(', ')}.`;
      if (cd.player > 0) line += ` Espera: ${formatWait(cd.player * 1000)}.`;
      return { kind: 'reply', replies: [line] };
    }
    const names = this.list.filter(canUse).map((c) => p + c.name);
    return { kind: 'reply', replies: chunkList(names, ` Pra ver como usar um: ${p}ajuda <comando>`) };
  }
}

/** "Comandos: !a, !b." em linhas de até 200 caracteres, com o rodapé na última se couber */
function chunkList(names: string[], footer: string): string[] {
  const lines: string[] = [];
  let cur = 'Comandos:';
  names.forEach((n, i) => {
    const token = n + (i < names.length - 1 ? ',' : '.');
    const next = cur ? `${cur} ${token}` : token;
    if ([...next].length > MAX_CHAT) {
      lines.push(cur);
      cur = token;
    } else cur = next;
  });
  if (!names.length) cur = 'Comandos: nenhum.';
  if ([...(cur + footer)].length <= MAX_CHAT) lines.push(cur + footer);
  else lines.push(cur, footer.trim());
  return lines;
}

/** o nome sem diferença de maiúscula, e com ou sem o "!" na frente */
function normalizeName(name: string): string {
  const n = String(name).trim().toLowerCase();
  return n.startsWith('!') ? n.slice(1) : n;
}
