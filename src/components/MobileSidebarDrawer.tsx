import { ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

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
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,86vw)] flex-col border-r border-sidebar-border bg-sidebar shadow-elegant md:hidden will-change-transform"
          >
            {/* Close button — pointer + click for max device coverage */}
            <button
              type="button"
              aria-label="Close menu"
              onPointerDown={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute right-3 top-3 z-[120] grid h-11 w-11 place-items-center rounded-full border border-border bg-background/95 backdrop-blur text-foreground shadow-lg hover:bg-muted active:scale-95 transition-all touch-manipulation cursor-pointer"
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              <X className="h-5 w-5 pointer-events-none" />
            </button>
            <div className="flex-1 min-h-0 flex flex-col pt-2">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
