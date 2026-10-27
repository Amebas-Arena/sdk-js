# @amebas/sdk

SDK oficial do **bot de sala** do [Amebas Arena](https://github.com/Amebas-Arena): conecta no WebSocket da sala, entrega
os eventos tipados e dá um sistema de **comandos de chat** pronto (`!gols 5`) com argumentos, permissão e cooldown.
TypeScript e JavaScript, zero dependências, Node 22+ ou navegador.

```sh
npm install @amebas/sdk
```

```ts
import { RoomBot } from '@amebas/sdk';

const bot = new RoomBot({ baseUrl: 'https://SEU-SITE/api', roomId: 'ID_DA_SALA', key: 'amb_...' });

bot.on('player.joined', (e) => bot.chat(`Oi, ${e.player.nick}!`));
bot.command('regras', (ctx) => ctx.reply('Sem xingar e joga limpo.'));
bot.command('dado', { args: { lados: 'int:2..100=6' }, cooldown: 5 }, (ctx) => {
  ctx.reply(`Tirou ${1 + Math.floor(Math.random() * ctx.args.lados)}`); // ctx.args.lados é number
});

await bot.connect(); // fica no ar e reconecta sozinho
```

A **chave** (`amb_...`) você cria no painel da comunidade, com o escopo `rooms:control`. O `roomId` é o id da sala
hospedada. Nunca coloque a chave num site: ela dá controle total da sala.

## Eventos

`bot.on(tipo, handler)` entrega o evento já tipado: o editor completa `e.player.nick`, `e.text`, `e.match.scoreA`...

| Evento | Quando |
|---|---|
| `ready` | a auth foi aceita (também depois de reconectar); traz a sala e quem está nela |
| `player.joined` / `player.left` | alguém entrou / saiu (`reason`: left, dropped, kicked, banned) |
| `chat.message` | mensagem no chat (`player` é `null` quando é do sistema) |
| `match.started` / `match.event` / `match.ended` | partida: começou, lance (gol, cartão...), terminou com a súmula |
| `room.live` / `room.off` / `room.config` | a sala ligou, desligou ou mudou de config |
| `rule.fired` / `script.log` / `script.stopped` | regras sem código e script da sala |
| `event` | qualquer um dos eventos da sala |
| `close` / `reconnecting` / `fatal` / `commandError` | a conexão e os comandos (veja "Quando algo falha") |

## Comandos da sala

```ts
await bot.chat('Bem-vindos!');
await bot.kick(playerId);
await bot.start();
await bot.send({ type: 'config', config: { time: 180 } }); // qualquer comando do protocolo, tipado
```

Todo comando espera a resposta da sala: resolve se deu certo e rejeita com `RoomBotError` (`error.code`:
`permission`, `invalid`, `rate_limited`...) se foi recusado. Limite: 20 comandos de cara e 5 por segundo.

## Comandos de chat (`!gols 5`)

```ts
bot.command('gols', { args: { n: 'int:1..20' }, cooldown: 10, permission: 'staff' }, (ctx) => {
  ctx.reply(`Top ${ctx.args.n}: ...`);
});
```

Argumento errado, cooldown e permissão **respondem sozinhos** no chat, sem você escrever nada:

```
Ana:  !gols 99
Bot:  Valor inválido pra n: um número inteiro de 1 a 20. Uso: !gols <n>
Ana:  !gols 5          (e de novo, 3 s depois)
Bot:  Espere 7s pra usar !gols de novo.
```

### A define

Um objeto simples. Guarde numa `const` e espalhe:

```ts
const STAFF = { permission: 'staff', cooldown: 30 } as const;
bot.command('silencio', { ...STAFF, args: { motivo: 'rest?' } }, (ctx) => ctx.reply('Silêncio!'));
```

| Campo | O que faz |
|---|---|
| `args` | os argumentos, em ordem: `{ nome: 'tipo' }` |
| `cooldown` | segundos por pessoa, ou `{ player: 10, room: 3, exemptStaff: false }` |
| `permission` | `'all'` (padrão), `'staff'` ou `'owner'` |
| `aliases` | outros nomes: `['g', 'artilharia']` |
| `description` | a linha do `!ajuda` |
| `hidden` | fora do `!ajuda` |
| `messages` | troca as respostas prontas (`usage`, `cooldown`, `permission`) |
| `parse` | troca o parser padrão |

### Tipos de argumento

`'tipo[:faixa][?|=padrão]'`

| Escrito | Aceita | `ctx.args.x` |
|---|---|---|
| `'int'`, `'int:1..20'`, `'int:1..'`, `'int:..20'` | inteiro, com faixa | `number` |
| `'number:0..1'` | decimal (`1,5` ou `1.5`) | `number` |
| `'text'`, `'text:3..16'` | uma palavra (a faixa é o tamanho) | `string` |
| `'rest'` | o resto da linha (tem que ser o último) | `string` |
| `'bool'` | sim/não | `boolean` |
| `'team'` | `a` ou `b` | `'a' \| 'b'` |
| `'player'` | `#id`, `@nick`, nick ou começo do nick | `{ id, nick, accountId }` |
| `'azul\|vermelho'` | uma das opções | `'azul' \| 'vermelho'` |
| `'int:1..?'` | opcional | `number \| null` |
| `'int:1..20=5'` | com padrão | `number` |

O TypeScript lê a string e tipa `ctx.args`: `'int:1..20'` vira `number`, `'rest?'` vira `string | null`.
Quem usa por extenso: `{ type: 'int', min: 1, max: 100, default: 10 }`.

### Padrões pra todos os comandos

```ts
bot.commandDefaults({ cooldown: 3, permission: 'all', prefix: '!' });
```

A define de cada comando sobrescreve o padrão. O `!ajuda` (também `!help` e `!comandos`) já vem pronto e lista só o que
a pessoa pode usar; `commandDefaults({ help: false })` desliga.

### Parser próprio

```ts
import { CommandError } from '@amebas/sdk';

bot.command('placar', {
  parse: ({ words }) => {
    const [casa, fora] = words.map(Number);
    if (Number.isNaN(casa) || Number.isNaN(fora)) throw new CommandError('Use dois números');
    return { casa, fora };
  },
}, (ctx) => ctx.reply(`${ctx.args.casa} x ${ctx.args.fora}`));
```

`CommandError` vira a resposta de uso, e o handler não roda. **Devolver `false`** do handler diz "não contou": o
cooldown não começa. Tudo isso está especificado em [COMANDOS.md](https://github.com/Amebas-Arena/protocol/blob/main/COMANDOS.md),
igual nos SDKs de Python e Go.

## Quando algo falha

| Situação | O que acontece |
|---|---|
| a conexão caiu | reconecta sozinho (espera de 1 s dobrando até 30 s); `bot.on('reconnecting', ...)` avisa |
| chave errada, sem escopo, sala de outra comunidade | **não** reconecta: `connect()` rejeita e `fatal` dispara com o `code` |
| comando antes do `ready` | `RoomBotError` `not_connected`: "espere o ready" |
| handler async que lança | o erro vai pro console (ou pro `commandError`), o bot continua |

Opções do `RoomBot`: `reconnect: false` (ou `{ initialDelayMs, maxDelayMs, maxAttempts }`), `commandTimeoutMs`,
`WebSocket` (outro construtor, ex.: o pacote `ws` num Node antigo).

## Tipos gerados

Os tipos do protocolo (`RoomEvent`, `RoomCommand`, `ChatMessageEvent`...) são **gerados** de
`protocol/bot-protocol.schema.json`, o schema do servidor ([Amebas-Arena/protocol](https://github.com/Amebas-Arena/protocol)).
Para atualizar: copie o schema novo pra `protocol/` e rode `npm run generate`.

## Desenvolvimento

```sh
npm install
npm test            # cliente + os casos de conformidade dos comandos
npm run build       # dist/ (ESM + .d.ts)
```

MIT.
