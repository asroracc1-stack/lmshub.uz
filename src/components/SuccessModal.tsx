import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import TigerPlayer from "./TigerPlayer";
import { motion, AnimatePresence } from "framer-motion";

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
}

export default function SuccessModal({
  open, onOpenChange, title = "Muvaffaqiyatli!", message }: SuccessModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="rounded-3xl glass p-8 text-center space-y-4"
            >
              <TigerPlayer size={200} text="" className="py-0" />
              
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-display font-bold neon-text">{title}</DialogTitle>
                <DialogDescription className="sr-only">{t("dynamic.successmodal.success_message_for_the_current_action")}</DialogDescription>
                {message && <p className="text-muted-foreground">{message}</p>}
              </div>
              
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2 }}
                className="h-1 bg-gradient-to-r from-primary to-secondary rounded-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
