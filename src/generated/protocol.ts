// Gerado de protocol/bot-protocol.schema.json por `npm run generate`. Não edite à mão: o schema é a fonte.

/**
 * Protocolo do bot de sala do Amebas Arena: WebSocket JSON em /v1/rooms/{roomId}/bot. Gerado de packages/protocol (pnpm --filter @amebas/bot-protocol generate); não edite à mão.
 */
export type AmebasBotProtocol = ClientMessage | ServerMessage;
/**
 * O que o bot manda: a auth (primeira mensagem) e, depois dela, comandos. Todo comando aceita um campo ref (texto até 64), que volta no result dele (x-amebas-bot.commandRef).
 */
export type ClientMessage = AuthMessage | RoomCommand;
export type RoomCommand =
  | ChatCommand
  | KickCommand
  | BanCommand
  | MuteCommand
  | MoveCommand
  | TeamCommand
  | CaptainCommand
  | AdminCommand
  | StartCommand
  | StopCommand
  | FinishCommand
  | PauseCommand
  | RestartCommand
  | AutoCommand
  | ShuffleCommand
  | PickCommand
  | ConfirmCommand
  | KnockoutCommand
  | BotCommand
  | BotsCommand
  | LockCommand
  | ConfigCommand;
/**
 * O que a API manda: ready (auth aceita), result (de cada comando), error e os eventos da sala.
 */
export type ServerMessage = ReadyMessage | ResultMessage | ErrorMessage | RoomEvent;
/**
 * @maxItems 20
 */
export type RoomRules =
  | []
  | [Rule]
  | [Rule, Rule]
  | [Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule, Rule]
  | [
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
    ]
  | [
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
    ]
  | [
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
      Rule,
    ];
export type RuleTrigger =
  | {
      type: 'room.live';
    }
  | {
      type: 'player.joined';
    }
  | {
      type: 'player.left';
    }
  | {
      type: 'chat.command';
      command: string;
      hide?: boolean;
    }
  | {
      type: 'match.started';
    }
  | {
      type: 'match.ended';
    }
  | {
      type: 'match.event';
      event:
        | 'Goal'
        | 'Save'
        | 'Post'
        | 'PenaltyKick'
        | 'Out'
        | 'Point'
        | 'Eliminated'
        | 'Revived'
        | 'Frozen'
        | 'Unfrozen'
        | 'FlagTaken'
        | 'FlagCaptured'
        | 'FlagDropped'
        | 'Block'
        | 'Fault'
        | 'Foul'
        | 'Card'
        | 'LapCompleted'
        | 'Finished'
        | 'RoundStart'
        | 'RoundEnd';
      team?: 'a' | 'b';
    }
  | {
      type: 'score.reached';
      goals: number;
      team?: 'a' | 'b';
    }
  | {
      type: 'time.passed';
      seconds: number;
    }
  | {
      type: 'every';
      minutes: number;
    };
export type RuleCondition =
  | {
      type: 'player.staff';
      is: boolean;
    }
  | {
      type: 'player.account';
      is: boolean;
    }
  | {
      type: 'player.place';
      place: 'field' | 'a' | 'b' | 'stands';
    }
  | {
      type: 'people';
      min?: number;
      max?: number;
    }
  | {
      type: 'phase';
      /**
       * @minItems 1
       * @maxItems 3
       */
      in:
        | ['stopped' | 'playing' | 'paused']
        | ['stopped' | 'playing' | 'paused', 'stopped' | 'playing' | 'paused']
        | [
            'stopped' | 'playing' | 'paused',
            'stopped' | 'playing' | 'paused',
            'stopped' | 'playing' | 'paused',
          ];
    }
  | {
      type: 'score';
      of: 'a' | 'b' | 'total' | 'diff';
      min?: number;
      max?: number;
    }
  | {
      type: 'mode';
      /**
       * @minItems 1
       * @maxItems 10
       */
      in:
        | ['football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race']
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ]
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ]
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ]
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ]
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ]
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ]
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ]
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ]
        | [
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
            'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race',
          ];
    }
  | {
      type: 'map';
      /**
       * @minItems 1
       * @maxItems 10
       */
      in:
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string, string, string];
    };
