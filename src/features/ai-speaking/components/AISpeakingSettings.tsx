import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Settings, Mic, Volume2, Video, Sparkles, Languages, SunMoon 
} from "lucide-react";
import { SpeakingSettings } from "../types";
import { useTheme } from "@/contexts/ThemeContext";

interface AISpeakingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AISpeakingSettings({ isOpen, onClose }: AISpeakingSettingsProps) {
  const { theme, setTheme } = useTheme();
  
  const [config, setConfig] = useState<SpeakingSettings>({
    avatarId: "avatar-robby",
    voiceId: "voice-conversational",
    inputDeviceId: "mic-default",
    outputDeviceId: "audio-default",
    cameraDeviceId: "cam-default",
    theme: theme as 'light' | 'dark',
  });

  const handleSave = () => {
    // Save settings locally
    setTheme(config.theme);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-[#111827] border-none rounded-[2rem] shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            AI Speaking Settings
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Configure devices and conversational parameters</p>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[350px] overflow-y-auto pr-1">
          {/* Avatar Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Choose AI Avatar
            </Label>
            <Select 
              value={config.avatarId} 
              onValueChange={(val) => setConfig((prev) => ({ ...prev, avatarId: val }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avatar-robby">Robby (Default Robot)</SelectItem>
                <SelectItem value="avatar-sophia">Sophia (Humanoid Companion)</SelectItem>
                <SelectItem value="avatar-neon">Neon (Futuristic AI)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Voice Model Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-purple-500" /> Voice Synthesis Style
            </Label>
            <Select 
              value={config.voiceId} 
              onValueChange={(val) => setConfig((prev) => ({ ...prev, voiceId: val }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voice-conversational">Conversational English (Default)</SelectItem>
                <SelectItem value="voice-natural">Natural American Accent</SelectItem>
                <SelectItem value="voice-academic">Academic British (Formal)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audio Input Device */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-teal-500" /> Microphone Input
            </Label>
            <Select 
              value={config.inputDeviceId} 
              onValueChange={(val) => setConfig((prev) => ({ ...prev, inputDeviceId: val }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mic-default">System Default Input</SelectItem>
                <SelectItem value="mic-built-in">Built-in Microphone Array</SelectItem>
                <SelectItem value="mic-external">External USB Microphone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audio Output Device */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" /> Audio Output
            </Label>
            <Select 
              value={config.outputDeviceId} 
              onValueChange={(val) => setConfig((prev) => ({ ...prev, outputDeviceId: val }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audio-default">System Default Output</SelectItem>
                <SelectItem value="audio-headphones">Stereo Headphones (Bluetooth)</SelectItem>
                <SelectItem value="audio-speakers">Built-in Speakers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Webcam Device */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-indigo-500" /> Camera Feed
            </Label>
            <Select 
              value={config.cameraDeviceId} 
              onValueChange={(val) => setConfig((prev) => ({ ...prev, cameraDeviceId: val }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cam-default">FaceTime HD Built-in Cam</SelectItem>
                <SelectItem value="cam-external">USB HD Webcam</SelectItem>
                <SelectItem value="cam-disabled">Disabled (Audio Only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Theme Switcher */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
              <SunMoon className="w-3.5 h-3.5 text-slate-500" /> Interface Theme
            </Label>
            <Select 
              value={config.theme} 
              onValueChange={(val: 'light' | 'dark') => setConfig((prev) => ({ ...prev, theme: val }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="rounded-xl h-11 px-6 font-bold"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-blue-500/10"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
