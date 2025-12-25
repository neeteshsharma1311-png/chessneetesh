import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Undo2, RotateCcw, Flag, Volume2, VolumeX } from 'lucide-react';

interface GameControlsProps {
  onUndo: () => void;
  onRestart: () => void;
  onResign: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  canUndo: boolean;
  gameStarted: boolean;
  gameOver: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  onUndo,
  onRestart,
  onResign,
  soundEnabled,
  onToggleSound,
  canUndo,
  gameStarted,
  gameOver,
}) => {
  return (
    <motion.div
      className="glass-card p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h3 className="font-display text-lg font-semibold mb-3 text-primary">Controls</h3>
      
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo || gameOver || !gameStarted}
          className="flex items-center gap-2"
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onRestart}
          disabled={!gameStarted}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Restart
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={onResign}
          disabled={gameOver || !gameStarted}
          className="flex items-center gap-2"
        >
          <Flag className="w-4 h-4" />
          Resign
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSound}
          className="flex items-center gap-2"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4" />
              Sound
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4" />
              Muted
            </>
          )}
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 text-xs text-muted-foreground">
        <p className="font-medium mb-1">Keyboard Shortcuts:</p>
        <p>U - Undo • R - Restart • M - Toggle Sound</p>
      </div>
    </motion.div>
  );
};

export default GameControls;
