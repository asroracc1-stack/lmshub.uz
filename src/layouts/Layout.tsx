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
    <div className="flex h-screen overflow-hidden bg-slate-50/30">
      {/* Sidebar - State passed via props */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <Navbar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          setIsMenuOpen={setIsMenuOpen} 
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-300">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[90] md:hidden transition-all duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}