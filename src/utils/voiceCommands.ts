export interface CommandMatch {
  type:
    | "theme"
    | "color"
    | "navigation"
    | "search"
    | "ai"
    | "system"
    | "greeting"
    | "help";
  action: string;
  payload?: any;
  toastMsg: string;
  speechResponse: string;
  lang: "uz-UZ" | "en-US";
}

export interface AccentColorPreset {
  hex: string;
  hsl: string;
  light: string;
  dark: string;
  glow: string;
  border: string;
  muted: string;
  labelUz: string;
  labelEn: string;
}

export const ACCENT_COLORS: Record<string, AccentColorPreset> = {
  green: {
    hex: "#10B981",
    hsl: "162 72.7% 41.2%",
    light: "#34D399",
    dark: "#059669",
    glow: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.3)",
    muted: "rgba(16, 185, 129, 0.5)",
    labelUz: "Yashil",
    labelEn: "Green"
  },
  red: {
    hex: "#EF4444",
    hsl: "0 84.3% 60.2%",
    light: "#F87171",
    dark: "#DC2626",
    glow: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.3)",
    muted: "rgba(239, 68, 68, 0.5)",
    labelUz: "Qizil",
    labelEn: "Red"
  },
  blue: {
    hex: "#3B82F6",
    hsl: "217 91.2% 59.8%",
    light: "#60A5FA",
    dark: "#2563EB",
    glow: "rgba(59, 130, 246, 0.15)",
    border: "rgba(59, 130, 246, 0.3)",
    muted: "rgba(59, 130, 246, 0.5)",
    labelUz: "Ko'k",
    labelEn: "Blue"
  },
  yellow: {
    hex: "#F59E0B",
    hsl: "38 93.7% 47.8%",
    light: "#FBBF24",
    dark: "#D97706",
    glow: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.3)",
    muted: "rgba(245, 158, 11, 0.5)",
    labelUz: "Sariq",
    labelEn: "Yellow"
  },
  pink: {
    hex: "#EC4899",
    hsl: "330 81.2% 60.4%",
    light: "#F472B6",
    dark: "#DB2777",
    glow: "rgba(236, 72, 153, 0.15)",
    border: "rgba(236, 72, 153, 0.3)",
    muted: "rgba(236, 72, 153, 0.5)",
    labelUz: "Pushti",
    labelEn: "Pink"
  },
  purple: {
    hex: "#8B5CF6",
    hsl: "258 90.3% 66.1%",
    light: "#A78BFA",
    dark: "#7C3AED",
    glow: "rgba(139, 92, 246, 0.15)",
    border: "rgba(139, 92, 246, 0.3)",
    muted: "rgba(139, 92, 246, 0.5)",
    labelUz: "Binafsha",
    labelEn: "Purple"
  },
  indigo: {
    hex: "#6366F1",
    hsl: "239 84.1% 66.7%",
    light: "#818CF8",
    dark: "#4F46E5",
    glow: "rgba(99, 102, 241, 0.15)",
    border: "rgba(99, 102, 241, 0.3)",
    muted: "rgba(99, 102, 241, 0.5)",
    labelUz: "Indigo",
    labelEn: "Indigo"
  },
  orange: {
    hex: "#F97316",
    hsl: "25 95% 53.1%",
    light: "#FB923C",
    dark: "#EA580C",
    glow: "rgba(249, 115, 22, 0.15)",
    border: "rgba(249, 115, 22, 0.3)",
    muted: "rgba(249, 115, 22, 0.5)",
    labelUz: "Olovrang",
    labelEn: "Orange"
  }
};

