import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Theme } from '@/types/chess';
import { Palette, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ThemeSelectorProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const themes: { id: Theme; name: string; colors: string[] }[] = [
  { id: 'default', name: 'Elegant Dark', colors: ['#1a1f35', '#f5d770', '#3d4a6b'] },
  { id: 'classic', name: 'Classic Wood', colors: ['#e8dcc8', '#6b4e31', '#d4c4a8'] },
  { id: 'ocean', name: 'Deep Ocean', colors: ['#0d1b2a', '#2dd4bf', '#1e3a5f'] },
  { id: 'forest', name: 'Forest', colors: ['#0d1f14', '#5cb85c', '#1a3d24'] },
  { id: 'sunset', name: 'Sunset', colors: ['#1f0d0a', '#f97316', '#3d1a14'] },
];

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Palette className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <h4 className="font-display font-semibold mb-3">Board Theme</h4>
        <div className="space-y-2">
          {themes.map((theme) => (
            <motion.button
              key={theme.id}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                currentTheme === theme.id
                  ? 'bg-primary/20 border border-primary'
                  : 'hover:bg-secondary border border-transparent'
              }`}
              onClick={() => onThemeChange(theme.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Color preview */}
              <div className="flex gap-0.5">
                {theme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium flex-1 text-left">{theme.name}</span>
              {currentTheme === theme.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </motion.button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeSelector;
