// Um bot de sala completo: dá boas-vindas, responde !regras e rola um !dado com argumento, faixa e cooldown.
// Rode contra a API de dev:
//   eval "$(pnpm --silent --filter @amebas/bot-protocol dev-setup)"   # cria sala e chave, exporta AMEBAS_*
//   pnpm --filter @amebas/sdk example
import { RoomBot } from '../src/index.js';

const bot = new RoomBot({
  baseUrl: process.env.AMEBAS_URL ?? 'http://localhost:8092',
  roomId: process.env.AMEBAS_ROOM ?? '',
  key: process.env.AMEBAS_KEY ?? '',
});

bot.on('ready', (r) =>
  console.log(`no ar na sala "${r.room.name}" (${r.live?.players.length ?? 0} pessoas)`),
);
bot.on('player.joined', (e) => bot.chat(`Oi, ${e.player.nick}! Digite !ajuda pra ver os comandos.`));

// o caso simples: uma linha
bot.command('regras', (ctx) => ctx.reply('Sem xingar e joga limpo.'));

// com argumento (lados vale 6 se a pessoa não disser), faixa, atalho e cooldown de 5 s por pessoa
bot.command(
  'dado',
  { aliases: ['d'], description: 'Rola um dado.', args: { lados: 'int:2..100=6' }, cooldown: 5 },
  (ctx) =>
    ctx.reply(
      `${ctx.player.nick} tirou ${1 + Math.floor(Math.random() * ctx.args.lados)} (d${ctx.args.lados})`,
    ),
);

// só a staff, e a define é uma const que dá pra reaproveitar
const STAFF = { permission: 'staff', cooldown: 30 } as const;
bot.command('silencio', { ...STAFF, description: 'Pede silêncio.', args: { motivo: 'rest?' } }, (ctx) =>
  ctx.reply(`Silêncio, por favor!${ctx.args.motivo ? ` (${ctx.args.motivo})` : ''}`),
);

bot.on('fatal', (err) => {
  console.error(`parou: ${err.message}`);
  process.exit(1);
});
await bot.connect();
