import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLMotionProps<"div"> {
  hoverEffect?: boolean;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverEffect = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverEffect ? { y: -4, transition: { duration: 0.2 } } : undefined}
        className={cn(
          "rounded-2xl border border-white/[0.06] bg-surface/60 backdrop-blur-md shadow-xl overflow-hidden relative",
          hoverEffect && "hover:border-primary/25 hover:shadow-[0_8px_40px_rgba(204,120,92,0.1)] transition-all duration-300",
          className
        )}
        {...props}
      >
        <div className="relative z-10 w-full h-full p-6">
          {children}
        </div>
      </motion.div>
    );
  }
);
Card.displayName = 'Card';