export type RuleAction =
  | {
      type: 'chat';
      text: string;
    }
  | {
      type: 'reply';
      text: string;
    }
  | {
      type: 'spectate';
    }
  | {
      type: 'mute';
    }
  | {
      type: 'kick';
    }
  | {
      type: 'start';
    }
  | {
      type: 'stop';
    }
  | {
      type: 'finish';
    }
  | {
      type: 'pause';
      paused?: boolean;
    }
  | {
      type: 'config';
      mode?: 'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race';
      map?: string;
      time?: number;
      goals?: number;
    }
  | {
      type: 'bots';
      action: 'fill' | 'clear';
    }
  | {
      type: 'team';
      team: 'a' | 'b';
      name?: string;
      kit?: string;
      colors?: {
        base: string;
        second: string;
      };
    };
export type RoomEvent =
  | RoomLiveEvent
  | RoomOffEvent
  | RoomConfigEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | ChatMessageEvent
  | MatchStartedEvent
  | MatchEventEvent
  | MatchEndedEvent
  | RuleFiredEvent
  | ScriptLogEvent
  | ScriptStoppedEvent;

export interface AuthMessage {
  type: 'auth';
  key: string;
}
export interface ChatCommand {
  type: 'chat';
  text: string;
}
export interface KickCommand {
  type: 'kick';
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  playerId: number;
}
export interface BanCommand {
  type: 'ban';
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  playerId: number;
  scope?: 'room' | 'community';
}
export interface MuteCommand {
  type: 'mute';
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  playerId: number;
  muted?: boolean;
}
export interface MoveCommand {
  type: 'move';
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  playerId: number;
  to: 'a' | 'b' | 'stands';
  slot?: number;
}
export interface TeamCommand {
  type: 'team';
  team: 'a' | 'b';
  name?: string;
  kit?: string;
  colors?: {
    base: string;
    second: string;
  };
}
export interface CaptainCommand {
  type: 'captain';
  team: 'a' | 'b';
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  playerId: number;
}
export interface AdminCommand {
  type: 'admin';
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  playerId: number;
  admin: boolean;
}
export interface StartCommand {
  type: 'start';
}
export interface StopCommand {
  type: 'stop';
}
export interface FinishCommand {
  type: 'finish';
}
export interface PauseCommand {
  type: 'pause';
  paused?: boolean;
}
export interface RestartCommand {
  type: 'restart';
}
export interface AutoCommand {
  type: 'auto';
}
export interface ShuffleCommand {
  type: 'shuffle';
}
export interface PickCommand {
  type: 'pick';
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  playerId?: number;
  number?: number;
  keyword?: 'top' | 'bottom' | 'random';
}
export interface ConfirmCommand {
  type: 'confirm';
}
export interface KnockoutCommand {
  type: 'knockout';
  action: 'lock' | 'reset';
}
export interface BotCommand {
  type: 'bot';
  team: 'a' | 'b';
  delta: 1 | -1;
  slot?: number;
}
export interface BotsCommand {
  type: 'bots';
  action: 'fill' | 'clear';
}
export interface LockCommand {
  type: 'lock';
  locked: boolean;
}
export interface ConfigCommand {
  type: 'config';
  config: HostedRoomConfigInput;
  name?: string;
  isPublic?: boolean;
  password?: string | null;
}
export interface HostedRoomConfigInput {
  preset?: string;
  mode?: 'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race';
  modeParams?: {
    [k: string]: number | boolean | string;
  };
  format?: 'open' | 'queue' | 'everyone' | 'rounds' | 'manual' | 'knockout';
  formatParams?: {
    [k: string]: number | boolean | string;
  };
  map?: string;
  communityMap?: string;
  time?: number;
  goals?: number;
  teamSize?: number;
  keepers?: boolean;
  goalkeeper?: number;
  ball?: string;
  gameplay?: {
    maxSpeed?: number;
    accelTime?: number;
    turning?: number;
    aimAssist?: number;
    controlSpin?: number;
    ballMass?: number;
    ballFriction?: number;
    ballAirFriction?: number;
    ballBounce?: number;
    ballSize?: number;
    kickPower?: number;
    gravity?: number;
    playerSize?: number;
  };
}
export interface ReadyMessage {
  type: 'ready';
  room: HostedRoom;
  live: LiveRoom | null;
}
export interface HostedRoom {
  id: string;
  /**
   * Slug da comunidade, definido na criação e imutável depois dela.
   */
  communityId: string;
  /**
   * Código fixo da sala: o id da comunidade, um hífen e um apelido de 1 a 16 letras minúsculas, números e hífen.
   */
  code: string;
  name: string;
  isPublic: boolean;
  hasPassword: boolean;
  maxPlayers: number;
  config: HostedRoomConfig;
  plan: 'simple' | 'full';
  paidUntil: number | null;
  alwaysOn: boolean;
  desired: 'on' | 'off';
  status: 'off' | 'starting' | 'live';
  live?: {
    code: string;
    address: string | null;
    players: number;
  } | null;
  hostBot?: HostBot | null;
  teams?: RoomTeams | null;
  rules?: RoomRules | null;
  script?: RoomScript | null;
  createdAt: number;
  updatedAt: number;
}
export interface HostedRoomConfig {
  preset?: string;
  mode?: 'football' | 'penalty' | 'volleyball' | 'ctf' | 'dodgeball' | 'tenman' | 'race';
  modeParams?: {
    [k: string]: number | boolean | string;
  };
  format?: 'open' | 'queue' | 'everyone' | 'rounds' | 'manual' | 'knockout';
  formatParams?: {
    [k: string]: number | boolean | string;
  };
  map?: string;
  communityMap?: string;
  time?: number;
  goals?: number;
  teamSize?: number;
  keepers?: boolean;
  goalkeeper?: number;
  ball?: string;
  gameplay?: {
    maxSpeed?: number;
    accelTime?: number;
    turning?: number;
    aimAssist?: number;
    controlSpin?: number;
    ballMass?: number;
    ballFriction?: number;
    ballAirFriction?: number;
    ballBounce?: number;
    ballSize?: number;
    kickPower?: number;
    gravity?: number;
    playerSize?: number;
  };
}
export interface HostBot {
  welcome?: {
    text: string;
  };
  notices?: {
    everyMinutes: number;
    /**
     * @minItems 1
     * @maxItems 5
     */
    messages:
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string];
  };
  chatRules?: {
    /**
     * @minItems 1
     * @maxItems 50
     */
    words: [string, ...string[]];
    action: 'mute' | 'kick';
  };
  afk?: {
    seconds: number;
    action: 'spectate' | 'kick';
  };
}
/**
 * O uniforme do time da casa (a) e o do time visitante (b).
 */
