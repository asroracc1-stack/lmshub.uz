import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Lock,
  BookOpen,
  Crown,
  CheckCircle,
  ChevronDown
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  coverImage: string;
}

interface Material {
  id: string;
  title: string;
  author: string;
  description: string;
  subject: string;
  grade: string;
  topic: string;
  coverImageUrl: string;
  pdfUrl: string;
  accessType: string; // FREE, PRO, ELITE
  status: string;
  viewsCount: number;
  isFavorite?: boolean;
}

interface LibraryCategoryDetailProps {
  code?: string;
}

// Inline Local Translations dictionary for Category Detail Page
const detailTranslations = {
  uz: {
    backBtn: "Orqaga",
    titleSuffix: "bo'limi",
    yourSubscription: "Sizning obunangiz",
    freeAccess: "FREE",
    proAccess: "PRO",
    eliteAccess: "ELITE",
    locked: "Qulflangan",
    searchPlaceholder: "Kitob nomi yoki muallif...",
    accessFilter: "Kirish turi",
    accessAll: "Barcha kirish turlari",
    subjectFilter: "Fan",
    subjectAll: "Barcha fanlar",
    sortFilter: "Saralash",
    sortNewest: "Yangi qo'shilganlar",
    sortPopular: "Ko'p o'qilganlar",
    sortTitle: "Nomi bo'yicha",
    clearFilters: "Tozalash",
    pages: "{{count}} bet",
    noBooksTitle: "Hech qanday kitob topilmadi",
    noBooksSub: "Iltimos, boshqa filtrlar yoki qidiruv so'zlarini sinab ko'ring",
    modalTitle: "Premium Obuna Talab Qilinadi",
    modalDesc: "Ushbu material {{tier}} obuna toifasiga tegishli. O'qishni davom ettirish uchun obunangizni yangilang.",
    modalBenefit1: "Barcha premium kitoblar va darsliklarga to'liq kirish",
    modalBenefit2: "Cheksiz yuklab olish va offline rejimda o'qish",
    modalBenefit3: "Shaxsiy o'quv progressini va AI tahlilini kuzatish",
    modalBenefit4: "Milliy sertifikat va SAT mock imtihonlariga kirish",
    modalUpgradeBtn: "Hozir yangilash",
    modalCancelBtn: "Orqaga qaytish",
  },
  ru: {
    backBtn: "Назад",
    titleSuffix: "раздел",
    yourSubscription: "Ваша подписка",
    freeAccess: "FREE",
    proAccess: "PRO",
    eliteAccess: "ELITE",
    locked: "Заблокировано",
    searchPlaceholder: "Название или автор...",
    accessFilter: "Тип доступа",
    accessAll: "Все типы доступа",
    subjectFilter: "Предмет",
    subjectAll: "Все предметы",
    sortFilter: "Сортировка",
    sortNewest: "Новинки",
    sortPopular: "Популярные",
    sortTitle: "По названию",
    clearFilters: "Сбросить",
    pages: "{{count}} стр.",
    noBooksTitle: "Книг не найдено",
    noBooksSub: "Пожалуйста, попробуйте изменить фильтры или строку поиска",
    modalTitle: "Требуется Premium Подписка",
    modalDesc: "Этот материал доступен по подписке {{tier}}. Обновите свой пакет для доступа к чтению.",
    modalBenefit1: "Полный доступ ко всей премиум-библиотеке учебников",
    modalBenefit2: "Неограниченное скачивание и чтение в автономном режиме",
    modalBenefit3: "Отслеживание прогресса и AI-анализ обучения",
    modalBenefit4: "Доступ к национальным сертификатам и пробным тестам SAT",
    modalUpgradeBtn: "Обновить сейчас",
    modalCancelBtn: "Вернуться назад",
  },
  en: {
    backBtn: "Back",
    titleSuffix: "section",
    yourSubscription: "Your subscription",
    freeAccess: "FREE",
    proAccess: "PRO",
    eliteAccess: "ELITE",
    locked: "Locked",
    searchPlaceholder: "Title or author...",
    accessFilter: "Access type",
    accessAll: "All access types",
    subjectFilter: "Subject",
    subjectAll: "All subjects",
    sortFilter: "Sort",
    sortNewest: "Newest arrivals",
    sortPopular: "Most read",
    sortTitle: "By title",
    clearFilters: "Clear",
    pages: "{{count}} pages",
    noBooksTitle: "No books found",
    noBooksSub: "Please try other filter settings or keywords",
    modalTitle: "Premium Subscription Required",
    modalDesc: "This material belongs to the {{tier}} package. Upgrade your subscription to continue reading.",
    modalBenefit1: "Full access to all premium books and textbooks",
    modalBenefit2: "Unlimited downloads and offline reading capabilities",
    modalBenefit3: "Personal reading progress tracking and AI analysis",
    modalBenefit4: "Access to National Certificate and SAT mock exams",
    modalUpgradeBtn: "Upgrade Now",
    modalCancelBtn: "Go Back",
  }
};

