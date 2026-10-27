// O cliente do bot de sala: abre o WebSocket /v1/rooms/{roomId}/bot, autentica pela primeira mensagem (funciona no
// navegador e no WebSocket do Node, que não mandam cabeçalho), entrega os eventos tipados pelo `type` e manda os
// comandos com `ref`, esperando o result de cada um. Caiu, volta sozinho com espera crescente; auth recusada não volta.

import {
  type ArgsOf,
  type CommandDefaults,
  type CommandDefine,
  type CommandHandler,
  Commands,
  type PersonRef,
} from './commands.js';
import {
  type AuthMessage,
  BOT_PROTOCOL,
  type ErrorMessage,
  type ReadyMessage,
  type RoomCommand,
  type RoomEvent,
  type ServerMessage,
} from './generated/protocol.js';

export type RoomEventType = RoomEvent['type'];
export type RoomEventOf<K extends RoomEventType> = Extract<RoomEvent, { type: K }>;
export type RoomCommandType = RoomCommand['type'];
export type RoomCommandOf<K extends RoomCommandType> = Extract<RoomCommand, { type: K }>;

/** o mínimo de WebSocket que o cliente usa: o global do navegador e do Node 22 servem, e o teste injeta um falso */
export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}
export type WebSocketConstructor = new (url: string) => WebSocketLike;

export interface ReconnectOptions {
  /** a primeira espera depois de cair (dobra a cada tentativa) */
  initialDelayMs?: number;
  maxDelayMs?: number;
  /** desiste depois de tantas tentativas seguidas sem ready; Infinity = nunca */
  maxAttempts?: number;
}

export interface RoomBotOptions {
  /** onde a API responde: http://localhost:8092 no dev, https://<site>/api em produção */
  baseUrl: string;
  roomId: string;
  /** a chave da comunidade com o escopo rooms:control (amb_...) */
  key: string;
  /** false desliga a reconexão */
  reconnect?: ReconnectOptions | false;
  /** quanto esperar o result de um comando antes de desistir */
  commandTimeoutMs?: number;
  /** outro WebSocket (o pacote ws, num Node antigo); sem, o global */
  WebSocket?: WebSocketConstructor;
}

/** o fechamento do socket, e se o cliente vai tentar de novo */
export interface CloseInfo {
  code: number;
  reason: string;
  willReconnect: boolean;
}

/** os eventos de RoomBot.on: os da sala, pelo nome, e os do próprio canal */
export type RoomBotEvents = { [K in RoomEventType]: RoomEventOf<K> } & {
  /** auth aceita (a cada conexão, inclusive depois de reconectar), com a sala e o estado ao vivo */
  ready: ReadyMessage;
  /** qualquer evento da sala */
  event: RoomEvent;
  /** qualquer mensagem do servidor, crua (pra log ou pra conferir contra o schema) */
  message: ServerMessage;
  /** erro mandado pelo servidor (auth recusada, JSON inválido) */
  error: ErrorMessage;
  close: CloseInfo;
  /** um handler de comando lançou erro (sem ouvinte, vai pro console.error) */
  commandError: { command: string; error: unknown };
  reconnecting: { attempt: number; delayMs: number };
  /** o cliente parou de vez: auth recusada, sala inválida ou tentativas esgotadas */
  fatal: RoomBotError;
};

/** o erro de um comando (o code e a mensagem do result) ou do canal */
export class RoomBotError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RoomBotError';
  }
}

/** códigos do error que não melhoram tentando de novo (chave errada, sem escopo, sala de outra comunidade) */
const PERMANENT_ERRORS = new Set(['unauthorized', 'forbidden', 'not_found']);
const OPEN = 1;

interface Pending {
  resolve: () => void;
  reject: (err: RoomBotError) => void;
  timer: ReturnType<typeof setTimeout>;
}

type Listener<T> = (payload: T) => unknown;

/** a URL do WebSocket a partir do endereço da API (http vira ws, https vira wss; o prefixo /api fica) */
export function botUrl(baseUrl: string, roomId: string): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
  const path = BOT_PROTOCOL.path.replace('{roomId}', encodeURIComponent(roomId));
  url.pathname = `${url.pathname.replace(/\/$/, '')}${path}`;
  return url.toString();
}

export class RoomBot {
  private readonly url: string;
  private readonly key: string;
  private readonly reconnect: Required<ReconnectOptions> | null;
  private readonly commandTimeoutMs: number;
  private readonly Socket: WebSocketConstructor;
  private readonly listeners = new Map<keyof RoomBotEvents, Set<Listener<never>>>();
  private readonly pending = new Map<string, Pending>();
  private socket: WebSocketLike | null = null;
  private nextRef = 1;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private lastError: ErrorMessage | null = null;
  private isReady = false;
  private firstReady: { resolve: (r: ReadyMessage) => void; reject: (e: RoomBotError) => void } | null = null;
  private readonly roster = new Map<number, PersonRef>();
  /** o sistema de comandos do chat (!gols...): bot.command() e bot.commandDefaults() usam este */
  readonly commands = new Commands();

