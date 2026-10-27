// `pnpm --filter @amebas/sdk generate`: os tipos do protocolo (src/generated/protocol.ts) a partir do schema.
// Usa a cópia protocol/bot-protocol.schema.json (no repo público ela vem do Amebas-Arena/protocol; no monorepo,
// `sync-schema` copia do pacote do protocolo).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const schema = JSON.parse(readFileSync(root('protocol/bot-protocol.schema.json'), 'utf8')) as Record<
  string,
  unknown
> & {
  'x-amebas-bot': unknown;
};

const types = await compile(schema as never, 'AmebasBotProtocol', {
  bannerComment:
    '// Gerado de protocol/bot-protocol.schema.json por `npm run generate`. Não edite à mão: o schema é a fonte.',
  additionalProperties: false,
  unreachableDefinitions: true,
  format: false,
});
// as regras do canal (x-amebas-bot) também vão pro código, pra o cliente não carregar o schema inteiro
const bot = schema['x-amebas-bot'] as {
  path: string;
  auth: { timeoutMs: number };
  rateLimit: { burst: number; perSecond: number };
  closeCodes: Record<string, { code: number }>;
};
const protocol = {
  path: bot.path,
  authTimeoutMs: bot.auth.timeoutMs,
  rateLimit: { burst: bot.rateLimit.burst, perSecond: bot.rateLimit.perSecond },
  closeCodes: Object.fromEntries(Object.entries(bot.closeCodes).map(([k, v]) => [k, v.code])),
};
const out = `${types}\n/** A rota, o prazo da auth, o balde de comandos e os códigos de fechamento do canal. */\nexport const BOT_PROTOCOL = ${JSON.stringify(protocol, null, 2)} as const;\n`;
writeFileSync(root('src/generated/protocol.ts'), out, 'utf8');
console.log('gravado: src/generated/protocol.ts');
