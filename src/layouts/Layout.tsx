import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/50">
      {/* Sidebar – takes its natural width (w-72 or w-20), transitions automatically */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      {/* Main content – flex-1 + min-w-0: fills ALL remaining space after sidebar */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden transition-all duration-300">
        <Navbar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          setIsMenuOpen={setIsMenuOpen}
        />

        <main className="flex-1 overflow-y-auto p-5">
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90] md:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}