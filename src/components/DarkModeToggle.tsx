import React from 'react';
import { Moon, Sun, Zap } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface DarkModeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'futuristic' | 'minimal';
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ 
  className, 
  size = 'md',
  variant = 'futuristic'
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
  };

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          sizeClasses[size],
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    );
  }

  if (variant === 'default') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          sizeClasses[size],
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    );
  }

  // Futuristic variant
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'group relative inline-flex items-center justify-center rounded-xl border-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden',
        'bg-gradient-to-br from-background to-muted border-border hover:border-primary/50',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/10 before:to-accent/10 before:opacity-0 before:transition-opacity before:duration-300',
        'hover:before:opacity-100 hover:shadow-lg hover:shadow-primary/20',
        'active:scale-95',
        sizeClasses[size],
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Animated background glow */}
      <div className={cn(
        'absolute inset-0 rounded-xl transition-all duration-500',
        isDark 
          ? 'bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-cyan-500/20' 
          : 'bg-gradient-to-br from-orange-500/20 via-yellow-500/20 to-red-500/20'
      )} />
      
      {/* Icon container with rotation animation */}
      <div className={cn(
        'relative z-10 flex items-center justify-center transition-transform duration-500',
        isDark ? 'rotate-180' : 'rotate-0'
      )}>
        {isDark ? (
          <div className="relative">
            <Sun className="h-4 w-4 text-yellow-400 drop-shadow-sm" />
            <div className="absolute inset-0 animate-pulse">
              <Sun className="h-4 w-4 text-yellow-300/50" />
            </div>
          </div>
        ) : (
          <div className="relative">
            <Moon className="h-4 w-4 text-blue-400 drop-shadow-sm" />
            <div className="absolute inset-0 animate-pulse">
              <Moon className="h-4 w-4 text-blue-300/50" />
            </div>
          </div>
        )}
      </div>

      {/* Energy effect lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn(
          'absolute top-0 left-1/2 w-px h-1/2 bg-gradient-to-b from-transparent via-primary/60 to-transparent transition-opacity duration-300',
          isDark ? 'opacity-100' : 'opacity-0'
        )} />
        <div className={cn(
          'absolute bottom-0 left-1/2 w-px h-1/2 bg-gradient-to-t from-transparent via-accent/60 to-transparent transition-opacity duration-300',
          isDark ? 'opacity-0' : 'opacity-100'
        )} />
        <div className={cn(
          'absolute left-0 top-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent transition-opacity duration-300',
          isDark ? 'opacity-100' : 'opacity-0'
        )} />
        <div className={cn(
          'absolute right-0 top-1/2 w-1/2 h-px bg-gradient-to-l from-transparent via-accent/60 to-transparent transition-opacity duration-300',
          isDark ? 'opacity-0' : 'opacity-100'
        )} />
      </div>

      {/* Corner accent dots */}
      <div className="absolute top-1 right-1 w-1 h-1 bg-primary/60 rounded-full animate-pulse" />
      <div className="absolute bottom-1 left-1 w-1 h-1 bg-accent/60 rounded-full animate-pulse" />
    </button>
  );
};
