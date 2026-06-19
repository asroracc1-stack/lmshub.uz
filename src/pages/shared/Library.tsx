import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  Search,
  BookMarked,
  Sparkles,
  ArrowRight,
  Heart,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/button"; // using standard HTML input for better styling or ui input if imported
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  coverImage: string;
  materialsCount?: number;
}

interface Material {
  id: string;
  title: string;
  author: string;
  subject: string;
  grade: string;
  topic: string;
  accessType: string;
  coverImageUrl: string;
}

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || "user";
  const basePath = `/${role}`;

  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchFavorites();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/library/categories");
      // Count materials inside each category dynamically for visual count
      const updatedCategories = await Promise.all(
        res.data.map(async (cat: Category) => {
          try {
            const countRes = await api.get("/library/materials", {
              params: { categoryId: cat.id, size: 1 }
            });
            return {
              ...cat,
              materialsCount: countRes.data.totalElements || 0
            };
          } catch (e) {
            return { ...cat, materialsCount: 0 };
          }
        })
      );
      setCategories(updatedCategories);
    } catch (e) {
      console.error("Kategoriyalarni yuklashda xatolik:", e);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await api.get("/library/favorites");
      setFavorites(res.data);
    } catch (e) {
      console.error("Sevimlilarni yuklashda xatolik:", e);
    }
  };

  // Handle live global search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      setIsSearching(true);
      try {
        const res = await api.get("/library/materials", {
          params: { search: searchQuery, size: 8 }
        });
        setSearchResults(res.data.content || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Mock student stats/failures for dynamic AI Recommendation
  const aiRecommendations = [
    {
      title: "Algebra o'quv qo'llanmasi",
      topic: "Algebra",
      reason: "Siz yaqinda algebra testlarida bir nechta xatoga yo'l qo'ydingiz.",
      id: "algebra-guide"
    },
    {
      title: "Geometriya va Trigonometriya formulalari",
      topic: "Trigonometriya",
      reason: "Mavzu bo'yicha bilimlarni mustahkamlash uchun formulalar.",
      id: "trig-guide"
    }
  ];

  // Hardcode category cover style variables to match premium requirements
  const getCategoryStyles = (code: string) => {
    switch (code) {
      case "adabiy_kitoblar":
        return {
          gradient: "from-blue-600/90 to-purple-600/90",
          shadow: "shadow-purple-500/10 hover:shadow-purple-500/20",
          emoji: "📖",
          bg: "bg-purple-500/10 text-purple-400"
        };
      case "maktab_darsliklari":
        return {
          gradient: "from-emerald-600/90 to-teal-600/90",
          shadow: "shadow-emerald-500/10 hover:shadow-emerald-500/20",
          emoji: "🎓",
          bg: "bg-emerald-500/10 text-emerald-400"
        };
      case "oquv_qollanmalar":
      default:
        return {
          gradient: "from-amber-600/90 to-rose-600/90",
          shadow: "shadow-amber-500/10 hover:shadow-amber-500/20",
          emoji: "📚",
          bg: "bg-amber-500/10 text-amber-400"
        };
    }
  };

  return (
    <div className="w-full space-y-8 pb-10">
      {/* ── Banner: Header ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1E1B4B] via-[#0F172A] to-[#1E1B4B] p-8 md:p-12 border border-[#2E1E52] shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            LMSHub Digital Library
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Bilimlar xazinasi va o'quv materiallari
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Romanlar, o'quv qo'llanmalari hamda maktab darsliklarining barcha to'plami. Istalgan materialni qidiring, sevimlilarga qo'shing va o'z o'qish progressizni kuzating.
          </p>

          {/* Global Search Box */}
          <div className="relative max-w-lg mt-6 group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Kitob nomi, muallif, fan yoki mavzu bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-[#0F172A]/85 backdrop-blur-xl border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search Results ────────────────────────────────────── */}
      {isSearching && (
        <div className="bg-[#111827] border border-[#222738] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-400" />
              Qidiruv natijalari: "{searchQuery}"
            </h2>
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearching(false);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Natijalarni tozalash
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Bunday material topilmadi.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {searchResults.map((material) => (
                <div
                  key={material.id}
                  onClick={() => navigate(`${basePath}/library/read/${material.id}`)}
                  className="group bg-[#0F172A] border border-slate-800 rounded-xl p-3 hover:border-purple-500/50 cursor-pointer transition-all duration-300"
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 bg-slate-900 flex items-center justify-center">
                    {material.coverImageUrl ? (
                      <img
                        src={material.coverImageUrl}
                        alt={material.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <FileText className="h-12 w-12 text-slate-700" />
                    )}
                    <span className="absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-slate-300 font-bold uppercase">
                      {material.accessType}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">{material.title}</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{material.author || "Muallifsiz"}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                      {material.subject}
                    </span>
                    {material.grade && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium">
                        {material.grade}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Category Cards (3 Premium Cards) ──────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-500" />
          Kutubxona bo'limlari
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((cat, idx) => {
            const styles = getCategoryStyles(cat.code);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                onClick={() => navigate(`${basePath}/library/category/${cat.code}`)}
                className={`relative group h-72 rounded-[24px] overflow-hidden cursor-pointer border border-[#2E1E52]/20 dark:border-white/5 bg-[#111827] shadow-xl ${styles.shadow} transition-all duration-300`}
              >
                {/* Cover / Background Overlay with Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} mix-blend-multiply opacity-80 group-hover:opacity-90 transition-opacity duration-300`} />
                
                {cat.coverImage && (
                  <img
                    src={cat.coverImage}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback if image not found
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}

                {/* Card Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl">{styles.emoji}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white">
                      {cat.materialsCount || 0} ta material
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-slate-200/90 text-xs line-clamp-2">
                      {cat.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-bold text-white pt-2 group-hover:translate-x-1 transition-transform">
                      Batafsil ko'rish
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Favorites Box (Left 2 cols) ─────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
            Sevimlilar ro'yxati
          </h2>

          <div className="bg-white dark:bg-[#111827] border border-[#E8DDFB] dark:border-[#222738] rounded-2xl p-5 shadow-sm">
            {favorites.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <BookMarked className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="text-slate-400 text-sm">Sevimli materiallaringiz hali yo'q. Kitoblarni o'qish vaqtida sevimlilarga qo'shishingiz mumkin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favorites.map((material) => (
                  <div
                    key={material.id}
                    onClick={() => navigate(`${basePath}/library/read/${material.id}`)}
                    className="flex gap-4 p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800/60 rounded-xl hover:border-rose-500/30 dark:hover:border-rose-500/30 cursor-pointer transition-all"
                  >
                    <div className="w-16 h-20 rounded bg-slate-200 dark:bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {material.coverImageUrl ? (
                        <img src={material.coverImageUrl} alt={material.title} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="h-8 w-8 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{material.title}</h4>
                        <p className="text-xs text-slate-500 truncate">{material.author || "Muallifsiz"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase">
                          {material.accessType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {material.subject}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 self-center" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── AI RECOMMENDATION BOX (Right 1 col) ──────────────── */}
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI Tavsiyalari
          </h2>

          <div className="relative overflow-hidden bg-gradient-to-br from-[#1E1B4B] to-[#311042] border border-purple-500/20 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="absolute top-0 right-0 p-3 bg-purple-500/10 rounded-bl-2xl">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Intellektual Tavsiyalar
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Yaqinda topshirgan test natijalaringiz va xatolaringiz tahlili asosida AI sizga ushbu materiallarni tavsiya qiladi:
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {aiRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-[#0F172A]/80 border border-purple-500/10 rounded-xl space-y-2 hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      {rec.topic}
                    </span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                      Tavsiya
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{rec.title}</h4>
                  <p className="text-[10px] text-slate-400 italic">
                    "{rec.reason}"
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <div className="text-[10px] text-purple-300 bg-purple-500/10 px-3 py-2 rounded-lg text-center font-medium">
                Sizning zaif mavzularingiz avtomatik tarzda tahlil qilinmoqda.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
