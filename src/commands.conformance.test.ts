// Os casos compartilhados do sistema de comandos (protocol/commands.conformance.json, cópia do pacote do protocolo):
// o script do painel e os SDKs de Python e Go rodam os mesmos.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type CommandDefaults, type CommandDefine, type CommandPlayer, Commands } from './commands.js';

interface Step {
  as: string;
  at?: number;
  text: string;
  result?: boolean;
  expect: { run?: string; args?: Record<string, unknown>; replies?: string[]; ignore?: boolean };
}
interface Case {
  name: string;
  defaults?: CommandDefaults;
  players?: string[];
  commands: { name: string; define?: CommandDefine }[];
  steps: Step[];
}
const fixture = JSON.parse(
  readFileSync(new URL('../protocol/commands.conformance.json', import.meta.url), 'utf8'),
) as { players: Record<string, CommandPlayer>; cases: Case[] };

describe('conformidade do sistema de comandos', () => {
  for (const c of fixture.cases) {
    it(c.name, async () => {
      const commands = new Commands();
      if (c.defaults) commands.defaults(c.defaults);
      let ran: { command: string; args: unknown } | null = null;
      let result: boolean | undefined;
      for (const def of c.commands)
        commands.add(def.name, def.define ?? {}, (ctx) => {
          ran = { command: ctx.command, args: ctx.args };
          return result;
        });
      const players = (c.players ?? []).map((k) => fixture.players[k]!);
      let at = 0;
      for (const step of c.steps) {
        at = step.at ?? at;
        ran = null;
        result = step.result;
        const replies: string[] = [];
        const handled = await commands.dispatch(
          { text: step.text, player: fixture.players[step.as]!, now: at, players },
          (t) => replies.push(t),
        );
        const where = `${step.as}: ${step.text}`;
        if (step.expect.ignore) {
          expect(handled, where).toBe(false);
        } else if (step.expect.replies) {
          expect(replies, where).toEqual(step.expect.replies);
          expect(ran, where).toBeNull();
        } else {
          expect(ran, where).toEqual({ command: step.expect.run, args: step.expect.args });
          expect(replies, where).toEqual([]);
        }
      }
    });
  }
});
