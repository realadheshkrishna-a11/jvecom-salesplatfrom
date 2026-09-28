import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft, Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function ComingSoon({
  title,
  subtitle = 'We\'re crafting something extraordinary. This feature is currently under development and will be available soon.',
  icon,
}: ComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
      {/* Animated background glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl scale-150 animate-pulse" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-center shadow-[0_8px_32px_rgba(37,99,235,0.12)]">
          {icon || <Clock className="w-10 h-10 text-primary/70" />}
        </div>
      </div>

      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold tracking-wide uppercase mb-5">
        <Sparkles className="w-3 h-3" />
        Under Development
      </div>

      {/* Title */}
      <h1 className="text-[2rem] font-bold tracking-[-0.04em] text-foreground mb-3">
        {title}
      </h1>

      {/* Subtitle */}
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
        {subtitle}
      </p>

      {/* Progress indicator */}
      <div className="w-64 mb-8">
        <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-2">
          <span>Progress</span>
          <span className="text-primary">In Progress</span>
        </div>
        <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 animate-pulse"
            style={{ width: '35%' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </Button>
      </div>
    </div>
  );
}
