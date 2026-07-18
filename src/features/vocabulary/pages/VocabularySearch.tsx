import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { VocabularyProvider, useVocabularyStore } from '../store/vocabularyStore';
import { vocabularyApi } from '../services/vocabularyApi';
import { VocabularyWord } from '../types/vocabulary';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Search as SearchIcon, 
  Star, 
  Bookmark, 
  Volume2, 
  Filter, 
  BookmarkCheck,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';

const categories = ['General', 'Travel', 'Business', 'School', 'Family', 'Food', 'Technology', 'Medical', 'IELTS', 'SAT'];
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const VocabularySearchContent: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { isOffline } = useVocabularyStore();
  const basePath = role === 'super_admin' ? '/super-admin' : role === 'student' ? '/student' : '/user';

  // Search filter states
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);

  // Data states
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<String>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Set<String>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load bookmarks
  const loadUserData = async () => {
    if (isOffline) return;
    try {
      const bRes = await vocabularyApi.getBookmarks();
      const bSet = new Set(bRes.map(item => item.word.id));
      setBookmarkedIds(bSet);
    } catch (e) {
      console.error(e);
    }
  };

  // Load words matching filters
  const loadWords = async () => {
    setLoading(true);
    try {
      if (showOnlyBookmarks) {
        const bookmarks = await vocabularyApi.getBookmarks();
        let list = bookmarks.map(item => item.word);
        // apply local client side filtering
        if (search) {
          list = list.filter(w => w.word.toLowerCase().includes(search.toLowerCase()) || w.translation.toLowerCase().includes(search.toLowerCase()));
        }
        if (selectedLevel) {
          list = list.filter(w => w.level === selectedLevel);
        }
        if (selectedCategory) {
          list = list.filter(w => w.category === selectedCategory);
        }
        setWords(list);
      } else {
        const res = await vocabularyApi.getWords({
          search: search || undefined,
          level: selectedLevel || undefined,
          category: selectedCategory || undefined,
          page: 0,
          size: 100
        });
        setWords(res.content || []);
      }
    } catch (e) {
      console.error('Failed to load words:', e);
      // fallback mock list if database offline
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [isOffline]);

  useEffect(() => {
    loadWords();
  }, [search, selectedLevel, selectedCategory, showOnlyBookmarks]);

  const handlePlayAudio = (wordText: string) => {
    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.lang = 'en-US';
      synth.speak(utterance);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBookmark = async (wordId: string) => {
    if (isOffline) {
      toast.error('Bookmarks cannot be updated offline');
      return;
    }
    try {
      const res = await vocabularyApi.toggleBookmark(wordId);
      const updated = new Set(bookmarkedIds);
      if (res.is_bookmarked) {
        updated.add(wordId);
        toast.success('Bookmark qoʻshildi!');
      } else {
        updated.delete(wordId);
        toast.success('Bookmark olib tashlandi.');
      }
      setBookmarkedIds(updated);
      if (showOnlyBookmarks) {
        loadWords();
      }
    } catch (e) {
      toast.error('Bookmarking failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => navigate(`${basePath}/vocabulary`)}
          variant="ghost"
          className="rounded-2xl h-10 px-3 flex items-center gap-1.5 dark:text-slate-350"
        >
          <ArrowLeft className="h-4 w-4" />
          Roadmapga qaytish
        </Button>

        <h3 className="text-xl font-black text-slate-850 dark:text-white">
          Soʻzlar ombori (Dictionary)
        </h3>
      </div>

      {/* Filter panel */}
      <div className="bg-white/40 dark:bg-[#160e2a]/40 border border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-md space-y-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Keyword input */}
          <div className="md:col-span-6 relative">
            <Input
              placeholder="Qidirish (inglizcha yoki oʻzbekcha)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 pl-10"
            />
            <SearchIcon className="absolute left-3.5 top-3.5 text-slate-400 h-4.5 w-4.5" />
          </div>

          {/* Level Filter select */}
          <div className="md:col-span-3">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="h-11 w-full rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-xs font-bold text-slate-650 dark:text-slate-200 px-3 focus:outline-none"
            >
              <option value="" className="text-slate-800 dark:text-slate-800">Barcha Darajalar</option>
              {levels.map(lvl => (
                <option key={lvl} value={lvl} className="text-slate-800 dark:text-slate-800">{lvl}</option>
              ))}
            </select>
          </div>

          {/* Category Filter select */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 w-full rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-xs font-bold text-slate-650 dark:text-slate-200 px-3 focus:outline-none"
            >
              <option value="" className="text-slate-800 dark:text-slate-800">Barcha Mavzular</option>
              {categories.map(cat => (
                <option key={cat} value={cat} className="text-slate-800 dark:text-slate-800">{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}
            className={`h-9 rounded-xl font-bold text-xs px-4 flex items-center gap-2 border-none shadow-sm ${
              showOnlyBookmarks 
                ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
            }`}
          >
            <BookmarkCheck className="h-4 w-4" />
            Bookmarked soʻzlar
          </Button>

          {(selectedLevel || selectedCategory || search) && (
            <Button
              onClick={() => {
                setSearch('');
                setSelectedLevel('');
                setSelectedCategory('');
                setShowOnlyBookmarks(false);
              }}
              variant="ghost"
              className="h-9 rounded-xl font-bold text-xs text-rose-500 hover:bg-rose-500/10 px-3"
            >
              Filtrlarni tozalash
            </Button>
          )}
        </div>
      </div>

      {/* Words grid list (Virtualized lookup / responsive) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-3xl" />
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-16 bg-white/40 dark:bg-[#160e2a]/40 border border-slate-100 dark:border-white/5 rounded-3xl backdrop-blur-xl">
          <FolderOpen className="h-10 w-10 text-slate-350 mx-auto opacity-55 mb-2" />
          <p className="text-sm font-semibold text-slate-500">Soʻzlar topilmadi. Filtrlarni oʻzgartirib koʻring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {words.map((w) => {
            const isBookmarked = bookmarkedIds.has(w.id);
            return (
              <Card key={w.id} className="bg-white/40 dark:bg-[#160e2a]/40 border-slate-100 dark:border-white/5 shadow-md rounded-3xl backdrop-blur-xl overflow-hidden hover:scale-[1.01] transition-transform duration-300">
                <CardContent className="p-5 flex gap-4 items-start">
                  {/* Image Thumb */}
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                    {w.imageUrl ? (
                      <img src={w.imageUrl} alt={w.word} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl">🖼️</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <h4 className="font-extrabold text-slate-850 dark:text-white leading-tight text-sm truncate">
                        {w.word}
                      </h4>
                      <Badge className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 border-none">
                        {w.level}
                      </Badge>
                      {w.category && (
                        <Badge className="bg-purple-500/10 text-purple-500 dark:text-purple-400 font-extrabold text-[9px] rounded-md px-1.5 py-0.5 border-none">
                          {w.category}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight mb-2 truncate">
                      {w.translation}
                    </p>

                    <p className="text-[10px] text-slate-450 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {w.definition || "Definition not loaded."}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      onClick={() => handlePlayAudio(w.word)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-emerald-500 cursor-pointer"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleToggleBookmark(w.id)}
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 rounded-full cursor-pointer ${
                        isBookmarked 
                          ? 'text-amber-500 hover:bg-amber-500/10' 
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-amber-500'
                      }`}
                    >
                      <Bookmark className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function VocabularySearch() {
  return (
    <VocabularyProvider>
      <VocabularySearchContent />
    </VocabularyProvider>
  );
}
