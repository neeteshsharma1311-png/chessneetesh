export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type PieceColor = 'w' | 'b';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export type Square = string;

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  san: string;
  flags: string;
}

export type GameMode = 'pvp' | 'ai';
export type AIDifficulty = 'easy' | 'medium' | 'hard';
export type Theme = 'default' | 'classic' | 'ocean' | 'forest' | 'sunset';

export interface Player {
  name: string;
  color: PieceColor;
  timeRemaining: number;
}

export interface GameState {
  mode: GameMode;
  difficulty: AIDifficulty;
  players: {
    white: Player;
    black: Player;
  };
  currentTurn: PieceColor;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isStalemate: boolean;
  moveHistory: Move[];
  gameStarted: boolean;
  gameOver: boolean;
  winner: PieceColor | null;
  useTimer: boolean;
  timerDuration: number;
}

export interface GameResult {
  winner: string | null;
  reason: 'checkmate' | 'stalemate' | 'draw' | 'timeout' | 'resignation';
  moveCount: number;
}
