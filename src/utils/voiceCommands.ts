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

export const ACCENT_COLORS: Record<string, { hex: string; hsl: string; labelUz: string; labelEn: string }> = {
  red: { hex: "#EF4444", hsl: "0 84.2% 60.2%", labelUz: "Qizil", labelEn: "Red" },
  yellow: { hex: "#EAB308", hsl: "45.4% 93.3% 47.1%", labelUz: "Sariq", labelEn: "Yellow" },
  green: { hex: "#22C55E", hsl: "142.1% 70.6% 45.3%", labelUz: "Yashil", labelEn: "Green" },
  blue: { hex: "#3B82F6", hsl: "217.2% 91.2% 59.8%", labelUz: "Ko'k", labelEn: "Blue" },
  purple: { hex: "#8B5CF6", hsl: "258.1% 89.7% 66.3%", labelUz: "Binafsha", labelEn: "Purple" },
  orange: { hex: "#F97316", hsl: "24.6% 95% 53.1%", labelUz: "Olovrang", labelEn: "Orange" },
  pink: { hex: "#EC4899", hsl: "330.4% 81.2% 60.4%", labelUz: "Pushti", labelEn: "Pink" },
  cyan: { hex: "#06B6D4", hsl: "188.7% 86.1% 40.2%", labelUz: "Havorang", labelEn: "Cyan" },
  violet: { hex: "#7C3AED", hsl: "262.1% 83.3% 57.8%", labelUz: "To'q binafsha", labelEn: "Violet" },
  indigo: { hex: "#4F46E5", hsl: "243.4% 75.4% 58.6%", labelUz: "Indigo", labelEn: "Indigo" },
};

export function parseVoiceCommand(text: string, currentRole = "student"): CommandMatch | null {
  const cleanText = text.trim().toLowerCase();
  
  // Detect language based on simple word matches, defaulting to Uzbek or English
  const isUzbek = /rejim|tungi|yorug|kunduzgi|yarat|chiq|sertifikat|yordam|salom|kutubxona|sozlamalar/i.test(cleanText);
  const lang = isUzbek ? "uz-UZ" : "en-US";

  // 1. Theme Commands
  const darkThemeWords = ["dark", "dark mode", "qorong'i rejim", "tungi rejim", "qorongqi rejim", "qorongu rejim"];
  if (darkThemeWords.some((word) => cleanText === word || cleanText.includes(word))) {
    return {
      type: "theme",
      action: "dark",
      toastMsg: "🌙 Dark Mode Enabled",
      speechResponse: isUzbek ? "Qorong'i rejim yoqildi." : "Dark mode enabled.",
      lang,
    };
  }

  const lightThemeWords = ["light", "light mode", "yorug' rejim", "kunduzgi rejim", "yorug rejim", "kunduz rejim"];
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
    // English name matches, or Uzbek equivalent/contains
    const colorObj = ACCENT_COLORS[color];
    const isColorMatch = cleanText === color || 
      (color === "red" && cleanText.includes("qizil")) ||
      (color === "yellow" && cleanText.includes("sariq")) ||
      (color === "green" && cleanText.includes("yashil")) ||
      (color === "blue" && cleanText.includes("ko'k") || cleanText.includes("kok")) ||
      (color === "purple" && cleanText.includes("binafsha")) ||
      (color === "orange" && cleanText.includes("olovrang")) ||
      (color === "pink" && cleanText.includes("pushti")) ||
      (color === "cyan" && cleanText.includes("havorang")) ||
      (color === "violet" && cleanText.includes("to'q binafsha") || cleanText.includes("toq binafsha")) ||
      (color === "indigo" && cleanText.includes("indigo"));

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