export function parseVoiceCommand(text: string, currentRole = "student"): CommandMatch | null {
  const cleanText = text.trim().toLowerCase();
  
  // Detect language based on simple word matches, defaulting to Uzbek or English
  const isUzbek = /rejim|tungi|yorug|kunduzgi|yarat|chiq|sertifikat|yordam|salom|kutubxona|sozlamalar|rang|qil/i.test(cleanText);
  const lang = isUzbek ? "uz-UZ" : "en-US";

  // 1. Theme Commands
  const darkThemeWords = ["dark", "dark mode", "qorong'i rejim", "tungi rejim", "qorongqi rejim", "qorongu rejim", "enable dark mode", "switch dark mode"];
  if (darkThemeWords.some((word) => cleanText === word || cleanText.includes(word))) {
    return {
      type: "theme",
      action: "dark",
      toastMsg: "🌙 Dark Mode Enabled",
      speechResponse: isUzbek ? "Qorong'i rejim yoqildi." : "Dark mode enabled.",
      lang,
    };
  }

  const lightThemeWords = ["light", "light mode", "yorug' rejim", "kunduzgi rejim", "yorug rejim", "kunduz rejim", "enable light mode", "switch light mode"];
  if (lightThemeWords.some((word) => cleanText === word || cleanText.includes(word))) {
    return {
      type: "theme",
      action: "light",
      toastMsg: "☀️ Light Mode Enabled",
      speechResponse: isUzbek ? "Kunduzgi rejim yoqildi." : "Light mode enabled.",
      lang,
    };
  }

  // 2. Accent Color Commands
  for (const color of Object.keys(ACCENT_COLORS)) {
    const colorObj = ACCENT_COLORS[color];
    const isColorMatch = cleanText === color ||
      (color === "green" && (cleanText.includes("yashil") || cleanText.includes("green"))) ||
      (color === "red" && (cleanText.includes("qizil") || cleanText.includes("red"))) ||
      (color === "blue" && (cleanText.includes("ko'k") || cleanText.includes("kok") || cleanText.includes("blue"))) ||
      (color === "yellow" && (cleanText.includes("sariq") || cleanText.includes("yellow"))) ||
      (color === "pink" && (cleanText.includes("pushti") || cleanText.includes("pink"))) ||
      (color === "purple" && (cleanText.includes("binafsha") || cleanText.includes("purple"))) ||
      (color === "indigo" && (cleanText.includes("indigo"))) ||
      (color === "orange" && (cleanText.includes("olovrang") || cleanText.includes("orange")));

    if (isColorMatch) {
      return {
        type: "color",
        action: "change-accent",
        payload: color,
        toastMsg: `🎨 Accent color changed to ${color.toUpperCase()}`,
        speechResponse: isUzbek 
          ? `${colorObj.labelUz} rangi muvaffaqiyatli o'rnatildi.` 
          : `${colorObj.labelEn} color successfully set.`,
        lang,
      };
    }
  }

  // 3. Navigation Commands
  const dashboardWords = ["dashboard", "bosh sahifa", "boshqaruv paneli"];
  if (dashboardWords.some(w => cleanText === w)) {
    return {
      type: "navigation",
      action: "navigate",
      payload: `/${currentRole}/dashboard`,
      toastMsg: "🏠 Dashboard Opened",
      speechResponse: isUzbek ? "Bosh sahifa ochildi." : "Dashboard opened.",
      lang,
    };
  }

  const libraryWords = ["kutubxona", "library", "kitoblar"];
  if (libraryWords.some(w => cleanText === w || cleanText.includes(w))) {
    return {
      type: "navigation",
      action: "navigate",
      payload: `/${currentRole}/library`,
      toastMsg: "📚 Kutubxona Opened",
      speechResponse: isUzbek ? "Kutubxona bo'limi ochildi." : "Library opened.",
      lang,
    };
  }

  const satWords = ["sat", "sat mocks", "sat test"];
  if (satWords.some(w => cleanText === w)) {
    const satPath = currentRole === "student" ? "/student/mocks/c/sat" : `/${currentRole}/sat`;
    return {
      type: "navigation",
      action: "navigate",
      payload: satPath,
      toastMsg: "📖 SAT Section Opened",
      speechResponse: isUzbek ? "SAT bo'limi ochildi." : "SAT Section opened.",
      lang,
    };
  }

  const certWords = ["milliy sertifikat", "national certificate", "milliy mock"];
  if (certWords.some(w => cleanText === w || cleanText.includes(w))) {
    const certPath = currentRole === "student" ? "/student/mocks/c/national_cert" : `/${currentRole}/national-cert`;
    return {
      type: "navigation",
      action: "navigate",
      payload: certPath,
      toastMsg: "🎓 Milliy Sertifikat Opened",
      speechResponse: isUzbek ? "Milliy Sertifikat bo'limi ochildi." : "National Certificate section opened.",
      lang,
    };
  }

  const settingsWords = ["sozlamalar", "settings", "tizim sozlamalari"];
  if (settingsWords.some(w => cleanText === w || cleanText.includes(w))) {
    return {
      type: "navigation",
      action: "navigate",
      payload: `/${currentRole}/settings`,
      toastMsg: "⚙️ Settings Opened",
      speechResponse: isUzbek ? "Sozlamalar bo'limi ochildi." : "Settings opened.",
      lang,
    };
  }

  const profileWords = ["profil", "profile", "hisobim", "account"];
  if (profileWords.some(w => cleanText === w || cleanText.includes(w))) {
    const profilePath = currentRole === "student" || currentRole === "user" ? `/${currentRole}/account` : `/${currentRole}/profile`;
    return {
      type: "navigation",
      action: "navigate",
      payload: profilePath,
      toastMsg: "👤 Profile Opened",
      speechResponse: isUzbek ? "Profil bo'limi ochildi." : "Profile opened.",
      lang,
    };
  }

  // 4. Search Commands ("search physics", "qidiring matematika", "search mathematics")
  if (cleanText.startsWith("search ") || cleanText.startsWith("qidiring ") || cleanText.startsWith("qidirish ")) {
    const query = cleanText.replace(/^(search|qidiring|qidirish)\s+/, "");
    return {
      type: "search",
      action: "execute-search",
      payload: query,
      toastMsg: `🔍 Searching for: ${query}`,
      speechResponse: isUzbek ? `Qidirilmoqda: ${query}` : `Searching for ${query}`,
      lang,
    };
  }

  // 5. LMSHub AI Commands (mapped to existing routes for production readiness)
  if (cleanText === "create test" || cleanText === "test yarat") {
    return {
      type: "ai",
      action: "navigate",
      payload: `/${currentRole}/mocks`,
      toastMsg: "📝 AI Test Creation Initiated",
      speechResponse: isUzbek ? "Mock testlar sahifasi ochildi." : "Mock tests page opened.",
      lang,
    };
  }

  if (cleanText === "open ai assistant" || cleanText === "ai assistant") {
    return {
      type: "ai",
      action: "navigate",
      payload: `/${currentRole}/speaking/ai`,
      toastMsg: "🤖 AI Assistant Opened",
      speechResponse: isUzbek ? "AI Speaking yordamchisi ochildi." : "AI assistant opened.",
      lang,
    };
  }

  if (cleanText === "analyze results" || cleanText === "natijalarni tahlil qilish") {
    const destPath = currentRole === "student" || currentRole === "user" ? `/${currentRole}/achievements` : `/${currentRole}/dashboard`;
    return {
      type: "ai",
      action: "navigate",
      payload: destPath,
      toastMsg: "📊 AI Analysis Opened",
      speechResponse: isUzbek ? "Natijalar va yutuqlar sahifasi ochildi." : "Results analysis opened.",
      lang,
    };
  }

  if (cleanText === "generate questions" || cleanText === "savollar yaratish") {
    const destPath = (currentRole === "super_admin" || currentRole === "admin") ? `/${currentRole}/question-bank` : `/${currentRole}/mocks`;
    return {
      type: "ai",
      action: "navigate",
      payload: destPath,
      toastMsg: "❓ Question Generator Opened",
      speechResponse: isUzbek ? "Savollar banki ochildi." : "Question bank opened.",
      lang,
    };
  }

  // 6. System Commands
  if (cleanText === "logout" || cleanText === "chiqish") {
    return {
      type: "system",
      action: "logout",
      toastMsg: "🚪 Logout Dialog Opened",
      speechResponse: isUzbek ? "Tizimdan chiqishni tasdiqlang." : "Please confirm your logout.",
      lang,
    };
  }

  if (cleanText === "refresh page" || cleanText === "sahifani yangilash") {
    return {
      type: "system",
      action: "refresh",
      toastMsg: "🔄 Refreshing Page...",
      speechResponse: isUzbek ? "Sahifa yangilanmoqda." : "Refreshing page.",
      lang,
    };
  }

  if (cleanText === "go back" || cleanText === "orqaga") {
    return {
      type: "system",
      action: "go-back",
      toastMsg: "⬅️ Going Back",
      speechResponse: isUzbek ? "Orqaga qaytilmoqda." : "Going back.",
      lang,
    };
  }

  if (cleanText === "go home" || cleanText === "uyga") {
    return {
      type: "system",
      action: "navigate",
      payload: `/${currentRole}/dashboard`,
      toastMsg: "🏠 Heading to Dashboard",
      speechResponse: isUzbek ? "Bosh sahifaga qaytilmoqda." : "Going to dashboard.",
      lang,
    };
  }

  // 7. Bonus Commands
  const greetingWords = ["hello lmshub", "salom lmshub", "assalomu alaykum"];
  if (greetingWords.some(w => cleanText === w || cleanText.includes(w))) {
    return {
      type: "greeting",
      action: "greet",
      toastMsg: "👋 Assalomu Alaykum!",
      speechResponse: "Assalomu alaykum. LMSHub AI yordamchisiga xush kelibsiz.",
      lang: "uz-UZ",
    };
  }

  if (cleanText === "help" || cleanText === "yordam") {
    return {
      type: "help",
      action: "help",
      toastMsg: "ℹ️ Voice Assistant Commands Helper",
      speechResponse: isUzbek ? "Barcha buyruqlar ro'yxati yordam panelida ko'rsatildi." : "List of all commands shown in the panel.",
      lang,
    };
  }

  return null;
}
