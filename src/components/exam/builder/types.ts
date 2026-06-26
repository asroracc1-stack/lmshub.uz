// ============================================================
// Enterprise Exam Builder — Core Types
// ============================================================

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "yes_no"
  | "fill_blank"
  | "drag_drop"
  | "matching"
  | "ordering"
  | "table_completion"
  | "summary_completion"
  | "sentence_completion"
  | "paragraph_heading"
  | "information_matching"
  | "map_labeling"
  | "diagram_labeling"
  | "flow_chart"
  | "listening_choice"
  | "listening_gap"
  | "speaking_recording"
  | "essay"
  | "short_answer"
  | "numeric"
  | "formula"
  | "matrix"
  | "hotspot"
  | "clickable_area"
  | "audio_based"
  | "video_based"
  | "code"
  | "case_study"
  | "custom";

export type ExamKind =
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "sat"
  | "national_cert"
  | "cefr"
  | "toefl"
  | "ielts_full"
  | "math"
  | "custom";

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export type PublishStatus = "draft" | "review" | "approved" | "published" | "archived" | "hidden";

export interface MediaItem {
  type: "image" | "audio" | "video" | "pdf" | "svg";
  url: string;
  caption?: string;
  position?: "top" | "bottom" | "left" | "right" | "inline";
  width?: number;
  height?: number;
}

export interface OptionState {
  id: string;
  text: string;
  richText?: string;   // HTML rich text
  isCorrect: boolean;
  media?: MediaItem;
  formula?: string;    // LaTeX
  explanation?: string;
  feedback?: string;
  weight?: number;     // partial scoring
  orderIndex?: number; // for ordering questions
  dragTarget?: string; // for drag-drop
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
  leftMedia?: MediaItem;
  rightMedia?: MediaItem;
}

export interface MatrixRow {
  id: string;
  label: string;
  cells: { columnId: string; isCorrect: boolean }[];
}

export interface MatrixColumn {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  prompt: string;
  richText?: string;        // HTML rich text for question
  qtype: QuestionType;
  difficulty: Difficulty;
  points: number;
  negativeMarks?: number;
  timeLimitSeconds?: number;
  explanation?: string;
  aiExplanation?: string;
  hint?: string;
  tags?: string[];
  topic?: string;
  subtopic?: string;
  learningObjective?: string;
  estimatedSeconds?: number;
  status: "draft" | "published" | "archived";

  // Media
  media?: MediaItem[];
  audioUrl?: string;
  videoUrl?: string;
  formula?: string;         // LaTeX for formula questions

  // Options (for choice-based questions)
  options: OptionState[];

  // Fill blank template: "The ____ is ____"
  fillTemplate?: string;

  // Matching pairs
  matchingPairs?: MatchingPair[];

  // Matrix
  matrixColumns?: MatrixColumn[];
  matrixRows?: MatrixRow[];

  // Hotspot / clickable area
  hotspotImage?: string;
  hotspotAreas?: { id: string; x: number; y: number; width: number; height: number; isCorrect: boolean; label: string }[];

  // Code question
  codeLanguage?: string;
  codeTemplate?: string;
  codeAnswer?: string;

  // Numeric
  numericAnswer?: number;
  numericTolerance?: number;

  // Essay
  wordLimit?: number;
  rubric?: string;
  bandDescriptor?: string;

  // Ordering
  correctOrder?: string[];  // option ids in correct order
}

export interface Section {
  id: string;
  title: string;
  instructions?: string;
  description?: string;
  passage?: string;
  richPassage?: string;     // HTML rich text passage

  // Section media
  media?: MediaItem[];
  audioUrl?: string;        // section intro audio
  imageUrl?: string;
  pdfAttachment?: string;

  // Section config
  timeLimitSeconds?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  passingScore?: number;
  backgroundColor?: string;
  colorTheme?: string;
  icon?: string;
  difficulty?: Difficulty;
  lockNavigation?: boolean;
  autoNumbering?: boolean;
  questionRandomization?: boolean;

  questions: Question[];
}

export interface ExamMeta {
  id?: string;
  title: string;
  description?: string;
  kind: ExamKind;
  difficulty: Difficulty;
  durationMinutes: number;
  passingScore: number;
  requiredPack: "free" | "pro" | "elite";
  status: PublishStatus;
  tags?: string[];
  version?: number;

