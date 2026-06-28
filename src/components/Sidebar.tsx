import { useTranslation } from "react-i18next";
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CreditCard, 
  Settings, 
  GraduationCap 
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  isMenuOpen?: boolean;
  setIsMenuOpen?: (open: boolean) => void;
}

const Sidebar = ({ isCollapsed, isMenuOpen, setIsMenuOpen }: SidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Bosh sahifa', icon: Home, path: '/' },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Talabalar', icon: Users, path: '/students' },
    { name: 'Guruhlar', icon: BookOpen, path: '/groups' },
    { name: 'To\'lovlar', icon: CreditCard, path: '/payments' },
    { name: 'Sozlamalar', icon: Settings, path: '/settings' },
  ];

  const handleItemClick = (path: string) => {
    navigate(path);
    if (setIsMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-[100] md:relative h-screen bg-white dark:bg-[#161d27] border-r border-slate-100 dark:border-slate-800 flex flex-col shadow-2xl md:shadow-none
        transition-all duration-300 ease-in-out shrink-0
        ${isCollapsed ? 'md:w-20' : 'md:w-72'}
        ${isMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Header */}
      <div className={`p-6 flex items-center h-[90px] shrink-0 transition-all duration-300 ${isCollapsed ? 'md:justify-center px-4' : 'justify-start'}`}>
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="bg-[#4ab658] p-2.5 rounded-xl shrink-0 shadow-lg shadow-[#4ab658]/20 flex items-center justify-center">
            <GraduationCap className="text-white" size={26} />
          </div>
          <span className={`font-black text-[22px] text-slate-800 dark:text-white tracking-tight whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'md:opacity-0 md:hidden' : 'opacity-100 block'}`}>
            LMS Hub<span className="text-[#4ab658]">.</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto thin-scrollbar">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              onClick={() => handleItemClick(item.path)}
              title={isCollapsed ? item.name : undefined}
              className={`
                w-full flex items-center rounded-2xl transition-all duration-200 group sidebar-nav-link
                ${isCollapsed ? 'md:justify-center md:p-3.5' : 'justify-start px-4 py-3.5'}
                ${isActive 
                  ? 'bg-[#4ab658] text-white shadow-md shadow-[#4ab658]/20 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white font-semibold'
                }
              `}
            >
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2}
                className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} 
              />
              
              <span 
                className={`
                  whitespace-nowrap transition-all duration-300 origin-left text-[15px]
                  ${isCollapsed ? 'md:w-0 md:opacity-0 md:hidden md:ml-0' : 'w-auto opacity-100 block ml-4'}
                `}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div className={`p-4 mx-4 mb-4 mt-2 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0 transition-all duration-300 flex items-center ${isCollapsed ? 'md:justify-center md:mx-2 md:p-2' : 'justify-start gap-3'}`}>
        <div className="w-11 h-11 rounded-full bg-[#4ab658]/10 dark:bg-[#4ab658]/20 flex items-center justify-center text-[#4ab658] font-bold shrink-0 transition-transform hover:scale-105 cursor-pointer">
          A
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:opacity-0 md:hidden md:w-0' : 'opacity-100 block w-auto'}`}>
          <p className="text-[14px] font-bold text-slate-800 dark:text-white truncate">{t("dynamic.sidebar.admin_user")}</p>
          <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 truncate">{t("dynamic.sidebar.adminlmshubuz")}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;