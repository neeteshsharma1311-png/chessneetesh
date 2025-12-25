import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GameMode, AIDifficulty } from '@/types/chess';
import { Users, Bot, Zap, Brain, Flame, Clock } from 'lucide-react';

interface GameSetupProps {
  onStartGame: (
    mode: GameMode,
    difficulty: AIDifficulty,
    player1Name: string,
    player2Name: string,
    useTimer: boolean,
    timerDuration: number
  ) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [mode, setMode] = useState<GameMode>('pvp');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [player1Name, setPlayer1Name] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2');
  const [useTimer, setUseTimer] = useState(true);
  const [timerDuration, setTimerDuration] = useState(600);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartGame(mode, difficulty, player1Name, player2Name, useTimer, timerDuration);
  };

  const timerOptions = [
    { value: 180, label: '3 min' },
    { value: 300, label: '5 min' },
    { value: 600, label: '10 min' },
    { value: 900, label: '15 min' },
    { value: 1800, label: '30 min' },
  ];

  return (
    <motion.div
      className="glass-card p-6 md:p-8 max-w-md w-full mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-6 text-gradient">
        New Game
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Game Mode Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Game Mode</Label>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              className={`p-4 rounded-lg border-2 transition-all ${
                mode === 'pvp'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary/50 hover:border-primary/50'
              }`}
              onClick={() => setMode('pvp')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Player vs Player</p>
              <p className="text-xs text-muted-foreground">Local multiplayer</p>
            </motion.button>

            <motion.button
              type="button"
              className={`p-4 rounded-lg border-2 transition-all ${
                mode === 'ai'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary/50 hover:border-primary/50'
              }`}
              onClick={() => setMode('ai')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Bot className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Player vs AI</p>
              <p className="text-xs text-muted-foreground">Challenge the computer</p>
            </motion.button>
          </div>
        </div>

        {/* AI Difficulty */}
        {mode === 'ai' && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Label className="text-base font-semibold">AI Difficulty</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as AIDifficulty)}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem value="easy" id="easy" className="peer sr-only" />
                <Label
                  htmlFor="easy"
                  className="flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 hover:bg-secondary"
                >
                  <Zap className="w-5 h-5 mb-1 text-green-500" />
                  <span className="text-sm font-medium">Easy</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="medium" id="medium" className="peer sr-only" />
                <Label
                  htmlFor="medium"
                  className="flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 hover:bg-secondary"
                >
                  <Brain className="w-5 h-5 mb-1 text-yellow-500" />
                  <span className="text-sm font-medium">Medium</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="hard" id="hard" className="peer sr-only" />
                <Label
                  htmlFor="hard"
                  className="flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 hover:bg-secondary"
                >
                  <Flame className="w-5 h-5 mb-1 text-red-500" />
                  <span className="text-sm font-medium">Hard</span>
                </Label>
              </div>
            </RadioGroup>
          </motion.div>
        )}

        {/* Player Names */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="player1">White Player Name</Label>
            <Input
              id="player1"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              placeholder="Enter name"
              className="bg-secondary border-border"
            />
          </div>

          {mode === 'pvp' && (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Label htmlFor="player2">Black Player Name</Label>
              <Input
                id="player2"
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                placeholder="Enter name"
                className="bg-secondary border-border"
              />
            </motion.div>
          )}
        </div>

        {/* Timer Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <Label htmlFor="timer" className="text-base font-semibold cursor-pointer">
                Chess Clock
              </Label>
            </div>
            <Switch
              id="timer"
              checked={useTimer}
              onCheckedChange={setUseTimer}
            />
          </div>

          {useTimer && (
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {timerOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    timerDuration === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-primary/20'
                  }`}
                  onClick={() => setTimerDuration(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Start Button */}
        <Button
          type="submit"
          className="w-full glow-button text-lg py-6 font-display font-semibold"
          size="lg"
        >
          Start Game
        </Button>
      </form>
    </motion.div>
  );
};

export default GameSetup;
