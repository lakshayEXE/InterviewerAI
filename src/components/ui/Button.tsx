import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    
    const variants = {
      primary: "bg-primary text-white hover:bg-primaryDim shadow-[0_4px_20px_rgba(204,120,92,0.25)] hover:shadow-[0_4px_28px_rgba(204,120,92,0.4)] border border-primary/50",
      secondary: "bg-white/[0.04] hover:bg-white/[0.08] text-textMain border border-white/[0.08] hover:border-white/[0.15]",
      danger: "bg-red-500/[0.06] hover:bg-red-500/[0.12] text-red-400 border border-red-500/20 hover:border-red-500/40",
      ghost: "bg-transparent hover:bg-white/[0.04] text-textMuted hover:text-white border border-transparent"
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm rounded-lg",
      md: "px-5 py-2.5 text-sm rounded-xl",
      lg: "px-8 py-4 text-base rounded-2xl font-semibold"
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: props.disabled ? 1 : 1.02 }}
        whileTap={{ scale: props.disabled ? 1 : 0.97 }}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
