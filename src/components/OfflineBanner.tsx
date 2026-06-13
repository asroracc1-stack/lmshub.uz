import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="fixed top-0 inset-x-0 z-[100] flex justify-center pt-3 px-3 pointer-events-none"
        >
          <div className="pointer-events-auto glass shadow-elegant rounded-full px-4 py-2 flex items-center gap-2 border border-destructive/40">
            <WifiOff className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">{t("dynamic.offlinebanner.internet_aloqasi_uzildi")}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
