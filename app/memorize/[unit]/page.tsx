"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  HelpCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Word {
  id: string;
  word: string;
  meaning: string;
  knowing_grade: number;
}

type FilterType = "known" | "partial" | "unknown" | "unclassified";

export default function MemorizeUnitPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const unit = Number.parseInt(params.unit as string);

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(
    new Set()
  );
  const [wordsPerPage, setWordsPerPage] = useState(10);

  useEffect(() => {
    loadUnit();
  }, [unit]);

  const loadUnit = async () => {
    try {
      setLoading(true);

      console.log("[v0] Loading unit:", unit);
      const userUid = user?.uid;
      if (!userUid) {
        throw new Error("לא זוהה משתמש מחובר. נא להתחבר ולנסות שוב.");
      }

      const response = await fetch("/api/proxy/memorize_unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_uid: userUid, file_index: unit }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[v0] Loaded unit data:", data);

      if (data.status === "ok") {
        setWords(data.words);
      } else {
        throw new Error("Failed to load unit");
      }
    } catch (error) {
      console.error("[v0] Error loading unit:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את היחידה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWordGrade = async (wordId: string, newGrade: number) => {
    // Optimistic update - update UI immediately
    const previousGrade = words.find((w) => w.id === wordId)?.knowing_grade;
    setWords((prevWords) =>
      prevWords.map((w) =>
        w.id === wordId ? { ...w, knowing_grade: newGrade } : w
      )
    );

    try {
      console.log("[v0] Updating word grade:", { wordId, newGrade });
      const userUid = user?.uid;
      if (!userUid) {
        throw new Error("לא זוהה משתמש מחובר. נא להתחבר ולנסות שוב.");
      }
      const response = await fetch("/api/proxy/memorization_update_word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uid: userUid,
          word_id: wordId,
          new_grade: newGrade,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[v0] Word grade updated:", data);

      if (data.status !== "ok") {
        // Revert on error
        setWords((prevWords) =>
          prevWords.map((w) =>
            w.id === wordId ? { ...w, knowing_grade: previousGrade ?? -1 } : w
          )
        );
        throw new Error("Failed to update grade on server");
      }
    } catch (error) {
      console.error("[v0] Error updating word grade:", error);
      // Revert on error
      setWords((prevWords) =>
        prevWords.map((w) =>
          w.id === wordId ? { ...w, knowing_grade: previousGrade ?? -1 } : w
        )
      );
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את הציון",
        variant: "destructive",
      });
    }
  };

  const toggleReveal = (wordId: string) => {
    setRevealedWords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const toggleFilter = (filterType: FilterType) => {
    setActiveFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filterType)) {
        newSet.delete(filterType);
      } else {
        newSet.add(filterType);
      }
      return newSet;
    });
    setCurrentPage(0);
  };

  const getFilteredWords = () => {
    if (activeFilters.size === 0) return words;

    return words.filter((w) => {
      if (activeFilters.has("known") && w.knowing_grade === 10) return true;
      if (
        activeFilters.has("partial") &&
        w.knowing_grade > 0 &&
        w.knowing_grade < 10
      )
        return true;
      if (activeFilters.has("unknown") && w.knowing_grade === 0) return true;
      if (activeFilters.has("unclassified") && w.knowing_grade === -1)
        return true;
      return false;
    });
  };

  const filteredWords = getFilteredWords();
  const totalPages = Math.ceil(filteredWords.length / wordsPerPage);
  const startIndex = currentPage * wordsPerPage;
  const endIndex = Math.min(startIndex + wordsPerPage, filteredWords.length);
  const currentWords = filteredWords.slice(startIndex, endIndex);

  const getBorderColor = (grade: number) => {
    if (grade === -1) return "border-gray-400";
    if (grade === 0) return "border-red-500";
    if (grade === 10) return "border-green-500";
    return "border-yellow-500";
  };

  const getBackgroundColor = (grade: number) => {
    if (grade === -1) return "bg-gradient-to-r from-gray-400 to-gray-500";
    if (grade === 0) return "bg-gradient-to-r from-red-500 to-red-600";
    if (grade === 10) return "bg-gradient-to-r from-green-500 to-green-600";
    return "bg-gradient-to-r from-yellow-500 to-yellow-600";
  };

  // Calculate statistics
  const stats = {
    known: words.filter((w) => w.knowing_grade === 10).length,
    partial: words.filter((w) => w.knowing_grade > 0 && w.knowing_grade < 10)
      .length,
    unknown: words.filter((w) => w.knowing_grade === 0).length,
    unclassified: words.filter((w) => w.knowing_grade === -1).length,
  };

  const totalClassified = stats.known + stats.partial + stats.unknown;
  const progressPercentage =
    words.length > 0 ? (totalClassified / words.length) * 100 : 0;

  const getFilterCount = (filterType: FilterType) => {
    if (filterType === "known")
      return words.filter((w) => w.knowing_grade === 10).length;
    if (filterType === "partial")
      return words.filter((w) => w.knowing_grade > 0 && w.knowing_grade < 10)
        .length;
    if (filterType === "unknown")
      return words.filter((w) => w.knowing_grade === 0).length;
    if (filterType === "unclassified")
      return words.filter((w) => w.knowing_grade === -1).length;
    return 0;
  };

  const handlePageSizeChange = (value: string) => {
    const size = Number.parseInt(value);
    if (size > 0 && size <= 100) {
      setWordsPerPage(size);
      setCurrentPage(0);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary"
        dir="rtl"
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-lg text-muted-foreground">טוען יחידה {unit}...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background to-secondary p-4"
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground break-words">
              שינון יחידה {unit}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              סה"כ {words.length} מילים | מציג {startIndex + 1}-{endIndex}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/memorize">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl bg-transparent"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl bg-transparent"
              >
                <Home className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        {words.length > 0 && (
          <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  התקדמות סיווג
                </span>
                <span className="text-muted-foreground">
                  {totalClassified} מתוך {words.length} (
                  {Math.round(progressPercentage)}%)
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Card */}
        {words.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.known}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">יודע</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <HelpCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.partial}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">בערך</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.unknown}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">לא יודע</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <div className="h-4 w-4 rounded-full bg-gray-400" />
                    <span className="text-2xl font-bold text-foreground">
                      {stats.unclassified}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">לא מסווג</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Words per page selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Label
              htmlFor="pageSize"
              className="text-sm font-medium whitespace-nowrap"
            >
              מילים בעמוד:
            </Label>
            <Input
              id="pageSize"
              type="number"
              min="1"
              max="100"
              value={wordsPerPage}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              className="w-20 rounded-lg"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            מסננים פעילים: {activeFilters.size || "ללא"}
          </span>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeFilters.has("known") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("known")}
            className="rounded-lg border-4 border-green-700 ring-2 ring-green-300 text-green-700 font-semibold hover:bg-green-200 hover:text-green-900 dark:hover:bg-green-900 dark:hover:text-green-100 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border-green-800 data-[state=active]:ring-green-400"
            data-state={activeFilters.has("known") ? "active" : "inactive"}
          >
            יודע ({getFilterCount("known")})
          </Button>
          <Button
            variant={activeFilters.has("partial") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("partial")}
            className="rounded-lg border-4 border-yellow-700 ring-2 ring-yellow-300 text-yellow-700 font-semibold hover:bg-yellow-200 hover:text-yellow-900 dark:hover:bg-yellow-900 dark:hover:text-yellow-100 data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:border-yellow-800 data-[state=active]:ring-yellow-400"
            data-state={activeFilters.has("partial") ? "active" : "inactive"}
          >
            בערך ({getFilterCount("partial")})
          </Button>
          <Button
            variant={activeFilters.has("unknown") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("unknown")}
            className="rounded-lg border-4 border-red-700 ring-2 ring-red-300 text-red-700 font-semibold hover:bg-red-200 hover:text-red-900 dark:hover:bg-red-900 dark:hover:text-red-100 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:border-red-800 data-[state=active]:ring-red-400"
            data-state={activeFilters.has("unknown") ? "active" : "inactive"}
          >
            לא יודע ({getFilterCount("unknown")})
          </Button>
          <Button
            variant={activeFilters.has("unclassified") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("unclassified")}
            className="rounded-lg border-4 border-gray-700 ring-2 ring-gray-300 text-gray-700 font-semibold hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100 data-[state=active]:bg-gray-600 data-[state=active]:text-white data-[state=active]:border-gray-800 data-[state=active]:ring-gray-400"
            data-state={
              activeFilters.has("unclassified") ? "active" : "inactive"
            }
          >
            לא מסווג ({getFilterCount("unclassified")})
          </Button>
          {activeFilters.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveFilters(new Set());
                setCurrentPage(0);
              }}
              className="rounded-lg"
            >
              נקה מסננים
            </Button>
          )}
        </div>

        {/* Words List */}
        <div className="space-y-3">
          {currentWords.map((word, index) => (
            <div
              key={word.id}
              className={`p-4 rounded-xl ${getBackgroundColor(
                word.knowing_grade
              )} shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.01] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden`}
              style={{
                animation: `fadeIn 0.3s ease-out ${index * 50}ms both`,
              }}
              dir="ltr"
            >
              {/* Word and Meaning (left side) */}
              <div className="flex-1 flex flex-col min-w-0 w-full sm:w-auto">
                <button
                  onClick={() => toggleReveal(word.id)}
                  className="text-left transition-transform hover:scale-[1.01] active:scale-100 w-full"
                >
                  <p className="text-xl font-bold text-white drop-shadow-sm hover:text-gray-100 transition-colors duration-200 break-words">
                    {word.word}
                  </p>
                </button>
                {/* Meaning (revealed) */}
                {revealedWords.has(word.id) && (
                  <p className="text-base text-white/95 animate-fade-in mt-2 drop-shadow-sm break-words">
                    {word.meaning}
                  </p>
                )}
              </div>

              {/* Grade Buttons (right side) */}
              <div className="flex gap-2 flex-wrap sm:flex-nowrap shrink-0 w-full sm:w-auto justify-start sm:justify-end">
                <Button
                  size="sm"
                  variant={word.knowing_grade === 0 ? "default" : "outline"}
                  onClick={() => updateWordGrade(word.id, 0)}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white border-red-600 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                >
                  <XCircle className="h-4 w-4" />
                  לא יודע
                </Button>
                <Button
                  size="sm"
                  variant={
                    word.knowing_grade > 0 && word.knowing_grade < 10
                      ? "default"
                      : "outline"
                  }
                  onClick={() => updateWordGrade(word.id, 5)}
                  className="rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                >
                  <HelpCircle className="h-4 w-4" />
                  בערך
                </Button>
                <Button
                  size="sm"
                  variant={word.knowing_grade === 10 ? "default" : "outline"}
                  onClick={() => updateWordGrade(word.id, 10)}
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white border-green-600 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  יודע
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="rounded-xl"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              עמוד {currentPage + 1} מתוך {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
              }
              disabled={currentPage === totalPages - 1}
              className="rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
