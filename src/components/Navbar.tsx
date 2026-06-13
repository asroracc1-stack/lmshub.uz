import React from "react";
import { PanelLeftClose, PanelLeftOpen, Menu, Gift } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface NavbarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  setIsMenuOpen: (v: boolean) => void;
}

export default function Navbar({ isCollapsed, setIsCollapsed, setIsMenuOpen }: NavbarProps) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const basePath = `/${role}`;
  const go = (path: string) => navigate(path);
  const { t } = useTranslation();

  return (
    <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-4">
        {/* Toggle Button: Professional & Minimalist */}
        <button
          onClick={() => {
            if (window.innerWidth >= 768) {
              setIsCollapsed(!isCollapsed);
            } else {
              setIsMenuOpen(true);
            }
          }}
          className="p-2.5 rounded-xl text-slate-500 hover:bg-purple-50 hover:text-purple-600 transition-all border border-slate-100 shadow-sm active:scale-95 group bg-white"
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <PanelLeftOpen size={20} className="md:block hidden" /> : <PanelLeftClose size={20} className="md:block hidden" />}
          <Menu size={20} className="md:hidden block" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-2 hidden md:block" />
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:block">
          {t("common.lmsManagement")}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Referral Button */}
        <button
          onClick={() => go(`${basePath}/referral`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
          title={t("nav.referral")}
        >
          <Gift className="h-4 w-4" />
          <span className="hidden sm:inline">{t("nav.referral")}</span>
        </button>

        <LanguageSwitcher />
        <div className="h-8 w-px bg-slate-100 mx-1 hidden xs:block" />
        <ProfileMenu role={role as any} basePath={`/${role}`} />
      </div>
    </header>
  );
}