export interface RoomTeams {
  a: TeamStyle;
  b: TeamStyle;
}
export interface TeamStyle {
  name: string;
  kit: string;
  colors?: {
    base: string;
    second: string;
  };
}
/**
 * Quando (when) acontecer X, se (if) Y, faça (do) Z.
 */
export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  cooldownSeconds?: number;
  when: RuleTrigger;
  /**
   * @maxItems 5
   */
  if:
    | []
    | [RuleCondition]
    | [RuleCondition, RuleCondition]
    | [RuleCondition, RuleCondition, RuleCondition]
    | [RuleCondition, RuleCondition, RuleCondition, RuleCondition]
    | [RuleCondition, RuleCondition, RuleCondition, RuleCondition, RuleCondition];
  /**
   * @minItems 1
   * @maxItems 5
   */
  do:
    | [RuleAction]
    | [RuleAction, RuleAction]
    | [RuleAction, RuleAction, RuleAction]
    | [RuleAction, RuleAction, RuleAction, RuleAction]
    | [RuleAction, RuleAction, RuleAction, RuleAction, RuleAction];
}
export interface RoomScript {
  source: string;
  enabled: boolean;
}
export interface LiveRoom {
  code: string;
  address: string | null;
  phase: 'stopped' | 'playing' | 'paused';
  score: {
    a: number;
    b: number;
  };
  mode: string;
  map: string;
  players: LivePlayer[];
}
export interface LivePlayer {
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  id: number;
  nick: string;
  accountId: string | null;
  place: 'a' | 'b' | 'stands';
  admin: boolean;
  connection: 'ok' | 'reconnecting' | 'afk';
}
export interface ResultMessage {
  type: 'result';
  ref?: string;
  ok: boolean;
  code?: string;
  message?: string;
}
export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}
export interface RoomLiveEvent {
  type: 'room.live';
  roomId: string;
  at: number;
  code: string;
  address: string | null;
}
export interface RoomOffEvent {
  type: 'room.off';
  roomId: string;
  at: number;
  reason: 'released' | 'empty' | 'server_lost' | 'failed';
}
export interface RoomConfigEvent {
  type: 'room.config';
  roomId: string;
  at: number;
  name: string;
  config: HostedRoomConfig;
}
export interface PlayerJoinedEvent {
  type: 'player.joined';
  roomId: string;
  at: number;
  player: PlayerRef;
  /**
   * quantas pessoas ficaram na sala
   */
  players: number;
}
export interface PlayerRef {
  /**
   * O id do jogador nesta sala, informado nos eventos e no estado ao vivo. O id muda se o jogador sair e voltar.
   */
  id: number;
  nick: string;
  accountId: string | null;
}
export interface PlayerLeftEvent {
  type: 'player.left';
  roomId: string;
  at: number;
  player: PlayerRef;
  reason: 'left' | 'dropped' | 'kicked' | 'banned';
  /**
   * quantas pessoas ficaram na sala
   */
  players: number;
}
export interface ChatMessageEvent {
  type: 'chat.message';
  roomId: string;
  at: number;
  player: PlayerRef | null;
  text: string;
  role?: 'owner' | 'staff' | 'player';
}
export interface MatchStartedEvent {
  type: 'match.started';
  roomId: string;
  at: number;
  mode: string;
  map: string;
}
export interface MatchEventEvent {
  type: 'match.event';
  roomId: string;
  at: number;
  event:
    | 'Goal'
    | 'Save'
    | 'Post'
    | 'PenaltyKick'
    | 'Out'
    | 'Point'
    | 'Eliminated'
    | 'Revived'
    | 'Frozen'
    | 'Unfrozen'
    | 'FlagTaken'
    | 'FlagCaptured'
    | 'FlagDropped'
    | 'Block'
    | 'Fault'
    | 'Foul'
    | 'Card'
    | 'LapCompleted'
    | 'Finished'
    | 'RoundStart'
    | 'RoundEnd';
  player: PlayerRef | null;
  team: ('a' | 'b') | null;
}
export interface MatchEndedEvent {
  type: 'match.ended';
  roomId: string;
  at: number;
  match: Match;
}
export interface Match {
  id: string;
  room: string;
  hostedRoomId: string | null;
  mode: string;
  format: string | null;
  map: string | null;
  scoreA: number;
  scoreB: number;
  durationSeconds: number;
  playedAt: number;
  rules?: boolean;
  players: {
    accountId: string | null;
    nick: string;
    team: 'a' | 'b';
    outcome: ('win' | 'loss' | 'draw') | null;
    stats: {
      [k: string]: number;
    };
  }[];
}
export interface RuleFiredEvent {
  type: 'rule.fired';
  roomId: string;
  at: number;
  rule: {
    id: string;
    name: string;
  };
  trigger: string;
  player: PlayerRef | null;
  depth: number;
  actions: {
    type: string;
    ok: boolean;
    message?: string;
  }[];
}
export interface ScriptLogEvent {
  type: 'script.log';
  roomId: string;
  at: number;
  text: string;
}
export interface ScriptStoppedEvent {
  type: 'script.stopped';
  roomId: string;
  at: number;
  reason: 'compile' | 'runtime' | 'time' | 'memory' | 'budget' | 'actions' | 'private' | 'ranked';
  message: string;
}

/** A rota, o prazo da auth, o balde de comandos e os códigos de fechamento do canal. */
export const BOT_PROTOCOL = {
  path: '/v1/rooms/{roomId}/bot',
  authTimeoutMs: 10000,
  rateLimit: {
    burst: 20,
    perSecond: 5,
  },
  closeCodes: {
    unauthorized: 4001,
    invalidRoom: 4004,
  },
} as const;
