import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CreditCard, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap 
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  isMenuOpen?: boolean;
  setIsMenuOpen?: (open: boolean) => void;
}

const Sidebar = ({ isCollapsed, isMenuOpen, setIsMenuOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState('Bosh sahifa');

  const menuItems = [
    { name: 'Bosh sahifa', icon: Home, path: '/' },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Talabalar', icon: Users, path: '/students' },
    { name: 'Guruhlar', icon: BookOpen, path: '/groups' },
    { name: 'To\'lovlar', icon: CreditCard, path: '/payments' },
    { name: 'Sozlamalar', icon: Settings, path: '/settings' },
  ];

  // 2. Navigatsiya va mobil menyuni avtomatik yopish birlashtirildi
  const handleItemClick = (name: string, path: string) => {
    setActiveItem(name);
    navigate(path);
    
    // Agar mobil versiyada bo'lsak, menyuni yopamiz
    if (setIsMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    /* 3. Animatsiya va UX: transform va transition orqali silliq chiqib kelish */
    <aside 
      className={`
        fixed inset-y-0 left-0 z-[100] md:relative h-screen bg-white border-r border-slate-200 flex flex-col shadow-2xl md:shadow-sm
        transition-all duration-300 ease-in-out transform will-change-[width,transform] 
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        /* Mobil holatda ochilishi/yopilishi */
        ${isMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Header & Toggle */}
      <div className="p-4 flex items-center justify-between h-20 shrink-0">
        {/* Logo: Mobil ochiq holatda yoki Desktop yig'ilmagan holatda ko'rinadi */}
        {(isMenuOpen || !isCollapsed) && (
          <div className="flex items-center gap-3 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-emerald-600 p-2.5 rounded-xl shrink-0 shadow-lg shadow-emerald-500/20">
              <GraduationCap className="text-white" size={24} />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight whitespace-nowrap">
              LMS Hub
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto thin-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeItem === item.name;
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              onClick={() => handleItemClick(item.name, item.path)}
              className={`
                w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
                }
                ${isCollapsed ? 'md:justify-center' : 'justify-start'}
              `}
            >
              <Icon 
                size={22} 
                className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'}`} 
              />
              
              <span 
                className={`
                  ml-3 font-medium whitespace-nowrap transition-all duration-300 origin-left
                  ${isCollapsed ? 'md:w-0 md:opacity-0 md:invisible md:ml-0' : 'w-auto opacity-100 visible'}
                `}
              >
                {item.name}
              </span>

              {/* Tooltip: Faqat Desktopda, panel yig'ilgan holatda ko'rinadi */}
              {isCollapsed && !isMenuOpen && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
                  {item.name}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile - Mobil menyuda ham ko'rinadi */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <div className={`flex items-center ${isCollapsed && !isMenuOpen ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white shadow-md flex items-center justify-center text-emerald-700 font-bold shrink-0 transition-transform hover:scale-105 cursor-pointer">
            A
          </div>
          {(!isCollapsed || isMenuOpen) && (
            <div className="overflow-hidden animate-in fade-in duration-300">
              <p className="text-sm font-semibold text-slate-800 truncate">Admin User</p>
              <p className="text-xs text-slate-500 truncate">admin@lmshub.uz</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;