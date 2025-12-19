"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  Loader2,
  Eye,
  Sparkles,
  ArrowRight,
  Home,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Confetti from "react-confetti";
import {
  initializeMockTraining,
  getCurrentMockWord,
  submitMockGrade,
  clearMockTrainingQueue,
  getMockTrainings,
} from "@/lib/mock-data";
import {
  initializeTrainingQueue,
  submitGrade,
  resumeTraining,
  getCurrentWord,
  getQueueStats,
  getSyncData,
  clearTrainingQueue,
  type Word,
} from "@/lib/training-queue";

// Word interface is now imported from training-queue.ts

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://word-psicho-server.onrender.com";

// Check if dev mode is enabled
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export default function TrainingPage() {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [showMeaning, setShowMeaning] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueRemaining, setQueueRemaining] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalWords, setTotalWords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [gradesHistory, setGradesHistory] = useState<number[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [queueStats, setQueueStats] = useState({
    totalWords: 0,
    remainingWords: 0,
    completedWords: 0,
    progress: 0,
  });
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    initializeTraining();

    // Check if device is mobile (touch device or small screen)
    const checkMobile = () => {
      const hasTouchScreen =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouchScreen || isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const initializeTraining = async () => {
    const trainingName = localStorage.getItem("currentTrainingName");
    if (!trainingName) {
      toast({
        title: "שגיאה",
        description: "לא נמצא אימון פעיל",
        variant: "destructive",
      });
      router.push("/trainings");
      return;
    }

    try {
      if (DEV_MODE) {
        // Use mock data in dev mode
        console.log("[v0] Dev mode: Initializing mock training");

        // Check if training queue already exists (resume training)
        const queueData = localStorage.getItem("mock_training_queue");
        if (queueData) {
          try {
            const queue = JSON.parse(queueData);
            // Resume existing training if queue exists and training name matches
            if (
              queue.trainingName === trainingName &&
              queue.currentIndex < queue.words.length
            ) {
              console.log(
                `[v0] Dev mode: Resuming existing training from localStorage: ${trainingName}`
              );
              const currentWord = queue.words[queue.currentIndex];
              setCurrentWord(currentWord);
              setQueueRemaining(queue.words.length - queue.currentIndex - 1);
              setIsLoading(false);
              return;
            } else if (queue.trainingName !== trainingName) {
              // Training name doesn't match, clear old training
              console.log(
                `[v0] Dev mode: Training name mismatch: requested "${trainingName}", found "${queue.trainingName}". Clearing old training.`
              );
              localStorage.removeItem("mock_training_queue");
            }
          } catch {
            // If parsing fails, continue to initialize new training
          }
        }

        // Initialize new training
        const allTrainings = getMockTrainings();
        const training = allTrainings.find((t) => t.name === trainingName);
        if (!training) {
          throw new Error("אימון לא נמצא");
        }

        const result = initializeMockTraining(
          trainingName,
          training.fileIndexes
        );
        if (result.training_complete) {
          setIsCompleted(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
          localStorage.removeItem("currentTrainingName");
        } else {
          setCurrentWord(result.first_word);
          setQueueRemaining(result.queue_size_remaining);
        }
        setIsLoading(false);
        return;
      }

      console.log(
        "[v0] Initializing training with new client-side queue:",
        trainingName
      );

      const userUid = user?.uid;
      if (!userUid) {
        throw new Error("לא זוהה משתמש מחובר. נא להתחבר ולנסות שוב.");
      }

      // Try to resume existing training from localStorage
      // Only resume if the training name matches
      const resumed = resumeTraining(trainingName);
      if (resumed.currentWord && !resumed.trainingComplete) {
        console.log(
          `[v0] Resuming existing training from localStorage: ${trainingName}`
        );
        setCurrentWord(resumed.currentWord);
        setQueueRemaining(resumed.queueSizeRemaining);
        setIsLoading(false);
        return;
      }

      // Load full training from server
      const response = await fetch("/api/proxy/load_training_full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uid: userUid,
          training_name: trainingName,
        }),
      });

      console.log("[v0] Load training full response status:", response.status);
      const data = await response.json();
      console.log("[v0] Load training full data:", data);

      if (!response.ok) {
        throw new Error(data.error || data.detail || "Failed to load training");
      }

      if (data.training_complete || !data.words || data.words.length === 0) {
        setIsCompleted(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        localStorage.removeItem("currentTrainingName");
      } else {
        // Initialize client-side queue with all words
        initializeTrainingQueue(
          trainingName,
          data.words,
          data.user_grades || {}
        );

        // Get first word from queue
        const firstWord = getCurrentWord();
        if (firstWord) {
          setCurrentWord(firstWord);
          setQueueRemaining(data.words.length - 1);
          setTotalWords(0); // Reset counter
          // Initialize queue stats
          const stats = getQueueStats();
          setQueueStats(stats);
        } else {
          setIsCompleted(true);
          localStorage.removeItem("currentTrainingName");
        }
      }
    } catch (error) {
      console.error("Error initializing training:", error);
      toast({
        title: "שגיאה",
        description:
          error instanceof Error ? error.message : "לא ניתן לטעון את האימון",
        variant: "destructive",
      });
      router.push("/trainings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (selectedGrade === null || !currentWord) {
      toast({
        title: "בחר רמת ידע",
        description: "נא לבחור אחת מהאפשרויות",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (DEV_MODE) {
        // Use mock data in dev mode
        console.log("[v0] Dev mode: Submitting mock grade");

        const result = submitMockGrade(selectedGrade);
        setTotalWords((prev) => prev + 1);
        setGradesHistory((prev) => [...prev, selectedGrade]);

        // Update streak
        if (selectedGrade >= 0) {
          setCurrentStreak((prev) => {
            const newStreak = prev + 1;
            setBestStreak((currentBest) =>
              newStreak > currentBest ? newStreak : currentBest
            );
            return newStreak;
          });
        } else {
          setCurrentStreak(0);
        }

        setTimeout(() => {
          if (result.training_complete) {
            setIsCompleted(true);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
            // Clear the training name when training is completed
            localStorage.removeItem("currentTrainingName");
            clearMockTrainingQueue();
          } else {
            setCurrentWord(result.next_word);
            setShowMeaning(false);
            setSelectedGrade(null);
            setQueueRemaining(result.queue_size_remaining);
          }
        }, 300);
        setIsSubmitting(false);
        return;
      }

      console.log("[v0] Submitting grade (client-side):", {
        word_id: currentWord.id,
        grade: selectedGrade,
      });

      // Use client-side queue management (no server call needed!)
      const result = submitGrade(selectedGrade as -1 | 0 | 1);

      setTotalWords((prev) => prev + 1);
      setGradesHistory((prev) => [...prev, selectedGrade]);

      // Update streak
      if (selectedGrade >= 0) {
        setCurrentStreak((prev) => {
          const newStreak = prev + 1;
          setBestStreak((currentBest) =>
            newStreak > currentBest ? newStreak : currentBest
          );
          return newStreak;
        });
      } else {
        setCurrentStreak(0);
      }

      setTimeout(() => {
        if (result.trainingComplete) {
          // Training complete - sync all updates to server
          const syncData = getSyncData();
          if (syncData) {
            const userUid = user?.uid;
            if (userUid) {
              // Sync in background (don't wait for response)
              fetch("/api/proxy/sync_training_updates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_uid: userUid,
                  training_name: syncData.trainingName,
                  grade_updates: syncData.gradeUpdates,
                  removed_ids: syncData.removedIds,
                  added_to_end: syncData.addedToEnd,
                }),
              }).catch((err) => {
                console.error("Failed to sync updates:", err);
                // Don't show error to user - it's background sync
              });
            }
          }

          setIsCompleted(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
          localStorage.removeItem("currentTrainingName");
          clearTrainingQueue();
          setQueueStats({
            totalWords: 0,
            remainingWords: 0,
            completedWords: 0,
            progress: 100,
          });
        } else {
          setCurrentWord(result.nextWord);
          setShowMeaning(false);
          setSelectedGrade(null);
          setQueueRemaining(result.queueSizeRemaining);
          // Update queue stats
          if (!DEV_MODE) {
            const stats = getQueueStats();
            setQueueStats(stats);
          }
        }
      }, 300);
    } catch (error) {
      console.error("Error submitting grade:", error);
      toast({
        title: "שגיאה",
        description:
          error instanceof Error ? error.message : "לא ניתן לשמור את הציון",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedGrade, currentWord, toast, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Number keys for grade selection
      if (e.key === "1") {
        setSelectedGrade(1);
      } else if (e.key === "2") {
        setSelectedGrade(0);
      } else if (e.key === "3") {
        setSelectedGrade(-1);
      } else if (e.key === "Enter" && selectedGrade !== null && !isSubmitting) {
        handleSubmit();
      } else if (e.key === "Escape" && showMeaning) {
        setShowMeaning(false);
      } else if (e.key === " " && !showMeaning && currentWord) {
        e.preventDefault();
        setShowMeaning(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedGrade, isSubmitting, showMeaning, currentWord, handleSubmit]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
        {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}
        <Card className="max-w-lg w-full animate-scale-in shadow-2xl">
          <CardContent className="p-12 text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h1 className="text-3xl font-bold text-foreground">כל הכבוד!</h1>
            <p className="text-lg text-muted-foreground">
              סיימת את האימון בהצלחה
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-secondary rounded-xl border-2 border-primary/20">
                <p className="text-3xl font-bold text-primary">{totalWords}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  מילים תורגלו
                </p>
              </div>
              <div className="p-6 bg-secondary rounded-xl border-2 border-success/20">
                <p className="text-3xl font-bold text-success">
                  {gradesHistory.length > 0
                    ? Math.round(
                        (gradesHistory.filter((g) => g >= 0).length /
                          gradesHistory.length) *
                          100
                      )
                    : 0}
                  %
                </p>
                <p className="text-sm text-muted-foreground mt-1">אחוז הצלחה</p>
              </div>
              <div className="p-6 bg-secondary rounded-xl border-2 border-accent/20">
                <p className="text-3xl font-bold text-accent">
                  {Math.round((Date.now() - startTime) / 1000 / 60)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">דקות</p>
                {totalWords > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((Date.now() - startTime) / 1000 / totalWords)}{" "}
                    שניות למילה
                  </p>
                )}
              </div>
              <div className="p-6 bg-secondary rounded-xl border-2 border-primary/20">
                <p className="text-3xl font-bold text-primary">{bestStreak}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  רצף מקסימלי
                </p>
              </div>
            </div>
            {gradesHistory.length > 0 && (
              <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20">
                <p className="text-sm font-semibold text-foreground mb-3 text-center">
                  פילוח תשובות
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">
                      {gradesHistory.filter((g) => g === -1).length}
                    </p>
                    <p className="text-xs text-muted-foreground">לא יודע</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {gradesHistory.filter((g) => g === 0).length}
                    </p>
                    <p className="text-xs text-muted-foreground">בערך</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-success">
                      {gradesHistory.filter((g) => g === 1).length}
                    </p>
                    <p className="text-xs text-muted-foreground">יודע</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => router.push("/trainings")}
                className="w-full h-14 text-base rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <Sparkles className="ml-2 h-5 w-5" />
                התחל אימון חדש
              </Button>
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="w-full h-12 text-base rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                חזרה למסך הראשי
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/trainings")}
            variant="outline"
            className="h-12 px-6 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <ArrowRight className="ml-2 h-5 w-5" />
            חזור לאימונים
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="h-12 px-6 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <Home className="ml-2 h-5 w-5" />
            דף הבית
          </Button>
        </div>

        {/* Progress */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">התקדמות</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {DEV_MODE
                    ? `${totalWords} מתוך ${totalWords + queueRemaining}`
                    : `${queueStats.completedWords} מתוך ${queueStats.totalWords}`}
                </span>
                <span className="font-bold text-primary">
                  {DEV_MODE
                    ? queueRemaining > 0
                      ? Math.round(
                          (totalWords / (totalWords + queueRemaining)) * 100
                        )
                      : 100
                    : Math.round(queueStats.progress)}
                  %
                </span>
              </div>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{
                  width: `${
                    DEV_MODE
                      ? queueRemaining > 0
                        ? (totalWords / (totalWords + queueRemaining)) * 100
                        : 100
                      : queueStats.progress
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                נותרו: {DEV_MODE ? queueRemaining : queueStats.remainingWords}
              </span>
              {totalWords > 0 && (
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {gradesHistory.length > 0
                      ? Math.round(
                          (gradesHistory.filter((g) => g >= 0).length /
                            gradesHistory.length) *
                            100
                        )
                      : 0}
                    % הצלחה
                  </span>
                  {currentStreak > 0 && (
                    <span className="flex items-center gap-1 text-success">
                      <Sparkles className="h-3 w-3" />
                      רצף: {currentStreak}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.round((Date.now() - startTime) / 1000)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Word Card */}
        <Card className="overflow-hidden shadow-2xl border-2">
          <CardContent className="p-8 md:p-12 space-y-8">
            {/* English Word */}
            <div className="text-center space-y-6">
              <div className="relative min-h-[120px] flex items-center justify-center px-4 md:px-6 w-full overflow-visible">
                <h2
                  key={currentWord.id}
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-foreground break-words overflow-wrap-anywhere w-full max-w-full px-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent animate-slide-in-right"
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  {currentWord.word}
                </h2>
              </div>

              <div className="min-h-[120px] flex items-center justify-center">
                {!showMeaning ? (
                  <Button
                    onClick={() => setShowMeaning(true)}
                    variant="outline"
                    className="h-14 px-8 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all border-2 text-base font-medium shadow-sm"
                  >
                    <Eye className="ml-2 h-5 w-5" />
                    הצג פירוש
                    {!isMobile && (
                      <span className="mr-2 text-xs opacity-60">(Space)</span>
                    )}
                  </Button>
                ) : (
                  <div
                    key={`meaning-${currentWord.id}`}
                    className="w-full p-8 rounded-2xl animate-fade-in bg-gradient-to-br from-secondary/50 to-secondary/30 border-2 border-primary/20 overflow-visible"
                  >
                    <p
                      className="text-3xl md:text-4xl font-bold text-foreground break-words overflow-wrap-anywhere leading-relaxed px-2"
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {currentWord.meaning}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Grade Selection */}
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground mb-1">
                  עד כמה אתה מכיר את המילה?
                </p>
                {!isMobile && (
                  <p className="text-xs text-muted-foreground">
                    לחץ 1, 2, או 3 על המקלדת
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  onClick={() => setSelectedGrade(-1)}
                  variant={selectedGrade === -1 ? "default" : "outline"}
                  className={`h-24 rounded-xl text-sm md:text-base font-semibold transition-all hover:scale-[1.05] active:scale-[0.97] relative flex flex-col items-center justify-center gap-1 px-2 ${
                    selectedGrade === -1
                      ? "bg-destructive text-destructive-foreground shadow-xl scale-[1.05] ring-2 ring-destructive/50"
                      : "hover:bg-destructive/10 hover:border-destructive border-2"
                  }`}
                >
                  {!isMobile && (
                    <span className="absolute top-1 left-1 text-xs opacity-60 font-normal">
                      3
                    </span>
                  )}
                  <span className="text-xl md:text-2xl">❌</span>
                  <span className="text-xs md:text-sm leading-tight">
                    לא יודע
                  </span>
                </Button>
                <Button
                  onClick={() => setSelectedGrade(0)}
                  variant={selectedGrade === 0 ? "default" : "outline"}
                  className={`h-24 rounded-xl text-sm md:text-base font-semibold transition-all hover:scale-[1.05] active:scale-[0.97] relative flex flex-col items-center justify-center gap-1 px-2 ${
                    selectedGrade === 0
                      ? "bg-primary text-primary-foreground shadow-xl scale-[1.05] ring-2 ring-primary/50"
                      : "hover:bg-primary/10 hover:border-primary border-2"
                  }`}
                >
                  {!isMobile && (
                    <span className="absolute top-1 left-1 text-xs opacity-60 font-normal">
                      2
                    </span>
                  )}
                  <span className="text-xl md:text-2xl">🤔</span>
                  <span className="text-xs md:text-sm leading-tight">בערך</span>
                </Button>
                <Button
                  onClick={() => setSelectedGrade(1)}
                  variant={selectedGrade === 1 ? "default" : "outline"}
                  className={`h-24 rounded-xl text-sm md:text-base font-semibold transition-all hover:scale-[1.05] active:scale-[0.97] relative flex flex-col items-center justify-center gap-1 px-2 ${
                    selectedGrade === 1
                      ? "bg-success text-success-foreground shadow-xl scale-[1.05] ring-2 ring-success/50"
                      : "hover:bg-success/10 hover:border-success border-2"
                  }`}
                >
                  {!isMobile && (
                    <span className="absolute top-1 left-1 text-xs opacity-60 font-normal">
                      1
                    </span>
                  )}
                  <span className="text-xl md:text-2xl">✅</span>
                  <span className="text-xs md:text-sm leading-tight">יודע</span>
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedGrade === null}
              className="w-full h-16 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  אישור ←
                  {!isMobile && (
                    <span className="mr-2 text-sm opacity-70 font-normal">
                      (Enter)
                    </span>
                  )}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Label component is imported but not used here, it can be used as needed
function Label({
  children,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}
