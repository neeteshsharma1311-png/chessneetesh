import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Move } from '@/types/chess';

interface MoveHistoryProps {
  moves: Move[];
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ moves }) => {
  // Group moves into pairs (white, black)
  const movePairs: { moveNumber: number; white?: Move; black?: Move }[] = [];
  
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <div className="glass-card p-4 h-full">
      <h3 className="font-display text-lg font-semibold mb-3 text-primary">Move History</h3>
      
      {moves.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          No moves yet. Make your first move!
        </p>
      ) : (
        <ScrollArea className="h-[200px] md:h-[300px] pr-2">
          <div className="space-y-1">
            {movePairs.map((pair, index) => (
              <motion.div
                key={pair.moveNumber}
                className="flex items-center gap-2 text-sm"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="text-muted-foreground w-6 text-right">
                  {pair.moveNumber}.
                </span>
                <span className="move-history-item flex-1">
                  {pair.white?.san || '...'}
                </span>
                {pair.black && (
                  <span className="move-history-item flex-1">
                    {pair.black.san}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default MoveHistory;
