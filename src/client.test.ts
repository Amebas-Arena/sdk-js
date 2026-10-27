// O cliente contra um WebSocket falso: auth pela primeira mensagem, ready, eventos tipados, comandos com ref e result,
// comandos do chat (!gols) respondendo pelo chat, e a reconexão (cai, volta; auth recusada não volta).
import { describe, expect, it } from 'vitest';
import { botUrl, RoomBot, RoomBotError, type WebSocketLike } from './client.js';

class FakeSocket implements WebSocketLike {
  static all: FakeSocket[] = [];
  readyState = 1;
  sent: Record<string, unknown>[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.all.push(this);
    queueMicrotask(() => this.onopen?.({}));
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {}
  push(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  drop(code = 1006, reason = '') {
    this.onclose?.({ code, reason });
  }
}

const room = { id: 'r1' } as never;
const ready = (players: unknown[] = []) => ({
  type: 'ready',
  room,
  live: {
    code: 'ABCD',
    address: null,
    phase: 'stopped',
    score: { a: 0, b: 0 },
    mode: 'football',
    map: 'm',
    players,
  },
});
const tick = () => new Promise((r) => setTimeout(r, 0));
const make = (extra = {}) => {
  FakeSocket.all = [];
  return new RoomBot({
    baseUrl: 'http://localhost:8092',
    roomId: 'r1',
    key: 'amb_x',
    WebSocket: FakeSocket,
    reconnect: { initialDelayMs: 1, maxDelayMs: 2 },
    ...extra,
  });
};
const last = () => FakeSocket.all[FakeSocket.all.length - 1]!;

describe('botUrl', () => {
  it('http vira ws, https vira wss, o prefixo /api fica e o id é escapado', () => {
    expect(botUrl('http://localhost:8092', 'r1')).toBe('ws://localhost:8092/v1/rooms/r1/bot');
    expect(botUrl('https://amebas.site/api/', 'a b')).toBe('wss://amebas.site/api/v1/rooms/a%20b/bot');
  });
});

describe('RoomBot', () => {
  it('manda a auth ao abrir, resolve no ready e entrega os eventos pelo nome', async () => {
    const bot = make();
    const events: string[] = [];
    bot.on('player.joined', (e) => events.push(`${e.player.nick}:${e.players}`));
    const p = bot.connect();
    await tick();
    expect(last().sent).toEqual([{ type: 'auth', key: 'amb_x' }]);
    last().push(ready());
    expect((await p).live?.code).toBe('ABCD');
    last().push({
      type: 'player.joined',
      roomId: 'r1',
      at: 1,
      player: { id: 2, nick: 'Ana', accountId: null },
      players: 1,
    });
    expect(events).toEqual(['Ana:1']);
  });

  it('chat() espera o result pelo ref; result com erro rejeita com o code', async () => {
    const bot = make();
    const p = bot.connect();
    await tick();
    last().push(ready());
    await p;
    const ok = bot.chat('oi');
    expect(last().sent[1]).toEqual({ type: 'chat', text: 'oi', ref: 'c1' });
    last().push({ type: 'result', ref: 'c1', ok: true });
    await ok;
    const bad = bot.kick(9);
    last().push({ type: 'result', ref: 'c2', ok: false, code: 'not_found', message: 'sem ele' });
    await expect(bad).rejects.toMatchObject({ code: 'not_found', message: 'sem ele' });
  });

  it('comando antes do ready é recusado com uma mensagem que diz o que fazer', async () => {
    const bot = make();
    await expect(bot.chat('oi')).rejects.toThrow(/espere o ready/);
  });

  it('bot.command() responde no chat: uso errado, permissão e o handler com args tipados', async () => {
    const bot = make();
    const seen: number[] = [];
    bot.command('gols', { args: { n: 'int:1..20' }, cooldown: 10, permission: 'staff' }, (ctx) => {
      // ctx.args.n é number: o TypeScript confere
      seen.push(ctx.args.n + 1);
    });
    const p = bot.connect();
    await tick();
    last().push(ready([{ id: 3, nick: 'Bia', accountId: 'acc-bia' }]));
    await p;
    const say = (role: string | undefined, text: string) =>
      last().push({
        type: 'chat.message',
        roomId: 'r1',
        at: 1,
        player: { id: 3, nick: 'Bia', accountId: 'acc-bia' },
        text,
        ...(role ? { role } : {}),
      });
    say('player', '!gols 5');
    await tick();
    expect(last().sent.at(-1)).toMatchObject({ type: 'chat', text: 'Só a staff pode usar !gols.' });
    say('staff', '!gols 99');
    await tick();
    expect(last().sent.at(-1)).toMatchObject({
      type: 'chat',
      text: 'Valor inválido pra n: um número inteiro de 1 a 20. Uso: !gols <n>',
    });
    say('staff', '!gols 4');
    await tick();
    expect(seen).toEqual([5]);
    // mensagem do sistema (sem player) nunca é comando
    last().push({ type: 'chat.message', roomId: 'r1', at: 1, player: null, text: '!gols 4' });
    await tick();
    expect(seen).toEqual([5]);
  });

  it('o argumento player enxerga quem entrou e quem saiu', async () => {
    const bot = make();
    const found: unknown[] = [];
    bot.command('ver', { args: { alvo: 'player' } }, (ctx) => found.push(ctx.args.alvo));
    const p = bot.connect();
    await tick();
    last().push(ready());
    await p;
    const join = { id: 5, nick: 'Caio', accountId: null };
    last().push({ type: 'player.joined', roomId: 'r1', at: 1, player: join, players: 1 });
    const say = () =>
      last().push({
        type: 'chat.message',
        roomId: 'r1',
        at: 1,
        player: join,
        text: '!ver caio',
        role: 'player',
      });
    say();
    await tick();
    expect(found).toEqual([join]);
    last().push({ type: 'player.left', roomId: 'r1', at: 2, player: join, reason: 'left', players: 0 });
    say();
    await tick();
    expect(found).toHaveLength(1);
    expect(last().sent.at(-1)).toMatchObject({ text: 'Ninguém na sala com o nick "caio". Uso: !ver <alvo>' });
  });

  it('caiu: reconecta, manda a auth de novo e avisa no ready; comando pendente rejeita', async () => {
    const bot = make();
    let readies = 0;
    bot.on('ready', () => readies++);
    const p = bot.connect();
    await tick();
    last().push(ready());
    await p;
    const pending = bot.chat('oi');
    const first = last();
    first.drop(1006);
    await expect(pending).rejects.toMatchObject({ code: 'disconnected' });
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeSocket.all).toHaveLength(2);
    expect(last().sent[0]).toEqual({ type: 'auth', key: 'amb_x' });
    last().push(ready());
    expect(readies).toBe(2);
  });

  it('auth recusada (chave errada) não reconecta: connect() rejeita e fatal avisa', async () => {
    const bot = make();
    let fatal: RoomBotError | null = null;
    bot.on('fatal', (e) => {
      fatal = e;
    });
    const p = bot.connect();
    await tick();
    last().push({ type: 'error', code: 'unauthorized', message: 'chave inválida' });
    last().drop(4001, 'auth');
    await expect(p).rejects.toMatchObject({ code: 'unauthorized', message: 'chave inválida' });
    await new Promise((r) => setTimeout(r, 15));
    expect(FakeSocket.all).toHaveLength(1);
    expect(fatal).toBeInstanceOf(RoomBotError);
  });

  it('reconnect: false não volta depois de cair', async () => {
    const bot = make({ reconnect: false });
    const p = bot.connect();
    await tick();
    last().push(ready());
    await p;
    last().drop(1006);
    await new Promise((r) => setTimeout(r, 15));
    expect(FakeSocket.all).toHaveLength(1);
  });
});
