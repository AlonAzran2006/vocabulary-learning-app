// Mock data for development mode

export interface MockWord {
  id: string;
  word: string;
  meaning: string;
  file_index: number;
}

export interface MockTraining {
  name: string;
  wordCount: number;
  lastModified: number;
  fileIndexes: number[];
}

// Mock words database
const MOCK_WORDS: MockWord[] = [
  { id: "w_1", word: "hello", meaning: "שלום", file_index: 1 },
  { id: "w_2", word: "world", meaning: "עולם", file_index: 1 },
  { id: "w_3", word: "computer", meaning: "מחשב", file_index: 1 },
  { id: "w_4", word: "school", meaning: "בית ספר", file_index: 1 },
  { id: "w_5", word: "book", meaning: "ספר", file_index: 1 },
  { id: "w_6", word: "friend", meaning: "חבר", file_index: 2 },
  { id: "w_7", word: "house", meaning: "בית", file_index: 2 },
  { id: "w_8", word: "family", meaning: "משפחה", file_index: 2 },
  { id: "w_9", word: "water", meaning: "מים", file_index: 2 },
  { id: "w_10", word: "food", meaning: "אוכל", file_index: 2 },
  { id: "w_11", word: "love", meaning: "אהבה", file_index: 3 },
  { id: "w_12", word: "happy", meaning: "שמח", file_index: 3 },
  { id: "w_13", word: "music", meaning: "מוזיקה", file_index: 3 },
  { id: "w_14", word: "sun", meaning: "שמש", file_index: 3 },
  { id: "w_15", word: "moon", meaning: "ירח", file_index: 3 },
  { id: "w_16", word: "star", meaning: "כוכב", file_index: 4 },
  { id: "w_17", word: "ocean", meaning: "אוקיינוס", file_index: 4 },
  { id: "w_18", word: "mountain", meaning: "הר", file_index: 4 },
  { id: "w_19", word: "tree", meaning: "עץ", file_index: 4 },
  { id: "w_20", word: "flower", meaning: "פרח", file_index: 4 },
];

// Default mock trainings
export const DEFAULT_MOCK_TRAININGS: MockTraining[] = [
  {
    name: "מילים בסיסיות - יחידות 1-2",
    wordCount: 10,
    lastModified: Math.floor(Date.now() / 1000) - 86400, // יום אחד לפני
    fileIndexes: [1, 2],
  },
  {
    name: "אוצר מילים מתקדם",
    wordCount: 15,
    lastModified: Math.floor(Date.now() / 1000) - 172800, // יומיים לפני
    fileIndexes: [3, 4],
  },
  {
    name: "מילים יומיומיות",
    wordCount: 8,
    lastModified: Math.floor(Date.now() / 1000) - 259200, // שלושה ימים לפני
    fileIndexes: [1, 2, 3],
  },
];

// Get trainings from localStorage or return defaults
export function getMockTrainings(): MockTraining[] {
  if (typeof window === "undefined") return DEFAULT_MOCK_TRAININGS;

  const stored = localStorage.getItem("mock_trainings");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_MOCK_TRAININGS;
    }
  }
  return DEFAULT_MOCK_TRAININGS;
}

// Save trainings to localStorage
export function saveMockTrainings(trainings: MockTraining[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("mock_trainings", JSON.stringify(trainings));
}

// Add a new training
export function addMockTraining(
  name: string,
  fileIndexes: number[]
): MockTraining {
  // Count words from selected files
  const wordCount = MOCK_WORDS.filter((w) =>
    fileIndexes.includes(w.file_index)
  ).length;

  const newTraining: MockTraining = {
    name,
    wordCount,
    lastModified: Math.floor(Date.now() / 1000),
    fileIndexes,
  };

  const trainings = getMockTrainings();
  trainings.unshift(newTraining); // Add to beginning
  saveMockTrainings(trainings);

  return newTraining;
}

// Get words for a training based on file indexes
export function getMockTrainingWords(fileIndexes: number[]): MockWord[] {
  return MOCK_WORDS.filter((w) => fileIndexes.includes(w.file_index));
}

// Training queue management
interface TrainingQueue {
  trainingName: string;
  words: MockWord[];
  currentIndex: number;
}

const TRAINING_QUEUE_KEY = "mock_training_queue";

// Initialize training queue
export function initializeMockTraining(
  trainingName: string,
  fileIndexes: number[]
): {
  first_word: MockWord | null;
  queue_size_remaining: number;
  training_complete: boolean;
} {
  const words = getMockTrainingWords(fileIndexes);

  if (words.length === 0) {
    return {
      first_word: null,
      queue_size_remaining: 0,
      training_complete: true,
    };
  }

  const queue: TrainingQueue = {
    trainingName,
    words,
    currentIndex: 0,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(TRAINING_QUEUE_KEY, JSON.stringify(queue));
  }

  return {
    first_word: words[0],
    queue_size_remaining: words.length - 1,
    training_complete: false,
  };
}

// Get current word from queue
export function getCurrentMockWord(): MockWord | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(TRAINING_QUEUE_KEY);
  if (!stored) return null;

  try {
    const queue: TrainingQueue = JSON.parse(stored);
    return queue.words[queue.currentIndex] || null;
  } catch {
    return null;
  }
}

// Submit grade and get next word
export function submitMockGrade(grade: number): {
  next_word: MockWord | null;
  queue_size_remaining: number;
  training_complete: boolean;
} {
  if (typeof window === "undefined") {
    return {
      next_word: null,
      queue_size_remaining: 0,
      training_complete: true,
    };
  }

  const stored = localStorage.getItem(TRAINING_QUEUE_KEY);
  if (!stored) {
    return {
      next_word: null,
      queue_size_remaining: 0,
      training_complete: true,
    };
  }

  try {
    const queue: TrainingQueue = JSON.parse(stored);
    queue.currentIndex += 1;

    if (queue.currentIndex >= queue.words.length) {
      // Training complete
      localStorage.removeItem(TRAINING_QUEUE_KEY);
      return {
        next_word: null,
        queue_size_remaining: 0,
        training_complete: true,
      };
    }

    localStorage.setItem(TRAINING_QUEUE_KEY, JSON.stringify(queue));

    return {
      next_word: queue.words[queue.currentIndex],
      queue_size_remaining: queue.words.length - queue.currentIndex - 1,
      training_complete: false,
    };
  } catch {
    return {
      next_word: null,
      queue_size_remaining: 0,
      training_complete: true,
    };
  }
}

// Clear training queue
export function clearMockTrainingQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TRAINING_QUEUE_KEY);
}
