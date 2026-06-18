import { ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  routeKey: string;
  children: ReactNode;
}

export default function MobileSidebarDrawer({
  open,
  onClose,
  routeKey,
  children,
}: MobileSidebarDrawerProps) {
  const isFirstRender = useRef(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Auto-close on route change (skip initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onCloseRef.current();
  }, [routeKey]);

  // Body scroll lock + ESC handling
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — faqat drawer tashqarisiga bosilganda yopadi */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          />

          {/* Drawer — z-50 bilan backdrop ustida, NavLink'lar to'liq bosiladi */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(19rem,82vw)] flex-col border-r border-sidebar-border bg-white dark:bg-[#140D23] shadow-2xl shadow-black/20 dark:shadow-black/50 md:hidden will-change-transform rounded-r-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 min-h-0 flex flex-col pt-2">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
