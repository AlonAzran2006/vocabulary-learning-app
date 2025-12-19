// Client-side training queue management
// This allows smooth training flow without server round-trips for each word

export interface Word {
  id: string;
  word: string;
  meaning: string;
  file_index: number;
  knowing_grade: number;
}

export interface TrainingQueueState {
  trainingName: string;
  words: Word[]; // Queue of words - first word is current
  userGrades: Record<string, number>; // word_id -> grade
  removedIds: string[];
  addedToEnd: string[];
  initialSize?: number; // Track initial size for stats
}

const TRAINING_QUEUE_KEY = "training_queue_state";

/**
 * Calculate new grade based on old grade and test result
 * This is the client-side version of calc_new_grade from the server
 */
export function calcNewGrade(oldGrade: number, testGrade: -1 | 0 | 1): number {
  if (testGrade === -1) {
    return Math.round(oldGrade * 0.5 * 100) / 100;
  }
  if (testGrade === 0) {
    return Math.round(oldGrade * 100) / 100;
  }
  if (testGrade === 1) {
    return Math.round(((10 - oldGrade) * 0.5 + oldGrade) * 100) / 100;
  }
  throw new Error("test_grade must be -1, 0, or 1");
}

/**
 * Initialize training queue from server response
 */
export function initializeTrainingQueue(
  trainingName: string,
  words: Word[],
  initialGrades: Record<string, number> = {}
): TrainingQueueState {
  const queue: TrainingQueueState = {
    trainingName,
    words: [...words], // Copy array - first word is current
    userGrades: { ...initialGrades },
    removedIds: [],
    addedToEnd: [],
    initialSize: words.length,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(TRAINING_QUEUE_KEY, JSON.stringify(queue));
  }

  return queue;
}

/**
 * Load training queue from localStorage
 */
export function loadTrainingQueue(): TrainingQueueState | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(TRAINING_QUEUE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as TrainingQueueState;
  } catch {
    return null;
  }
}

/**
 * Get current word from queue (first word in array)
 */
export function getCurrentWord(): Word | null {
  const queue = loadTrainingQueue();
  if (!queue || queue.words.length === 0) {
    return null;
  }
  return queue.words[0];
}

/**
 * Submit grade and move to next word
 * Returns the next word or null if training is complete
 */
export function submitGrade(testGrade: -1 | 0 | 1): {
  nextWord: Word | null;
  queueSizeRemaining: number;
  trainingComplete: boolean;
  updatedGrade: { wordId: string; oldGrade: number; newGrade: number };
} {
  const queue = loadTrainingQueue();
  if (!queue || queue.words.length === 0) {
    return {
      nextWord: null,
      queueSizeRemaining: 0,
      trainingComplete: true,
      updatedGrade: { wordId: "", oldGrade: 0, newGrade: 0 },
    };
  }

  // Get first word (current word)
  const currentWord = queue.words[0];
  const oldGrade = queue.userGrades[currentWord.id] || 0.0;
  const newGrade = calcNewGrade(oldGrade, testGrade);

  // Update grade
  queue.userGrades[currentWord.id] = newGrade;

  // Remove current word from queue (shift - remove first element)
  queue.words.shift();

  // If test_grade is -1 (didn't know), add word back to end if not already there
  if (testGrade === -1) {
    const alreadyInQueue = queue.words.some((w) => w.id === currentWord.id);
    if (!alreadyInQueue) {
      // Update the word's grade before adding it back
      const wordWithNewGrade: Word = {
        ...currentWord,
        knowing_grade: newGrade,
      };
      queue.words.push(wordWithNewGrade);
      if (!queue.addedToEnd.includes(currentWord.id)) {
        queue.addedToEnd.push(currentWord.id);
      }
    }
  }

  // Track removed word
  if (!queue.removedIds.includes(currentWord.id)) {
    queue.removedIds.push(currentWord.id);
  }

  // Remove from addedToEnd if it was there and testGrade is not -1
  const addedIndex = queue.addedToEnd.indexOf(currentWord.id);
  if (addedIndex > -1 && testGrade !== -1) {
    queue.addedToEnd.splice(addedIndex, 1);
  }

  // Check if training is complete
  const trainingComplete = queue.words.length === 0;
  const nextWord = trainingComplete ? null : queue.words[0]; // Next word is now first in queue

  // Save updated queue
  if (typeof window !== "undefined") {
    localStorage.setItem(TRAINING_QUEUE_KEY, JSON.stringify(queue));
  }

  return {
    nextWord: nextWord || null,
    queueSizeRemaining: queue.words.length,
    trainingComplete,
    updatedGrade: {
      wordId: currentWord.id,
      oldGrade,
      newGrade,
    },
  };
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  totalWords: number;
  remainingWords: number;
  completedWords: number;
  progress: number;
} {
  const queue = loadTrainingQueue();
  if (!queue) {
    return {
      totalWords: 0,
      remainingWords: 0,
      completedWords: 0,
      progress: 0,
    };
  }

  // Calculate stats based on current state
  const remainingWords = queue.words.length;

  // Use initial size if available, otherwise estimate from current + removed
  const initialSize =
    queue.initialSize || queue.words.length + queue.removedIds.length;

  // Count unique removed words (some might be in addedToEnd, so they're not really "completed")
  const uniqueRemoved = new Set(queue.removedIds);
  queue.addedToEnd.forEach((id) => uniqueRemoved.delete(id));
  const completedWords = uniqueRemoved.size;

  // Total is initial size (or estimate)
  const totalWords = initialSize;
  const progress = totalWords > 0 ? (completedWords / totalWords) * 100 : 0;

  return {
    totalWords,
    remainingWords,
    completedWords,
    progress,
  };
}

/**
 * Get all updates that need to be synced to server
 */
export function getSyncData(): {
  trainingName: string;
  gradeUpdates: Array<{ wordId: string; grade: number }>;
  removedIds: string[];
  addedToEnd: string[];
} | null {
  const queue = loadTrainingQueue();
  if (!queue) return null;

  const gradeUpdates = Object.entries(queue.userGrades).map(
    ([wordId, grade]) => ({
      wordId,
      grade,
    })
  );

  return {
    trainingName: queue.trainingName,
    gradeUpdates,
    removedIds: queue.removedIds,
    addedToEnd: queue.addedToEnd,
  };
}

/**
 * Clear training queue
 */
export function clearTrainingQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TRAINING_QUEUE_KEY);
}

/**
 * Resume training from saved state
 * Only resumes if the training name matches the requested training
 */
export function resumeTraining(trainingName?: string): {
  currentWord: Word | null;
  queueSizeRemaining: number;
  trainingComplete: boolean;
} {
  const queue = loadTrainingQueue();
  if (!queue || queue.words.length === 0) {
    return {
      currentWord: null,
      queueSizeRemaining: 0,
      trainingComplete: true,
    };
  }

  // If trainingName is provided, only resume if it matches
  if (trainingName && queue.trainingName !== trainingName) {
    console.log(
      `[v0] Training name mismatch: requested "${trainingName}", found "${queue.trainingName}". Clearing old training.`
    );
    // Clear the old training queue since it doesn't match
    clearTrainingQueue();
    return {
      currentWord: null,
      queueSizeRemaining: 0,
      trainingComplete: true,
    };
  }

  return {
    currentWord: queue.words[0], // First word is current
    queueSizeRemaining: queue.words.length - 1, // Excluding current word
    trainingComplete: false,
  };
}
