import React from 'react';
import { motion } from 'framer-motion';
import { Square } from 'chess.js';
import { ChessPiece as ChessPieceType } from '@/types/chess';

// Unicode chess pieces
const PIECE_SYMBOLS: Record<string, string> = {
  'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
  'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟',
};

interface ChessBoardProps {
  board: (ChessPieceType | null)[][];
  selectedSquare: Square | null;
  validMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  currentTurn: 'w' | 'b';
  onSquareClick: (square: Square) => void;
  disabled?: boolean;
}

const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  selectedSquare,
  validMoves,
  lastMove,
  isCheck,
  currentTurn,
  onSquareClick,
  disabled = false,
}) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  const getSquareName = (row: number, col: number): Square => {
    return `${files[col]}${ranks[row]}` as Square;
  };

  const isLightSquare = (row: number, col: number) => (row + col) % 2 === 0;

  const isSquareSelected = (row: number, col: number) => {
    return getSquareName(row, col) === selectedSquare;
  };

  const isValidMove = (row: number, col: number) => {
    return validMoves.includes(getSquareName(row, col));
  };

  const isLastMove = (row: number, col: number) => {
    const square = getSquareName(row, col);
    return lastMove && (lastMove.from === square || lastMove.to === square);
  };

  const isKingInCheck = (row: number, col: number) => {
    if (!isCheck) return false;
    const piece = board[row][col];
    return piece?.type === 'k' && piece?.color === currentTurn;
  };

  const hasPiece = (row: number, col: number) => {
    return board[row][col] !== null;
  };

  return (
    <div className="relative">
      {/* Board */}
      <motion.div
        className="chess-board"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const square = getSquareName(rowIndex, colIndex);
            const isLight = isLightSquare(rowIndex, colIndex);
            const selected = isSquareSelected(rowIndex, colIndex);
            const valid = isValidMove(rowIndex, colIndex);
            const wasLastMove = isLastMove(rowIndex, colIndex);
            const kingCheck = isKingInCheck(rowIndex, colIndex);
            const hasCapture = valid && hasPiece(rowIndex, colIndex);

            return (
              <motion.div
                key={square}
                className={`
                  chess-square
                  ${isLight ? 'chess-square-light' : 'chess-square-dark'}
                  ${selected ? 'chess-square-selected' : ''}
                  ${valid && !hasCapture ? 'chess-square-valid' : ''}
                  ${hasCapture ? 'chess-square-capture' : ''}
                  ${wasLastMove ? 'chess-square-last-move' : ''}
                  ${kingCheck ? 'chess-square-check check-pulse' : ''}
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => !disabled && onSquareClick(square)}
                whileHover={!disabled ? { scale: 1.02 } : undefined}
                whileTap={!disabled ? { scale: 0.98 } : undefined}
              >
                {/* Rank labels on first column */}
                {colIndex === 0 && (
                  <span className="absolute top-0.5 left-1 text-xs font-medium opacity-60 select-none">
                    {ranks[rowIndex]}
                  </span>
                )}
                
                {/* File labels on last row */}
                {rowIndex === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-xs font-medium opacity-60 select-none">
                    {files[colIndex]}
                  </span>
                )}

                {/* Chess piece */}
                {piece && (
                  <motion.span
                    className={`chess-piece ${piece.color === 'w' ? 'chess-piece-white' : 'chess-piece-black'}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    key={`${square}-${piece.type}-${piece.color}`}
                  >
                    {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                  </motion.span>
                )}
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
};

export default ChessBoard;
