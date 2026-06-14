import React, { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Settings, Plus, Trash2, Edit2, Check, X, Shield, Gift, RefreshCw, Compass } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Checkpoint {
  id?: string;
  name: string;
  targetDistance: number;
  rewardType: string;
  rewardValue: string;
  active: boolean;
}

interface Multipliers {
  practiceMultiplier: number;
  quizMultiplier: number;
  lessonMultiplier: number;
  mockMultiplier: number;
  coinMultiplier: number;
  streakMultiplier: number;
}

export const GamificationAdmin: React.FC = () => {
  const { t } = useTranslation();
  const [multipliers, setMultipliers] = useState<Multipliers>({
    practiceMultiplier: 50,
    quizMultiplier: 100,
    lessonMultiplier: 150,
    mockMultiplier: 500,
    coinMultiplier: 10,
    streakMultiplier: 200,
  });

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMultipliers, setSavingMultipliers] = useState(false);

  // Form states for creating/editing checkpoint
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [formName, setFormName] = useState("");
  const [formDistance, setFormDistance] = useState(0);
  const [formRewardType, setFormRewardType] = useState("COIN_BOX");
  const [formRewardValue, setFormRewardValue] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [submittingCheckpoint, setSubmittingCheckpoint] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const multRes = await api.get("/admin/gamification/multipliers");
      if (multRes.data) {
        setMultipliers(multRes.data);
      }
      const cpRes = await api.get("/admin/gamification/checkpoints");
      if (cpRes.data) {
        setCheckpoints(cpRes.data);
      }
    } catch (e) {
      console.error("Failed to load gamification admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveMultipliers = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMultipliers(true);
    try {
      await api.post("/admin/gamification/multipliers", multipliers);
      toast.success(t("gradesPage.savedSuccessfully"));
    } catch (e) {
      toast.error(t("settings.saveError"));
    } finally {
      setSavingMultipliers(false);
    }
  };

  const handleCheckpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCheckpoint(true);
    const payload = {
      name: formName,
      targetDistance: formDistance,
      rewardType: formRewardType,
      rewardValue: formRewardValue,
      active: formActive,
    };

    try {
      if (editingCheckpoint?.id) {
        await api.put(`/admin/gamification/checkpoints/${editingCheckpoint.id}`, payload);
        toast.success(t("gradesPage.savedSuccessfully"));
      } else {
        await api.post("/admin/gamification/checkpoints", payload);
        toast.success(t("gradesPage.savedSuccessfully"));
      }
      resetForm();
      fetchData();
    } catch (e) {
      toast.error(t("settings.saveError"));
    } finally {
      setSubmittingCheckpoint(false);
    }
  };

  const handleEditClick = (cp: Checkpoint) => {
    setEditingCheckpoint(cp);
    setFormName(cp.name);
    setFormDistance(cp.targetDistance);
    setFormRewardType(cp.rewardType);
    setFormRewardValue(cp.rewardValue);
    setFormActive(cp.active);
  };

  const handleDeleteClick = async (id?: string) => {
    if (!id || !window.confirm(t("dynamic.gamificationAdmin.confirmDelete"))) return;

    try {
      await api.delete(`/admin/gamification/checkpoints/${id}`);
      toast.success(t("gradesPage.deleted"));
      fetchData();
    } catch (e) {
      toast.error(t("settings.saveError"));
    }
  };

  const resetForm = () => {
    setEditingCheckpoint(null);
    setFormName("");
    setFormDistance(0);
    setFormRewardType("COIN_BOX");
    setFormRewardValue("");
    setFormActive(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-400">{t("dynamic.learningWorld.loadingDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-1">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100">{t("dynamic.gamificationAdmin.title")}</h1>
            <p className="text-xs text-slate-400">{t("dynamic.gamificationAdmin.subtitle")}</p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-400 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold border-b border-slate-800 pb-3 mb-2">
            <Settings className="w-5 h-5" />
            <h3>{t("dynamic.gamificationAdmin.multipliers")}</h3>
          </div>

          <form onSubmit={handleSaveMultipliers} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                {t("dynamic.gamificationAdmin.practiceLabel")}
              </label>
              <input
                type="number"
                value={multipliers.practiceMultiplier}
                onChange={(e) => setMultipliers({ ...multipliers, practiceMultiplier: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                {t("dynamic.gamificationAdmin.quizLabel")}
              </label>
              <input
                type="number"
                value={multipliers.quizMultiplier}
                onChange={(e) => setMultipliers({ ...multipliers, quizMultiplier: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                {t("dynamic.gamificationAdmin.lessonLabel")}
              </label>
              <input
                type="number"
                value={multipliers.lessonMultiplier}
                onChange={(e) => setMultipliers({ ...multipliers, lessonMultiplier: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                {t("dynamic.gamificationAdmin.mockLabel")}
              </label>
              <input
                type="number"
                value={multipliers.mockMultiplier}
                onChange={(e) => setMultipliers({ ...multipliers, mockMultiplier: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                {t("dynamic.gamificationAdmin.coinLabel")}
              </label>
              <input
                type="number"
                value={multipliers.coinMultiplier}
                onChange={(e) => setMultipliers({ ...multipliers, coinMultiplier: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                {t("dynamic.gamificationAdmin.streakLabel")}
              </label>
              <input
                type="number"
                value={multipliers.streakMultiplier}
                onChange={(e) => setMultipliers({ ...multipliers, streakMultiplier: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingMultipliers}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl py-3 text-sm transition disabled:opacity-50"
            >
              {savingMultipliers ? t("dynamic.gamificationAdmin.saving") : t("dynamic.gamificationAdmin.saveMultipliers")}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-400" />
                {editingCheckpoint ? t("dynamic.gamificationAdmin.editCheckpoint") : t("dynamic.gamificationAdmin.newCheckpoint")}
              </h3>
              {editingCheckpoint && (
                <button onClick={resetForm} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> {t("dynamic.gamificationAdmin.cancel")}
                </button>
              )}
            </div>

            <form onSubmit={handleCheckpointSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t("dynamic.gamificationAdmin.checkpointName")}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Oltin Sandiq #1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t("dynamic.gamificationAdmin.targetDistance")}</label>
                <input
                  type="number"
                  required
                  value={formDistance}
                  onChange={(e) => setFormDistance(Number(e.target.value))}
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t("dynamic.gamificationAdmin.rewardType")}</label>
                <select
                  value={formRewardType}
                  onChange={(e) => setFormRewardType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="COIN_BOX">Coin Box (Oltin tangalar)</option>
                  <option value="XP_BOOST">XP Boost (Bonus ballar)</option>
                  <option value="PREMIUM_MOCK_TEST">Premium Mock Test (Paket ID)</option>
                  <option value="FREE_PACK">Free Course Pack (Paket ID)</option>
                  <option value="SPECIAL_BADGE">Maxsus Unvon (Badge Name)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">{t("dynamic.gamificationAdmin.rewardValue")}</label>
                <input
                  type="text"
                  value={formRewardValue}
                  onChange={(e) => setFormRewardValue(e.target.value)}
                  placeholder="e.g. 100 yoki UUID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="formActive"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-0"
                />
                <label htmlFor="formActive" className="text-xs font-bold text-slate-300 cursor-pointer">
                  {t("dynamic.gamificationAdmin.activeLabel")}
                </label>
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingCheckpoint}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-slate-100 font-bold rounded-xl py-2.5 text-sm transition disabled:opacity-50"
                >
                  {submittingCheckpoint ? t("dynamic.gamificationAdmin.saving") : editingCheckpoint ? t("dynamic.gamificationAdmin.saveCheckpoint") : t("dynamic.gamificationAdmin.addCheckpoint")}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              {t("dynamic.gamificationAdmin.listTitle")}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">{t("dynamic.gamificationAdmin.nameCol")}</th>
                    <th className="pb-3 pr-2">{t("dynamic.gamificationAdmin.distanceCol")}</th>
                    <th className="pb-3 pr-2">{t("dynamic.gamificationAdmin.rewardCol")}</th>
                    <th className="pb-3 pr-2 text-center">{t("dynamic.gamificationAdmin.statusCol")}</th>
                    <th className="pb-3 text-right">{t("dynamic.gamificationAdmin.actionsCol")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {checkpoints.map((cp) => (
                    <tr key={cp.id} className="text-slate-300">
                      <td className="py-3.5 pr-2 font-semibold">{cp.name}</td>
                      <td className="py-3.5 pr-2 text-amber-400 font-bold">{Math.round(cp.targetDistance / 1000)} km</td>
                      <td className="py-3.5 pr-2 text-xs">
                        <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                          {cp.rewardType}
                        </span>
                        <span className="ml-1 text-slate-400 font-bold">({cp.rewardValue})</span>
                      </td>
                      <td className="py-3.5 pr-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cp.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {cp.active ? t("dynamic.gamificationAdmin.active") : t("dynamic.gamificationAdmin.inactive")}
                        </span>
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleEditClick(cp)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(cp.id)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {checkpoints.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        {t("dynamic.gamificationAdmin.emptyList")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationAdmin;