// Beautiful Empty State Illustration component
const EmptyStateIllustration = () => (
  <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-48 mx-auto text-slate-400 dark:text-slate-650 opacity-60">
    <ellipse cx="200" cy="190" rx="120" ry="20" fill="currentColor" fillOpacity="0.05" />
    <path d="M140 180H260" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" strokeLinecap="round" />
    {/* Floating dotted path */}
    <path d="M200 40C240 70 240 100 200 130C160 160 160 190 200 220" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" strokeOpacity="0.2" fill="none" />
    {/* Search icon / magnifying glass abstract */}
    <circle cx="200" cy="110" r="35" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.03" />
    <line x1="225" y1="135" x2="255" y2="165" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    {/* Stardust/Sparkles */}
    <g className="animate-pulse">
      <circle cx="150" cy="80" r="2.5" fill="currentColor" fillOpacity="0.5" />
      <circle cx="250" cy="70" r="3.5" fill="currentColor" fillOpacity="0.4" />
      <circle cx="180" cy="150" r="2" fill="currentColor" fillOpacity="0.6" />
    </g>
  </svg>
);

// High-end Kindle/Apple Books cover placeholder component
const BookCoverPlaceholder = ({ title, author, accent }: { title: string; author: string; accent: string }) => {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${accent} p-5 flex flex-col justify-between text-white relative overflow-hidden select-none`}>
      {/* Abstract circles */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/25 blur-2xl" />
      <div className="text-[9px] uppercase tracking-widest font-black opacity-55">LMSHub Digital</div>
      <div className="space-y-1.5 my-auto">
        <h4 className="text-base md:text-lg font-black leading-tight line-clamp-3 uppercase tracking-tight drop-shadow">
          {title}
        </h4>
        <p className="text-[10px] font-bold opacity-80 line-clamp-1">{author || "Author"}</p>
      </div>
      <div className="flex items-center justify-between border-t border-white/20 pt-2.5 text-[8px] font-black opacity-70">
        <span>PREMIUM EDITION</span>
        <span>📚</span>
      </div>
    </div>
  );
};

export default function LibraryCategoryDetail({ code: propCode }: LibraryCategoryDetailProps = {}) {
  const { code: paramCode } = useParams<{ code: string }>();
  const code = propCode || paramCode;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const role = user?.role?.toLowerCase() || "user";
  const basePath = `/${role}`;
  const lang = (i18n.language || "uz") as "uz" | "ru" | "en";
  const t = detailTranslations[lang] || detailTranslations["uz"];

  const [category, setCategory] = useState<Category | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [userSubscriptionTier, setUserSubscriptionTier] = useState("FREE");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccessType, setSelectedAccessType] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sortBy, setSortBy] = useState("NEWEST");

  // Paywall Modal State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [modalTierRequired, setModalTierRequired] = useState<"PRO" | "ELITE" | null>(null);
  const [loading, setLoading] = useState(true);

  // Hardcode lists of genres/subjects based on category code to prevent unnecessary queries
  const genreList = code === "adabiy_kitoblar" 
    ? ["Romanlar", "Hikoyalar", "She'rlar", "Jahon adabiyoti", "O'zbek adabiyoti"]
    : ["Matematika", "Fizika", "Kimyo", "Biologiya", "Ingliz tili", "Tarix", "Ona tili", "Geografiya"];

  // Accents for placeholders based on category
  const placeholderAccents = [
    "from-indigo-600 to-purple-650",
    "from-teal-600 to-emerald-650",
    "from-blue-600 to-indigo-650",
    "from-rose-600 to-pink-650",
    "from-amber-600 to-orange-650"
  ];

  useEffect(() => {
    if (code) {
      fetchCategoryDetails();
      fetchUserSubscription();
    }
  }, [code]);

  useEffect(() => {
    if (category) {
      fetchMaterials();
    }
  }, [category, selectedSubject, selectedAccessType, searchQuery]);

  const fetchUserSubscription = async () => {
    try {
      const res = await api.get("/profile/my-subscription");
      setUserSubscriptionTier(res.data?.packType || "FREE");
    } catch (e) {
      console.error("Obuna ma'lumotlarini yuklashda xatolik:", e);
    }
  };

  const fetchCategoryDetails = async () => {
    try {
      setLoading(true);
      const catRes = await api.get(`/library/categories/${code}`);
      setCategory(catRes.data);
    } catch (e) {
      console.error(e);
      toast.error(lang === "uz" ? "Xatolik yuz berdi" : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (!category) return;
    try {
      setLoading(true);
      const res = await api.get("/library/materials", {
        params: {
          categoryId: category.id,
          subject: selectedSubject || undefined,
          accessType: selectedAccessType || undefined,
          search: searchQuery || undefined,
          size: 100 // Fetch a large batch to perform reliable frontend sorting/filtering
        }
      });
      setMaterials(res.data.content || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkHasAccess = (material: Material) => {
    if (["super_admin", "admin", "administrator", "teacher"].includes(role)) {
      return true;
    }
    if (material.accessType === "FREE") return true;
    if (material.accessType === "PRO") {
      return userSubscriptionTier === "PRO" || userSubscriptionTier === "ELITE";
    }
    if (material.accessType === "ELITE") {
      return userSubscriptionTier === "ELITE";
    }
    return false;
  };

  const handleMaterialClick = (material: Material) => {
    const access = checkHasAccess(material);
    if (access) {
      navigate(`${basePath}/library/read/${material.id}`);
    } else {
      setModalTierRequired(material.accessType as "PRO" | "ELITE");
      setShowSubscriptionModal(true);
    }
  };

  const handleRedirectToPacks = () => {
    setShowSubscriptionModal(false);
    const packsPath = role === "student" ? "/student/packs" : `${basePath}/subscriptions`;
    navigate(packsPath);
  };

  // Deterministic Page count generator
  const getPagesCount = (mId: string) => {
    if (!mId) return 180;
    let sum = 0;
    for (let i = 0; i < mId.length; i++) {
      sum += mId.charCodeAt(i);
    }
    return (sum % 280) + 120;
  };

  // Deterministic Accent generator for covers
  const getCoverAccent = (mId: string) => {
    if (!mId) return placeholderAccents[0];
    let sum = 0;
    for (let i = 0; i < mId.length; i++) {
      sum += mId.charCodeAt(i);
    }
    return placeholderAccents[sum % placeholderAccents.length];
  };

  // Filter and Sort materials array
  const filteredAndSortedMaterials = [...materials]
    .sort((a, b) => {
      if (sortBy === "NEWEST") {
        return new Date(b.id ? 10000 : 0).getTime() - new Date(a.id ? 10000 : 0).getTime();
      } else if (sortBy === "POPULAR") {
        return (b.viewsCount || 0) - (a.viewsCount || 0);
      } else if (sortBy === "TITLE") {
        return (a.title || "").localeCompare(b.title || "");
      }
      return 0;
    });

  return (
    <div className="w-full min-h-[85vh] pb-12 transition-colors duration-500 bg-[#F8FAFC] dark:bg-[#020617] text-slate-800 dark:text-slate-150">
      
      {/* ── HEADER NAVIGATION ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={() => navigate(`${basePath}/library`)}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors group shrink-0"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          {t.backBtn}
        </button>

        {category && (
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <span className="text-[10px] tracking-wider uppercase font-black px-3 py-1 rounded-full bg-purple-500/10 dark:bg-purple-400/10 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40">
              {t.yourSubscription}: {userSubscriptionTier}
            </span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-2">
        {category && (
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {category.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed font-medium">
              {category.description}
            </p>
          </div>
        )}

        {/* ── STEAM/NETFLIX STYLE TOP FILTER BAR ───────────────────────────── */}
        <div className="mb-8 flex flex-col lg:flex-row gap-4 p-4 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm z-20 relative">
          
          {/* Search Box */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-sm placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
            />
          </div>

          {/* Access Type dropdown */}
          <div className="w-full lg:w-[180px] relative">
            <select
              value={selectedAccessType}
              onChange={(e) => setSelectedAccessType(e.target.value)}
              className="w-full h-11 pl-3.5 pr-10 appearance-none bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="">{t.accessAll}</option>
              <option value="FREE">{t.freeAccess}</option>
              <option value="PRO">{t.proAccess}</option>
              <option value="ELITE">{t.eliteAccess}</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 pointer-events-none text-slate-400" />
          </div>

          {/* Type/Genre/Subject dropdown */}
          <div className="w-full lg:w-[180px] relative">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full h-11 pl-3.5 pr-10 appearance-none bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="">{code === "adabiy_kitoblar" ? (lang === "uz" ? "Barcha janrlar" : lang === "ru" ? "Все жанры" : "All genres") : t.subjectAll}</option>
              {genreList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 pointer-events-none text-slate-400" />
          </div>

          {/* Sort dropdown */}
          <div className="w-full lg:w-[180px] relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-11 pl-3.5 pr-10 appearance-none bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 transition-all"
            >
              <option value="NEWEST">{t.sortNewest}</option>
              <option value="POPULAR">{t.sortPopular}</option>
              <option value="TITLE">{t.sortTitle}</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 pointer-events-none text-slate-400" />
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedAccessType || selectedSubject) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedAccessType("");
                setSelectedSubject("");
              }}
              className="px-5 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors select-none shrink-0"
            >
              {t.clearFilters}
            </button>
          )}
        </div>

        {/* ── BOOK COVER SHOWCASE GRID ───────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="h-10 w-10 rounded-full border-4 border-purple-500/20 border-t-purple-650 animate-spin" />
          </div>
        ) : filteredAndSortedMaterials.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-[#0F172A]/20 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-sm text-center p-6">
            <EmptyStateIllustration />
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mt-6">
              {t.noBooksTitle}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-semibold max-w-sm mt-2">
              {t.noBooksSub}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-7">
            {filteredAndSortedMaterials.map((m) => {
              const access = checkHasAccess(m);
              const pages = getPagesCount(m.id);
              const coverAccent = getCoverAccent(m.id);
              const badgeLabel = m.accessType === "FREE" ? t.freeAccess : m.accessType;

              return (
                <motion.div
                  key={m.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMaterialClick(m)}
                  style={{
                    willChange: "transform",
                  }}
                  className="group cursor-pointer flex flex-col justify-between"
                >
                  {/* Book cover showcase area */}
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#0F172A] border border-slate-200/60 dark:border-slate-850 shadow-sm transition-all duration-500 ease-out group-hover:scale-[1.04] group-hover:shadow-[0_15px_35px_-8px_rgba(139,92,246,0.3)] group-hover:border-purple-500/40">
                    
                    {m.coverImageUrl ? (
                      <img
                        src={m.coverImageUrl}
                        alt={m.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <BookCoverPlaceholder title={m.title} author={m.author} accent={coverAccent} />
                    )}

                    {/* Access lock overlay */}
                    {!access && (
                      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1.5px] flex items-center justify-center text-white">
                        <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-900/80 border border-white/10 shadow-lg scale-95 group-hover:scale-100 transition-transform">
                          <Lock className="h-5 w-5 text-amber-400 animate-pulse" />
                          <span className="text-[9px] font-black tracking-wider uppercase">
                            {badgeLabel} {t.locked}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Floating Tier access badge */}
                    <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase shadow tracking-wider ${
                      m.accessType === "FREE" 
                        ? "bg-emerald-500 text-white" 
                        : m.accessType === "PRO" 
                        ? "bg-purple-600 text-white" 
                        : "bg-amber-500 text-slate-950"
                    }`}>
                      {badgeLabel}
                    </span>
                  </div>

                  {/* Metadata fields */}
                  <div className="mt-3.5 space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {m.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-450 dark:text-slate-400">
                      <span className="truncate max-w-[110px]">
                        {m.author || "Unknown"}
                      </span>
                      <span className="shrink-0 text-slate-400/80 dark:text-slate-500 text-[10px]">
                        {t.pages.replace("{{count}}", String(pages))}
                      </span>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PREMIUM paywall SUBSCRIPTION COMPARISON MODAL ────────────────── */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.93, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-md overflow-hidden rounded-[32px] border border-slate-200/20 dark:border-slate-800/80 bg-white dark:bg-[#0F172A] p-7 text-center shadow-2xl relative"
            >
              {/* Paywall Glowing Background Accents */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl bg-purple-600/15" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full blur-3xl bg-blue-600/15" />

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-md">
                <Crown className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {t.modalTitle}
              </h3>
              
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {t.modalDesc.replace("{{tier}}", String(modalTierRequired))}
              </p>

              {/* Perks Grid */}
              <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-[#020617]/50 border border-slate-100 dark:border-slate-800 text-left space-y-3.5">
                <div className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-300 font-semibold">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{t.modalBenefit1}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-300 font-semibold">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{t.modalBenefit2}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-300 font-semibold">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{t.modalBenefit3}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-300 font-semibold">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{t.modalBenefit4}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleRedirectToPacks}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/15 hover:scale-[1.01] transition-all"
                >
                  {t.modalUpgradeBtn} 🪙
                </button>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-2xl transition-colors"
                >
                  {t.modalCancelBtn}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
