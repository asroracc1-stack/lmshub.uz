import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Phone, MapPin, Globe, Camera, Volume2, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface OrganizationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgData: any;
  onUpdate: (data: any) => Promise<void>;
  clockSettings: { visible: boolean; sound: boolean };
  onClockUpdate: (settings: { visible: boolean; sound: boolean }) => void;
}

export default function OrganizationSettingsModal({ 
  isOpen, 
  onClose, 
  orgData, 
  onUpdate,
  clockSettings,
  onClockUpdate
}: OrganizationSettingsModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    logoUrl: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Helper to safely convert address (object or string) → display string
  const resolveAddress = (addr: any): string => {
    if (!addr) return "";
    if (typeof addr === "string") return addr;
    if (typeof addr === "object") {
      return [addr.full_address, addr.street_address, addr.district, addr.region]
        .filter(Boolean).join(", ");
    }
    return "";
  };

  useEffect(() => {
    if (orgData) {
      setFormData({
        name: orgData.name || "",
        email: orgData.email || "",
        phone: orgData.phone || "",
        address: resolveAddress(orgData.address),
        logoUrl: orgData.logoUrl || ""
      });
      setPreviewUrl(orgData.logoUrl || null);
    }
  }, [orgData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        setFormData(prev => ({ ...prev, logoUrl: result })); // Simulated upload (base64)
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error("Iltimos, barcha majburiy maydonlarni to'ldiring!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const addressParts = formData.address.split(",").map(s => s.trim()).filter(Boolean);
      const region = addressParts[0] || "Toshkent";
      const district = addressParts[1] || region;
      const streetAddress = addressParts.slice(2).join(", ") || formData.address || "Asosiy bino";

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        logoUrl: formData.logoUrl,
        address: {
          region,
          district,
          streetAddress,
          fullAddress: formData.address
        }
      };

      await onUpdate(payload);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] p-0 overflow-hidden border-none bg-white dark:bg-slate-900 shadow-2xl rounded-2xl flex flex-col">
        {/* Header - Fixed */}
        <div className="relative p-8 pb-4 space-y-6 shrink-0">
          <div className="absolute -top-24 -right-24 w-48 h-48 blur-[80px] rounded-full opacity-10 bg-primary" />
          
          <DialogHeader className="relative z-10 text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/10 shadow-sm">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Tashkilot Sozlamalari
                </DialogTitle>
                <DialogDescription id="org-settings-description" className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Tashkilot ma'lumotlari va tizim parametrlarini boshqarish.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 relative z-10 thin-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 flex justify-center mb-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 overflow-hidden transition-all group-hover:border-primary/50">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-lg shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  <Camera className="h-4 w-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Tashkilot Nomi</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  required
                  placeholder="Masalan: PDP Academy"
                  className="pl-10 h-11 rounded-lg bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:ring-primary/10 shadow-inner"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  type="email"
                  required
                  placeholder="info@pdp.uz"
                  className="pl-10 h-11 rounded-lg bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:ring-primary/10 shadow-inner"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="+998 90 123 45 67"
                  className="pl-10 h-11 rounded-lg bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:ring-primary/10 shadow-inner"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Manzil</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Toshkent sh, Yunusobod..."
                  className="pl-10 h-11 rounded-lg bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:ring-primary/10 shadow-inner"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Dashboard Sozlamalari</Label>
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-primary/20 transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-primary/60" />
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Smart Clock Ko'rinishi</p>
                    <p className="text-[10px] text-slate-400">Headerdagi soatni yoqish/o'chirish</p>
                  </div>
                </div>
                <Switch 
                  checked={clockSettings.visible}
                  onCheckedChange={(v) => onClockUpdate({...clockSettings, visible: v})}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-primary/20 transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-primary/60" />
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Soat Ovozi (Tick-Tock)</p>
                    <p className="text-[10px] text-slate-400">Har soniyada chiqadigan ovozni boshqarish</p>
                  </div>
                </div>
                <Switch 
                  checked={clockSettings.sound}
                  onCheckedChange={(v) => onClockUpdate({...clockSettings, sound: v})}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer - Fixed Sticky */}
        <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-end gap-3 w-full">
            <Button type="button" variant="ghost" onClick={onClose} className="h-11 rounded-lg font-bold px-6">Bekor qilish</Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 rounded-lg bg-primary text-white font-bold uppercase tracking-widest text-[10px] px-10 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
            >
              {isSubmitting ? "SAQLANMOQDA..." : "SAQLASH"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