  // Exam-level media
  audioUrl?: string;
  pdfUrl?: string;
  thumbnailUrl?: string;
}

export interface ExamBuilderState {
  meta: ExamMeta;
  sections: Section[];
  isDirty: boolean;
  lastSaved?: Date;
  activeSection: number;
  activeQuestion: string | null;
}

// ============================================================
// Question Type Config (metadata for the type selector)
// ============================================================

export interface QuestionTypeConfig {
  type: QuestionType;
  label: string;
  icon: string;
  description: string;
  category: string;
  color: string;
  hasOptions: boolean;
  hasMedia: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
}

export const QUESTION_TYPE_CONFIGS: QuestionTypeConfig[] = [
  // Choice-based
  { type: "single_choice",    label: "Single Choice",       icon: "◉", description: "Bitta to'g'ri javob",          category: "Choice",    color: "violet",  hasOptions: true,  hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "multiple_choice",  label: "Multiple Choice",     icon: "☑", description: "Bir nechta to'g'ri javob",     category: "Choice",    color: "purple",  hasOptions: true,  hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "true_false",       label: "True / False",        icon: "⊤⊥", description: "Rost yoki yolg'on",           category: "Choice",    color: "blue",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "yes_no",           label: "Yes / No",            icon: "✓✗", description: "Ha yoki yo'q",                category: "Choice",    color: "cyan",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  // Text-based
  { type: "fill_blank",       label: "Fill in the Blank",   icon: "___", description: "Bo'sh joyni to'ldirish",      category: "Text",      color: "emerald", hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "short_answer",     label: "Short Answer",        icon: "✏", description: "Qisqa javob",                  category: "Text",      color: "teal",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "essay",            label: "Essay / Writing",     icon: "📝", description: "Keng javob / esse",           category: "Text",      color: "green",   hasOptions: false, hasMedia: false, supportsAudio: false, supportsVideo: false },
  { type: "summary_completion", label: "Summary Completion", icon: "📄", description: "Xulosa to'ldirish",          category: "Text",      color: "lime",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "sentence_completion", label: "Sentence Completion", icon: "💬", description: "Gap to'ldirish",           category: "Text",      color: "yellow",  hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  // Matching & Ordering
  { type: "matching",         label: "Matching",            icon: "↔", description: "Moslashtirish",                category: "Matching",  color: "orange",  hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "ordering",         label: "Ordering",            icon: "⇅", description: "Tartibga keltirish",           category: "Matching",  color: "amber",   hasOptions: true,  hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "drag_drop",        label: "Drag & Drop",         icon: "↕", description: "Sudrab tashlash",              category: "Matching",  color: "rose",    hasOptions: true,  hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "table_completion", label: "Table Completion",    icon: "⊞", description: "Jadval to'ldirish",            category: "Matching",  color: "red",     hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "paragraph_heading", label: "Paragraph Heading", icon: "¶", description: "Paragraf sarlavhasi",           category: "Matching",  color: "pink",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "information_matching", label: "Information Matching", icon: "🔍", description: "Ma'lumot moslashtirish",  category: "Matching",  color: "fuchsia", hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  // IELTS specific
  { type: "map_labeling",     label: "Map Labeling",        icon: "🗺", description: "Xarita belgilash",             category: "IELTS",     color: "indigo",  hasOptions: true,  hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "diagram_labeling", label: "Diagram Labeling",    icon: "📐", description: "Diagramma belgilash",          category: "IELTS",     color: "slate",   hasOptions: true,  hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "flow_chart",       label: "Flow Chart",          icon: "🔄", description: "Oqim sxemasi",                 category: "IELTS",     color: "zinc",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  // Listening
  { type: "listening_choice", label: "Listening Choice",    icon: "🎧", description: "Eshitish tanlov",              category: "Listening", color: "sky",     hasOptions: true,  hasMedia: false, supportsAudio: true,  supportsVideo: false },
  { type: "listening_gap",    label: "Listening Gap Fill",  icon: "🔊", description: "Eshitib bo'sh joyni to'ldirish", category: "Listening", color: "blue", hasOptions: false, hasMedia: false, supportsAudio: true,  supportsVideo: false },
  // Speaking
  { type: "speaking_recording", label: "Speaking Recording", icon: "🎤", description: "Nutq yozib olish",           category: "Speaking",  color: "emerald", hasOptions: false, hasMedia: false, supportsAudio: false, supportsVideo: false },
  // Advanced
  { type: "numeric",          label: "Numeric Answer",      icon: "🔢", description: "Raqamli javob",               category: "Advanced",  color: "violet",  hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "formula",          label: "Formula Answer",      icon: "∑", description: "Formula javob (LaTeX)",         category: "Advanced",  color: "purple",  hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "matrix",           label: "Matrix Question",     icon: "⊠", description: "Matritsa savol",               category: "Advanced",  color: "blue",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "hotspot",          label: "Hotspot Image",       icon: "🎯", description: "Rasmda nuqtani belgilash",     category: "Advanced",  color: "orange",  hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "clickable_area",   label: "Clickable Area",      icon: "👆", description: "Bosiladigan maydon",           category: "Advanced",  color: "rose",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "audio_based",      label: "Audio Question",      icon: "🔉", description: "Audio asosida savol",          category: "Media",     color: "amber",   hasOptions: true,  hasMedia: false, supportsAudio: true,  supportsVideo: false },
  { type: "video_based",      label: "Video Question",      icon: "🎬", description: "Video asosida savol",          category: "Media",     color: "red",     hasOptions: true,  hasMedia: false, supportsAudio: false, supportsVideo: true  },
  { type: "code",             label: "Code Question",       icon: "💻", description: "Dasturlash savoli",            category: "Advanced",  color: "green",   hasOptions: false, hasMedia: false, supportsAudio: false, supportsVideo: false },
  { type: "case_study",       label: "Case Study",          icon: "📋", description: "Muammo holati",                category: "Advanced",  color: "teal",    hasOptions: false, hasMedia: true,  supportsAudio: false, supportsVideo: false },
  { type: "custom",           label: "Custom Question",     icon: "⚙", description: "Maxsus savol",                 category: "Advanced",  color: "gray",    hasOptions: true,  hasMedia: true,  supportsAudio: true,  supportsVideo: true  },
];

export const EXAM_KIND_CONFIG: Record<ExamKind, { label: string; icon: string; color: string }> = {
  reading:      { label: "IELTS Reading",      icon: "📖", color: "blue"    },
  listening:    { label: "IELTS Listening",    icon: "🎧", color: "sky"     },
  writing:      { label: "IELTS Writing",      icon: "✍️", color: "emerald" },
  speaking:     { label: "IELTS Speaking",     icon: "🎤", color: "green"   },
  sat:          { label: "SAT",                icon: "🎯", color: "violet"  },
  national_cert:{ label: "Milliy Sertifikat",  icon: "🏛️", color: "amber"   },
  cefr:         { label: "CEFR",               icon: "🇪🇺", color: "blue"    },
  toefl:        { label: "TOEFL",              icon: "🌐", color: "red"     },
  ielts_full:   { label: "IELTS Full",         icon: "📚", color: "indigo"  },
  math:         { label: "Mathematics",        icon: "∑",  color: "purple"  },
  custom:       { label: "Custom Exam",        icon: "⚙️", color: "gray"    },
};

// Helper: generate unique id
export const uid = () => Math.random().toString(36).slice(2, 10);

export const newOption = (overrides?: Partial<OptionState>): OptionState => ({
  id: uid(),
  text: "",
  isCorrect: false,
  ...overrides,
});

export const newQuestion = (qtype: QuestionType = "single_choice"): Question => {
  const defaultOptions: OptionState[] =
    qtype === "true_false"
      ? [{ id: uid(), text: "True", isCorrect: true }, { id: uid(), text: "False", isCorrect: false }]
      : qtype === "yes_no"
      ? [{ id: uid(), text: "Yes", isCorrect: true }, { id: uid(), text: "No", isCorrect: false }]
      : ["A", "B", "C", "D"].map((l, i) => ({ id: uid(), text: l, isCorrect: i === 0 }));

  return {
    id: uid(),
    prompt: "",
    qtype,
    difficulty: "medium",
    points: 1,
    status: "draft",
    options: defaultOptions,
  };
};

export const newSection = (): Section => ({
  id: uid(),
  title: "",
  questions: [newQuestion("single_choice")],
  shuffleQuestions: false,
  shuffleOptions: false,
  autoNumbering: true,
});
