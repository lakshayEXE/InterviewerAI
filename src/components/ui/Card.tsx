import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLMotionProps<"div"> {
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverEffect = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverEffect ? { y: -5, transition: { duration: 0.2 } } : undefined}
        className={cn(
          "bg-surfaceHighlight rounded-3xl border border-gray-800 shadow-2xl overflow-hidden glass-panel relative",
          hoverEffect && "hover:border-accent hover:shadow-[0_10px_40px_rgba(56,189,248,0.15)] transition-colors duration-300",
          className
        )}
        {...props}
      >
        {/* Subtle top inner glare for premium feel */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
        <div className="relative z-10 w-full h-full p-6">
          {children}
        </div>
      </motion.div>
    );
  }
);
Card.displayName = 'Card';
