export type GameStatus =
  | "available"
  | "beta"
  | "coming-soon"
  | "maintenance";

export type PlayMode =
  | "solo"
  | "local-multiplayer"
  | "ai"
  | "online";

export type LocalRuntime = "static" | "vite" | "node";
export type LaunchMode = "public" | "local";
export type ModeFilter = "all" | PlayMode;

export interface LocalLaunch {
  runtime: LocalRuntime;
  directory: string;
  port: number;
  path: string;
}

export interface GameManifest {
  id: string;
  title: string;
  originalTitle?: string;
  summary: string;
  cover: string;
  version: string;
  status: GameStatus;
  modes: PlayMode[];
  players: {
    min: number;
    max: number;
  };
  tags: string[];
  featured?: boolean;
  launch: {
    public?: string;
    local?: LocalLaunch;
  };
  notice?: {
    public?: string;
    local?: string;
  };
}
