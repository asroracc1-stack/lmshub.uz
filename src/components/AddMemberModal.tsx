import { useState } from "react";
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
import { UserPlus, GraduationCap, Mail, User, Phone, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AddMemberModalProps {
  type: "teacher" | "student" | "admin" | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

export default function AddMemberModal({ type, isOpen, onClose, onSubmit }: AddMemberModalProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    username: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = type === "teacher" ? "Yangi O'qituvchi Qo'shish" : type === "student" ? "Yangi Talaba Qo'shish" : "Yangi Admin Qo'shish";
  const Icon = type === "teacher" ? GraduationCap : type === "student" ? UserPlus : Shield;
  const color = type === "teacher" ? "text-blue-500" : type === "student" ? "text-emerald-500" : "text-purple-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      setFormData({ full_name: "", email: "", phone: "", username: "" });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-white dark:bg-slate-900 shadow-2xl rounded-2xl">
        <div className="relative p-8 space-y-6">
          {/* Background Glow */}
          <div className={cn("absolute -top-24 -right-24 w-48 h-48 blur-[80px] rounded-full opacity-10", 
            type === "teacher" ? "bg-blue-500" : type === "student" ? "bg-emerald-500" : "bg-purple-500"
          )} />
          
          <DialogHeader className="relative z-10 text-left">
            <div className="flex items-center gap-4 mb-2">
              <div className={cn("p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm", color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Tizimga yangi {type === "teacher" ? "o'qituvchi" : type === "student" ? "talaba" : "admin"} ma'lumotlarini kiriting.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">F.I.SH</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="full_name"
                    required
                    placeholder="Eshmatov Toshmat"
                    className="pl-10 h-11 rounded-lg bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-inner focus:ring-primary/10 transition-all"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      id="email"
                      type="email"
                      required
                      placeholder="example@mail.com"
                      className="pl-10 h-11 rounded-lg bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-inner focus:ring-primary/10 transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Telefon</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      id="phone"
                      placeholder="+998 90 123 45 67"
                      className="pl-10 h-11 rounded-lg bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-inner focus:ring-primary/10 transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Login (Username)</Label>
                <Input 
                  id="username"
                  required
                  placeholder="toshmat_2024"
                  className="h-11 rounded-lg bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 shadow-inner focus:ring-primary/10 transition-all"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                className="h-11 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Bekor qilish
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="h-11 rounded-lg bg-primary text-white font-bold uppercase tracking-widest text-[10px] px-10 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
              >
                {isSubmitting ? "QO'SHILMOQDA..." : "TASDIQLASH"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
