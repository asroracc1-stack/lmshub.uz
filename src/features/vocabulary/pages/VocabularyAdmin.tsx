import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { VocabularyProvider, useVocabularyStore } from '../store/vocabularyStore';
import { vocabularyApi } from '../services/vocabularyApi';
import { VocabularyWord } from '../types/vocabulary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit2, 
  Search,
  BookOpen
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const VocabularyAdminContent: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { isOffline } = useVocabularyStore();
  const basePath = role === 'super_admin' ? '/super-admin' : role === 'student' ? '/student' : '/user';

  // Words list states
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('A1');
  const [unitFilter, setUnitFilter] = useState<number>(1);
  const [search, setSearch] = useState('');

  // Dialog forms states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Form values
  const [formWord, setFormWord] = useState('');
  const [formTranslation, setFormTranslation] = useState('');
  const [formIpaUs, setFormIpaUs] = useState('');
  const [formIpaUk, setFormIpaUk] = useState('');
  const [formPartOfSpeech, setFormPartOfSpeech] = useState('');
  const [formDefinition, setFormDefinition] = useState('');
  const [formExampleSentence, setFormExampleSentence] = useState('');
  const [formUzbekExample, setFormUzbekExample] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formAudioUsUrl, setFormAudioUsUrl] = useState('');
  const [formAudioUkUrl, setFormAudioUkUrl] = useState('');
  const [formLevel, setFormLevel] = useState('A1');
  const [formUnit, setFormUnit] = useState(1);
  const [formCategory, setFormCategory] = useState('General');
  const [formSynonyms, setFormSynonyms] = useState('');
  const [formAntonyms, setFormAntonyms] = useState('');
  const [formCollocations, setFormCollocations] = useState('');
  const [formCommonMistakes, setFormCommonMistakes] = useState('');
  const [formPronunciationTips, setFormPronunciationTips] = useState('');

  // Load vocabulary
  const loadWords = async () => {
    setLoading(true);
    try {
      const res = await vocabularyApi.getWords({
        level: levelFilter || undefined,
        page: 0,
        size: 200
      });
      // Client-side unit/search filter
      let filtered = res.content || [];
      if (unitFilter) {
        filtered = filtered.filter((w: VocabularyWord) => w.unit === unitFilter);
      }
      if (search) {
        filtered = filtered.filter((w: VocabularyWord) => w.word.toLowerCase().includes(search.toLowerCase()));
      }
      setWords(filtered);
    } catch (e) {
      console.error(e);
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, [levelFilter, unitFilter, search]);

  const resetForm = () => {
    setFormWord('');
    setFormTranslation('');
    setFormIpaUs('');
    setFormIpaUk('');
    setFormPartOfSpeech('');
    setFormDefinition('');
    setFormExampleSentence('');
    setFormUzbekExample('');
    setFormImageUrl('');
    setFormAudioUsUrl('');
    setFormAudioUkUrl('');
    setFormLevel(levelFilter);
    setFormUnit(unitFilter);
    setFormCategory('General');
    setFormSynonyms('');
    setFormAntonyms('');
    setFormCollocations('');
    setFormCommonMistakes('');
    setFormPronunciationTips('');
    setEditingWord(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (w: VocabularyWord) => {
    setEditingWord(w);
    setFormWord(w.word);
    setFormTranslation(w.translation);
    setFormIpaUs(w.ipaUs || '');
    setFormIpaUk(w.ipaUk || '');
    setFormPartOfSpeech(w.partOfSpeech || '');
    setFormDefinition(w.definition || '');
    setFormExampleSentence(w.exampleSentence || '');
    setFormUzbekExample(w.uzbekExample || '');
    setFormImageUrl(w.imageUrl || '');
    setFormAudioUsUrl(w.audioUsUrl || '');
    setFormAudioUkUrl(w.audioUkUrl || '');
    setFormLevel(w.level);
    setFormUnit(w.unit);
    setFormCategory(w.category || 'General');
    setFormSynonyms(w.synonyms || '');
    setFormAntonyms(w.antonyms || '');
    setFormCollocations(w.collocations || '');
    setFormCommonMistakes(w.commonMistakes || '');
    setFormPronunciationTips(w.pronunciationTips || '');
    setShowAddModal(true);
  };

  // AI Filler triggers
  const handleAutoFillAI = async () => {
    if (!formWord.trim()) {
      toast.error('Avval soʻzni kiriting!');
      return;
    }

    setGeneratingAI(true);
    try {
      const data = await vocabularyApi.generateWordDataAI(formWord, formLevel);
      setFormTranslation(data.translation || '');
      setFormIpaUs(data.ipa_us || '');
      setFormIpaUk(data.ipa_uk || '');
      setFormPartOfSpeech(data.part_of_speech || '');
      setFormDefinition(data.definition || '');
      setFormExampleSentence(data.example_sentence || '');
      setFormUzbekExample(data.uzbek_example || '');
      setFormCategory(data.category || 'General');
      setFormSynonyms(data.synonyms || '');
      setFormAntonyms(data.antonyms || '');
      setFormCollocations(data.collocations || '');
      setFormCommonMistakes(data.common_mistakes || '');
      setFormPronunciationTips(data.pronunciation_tips || '');
      
      toast.success('AI maʻlumotlari muvaffaqiyatli generatsiya qilindi! ✨');
    } catch (e) {
      toast.error('AI orqali toʻldirishda xatolik yuz berdi.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Submit word save
  const handleSaveWord = async () => {
    if (!formWord.trim() || !formTranslation.trim()) {
      toast.error('Soʻz va tarjimani kiritish shart!');
      return;
    }

    const payload: Partial<VocabularyWord> = {
      word: formWord.trim(),
      translation: formTranslation.trim(),
      ipaUs: formIpaUs.trim() || undefined,
      ipaUk: formIpaUk.trim() || undefined,
      partOfSpeech: formPartOfSpeech.trim() || undefined,
      definition: formDefinition.trim() || undefined,
      exampleSentence: formExampleSentence.trim() || undefined,
      uzbekExample: formUzbekExample.trim() || undefined,
      imageUrl: formImageUrl.trim() || undefined,
      audioUsUrl: formAudioUsUrl.trim() || undefined,
      audioUkUrl: formAudioUkUrl.trim() || undefined,
      level: formLevel,
      unit: formUnit,
      category: formCategory,
      synonyms: formSynonyms.trim() || undefined,
      antonyms: formAntonyms.trim() || undefined,
      collocations: formCollocations.trim() || undefined,
      commonMistakes: formCommonMistakes.trim() || undefined,
      pronunciationTips: formPronunciationTips.trim() || undefined,
      difficultyScore: 1.0
    };

    try {
      if (editingWord) {
        await vocabularyApi.adminUpdateWord(editingWord.id, payload);
        toast.success('Soʻz muvaffaqiyatli tahrirlandi.');
      } else {
        await vocabularyApi.adminCreateWord(payload);
        toast.success('Yangi soʻz qoʻshildi.');
      }
      setShowAddModal(false);
      resetForm();
      loadWords();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Saqlashda xatolik yuz berdi');
    }
  };

  // Delete word
  const handleDeleteWord = async (id: string) => {
    if (!window.confirm('Haqiqatan ham bu soʻzni oʻchirmoqchimisiz?')) return;
    try {
      await vocabularyApi.adminDeleteWord(id);
      toast.success('Soʻz oʻchirildi.');
      loadWords();
    } catch (e) {
      toast.error('Oʻchirishda xatolik yuz berdi.');
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const blob = await vocabularyApi.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vocabulary_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error('CSV export failed');
    }
  };

  // CSV Import file uploader
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await vocabularyApi.importCsv(file, levelFilter);
      if (res.success) {
        toast.success('CSV muvaffaqiyatli import qilindi! 🎉');
        loadWords();
      }
    } catch (e) {
      toast.error('CSV import failed');
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button
          onClick={() => navigate(`${basePath}/vocabulary`)}
          variant="ghost"
          className="rounded-2xl h-10 px-3 flex items-center gap-1.5 dark:text-slate-350"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboardga qaytish
        </Button>

        <h3 className="text-xl font-black text-slate-850 dark:text-white flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-emerald-500" />
          Vocabulary boshqaruvi (Super Admin)
        </h3>
      </div>

      {/* CSV Import/Export controls card */}
      <Card className="bg-white/45 dark:bg-[#160e2a]/45 border border-slate-100 dark:border-white/5 rounded-3xl shadow-md backdrop-blur-xl">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-slate-850 dark:text-white">Lugʻatni import/export qilish</h4>
            <p className="text-xs text-slate-450 dark:text-slate-400">CSV formatidagi lugʻatlarni yuklang yoki eksport qiling.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExportCsv}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs h-10 px-4 flex items-center gap-1.5 border-none shadow-sm"
            >
              <Download className="h-4 w-4" />
              CSV Eksport
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCsv}
                className="hidden"
                id="csv-import-file"
              />
              <label
                htmlFor="csv-import-file"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 hover:opacity-90 text-white font-bold text-xs h-10 px-4 gap-1.5 cursor-pointer shadow-sm"
              >
                <Upload className="h-4 w-4" />
                CSV Import
              </label>
            </div>

            <Button
              onClick={handleOpenAdd}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-10 px-4 flex items-center gap-1"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Qoʻlda qoʻshish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters & search list */}
      <div className="bg-white/40 dark:bg-[#160e2a]/40 border border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-md space-y-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-3">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-11 w-full rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-xs font-bold text-slate-650 dark:text-slate-200 px-3 focus:outline-none"
            >
              {levels.map(lvl => (
                <option key={lvl} value={lvl} className="text-slate-850">{lvl}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <Input
              type="number"
              min={1}
              value={unitFilter}
              onChange={(e) => setUnitFilter(parseInt(e.target.value) || 1)}
              placeholder="Unit raqami..."
              className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 font-semibold text-xs text-slate-700"
            />
          </div>

          <div className="sm:col-span-6 relative">
            <Input
              placeholder="Soʻz boʻyicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 pl-10"
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-400 h-4.5 w-4.5" />
          </div>
        </div>

        {/* Words lists table */}
        {loading ? (
          <div className="text-center py-10 font-bold text-slate-450">Yuklanmoqda...</div>
        ) : words.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-bold">Kechirasiz, soʻzlar topilmadi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-semibold text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 font-black">Word</th>
                  <th className="py-3 px-4 font-black">Translation</th>
                  <th className="py-3 px-4 font-black">Unit</th>
                  <th className="py-3 px-4 font-black">Category</th>
                  <th className="py-3 px-4 text-right font-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {words.map((w) => (
                  <tr key={w.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="py-3 px-4 font-black text-slate-800 dark:text-white">{w.word}</td>
                    <td className="py-3 px-4">{w.translation}</td>
                    <td className="py-3 px-4">{w.unit}</td>
                    <td className="py-3 px-4">{w.category || 'General'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          onClick={() => handleOpenEdit(w)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-slate-500 hover:text-emerald-500"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteWord(w.id)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-slate-500 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit manual Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border-none shadow-2xl p-6 overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-base font-black tracking-tight">
              {editingWord ? 'Soʻzni tahrirlash' : 'Yangi soʻz qoʻshish'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 text-xs">
            {/* Core Word Input + AI helper button */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-8 space-y-1">
                <label className="font-extrabold text-slate-450">English Word *</label>
                <Input
                  value={formWord}
                  onChange={(e) => setFormWord(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. environment"
                />
              </div>
              <div className="sm:col-span-4">
                <Button
                  onClick={handleAutoFillAI}
                  disabled={generatingAI || !formWord.trim()}
                  className="h-10 w-full rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-1 border-none shadow-md"
                >
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  AI bilan toʻldirish ✨
                </Button>
              </div>
            </div>

            {/* Translation and IPA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Uzbek Translation *</label>
                <Input
                  value={formTranslation}
                  onChange={(e) => setFormTranslation(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. atrof-muhit"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">IPA Pronunciation (US)</label>
                <Input
                  value={formIpaUs}
                  onChange={(e) => setFormIpaUs(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. ɪnˈvaɪrənmənt"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">IPA Pronunciation (UK)</label>
                <Input
                  value={formIpaUk}
                  onChange={(e) => setFormIpaUk(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. ɪnˈvaɪrənmənt"
                />
              </div>
            </div>

            {/* Level, Unit, Category */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Daraja (Level)</label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  className="h-10 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 px-3 focus:outline-none"
                >
                  {levels.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Unit raqami</label>
                <Input
                  type="number"
                  min={1}
                  value={formUnit}
                  onChange={(e) => setFormUnit(parseInt(e.target.value) || 1)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Mavzu (Category)</label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Part of Speech</label>
                <Input
                  value={formPartOfSpeech}
                  onChange={(e) => setFormPartOfSpeech(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. noun"
                />
              </div>
            </div>

            {/* English Definition */}
            <div className="space-y-1">
              <label className="font-extrabold text-slate-450">English Definition</label>
              <textarea
                value={formDefinition}
                onChange={(e) => setFormDefinition(e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 p-3 focus:outline-none text-slate-700 dark:text-slate-200"
                placeholder="The surroundings or conditions in which a person lives..."
              />
            </div>

            {/* Example Sentences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Example Sentence (English)</label>
                <textarea
                  value={formExampleSentence}
                  onChange={(e) => setFormExampleSentence(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 p-3 focus:outline-none text-slate-700 dark:text-slate-200"
                  placeholder="We must protect our environment."
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Example Sentence Translation (Uzbek)</label>
                <textarea
                  value={formUzbekExample}
                  onChange={(e) => setFormUzbekExample(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 p-3 focus:outline-none text-slate-700 dark:text-slate-200"
                  placeholder="Biz atrof-muhitimizni himoya qilishimiz kerak."
                />
              </div>
            </div>

            {/* Synonyms & Antonyms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Synonyms (koʻplikda, vergul bilan)</label>
                <Input
                  value={formSynonyms}
                  onChange={(e) => setFormSynonyms(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. surroundings, nature"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Antonyms</label>
                <Input
                  value={formAntonyms}
                  onChange={(e) => setFormAntonyms(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Collocations, Common Mistakes, Pronunciation Tips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Collocations</label>
                <Input
                  value={formCollocations}
                  onChange={(e) => setFormCollocations(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="e.g. natural environment; protect the environment"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Common Mistakes</label>
                <Input
                  value={formCommonMistakes}
                  onChange={(e) => setFormCommonMistakes(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Pronunciation Tips</label>
                <Input
                  value={formPronunciationTips}
                  onChange={(e) => setFormPronunciationTips(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Media Upload URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Image URL</label>
                <Input
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Audio URL (US)</label>
                <Input
                  value={formAudioUsUrl}
                  onChange={(e) => setFormAudioUsUrl(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-450">Audio URL (UK)</label>
                <Input
                  value={formAudioUkUrl}
                  onChange={(e) => setFormAudioUkUrl(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                onClick={() => setShowAddModal(false)}
                variant="outline"
                className="h-11 rounded-xl font-bold text-xs"
              >
                Bekor qilish
              </Button>
              <Button
                onClick={handleSaveWord}
                className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs border-none shadow-md"
              >
                Saqlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function VocabularyAdmin() {
  return (
    <VocabularyProvider>
      <VocabularyAdminContent />
    </VocabularyProvider>
  );
}
