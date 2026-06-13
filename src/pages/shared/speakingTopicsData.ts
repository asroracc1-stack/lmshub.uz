// Curated IELTS Speaking topics — used by SpeakingTopics list and SpeakingTopicDetail
export type Difficulty = "easy" | "medium" | "hard";

export interface SpeakingTopic {
  slug: string;
  title: string;
  category: string;
  emoji: string;
  difficulty: Difficulty;
  color: string; // tailwind border color class
  bg: string;    // tailwind background tint class
  part1: string[];
  part2: { cue: string; bullets: string[] };
  part3: string[];
}

export const TOPICS: SpeakingTopic[] = [
  {
    slug: "shoes-apologized",
    title: "Shoes & Someone Apologized to You",
    category: "Fashion & Relationships",
    emoji: "👟",
    difficulty: "medium",
    color: "border-violet-400",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    part1: [
      "Do you like buying shoes? How often?",
      "What kind of shoes do you usually wear?",
      "Have you ever bought shoes online?",
      "Do you think shoes are important for your style?",
    ],
    part2: {
      cue: "Describe a time when someone apologized to you.",
      bullets: ["Who that person was", "What they apologized for", "How you reacted", "And explain how you felt about it"],
    },
    part3: [
      "Why is it sometimes hard for people to apologize?",
      "Do you think apologies are taken seriously today?",
      "How does culture affect the way people apologize?",
      "Should children be taught how to apologize?",
      "What is the difference between a sincere and a forced apology?",
    ],
  },
  {
    slug: "rules-cant-live-without",
    title: "Rules & Something You Can't Live Without",
    category: "Society & Daily Life",
    emoji: "📋",
    difficulty: "medium",
    color: "border-rose-400",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    part1: ["Are there many rules at your school/work?", "Do you usually follow rules?", "Which rule do you find unnecessary?", "Have you ever broken an important rule?"],
    part2: { cue: "Describe something you cannot live without (not phone or computer).", bullets: ["What it is", "Why it is important to you", "How often you use it", "And explain how you would feel without it"] },
    part3: ["Why do societies need rules?", "Should rules change with time?", "Do young people respect rules less than older people?", "How are rules different at home and at school?", "What kind of items do people get attached to?"],
  },
  {
    slug: "building-family-member",
    title: "Building & Proud of a Family Member",
    category: "Architecture & Family",
    emoji: "🏛️",
    difficulty: "medium",
    color: "border-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    part1: ["What's the most beautiful building you've seen?", "Do you prefer modern or traditional buildings?", "Are there any famous buildings in your city?", "Would you like to live in a tall building?"],
    part2: { cue: "Describe a family member you are proud of.", bullets: ["Who they are", "What they do", "Why you are proud of them", "And explain how they have influenced you"] },
    part3: ["What qualities make a good family member?", "How important is family in your culture?", "Do you think family values are changing?", "Should grandparents live with their children?", "How do families show respect to each other?"],
  },
  {
    slug: "morning-traditional-story",
    title: "Morning Time & Traditional Story",
    category: "Daily Life & Culture",
    emoji: "🌅",
    difficulty: "medium",
    color: "border-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    part1: ["Are you a morning person?", "What do you usually do in the morning?", "Do you eat breakfast every day?", "How do you feel after a good morning?"],
    part2: { cue: "Describe a traditional story from your country.", bullets: ["What the story is about", "Who told it to you", "What lesson it teaches", "And explain why it is important to your culture"] },
    part3: ["Why do people enjoy traditional stories?", "Are old stories still useful today?", "Should children read more folk tales?", "How are stories used to teach values?", "Do modern movies replace traditional storytelling?"],
  },
  {
    slug: "phone-childhood-toy",
    title: "Mobile Phone & Childhood Toy",
    category: "Technology & Childhood",
    emoji: "📱",
    difficulty: "medium",
    color: "border-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    part1: ["When did you get your first phone?", "How often do you use your phone?", "Do you prefer calling or messaging?", "Are phones too distracting nowadays?"],
    part2: { cue: "Describe a toy you had in your childhood.", bullets: ["What the toy was", "Who gave it to you", "How you played with it", "And explain why it was special"] },
    part3: ["Are toys important for child development?", "Do modern toys teach children well?", "Should kids play with educational toys only?", "How have toys changed over the years?", "Do digital games replace real toys?"],
  },
  {
    slug: "gifts",
    title: "Gifts",
    category: "Gifts & Relationships",
    emoji: "🎁",
    difficulty: "medium",
    color: "border-pink-400",
    bg: "bg-pink-100 dark:bg-pink-900/30",
    part1: ["Do you like giving gifts?", "What was the last gift you received?", "How do you choose a gift for someone?", "Are gifts important in your culture?"],
    part2: { cue: "Describe a special gift you gave to someone.", bullets: ["What the gift was", "Who you gave it to", "Why you chose it", "And explain how they reacted"] },
    part3: ["Why do people give gifts?", "Is the price of a gift important?", "Should gifts be practical or emotional?", "How do gifts strengthen relationships?", "Are some occasions becoming too commercialized?"],
  },
  {
    slug: "noisy-place-friend",
    title: "Noisy Place & Helpful Friend",
    category: "Environment & Friendship",
    emoji: "🔊",
    difficulty: "easy",
    color: "border-fuchsia-400",
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
    part1: ["Do you live in a noisy area?", "How does noise affect your mood?", "Do you prefer quiet or busy places?", "Where do you go to relax?"],
    part2: { cue: "Describe a helpful friend you have.", bullets: ["Who they are", "How you met them", "How they helped you", "And explain why you appreciate them"] },
    part3: ["Why are friendships important?", "How do friendships change over time?", "Can online friendships be real?", "Should friends always tell the truth?", "What makes a friendship last long?"],
  },
  {
    slug: "favorite-food",
    title: "Favorite Food & Cooking",
    category: "Food & Lifestyle",
    emoji: "🍜",
    difficulty: "easy",
    color: "border-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    part1: ["What's your favorite food?", "Do you like cooking?", "Do you prefer eating at home or out?", "Has your taste in food changed?"],
    part2: { cue: "Describe a dish you really enjoy.", bullets: ["What it is", "Where you usually eat it", "How it is made", "And explain why you like it"] },
    part3: ["Why is food culture important?", "Are traditional foods disappearing?", "Should fast food be regulated?", "How does food connect people?", "Will home cooking decline in the future?"],
  },
  {
    slug: "travel-place",
    title: "Travel & Memorable Place",
    category: "Travel & Memory",
    emoji: "✈️",
    difficulty: "hard",
    color: "border-sky-400",
    bg: "bg-sky-100 dark:bg-sky-900/30",
    part1: ["Do you like travelling?", "Where would you like to go next?", "Do you prefer cities or nature?", "How do you plan a trip?"],
    part2: { cue: "Describe a place you visited that left a strong impression.", bullets: ["Where it is", "When you went", "What you did there", "And explain why it impressed you"] },
    part3: ["Why do people travel?", "How does travel change people?", "Is tourism harmful for some places?", "Should travel be more sustainable?", "Will virtual tourism replace real travel?"],
  },
];
