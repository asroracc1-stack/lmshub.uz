import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, PhoneOff, PhoneCall, Users, Filter, Sparkles, Loader2, X, User as UserIcon, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Gender = "male" | "female" | "any";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface PresenceMeta {
  user_id: string;
  full_name: string;
  username?: string;
  avatar_url?: string | null;
  gender?: "male" | "female" | null;
  level?: Level;
  status: "available" | "in_call" | "ringing";
}

const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }] };

export default function SpeakingPartners() {
  const { user, profile } = useAuth();
  const [online, setOnline] = useState<PresenceMeta[]>([]);
  const [genderFilter, setGenderFilter] = useState<Gender>("any");
  const [levelFilter, setLevelFilter] = useState<Level | null>(null);
  const [myLevel, setMyLevel] = useState<Level>("B1");
  const [searching, setSearching] = useState(false);

  // Call state
  const [incoming, setIncoming] = useState<{ from: string; meta: PresenceMeta } | null>(null);
  const [callPeer, setCallPeer] = useState<PresenceMeta | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [stats, setStats] = useState({ talks: 0, minutes: 0 });

  const presenceChan = useRef<any>(null);
  const callChan = useRef<any>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<number | null>(null);
  const isCallerRef = useRef(false);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);

  // Stable presence meta
  const myMeta: PresenceMeta = useMemo(() => ({
    user_id: user?.id ?? "",
    full_name: profile?.full_name || profile?.username || "Foydalanuvchi",
    username: profile?.username ?? undefined,
    avatar_url: profile?.avatar_url ?? null,
    gender: (profile as any)?.gender ?? null,
    level: myLevel,
    status: callPeer ? "in_call" : "available",
  }), [user, profile, myLevel, callPeer]);

  // Presence channel
  useEffect(() => {
    if (!user) return;
    const chan = supabase.channel("speaking-lobby", { config: { presence: { key: user.id } } });
    presenceChan.current = chan;

    chan.on("presence", { event: "sync" }, () => {
      const state = chan.presenceState() as Record<string, PresenceMeta[]>;
      const seen = new Set<string>();
      const list: PresenceMeta[] = [];
      Object.values(state).forEach((arr) => arr.forEach((m) => {
        if (!m?.user_id || m.user_id === user.id) return;
        if (seen.has(m.user_id)) return;
        seen.add(m.user_id);
        list.push(m);
      }));
      setOnline(list);
    });

    chan.on("broadcast", { event: "invite" }, (payload) => {
      const { from, meta } = payload.payload;
      if (from === user.id) return;
      if (callPeer) {
        chan.send({ type: "broadcast", event: "reject", payload: { to: from, from: user.id, reason: "busy" } });
        return;
      }
      setIncoming({ from, meta });
    });

    chan.on("broadcast", { event: "reject" }, (payload) => {
      if (payload.payload.to !== user.id) return;
      toast.info(`Suhbat rad etildi: ${payload.payload.reason ?? ""}`);
      setSearching(false);
    });

    // Receiver tells caller "I'm subscribed to RTC channel — send me the offer now"
    chan.on("broadcast", { event: "ready" }, async (payload) => {
      const { to, from } = payload.payload;
      if (to !== user.id) return;
      if (!isCallerRef.current || !pc.current || !callChan.current) return;
      try {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        callChan.current.send({ type: "broadcast", event: "offer", payload: { to: from, from: user.id, sdp: offer } });
      } catch (e) { /* noop */ }
    });

    chan.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await chan.track(myMeta);
    });

    return () => {
      chan.unsubscribe();
      presenceChan.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Update presence when meta changes
  useEffect(() => {
    if (presenceChan.current && user) {
      presenceChan.current.track(myMeta);
    }
  }, [myMeta, user]);

  const filtered = useMemo(() => {
    return online.filter((u) => {
      if (genderFilter !== "any" && u.gender !== genderFilter) return false;
      if (levelFilter && u.level !== levelFilter) return false;
      return u.status === "available";
    });
  }, [online, genderFilter, levelFilter]);

  // ───── WebRTC core ─────
  const setupPC = (otherId: string) => {
    const peer = new RTCPeerConnection(ICE);
    pc.current = peer;
    peer.onicecandidate = (e) => {
      if (e.candidate && callChan.current) {
        callChan.current.send({ type: "broadcast", event: "ice", payload: { to: otherId, from: user!.id, candidate: e.candidate } });
      }
    };
    peer.ontrack = (e) => {
      if (remoteAudio.current) {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        if (remoteAudio.current.srcObject !== stream) {
          remoteAudio.current.srcObject = stream;
        }
        remoteAudio.current.muted = false;
        remoteAudio.current.volume = 1;
        const tryPlay = () => remoteAudio.current?.play().catch(() => setTimeout(tryPlay, 200));
        tryPlay();
      }
    };
    peer.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(peer.connectionState)) {
        endCall(true);
      }
    };
    return peer;
  };

  const openCallChannel = (otherId: string) => {
    const ids = [user!.id, otherId].sort().join("--");
    const chan = supabase.channel(`speaking-rtc-${ids}`);
    callChan.current = chan;

    chan.on("broadcast", { event: "offer" }, async (p) => {
      if (p.payload.to !== user!.id) return;
      const peer = pc.current ?? setupPC(otherId);
      await peer.setRemoteDescription(new RTCSessionDescription(p.payload.sdp));
      // flush queued ICE
      for (const c of pendingIce.current) {
        try { await peer.addIceCandidate(new RTCIceCandidate(c)); } catch { /* noop */ }
      }
      pendingIce.current = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      chan.send({ type: "broadcast", event: "answer", payload: { to: otherId, from: user!.id, sdp: answer } });
    });
    chan.on("broadcast", { event: "answer" }, async (p) => {
      if (p.payload.to !== user!.id) return;
      await pc.current?.setRemoteDescription(new RTCSessionDescription(p.payload.sdp));
      for (const c of pendingIce.current) {
        try { await pc.current?.addIceCandidate(new RTCIceCandidate(c)); } catch { /* noop */ }
      }
      pendingIce.current = [];
    });
    chan.on("broadcast", { event: "ice" }, async (p) => {
      if (p.payload.to !== user!.id) return;
      if (!pc.current || !pc.current.remoteDescription) {
        pendingIce.current.push(p.payload.candidate);
        return;
      }
      try { await pc.current.addIceCandidate(new RTCIceCandidate(p.payload.candidate)); } catch {/* noop */ }
    });
    chan.on("broadcast", { event: "hangup" }, (p) => {
      if (p.payload.to !== user!.id) return;
      endCall(true);
    });
    return new Promise<void>((res) => chan.subscribe((s) => s === "SUBSCRIBED" && res()));
  };

  // Unlock <audio> playback on user gesture (iOS/Safari autoplay policy)
  const unlockAudioPlayback = () => {
    try {
      const a = remoteAudio.current;
      if (!a) return;
      a.muted = false;
      a.volume = 1;
      // Prime element with a no-op play attempt; safe to ignore errors
      a.play().catch(() => {/* will retry on ontrack */});
    } catch {/**/}
  };

  const startCallAsCaller = async (other: PresenceMeta) => {
    try {
      unlockAudioPlayback();
      isCallerRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      localStream.current = stream;
      const peer = setupPC(other.user_id);
      stream.getTracks().forEach((t) => peer.addTrack(t, stream));
      // Ensure recv transceiver exists so receiver's audio is negotiated even if they add tracks late
      try { peer.addTransceiver("audio", { direction: "sendrecv" }); } catch {/**/}
      await openCallChannel(other.user_id);
      presenceChan.current?.send({ type: "broadcast", event: "invite", payload: { from: user!.id, to: other.user_id, meta: myMeta } });
      playTone();
      setCallPeer(other);
      startTimer();
    } catch (e: any) {
      toast.error("Mikrofon ruxsati kerak: " + e.message);
    }
  };

  const acceptIncoming = async () => {
    if (!incoming) return;
    unlockAudioPlayback();
    isCallerRef.current = false;
    const fromId = incoming.from;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      localStream.current = stream;
      setupPC(fromId);
      stream.getTracks().forEach((t) => pc.current!.addTrack(t, stream));
      await openCallChannel(fromId);
      setCallPeer(incoming.meta);
      setIncoming(null);
      startTimer();
      presenceChan.current?.send({ type: "broadcast", event: "ready", payload: { from: user!.id, to: fromId } });
    } catch (e: any) {
      toast.error("Mikrofon ruxsati kerak: " + e.message);
      rejectIncoming("nomic");
    }
  };

  const rejectIncoming = (reason = "rejected") => {
    if (!incoming) return;
    presenceChan.current?.send({ type: "broadcast", event: "reject", payload: { to: incoming.from, from: user!.id, reason } });
    setIncoming(null);
  };

  const endCall = (silent = false) => {
    if (!silent && callPeer) {
      callChan.current?.send({ type: "broadcast", event: "hangup", payload: { to: callPeer.user_id, from: user!.id } });
    }
    try { pc.current?.close(); } catch {/* noop */ }
    pc.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    callChan.current?.unsubscribe();
    callChan.current = null;
    pendingIce.current = [];
    isCallerRef.current = false;
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    if (callDuration > 5) {
      setStats((s) => ({ talks: s.talks + 1, minutes: s.minutes + Math.round(callDuration / 60) }));
    }
    setCallDuration(0);
    setMuted(false);
    setCallPeer(null);
  };

  const startTimer = () => {
    setCallDuration(0);
    callTimerRef.current = window.setInterval(() => setCallDuration((d) => d + 1), 1000);
  };

  const toggleMute = () => {
    if (!localStream.current) return;
    const enabled = !muted;
    localStream.current.getAudioTracks().forEach((t) => (t.enabled = !enabled));
    setMuted(enabled);
  };

  // Soft ringtone (Web Audio)
  const playTone = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 480;
      o.connect(g); g.connect(ctx.destination);
      g.gain.value = 0.05;
      o.start(); o.stop(ctx.currentTime + 0.2);
    } catch {/* noop */ }
  };

  const findPartner = () => {
    if (filtered.length === 0) { toast.info("Hozir mos partner topilmadi"); return; }
    setSearching(true);
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    startCallAsCaller(pick).finally(() => setSearching(false));
  };

  // Ringtone for incoming
  useEffect(() => {
    if (incoming) {
      const id = setInterval(playTone, 1200);
      return () => clearInterval(id);
    }
  }, [incoming]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <audio ref={remoteAudio} autoPlay playsInline />

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Speaking</Badge>
          <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Speaking Practice</h1>
          <p className="text-muted-foreground mt-1">Online partnerlar bilan jonli ovozli suhbat</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-5 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center"><Mic className="h-6 w-6 text-emerald-600" /></div>
          <div><p className="text-3xl font-bold">{stats.talks}</p><p className="text-xs text-muted-foreground">Talks</p></div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 grid place-items-center"><Sparkles className="h-6 w-6 text-blue-600" /></div>
          <div><p className="text-3xl font-bold">{stats.minutes}</p><p className="text-xs text-muted-foreground">Daqiqalar</p></div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 grid place-items-center"><Users className="h-6 w-6 text-amber-600" /></div>
          <div><p className="text-3xl font-bold">{online.length}</p><p className="text-xs text-muted-foreground">Online hozir</p></div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Online list */}
        <Card className="p-5 lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Online foydalanuvchilar</h3>
            <Badge variant="outline" className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</Badge>
          </div>

          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Hozir mos online foydalanuvchi yo'q
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto">
              {filtered.map((u) => (
                <Card key={u.user_id} className="p-3 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{initials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.full_name}</p>
                    <div className="flex gap-1">
                      {u.level && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{u.level}</Badge>}
                      {u.gender && <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{u.gender === "male" ? "♂" : "♀"}</Badge>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => startCallAsCaller(u)} disabled={!!callPeer} className="bg-emerald-500 hover:bg-emerald-600">
                    <PhoneCall className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              ))}
            </div>
          )}

          <Button onClick={findPartner} disabled={searching || !!callPeer} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-base py-6">
            {searching ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Partner qidirish
          </Button>
        </Card>

        {/* Filters */}
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filterlari</h3>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Mening darajam</p>
            <div className="grid grid-cols-3 gap-1.5">
              {LEVELS.map((l) => (
                <Button key={l} size="sm" variant={myLevel === l ? "default" : "outline"} onClick={() => setMyLevel(l)}>{l}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Jins (bo'sh = hammasi)</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant={genderFilter === "male" ? "default" : "outline"} onClick={() => setGenderFilter(genderFilter === "male" ? "any" : "male")}><UserIcon className="h-3.5 w-3.5 mr-1" /> Erkak</Button>
              <Button size="sm" variant={genderFilter === "female" ? "default" : "outline"} onClick={() => setGenderFilter(genderFilter === "female" ? "any" : "female")}><UserCircle className="h-3.5 w-3.5 mr-1" /> Ayol</Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Daraja (bo'sh = hammasi)</p>
            <div className="grid grid-cols-3 gap-1.5">
              {LEVELS.map((l) => (
                <Button key={l} size="sm" variant={levelFilter === l ? "default" : "outline"} onClick={() => setLevelFilter(levelFilter === l ? null : l)}>{l}</Button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Incoming dialog */}
      <AnimatePresence>
        {incoming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur z-50 grid place-items-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}>
              <Card className="p-8 max-w-sm text-center space-y-4 shadow-elegant">
                <Avatar className="h-20 w-20 mx-auto ring-4 ring-emerald-500/40 animate-pulse">
                  {incoming.meta.avatar_url && <AvatarImage src={incoming.meta.avatar_url} />}
                  <AvatarFallback className="text-xl">{initials(incoming.meta.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Kiruvchi qo'ng'iroq</p>
                  <p className="font-display text-xl font-bold">{incoming.meta.full_name}</p>
                  {incoming.meta.level && <Badge variant="outline" className="mt-1">{incoming.meta.level}</Badge>}
                </div>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => rejectIncoming()} variant="destructive" size="lg" className="rounded-full h-14 w-14"><PhoneOff className="h-6 w-6" /></Button>
                  <Button onClick={acceptIncoming} size="lg" className="rounded-full h-14 w-14 bg-emerald-500 hover:bg-emerald-600"><PhoneCall className="h-6 w-6" /></Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-call dialog */}
      <AnimatePresence>
        {callPeer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gradient-to-br from-emerald-900 to-teal-950 z-50 grid place-items-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="text-center space-y-6 text-white">
              <Avatar className={cn("h-32 w-32 mx-auto ring-4 ring-white/30", !muted && "animate-pulse")}>
                {callPeer.avatar_url && <AvatarImage src={callPeer.avatar_url} />}
                <AvatarFallback className="text-3xl bg-emerald-700">{initials(callPeer.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-3xl font-display font-bold">{callPeer.full_name}</p>
                <p className="text-sm text-white/70 mt-1">{fmt(callDuration)}</p>
              </div>
              <div className="flex justify-center gap-4">
                <Button onClick={toggleMute} size="lg" className={cn("rounded-full h-16 w-16", muted ? "bg-amber-500 hover:bg-amber-600" : "bg-white/20 hover:bg-white/30")}>
                  {muted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                </Button>
                <Button onClick={() => endCall()} variant="destructive" size="lg" className="rounded-full h-16 w-16"><PhoneOff className="h-7 w-7" /></Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

