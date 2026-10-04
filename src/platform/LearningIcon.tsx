import React from 'react';
import {ArrowRight, Bell, BookOpen, Bookmark, ChartColumn, Check, ChevronLeft, ChevronRight, House, List, RotateCcw, Search, Settings, Timer, X} from 'lucide-react-native';
import type {LearningIconName} from '../ui/nodes';

const icons = {home:House,book:BookOpen,timer:Timer,chart:ChartColumn,settings:Settings,bookmark:Bookmark,search:Search,
  'chevron-right':ChevronRight,check:Check,close:X,'arrow-right':ArrowRight,refresh:RotateCcw,bell:Bell,list:List,'chevron-left':ChevronLeft};

/** Decorative native vectors: the parent control supplies its accessible name. */
export function LearningIcon({name,size=22,color}:{name:LearningIconName;size?:number;color:string}) {
  const Icon=icons[name];
  return <Icon size={size} color={color} strokeWidth={2} accessible={false} pointerEvents="none" />;
}
