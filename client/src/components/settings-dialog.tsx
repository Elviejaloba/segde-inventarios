import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useThemeConfig, ThemeColor, AnimationStyle, SoundEffect, THEME_COLORS } from "@/lib/theme-config";
import { playSound } from "@/lib/sound-effects";
import { analytics } from "@/lib/analytics";

export function SettingsDialog() {
  const { primaryColor, animationStyle, soundEffect, setTheme, setAnimation, setSound } = useThemeConfig();

  const handleThemeChange = (value: ThemeColor) => {
    setTheme(value);
    analytics.logAction('theme_change', { theme: value });
  };

  const handleAnimationChange = (value: AnimationStyle) => {
    setAnimation(value);
    analytics.logAction('animation_change', { style: value });
  };

  const handleSoundChange = async (value: SoundEffect) => {
    setSound(value);
    if (value !== 'none') {
      await playSound(value);
    }
    analytics.logAction('sound_change', { effect: value });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Personalización</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <Label>Tema de Color</Label>
            <RadioGroup value={primaryColor} onValueChange={handleThemeChange}>
              {Object.keys(THEME_COLORS).map((color) => (
                <div key={color} className="flex items-center space-x-2">
                  <RadioGroupItem value={color} id={`color-${color}`} />
                  <Label htmlFor={`color-${color}`} className="capitalize">{color}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Estilo de Animación</Label>
            <RadioGroup value={animationStyle} onValueChange={handleAnimationChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minimal" id="animation-minimal" />
                <Label htmlFor="animation-minimal">Mínima</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="moderate" id="animation-moderate" />
                <Label htmlFor="animation-moderate">Moderada</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="celebration" id="animation-celebration" />
                <Label htmlFor="animation-celebration">Celebración</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Sonidos de Notificación</Label>
            <RadioGroup value={soundEffect} onValueChange={handleSoundChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="sound-none" />
                <Label htmlFor="sound-none">Sin sonido</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="chime" id="sound-chime" />
                <Label htmlFor="sound-chime">Campana suave</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bell" id="sound-bell" />
                <Label htmlFor="sound-bell">Campana</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="success" id="sound-success" />
                <Label htmlFor="sound-success">Éxito</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}