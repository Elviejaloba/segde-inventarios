import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeColor = 'default' | 'blue' | 'green' | 'purple' | 'orange';
export type AnimationStyle = 'minimal' | 'moderate' | 'celebration';
export type SoundEffect = 'none' | 'chime' | 'bell' | 'success';

interface ThemeConfig {
  primaryColor: ThemeColor;
  animationStyle: AnimationStyle;
  soundEffect: SoundEffect;
  setTheme: (color: ThemeColor) => void;
  setAnimation: (style: AnimationStyle) => void;
  setSound: (effect: SoundEffect) => void;
}

export const useThemeConfig = create<ThemeConfig>()(
  persist(
    (set) => ({
      primaryColor: 'default',
      animationStyle: 'moderate',
      soundEffect: 'chime',
      setTheme: (color) => set({ primaryColor: color }),
      setAnimation: (style) => set({ animationStyle: style }),
      setSound: (effect) => set({ soundEffect: effect }),
    }),
    {
      name: 'theme-config',
    }
  )
);

export const THEME_COLORS = {
  default: {
    primary: 'hsl(222.2 47.4% 11.2%)',
    background: 'hsl(0 0% 100%)',
    border: 'hsl(214.3 31.8% 91.4%)',
  },
  blue: {
    primary: 'hsl(221.2 83.2% 53.3%)',
    background: 'hsl(210 40% 98%)',
    border: 'hsl(214.3 31.8% 91.4%)',
  },
  green: {
    primary: 'hsl(142.1 76.2% 36.3%)',
    background: 'hsl(140 40% 98%)',
    border: 'hsl(144.3 31.8% 91.4%)',
  },
  purple: {
    primary: 'hsl(262.1 83.3% 57.8%)',
    background: 'hsl(260 40% 98%)',
    border: 'hsl(264.3 31.8% 91.4%)',
  },
  orange: {
    primary: 'hsl(24.6 95% 53.1%)',
    background: 'hsl(20 40% 98%)',
    border: 'hsl(24.3 31.8% 91.4%)',
  },
};
