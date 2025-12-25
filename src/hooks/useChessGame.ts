import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Square, Move as ChessMove } from 'chess.js';
import { GameState, GameMode, AIDifficulty, PieceColor, Move, Player } from '@/types/chess';

const INITIAL_TIME = 600; // 10 minutes in seconds

const createInitialState = (): GameState => ({
  mode: 'pvp',
  difficulty: 'medium',
  players: {
    white: { name: 'Player 1', color: 'w', timeRemaining: INITIAL_TIME },
    black: { name: 'Player 2', color: 'b', timeRemaining: INITIAL_TIME },
  },
  currentTurn: 'w',
  isCheck: false,
  isCheckmate: false,
  isDraw: false,
  isStalemate: false,
  moveHistory: [],
  gameStarted: false,
  gameOver: false,
  winner: null,
  useTimer: true,
  timerDuration: INITIAL_TIME,
});

export const useChessGame = () => {
  const [chess] = useState(() => new Chess());
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [boardPosition, setBoardPosition] = useState(chess.board());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const historyRef = useRef<string[]>([chess.fen()]);

  const updateBoardState = useCallback(() => {
    setBoardPosition(chess.board());
    setGameState(prev => ({
      ...prev,
      currentTurn: chess.turn(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
      isStalemate: chess.isStalemate(),
      gameOver: chess.isGameOver(),
      winner: chess.isCheckmate() ? (chess.turn() === 'w' ? 'b' : 'w') : null,
    }));
  }, [chess]);

  const startGame = useCallback((
    mode: GameMode,
    difficulty: AIDifficulty,
    player1Name: string,
    player2Name: string,
    useTimer: boolean,
    timerDuration: number
  ) => {
    chess.reset();
    historyRef.current = [chess.fen()];
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setGameState({
      mode,
      difficulty,
      players: {
        white: { name: player1Name, color: 'w', timeRemaining: timerDuration },
        black: { name: mode === 'ai' ? 'Computer' : player2Name, color: 'b', timeRemaining: timerDuration },
      },
      currentTurn: 'w',
      isCheck: false,
      isCheckmate: false,
      isDraw: false,
      isStalemate: false,
      moveHistory: [],
      gameStarted: true,
      gameOver: false,
      winner: null,
      useTimer,
      timerDuration,
    });
    updateBoardState();
  }, [chess, updateBoardState]);

  const getValidMoves = useCallback((square: Square): Square[] => {
    const moves = chess.moves({ square, verbose: true });
    return moves.map((m: ChessMove) => m.to as Square);
  }, [chess]);

  const selectSquare = useCallback((square: Square) => {
    if (gameState.gameOver || !gameState.gameStarted) return;

    const piece = chess.get(square);
    
    // If clicking on own piece, select it
    if (piece && piece.color === chess.turn()) {
      // In AI mode, only allow white pieces to be selected by player
      if (gameState.mode === 'ai' && piece.color === 'b') return;
      
      setSelectedSquare(square);
      setValidMoves(getValidMoves(square));
      return;
    }

    // If a piece is selected and clicking on valid move
    if (selectedSquare && validMoves.includes(square)) {
      makeMove(selectedSquare, square);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  }, [chess, gameState.gameOver, gameState.gameStarted, gameState.mode, selectedSquare, validMoves, getValidMoves]);

  const makeMove = useCallback((from: Square, to: Square, isAIMove = false) => {
    try {
      // Check for pawn promotion
      const piece = chess.get(from);
      const isPromotion = piece?.type === 'p' && 
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      const move = chess.move({
        from,
        to,
        promotion: isPromotion ? 'q' : undefined, // Auto-promote to queen
      });

      if (move) {
        historyRef.current.push(chess.fen());
        setLastMove({ from, to });
        setSelectedSquare(null);
        setValidMoves([]);
        
        const newMove: Move = {
          from: move.from,
          to: move.to,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
          san: move.san,
          flags: move.flags,
        };

        setGameState(prev => ({
          ...prev,
          moveHistory: [...prev.moveHistory, newMove],
        }));

        updateBoardState();
        return true;
      }
    } catch (e) {
      console.error('Invalid move:', e);
    }
    return false;
  }, [chess, updateBoardState]);

  const undoMove = useCallback(() => {
    if (historyRef.current.length <= 1) return;
    
    // In AI mode, undo two moves (player + AI)
    const movesToUndo = gameState.mode === 'ai' ? 2 : 1;
    
    for (let i = 0; i < movesToUndo && historyRef.current.length > 1; i++) {
      historyRef.current.pop();
      chess.undo();
    }
    
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    
    setGameState(prev => ({
      ...prev,
      moveHistory: prev.moveHistory.slice(0, -movesToUndo),
    }));
    
    updateBoardState();
  }, [chess, gameState.mode, updateBoardState]);

  const restartGame = useCallback(() => {
    startGame(
      gameState.mode,
      gameState.difficulty,
      gameState.players.white.name,
      gameState.players.black.name,
      gameState.useTimer,
      gameState.timerDuration
    );
  }, [startGame, gameState]);

  const resignGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gameOver: true,
      winner: prev.currentTurn === 'w' ? 'b' : 'w',
    }));
  }, []);

  // AI Move Logic
  const makeAIMove = useCallback(() => {
    if (gameState.mode !== 'ai' || chess.turn() !== 'b' || gameState.gameOver) return;

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return;

    let selectedMove: ChessMove;

    switch (gameState.difficulty) {
      case 'easy':
        // Random move
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
        break;
      case 'medium':
        // Prefer captures, then random
        const captures = moves.filter((m: ChessMove) => m.captured);
        if (captures.length > 0 && Math.random() > 0.3) {
          selectedMove = captures[Math.floor(Math.random() * captures.length)];
        } else {
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
        }
        break;
      case 'hard':
        // Simple evaluation: prioritize checks, captures, center control
        const scoredMoves = moves.map((m: ChessMove) => {
          let score = 0;
          if (m.captured) {
            const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
            score += pieceValues[m.captured] * 10;
          }
          // Center control bonus
          if (['d4', 'd5', 'e4', 'e5'].includes(m.to)) score += 2;
          if (['c3', 'c6', 'f3', 'f6', 'd3', 'd6', 'e3', 'e6'].includes(m.to)) score += 1;
          // Check bonus
          chess.move(m);
          if (chess.isCheck()) score += 5;
          if (chess.isCheckmate()) score += 1000;
          chess.undo();
          // Random factor
          score += Math.random() * 2;
          return { move: m, score };
        });
        scoredMoves.sort((a, b) => b.score - a.score);
        selectedMove = scoredMoves[0].move;
        break;
      default:
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
    }

    setTimeout(() => {
      makeMove(selectedMove.from as Square, selectedMove.to as Square, true);
    }, 500);
  }, [chess, gameState.mode, gameState.difficulty, gameState.gameOver, makeMove]);

  // Trigger AI move when it's black's turn
  useEffect(() => {
    if (gameState.mode === 'ai' && gameState.currentTurn === 'b' && gameState.gameStarted && !gameState.gameOver) {
      makeAIMove();
    }
  }, [gameState.currentTurn, gameState.mode, gameState.gameStarted, gameState.gameOver, makeAIMove]);

  // Timer logic
  useEffect(() => {
    if (!gameState.useTimer || !gameState.gameStarted || gameState.gameOver) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setGameState(prev => {
        const currentPlayer = prev.currentTurn === 'w' ? 'white' : 'black';
        const newTime = prev.players[currentPlayer].timeRemaining - 1;

        if (newTime <= 0) {
          clearInterval(timerRef.current!);
          return {
            ...prev,
            players: {
              ...prev.players,
              [currentPlayer]: { ...prev.players[currentPlayer], timeRemaining: 0 },
            },
            gameOver: true,
            winner: prev.currentTurn === 'w' ? 'b' : 'w',
          };
        }

        return {
          ...prev,
          players: {
            ...prev.players,
            [currentPlayer]: { ...prev.players[currentPlayer], timeRemaining: newTime },
          },
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.useTimer, gameState.gameStarted, gameState.gameOver, gameState.currentTurn]);

  return {
    chess,
    gameState,
    boardPosition,
    selectedSquare,
    validMoves,
    lastMove,
    startGame,
    selectSquare,
    makeMove,
    undoMove,
    restartGame,
    resignGame,
  };
};