  constructor(options: RoomBotOptions) {
    this.url = botUrl(options.baseUrl, options.roomId);
    this.key = options.key;
    this.reconnect =
      options.reconnect === false
        ? null
        : {
            initialDelayMs: options.reconnect?.initialDelayMs ?? 1000,
            maxDelayMs: options.reconnect?.maxDelayMs ?? 30_000,
            maxAttempts: options.reconnect?.maxAttempts ?? Number.POSITIVE_INFINITY,
          };
    this.commandTimeoutMs = options.commandTimeoutMs ?? 10_000;
    const Socket = options.WebSocket ?? (globalThis as { WebSocket?: WebSocketConstructor }).WebSocket;
    if (!Socket) throw new Error('sem WebSocket global (Node 22+ ou navegador); passe options.WebSocket');
    this.Socket = Socket;
    this.watchRoom();
  }

  /** quem está na sala (pro argumento `player` dos comandos) e o despacho dos comandos do chat */
  private watchRoom(): void {
    this.on('ready', (r) => {
      this.roster.clear();
      for (const p of r.live?.players ?? [])
        this.roster.set(p.id, { id: p.id, nick: p.nick, accountId: p.accountId });
    });
    this.on('player.joined', (e) => this.roster.set(e.player.id, e.player));
    this.on('player.left', (e) => this.roster.delete(e.player.id));
    this.on('chat.message', (e) => {
      if (!e.player) return;
      const player = { ...e.player, role: e.role ?? 'player' };
      this.commands
        .dispatch({ text: e.text, player, now: Date.now(), players: [...this.roster.values()] }, (text) =>
          this.chat(text).catch(() => {}),
        )
        .catch((error: unknown) => {
          const info = { command: e.text.trim().split(/\s+/, 1)[0] ?? '', error };
          if (this.listeners.get('commandError')?.size) this.emit('commandError', info);
          else console.error(`amebas: erro no comando ${info.command}`, error);
        });
    });
  }

  /**
   * Registra um comando do chat. O caso simples cabe numa linha; arg errado, cooldown e permissão respondem sozinhos.
   *   bot.command('regras', (ctx) => ctx.reply('Sem xingar.'))
   *   bot.command('gols', { args: { n: 'int:1..20' }, cooldown: 10, permission: 'staff' }, (ctx) => ctx.reply(`${ctx.args.n} gols`))
   * A define é um objeto simples: guarde numa const e espalhe ({ ...STAFF, args }).
   */
  command(name: string, handler: CommandHandler<Record<string, never>>): this;
  command<const D extends CommandDefine>(name: string, define: D, handler: CommandHandler<ArgsOf<D>>): this;
  command(
    name: string,
    defineOrHandler: CommandDefine | CommandHandler<never>,
    handler?: CommandHandler<never>,
  ): this {
    if (typeof defineOrHandler === 'function') this.commands.add(name, defineOrHandler as never);
    else this.commands.add(name, defineOrHandler, handler as never);
    return this;
  }

  /** os padrões de todos os comandos: bot.commandDefaults({ cooldown: 3, permission: 'all' }) */
  commandDefaults(defaults: CommandDefaults): this {
    this.commands.defaults(defaults);
    return this;
  }

  /** se a auth já foi aceita nesta conexão (comandos só saem com ela) */
  get ready(): boolean {
    return this.isReady;
  }

  /** escuta um evento; devolve a função que para de escutar */
  on<K extends keyof RoomBotEvents>(type: K, fn: Listener<RoomBotEvents[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn as Listener<never>);
    return () => set.delete(fn as Listener<never>);
  }

  /** conecta e resolve no primeiro ready; rejeita se a auth for recusada (ou o cliente desistir) */
  connect(): Promise<ReadyMessage> {
    if (this.firstReady || this.socket)
      return Promise.reject(new RoomBotError('busy', 'o bot já está conectando'));
    this.stopped = false;
    const promise = new Promise<ReadyMessage>((resolve, reject) => {
      this.firstReady = { resolve, reject };
    });
    this.open();
    return promise;
  }

  /** fecha de vez, sem reconectar; os comandos esperando result são rejeitados */
  close(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.socket?.close(1000, 'bot saiu');
    this.dropSocket();
    this.failPending('closed', 'o bot fechou a conexão');
  }

