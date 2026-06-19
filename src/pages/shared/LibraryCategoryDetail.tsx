import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  BookOpen,
  Filter,
  FileText,
  Lock,
  Compass,
  Search,
  Grid,
  Heart,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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

export default function LibraryCategoryDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || "user";
  const basePath = `/${role}`;

  const [category, setCategory] = useState<Category | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  
  // Active subscription check
  const [userSubscriptionTier, setUserSubscriptionTier] = useState("FREE");

  // Filters state
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedAccessType, setSelectedAccessType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [modalTierRequired, setModalTierRequired] = useState<"PRO" | "ELITE" | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (code) {
      fetchCategoryAndFilters();
      fetchUserSubscription();
    }
  }, [code]);

  useEffect(() => {
    if (category) {
      fetchMaterials();
    }
  }, [category, selectedSubject, selectedGrade, selectedAccessType, searchQuery, page]);

  const fetchUserSubscription = async () => {
    try {
      const res = await api.get("/profile/my-subscription");
      setUserSubscriptionTier(res.data?.packType || "FREE");
    } catch (e) {
      console.error("Obuna ma'lumotlarini yuklashda xatolik:", e);
    }
  };

  const fetchCategoryAndFilters = async () => {
    try {
      setLoading(true);
      const catRes = await api.get(`/library/categories/${code}`);
      setCategory(catRes.data);

      const subjectsRes = await api.get("/library/subjects");
      setSubjects(subjectsRes.data);

      const gradesRes = await api.get("/library/grades");
      setGrades(gradesRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
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
          grade: selectedGrade || undefined,
          accessType: selectedAccessType || undefined,
          search: searchQuery || undefined,
          page,
          size: 12
        }
      });
      setMaterials(res.data.content || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (e) {
      console.error(e);
      toast.error("Materiallarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const checkHasAccess = (material: Material) => {
    if (["SUPER_ADMIN", "ADMIN", "ADMINISTRATOR", "TEACHER"].includes(user?.role || "")) {
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

  const handleToggleFavorite = async (materialId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/library/materials/${materialId}/favorite`);
      setMaterials(prev =>
        prev.map(m => (m.id === materialId ? { ...m, isFavorite: res.data.isFavorite } : m))
      );
      toast.success(res.data.isFavorite ? "Sevimlilarga qo'shildi ❤️" : "Sevimlilardan o'chirildi");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRedirectToPacks = () => {
    setShowSubscriptionModal(false);
    const packsPath = role === "student" ? "/student/packs" : `${basePath}/subscriptions`;
    navigate(packsPath);
  };

  // Subcategories mock list for CARD #1: Adabiy Kitoblar
  const adabiySubcategories = ["Romanlar", "Hikoyalar", "She'rlar", "Jahon adabiyoti", "O'zbek adabiyoti"];

  // Subjects mock list for CARD #2 / #3
  const standardSubjects = ["Matematika", "Ona tili", "Ingliz tili", "Fizika", "Kimyo", "Biologiya", "Tarix", "Geografiya"];

  return (
    <div className="w-full space-y-6 pb-10">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(`${basePath}/library`)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kutubxonaga qaytish
        </button>
        {category && (
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
            {category.name} bo'limi
          </h1>
        )}
      </div>

      {category && (
        <div className="p-6 bg-gradient-to-r from-purple-900/40 via-slate-900/50 to-purple-900/40 border border-[#2E1E52]/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">{category.name}</h2>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-xl">
              {category.description}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-center">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Sizning obunangiz</p>
              <p className="text-sm font-bold text-emerald-400">{userSubscriptionTier} TIER</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Subcategory Quick Filters (only for Adabiy Kitoblar) ── */}
      {code === "adabiy_kitoblar" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSubject("")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedSubject === ""
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            }`}
          >
            Barchasi
          </button>
          {adabiySubcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedSubject === sub
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* ── Main Layout: Filters & Materials Grid ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filters Sidebar */}
        <div className="bg-white dark:bg-[#111827] border border-[#E8DDFB] dark:border-[#222738] rounded-2xl p-5 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Filtrlar</h3>
          </div>

          {/* Search query input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-400">Qidiruv</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Kitob nomi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Subjects dropdown */}
          {code !== "adabiy_kitoblar" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-400">Fan bo'yicha</label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setPage(0);
                }}
                className="w-full h-9 px-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              >
                <option value="">Barcha fanlar</option>
                {standardSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grades dropdown (only for Maktab darsliklari) */}
          {code === "maktab_darsliklari" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-400">Sinf bo'yicha</label>
              <select
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setPage(0);
                }}
                className="w-full h-9 px-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
              >
                <option value="">Barcha sinflar</option>
                {Array.from({ length: 11 }, (_, i) => `${i + 1}-sinf`).map((gr) => (
                  <option key={gr} value={gr}>
                    {gr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Access Tier dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-400">Kirish turi</label>
            <select
              value={selectedAccessType}
              onChange={(e) => {
                setSelectedAccessType(e.target.value);
                setPage(0);
              }}
              className="w-full h-9 px-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none"
            >
              <option value="">Barchasi</option>
              <option value="FREE">Bepul (Free)</option>
              <option value="PRO">PRO</option>
              <option value="ELITE">ELITE</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSelectedSubject("");
              setSelectedGrade("");
              setSelectedAccessType("");
              setSearchQuery("");
              setPage(0);
            }}
            className="w-full py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Filtrni tozalash
          </button>
        </div>

        {/* Materials Grid */}
        <div className="lg:col-span-3 space-y-6">
          {loading && materials.length === 0 ? (
            <div className="flex justify-center items-center py-20 bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
              <BookOpen className="h-12 w-12 text-slate-400" />
              <p className="text-slate-400 text-sm">Ushbu filtrlar bo'yicha hech qanday kitob topilmadi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {materials.map((m) => {
                const hasAccess = checkHasAccess(m);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleMaterialClick(m)}
                    className="group bg-white dark:bg-[#111827] border border-[#E8DDFB] dark:border-[#222738] rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Cover image area */}
                    <div className="relative aspect-[3/4] bg-slate-100 dark:bg-[#0F172A] overflow-hidden flex items-center justify-center">
                      {m.coverImageUrl ? (
                        <img
                          src={m.coverImageUrl}
                          alt={m.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <FileText className="h-16 w-16 text-slate-300 dark:text-slate-700" />
                      )}

                      {/* Favorite Heart Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(m.id, e)}
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/60 text-white transition-colors"
                      >
                        <Heart
                          className={`h-4 w-4 transition-colors ${
                            m.isFavorite ? "text-rose-500 fill-rose-500" : "text-white"
                          }`}
                        />
                      </button>

                      {/* Access Lock indicator */}
                      {!hasAccess && (
                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center text-white">
                          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-black/55">
                            <Lock className="h-5 w-5 text-amber-400" />
                            <span className="text-[10px] font-bold tracking-wider uppercase">
                              {m.accessType} Qulflangan
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Free Tag */}
                      {hasAccess && m.accessType === "FREE" && (
                        <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500 text-white shadow">
                          FREE
                        </span>
                      )}
                      {hasAccess && m.accessType !== "FREE" && (
                        <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-600 text-white shadow">
                          {m.accessType} Ochiq
                        </span>
                      )}
                    </div>

                    {/* Metadata area */}
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                          {m.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {m.author || "Noma'lum muallif"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        {m.subject && (
                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                            {m.subject}
                          </span>
                        )}
                        {m.grade && (
                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                            {m.grade}
                          </span>
                        )}
                        {m.topic && (
                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">
                            {m.topic}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-white/10"
              >
                Orqaga
              </button>
              <span className="text-xs text-slate-500 font-semibold">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page === totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-white/10"
              >
                Keyingi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Subscription Redirection Modal ──────────────────── */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/80 bg-[#161226] p-6 text-center shadow-2xl"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <ShieldAlert className="h-6 w-6" />
              </div>

              <h3 className="text-lg font-extrabold text-white">Obuna talab etiladi!</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Ushbu material <span className="font-bold text-amber-400">{modalTierRequired}</span> obuna toifasi uchun ruxsat etilgan. Davom etish uchun obunani yangilashingiz lozim.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={handleRedirectToPacks}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.01]"
                >
                  Obuna bo'lish 🪙
                </button>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="w-full py-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
