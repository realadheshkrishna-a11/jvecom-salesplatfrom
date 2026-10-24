import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowLeft, Sparkles } from 'lucide-react';

export function ComingSoonPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center select-none">
      {/* Animated glow blob */}
      <div className="relative mb-8">
        <div
          className="absolute -inset-8 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ background: 'radial-gradient(circle, #6366f1, #8b5cf6)' }}
        />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-violet-600/20 shadow-xl backdrop-blur">
          <Rocket className="h-10 w-10 text-indigo-400" strokeWidth={1.5} />
        </div>
      </div>

      {/* Badge */}
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-400">
        <Sparkles className="h-3 w-3" />
        Coming Soon
      </span>

      {/* Heading */}
      <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        We're building something{' '}
        <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          amazing
        </span>
      </h1>

      {/* Sub-text */}
      <p className="mb-10 max-w-md text-base text-white/50 leading-relaxed">
        This feature is currently under active development and will be available
        in an upcoming release. Stay tuned!
      </p>

      {/* Progress bar decoration */}
      <div className="mb-10 w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          style={{ width: '60%', animation: 'shimmer 2s ease-in-out infinite' }}
        />
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 backdrop-blur transition-all duration-200 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to Dashboard
      </button>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
