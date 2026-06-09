import { Hand, BookOpen, Puzzle, Code2, Network, Users, Pencil, Flag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NodeCategory } from '../../types/flow';

export const CATEGORY_ICONS: Record<NodeCategory, LucideIcon> = {
  greeting: Hand,
  fundamentals: BookOpen,
  dsa: Puzzle,
  coding: Code2,
  'system-design': Network,
  behavioral: Users,
  custom: Pencil,
  wrapup: Flag,
};