  /** manda um comando da sala e espera o result: resolve com ok, rejeita com o code do servidor (invalid, permission...) */
  send(command: RoomCommand): Promise<void> {
    const socket = this.socket;
    if (!socket || !this.isReady || socket.readyState !== OPEN)
      return Promise.reject(new RoomBotError('not_connected', 'o bot não está conectado (espere o ready)'));
    const ref = `c${this.nextRef++}`;
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(ref);
        reject(new RoomBotError('timeout', `o comando ${command.type} ficou sem resposta`));
      }, this.commandTimeoutMs);
      this.pending.set(ref, { resolve, reject, timer });
      this.sendRaw({ ...command, ref });
    });
  }

  // os atalhos dos comandos mais usados; o resto vai pelo command()
  chat(text: string): Promise<void> {
    return this.send({ type: 'chat', text });
  }
  kick(playerId: number): Promise<void> {
    return this.send({ type: 'kick', playerId });
  }
  ban(playerId: number, scope: 'room' | 'community' = 'room'): Promise<void> {
    return this.send({ type: 'ban', playerId, scope });
  }
  mute(playerId: number, muted = true): Promise<void> {
    return this.send({ type: 'mute', playerId, muted });
  }
  move(playerId: number, to: 'a' | 'b' | 'stands'): Promise<void> {
    return this.send({ type: 'move', playerId, to });
  }
  start(): Promise<void> {
    return this.send({ type: 'start' });
  }
  stop(): Promise<void> {
    return this.send({ type: 'stop' });
  }
  pause(paused?: boolean): Promise<void> {
    return this.send(paused === undefined ? { type: 'pause' } : { type: 'pause', paused });
  }

  private emit<K extends keyof RoomBotEvents>(type: K, payload: RoomBotEvents[K]): void {
    for (const fn of this.listeners.get(type) ?? []) {
      try {
        const result = (fn as Listener<RoomBotEvents[K]>)(payload) as unknown;
        // handler async que falha não derruba o processo: o erro vai pro console, com o nome do evento
        if (result instanceof Promise)
          result.catch((err: unknown) => console.error(`amebas: erro no handler de ${type}`, err));
      } catch (err) {
        console.error(`amebas: erro no handler de ${type}`, err);
      }
    }
  }

  private sendRaw(message: AuthMessage | (RoomCommand & { ref?: string })): void {
    this.socket?.send(JSON.stringify(message));
  }

  private open(): void {
    this.lastError = null;
    const socket = new this.Socket(this.url);
    this.socket = socket;
    socket.onopen = () => this.sendRaw({ type: 'auth', key: this.key });
    socket.onmessage = (ev) => this.receive(ev.data);
    // o close vem logo depois do error; quem decide reconectar é ele
    socket.onerror = () => {};
    socket.onclose = (ev) => this.closed(ev.code, ev.reason);
  }

  private dropSocket(): void {
    if (this.socket) {
      this.socket.onopen = this.socket.onmessage = this.socket.onclose = this.socket.onerror = null;
    }
    this.socket = null;
    this.isReady = false;
  }

  private receive(data: unknown): void {
    let message: ServerMessage;
    try {
      message = JSON.parse(String(data)) as ServerMessage;
    } catch {
      return;
    }
    this.emit('message', message);
    switch (message.type) {
      case 'ready':
        this.isReady = true;
        this.attempt = 0;
        this.firstReady?.resolve(message);
        this.firstReady = null;
        this.emit('ready', message);
        return;
      case 'result': {
        const p = message.ref === undefined ? undefined : this.pending.get(message.ref);
        if (!p || message.ref === undefined) return;
        this.pending.delete(message.ref);
        clearTimeout(p.timer);
        if (message.ok) p.resolve();
        else p.reject(new RoomBotError(message.code ?? 'error', message.message ?? 'comando recusado'));
        return;
      }
      case 'error':
        this.lastError = message;
        this.emit('error', message);
        return;
      default:
        // os eventos da sala: o nome exato e o "event" genérico
        this.emit(message.type, message as never);
        this.emit('event', message);
    }
  }

  private closed(code: number, reason: string): void {
    this.dropSocket();
    this.failPending('disconnected', 'a conexão caiu antes do result');
    if (this.stopped) return;
    const fatal = this.fatalReason(code);
    const retry = this.reconnect;
    if (fatal || !retry || this.attempt >= retry.maxAttempts) {
      this.emit('close', { code, reason, willReconnect: false });
      this.giveUp(
        fatal ?? new RoomBotError('disconnected', `conexão fechada (${code}${reason ? `: ${reason}` : ''})`),
      );
      return;
    }
    this.emit('close', { code, reason, willReconnect: true });
    // espera crescente com sorteio (metade fixa, metade aleatória): muitos bots não voltam todos no mesmo instante
    const base = Math.min(retry.maxDelayMs, retry.initialDelayMs * 2 ** this.attempt);
    const delayMs = Math.round(base / 2 + (Math.random() * base) / 2);
    this.attempt++;
    this.emit('reconnecting', { attempt: this.attempt, delayMs });
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.stopped) this.open();
    }, delayMs);
  }

  /** o fechamento que não adianta repetir: sala inválida, ou auth recusada por chave/escopo/sala */
  private fatalReason(code: number): RoomBotError | null {
    if (code === BOT_PROTOCOL.closeCodes.invalidRoom)
      return new RoomBotError('invalid', 'id de sala inválido');
    const err = this.lastError;
    if (code === BOT_PROTOCOL.closeCodes.unauthorized && err && PERMANENT_ERRORS.has(err.code))
      return new RoomBotError(err.code, err.message);
    return null;
  }

  private giveUp(err: RoomBotError): void {
    this.stopped = true;
    this.firstReady?.reject(err);
    this.firstReady = null;
    this.emit('fatal', err);
  }

  private failPending(code: string, message: string): void {
    for (const [ref, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new RoomBotError(code, message));
      this.pending.delete(ref);
    }
  }
}
