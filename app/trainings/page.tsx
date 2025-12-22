"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Plus, Play, Loader2, ArrowRight, Home, Dumbbell, Calendar, FileText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getMockTrainings,
  addMockTraining,
  initializeMockTraining,
  type MockTraining,
} from "@/lib/mock-data";
import {
  DataType,
  DEFAULT_DATA_TYPE,
  getAllDataTypes,
  getDataTypeInfo,
} from "@/lib/types";

interface TrainingListItem {
  name: string;
  word_count?: number;
  last_modified?: number;
  error?: string;
}

interface Training {
  name: string;
  fileIndexes: number[];
  createdAt: string;
  numUniqueWords?: number;
  totalItems?: number;
  wordCount?: number;
  lastModified?: number;
  dataType?: DataType; // Optional for backward compatibility
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Check if dev mode is enabled
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [trainingName, setTrainingName] = useState("");
  const [selectedFileIndexes, setSelectedFileIndexes] = useState<number[]>([]);
  const [selectedDataType, setSelectedDataType] = useState<DataType>(
    DEFAULT_DATA_TYPE
  );
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    loadExistingTrainings();
  }, []);

  // Generate training name based on selected units, language, and date
  const generateTrainingName = (indexes: number[], dataType: DataType): string => {
    if (indexes.length === 0) {
      return "";
    }

    // Get language label
    const languageLabel = getDataTypeInfo(dataType).label;

    // Sort the indexes
    const sorted = [...indexes].sort((a, b) => a - b);

    // Generate units part
    let unitsPart: string;
    if (sorted.length === 1) {
      unitsPart = `יחידה ${sorted[0]}`;
    } else {
      // Find consecutive ranges
      const ranges: Array<{ start: number; end: number }> = [];
      let start = sorted[0];
      let end = sorted[0];

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
          // Consecutive, extend the range
          end = sorted[i];
        } else {
          // Break in sequence, save current range
          ranges.push({ start, end });
          start = sorted[i];
          end = sorted[i];
        }
      }
      ranges.push({ start, end });

      // Format ranges
      const parts = ranges.map((range) => {
        if (range.start === range.end) {
          return `${range.start}`;
        } else {
          return `${range.start}-${range.end}`;
        }
      });

      unitsPart = `יחידות ${parts.join(",")}`;
    }

    // Get current date in Hebrew format
    const datePart = new Date().toLocaleDateString("he-IL");

    // Combine: שפה + יחידות + תאריך
    return `${languageLabel} - ${unitsPart} - ${datePart}`;
  };

  // Update training name when selected units, language, or dialog state change
  useEffect(() => {
    if (isDialogOpen && selectedFileIndexes.length > 0) {
      setTrainingName(generateTrainingName(selectedFileIndexes, selectedDataType));
    } else if (isDialogOpen && selectedFileIndexes.length === 0) {
      setTrainingName("");
    }
  }, [selectedFileIndexes, selectedDataType, isDialogOpen]);

  const loadExistingTrainings = async () => {
    try {
      if (DEV_MODE) {
        // Use mock data in dev mode
        console.log("[v0] Dev mode: Loading mock trainings");
        const mockTrainings = getMockTrainings();
        const formattedTrainings: Training[] = mockTrainings.map((t) => ({
          name: t.name,
          fileIndexes: t.fileIndexes,
          createdAt: t.lastModified
            ? new Date(t.lastModified * 1000).toISOString()
            : new Date().toISOString(),
          wordCount: t.wordCount,
          lastModified: t.lastModified,
        }));
        setTrainings(formattedTrainings);
        return;
      }

      console.log("[v0] Fetching trainings from proxy API");

      const userUid = user?.uid;
      if (!userUid) {
        console.error("[v0] Cannot load trainings: no authenticated user");
        return;
      }

      const response = await fetch(
        `/api/proxy/list_trainings?user_uid=${encodeURIComponent(userUid)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("[v0] Response status:", response.status);
      const data = await response.json();
      console.log("[v0] Response data:", data);

      if (!response.ok) {
        console.error("Failed to load trainings:", data.error);
        return;
      }

      if (data.trainings && data.trainings.length > 0) {
        const formattedTrainings: Training[] = data.trainings.map(
          (t: TrainingListItem) => ({
            name: t.name,
            fileIndexes: [],
            createdAt: t.last_modified
              ? new Date(t.last_modified * 1000).toISOString()
              : new Date().toISOString(),
            wordCount: t.word_count,
            lastModified: t.last_modified,
            dataType: (t as any).data_type || DEFAULT_DATA_TYPE,
          })
        );
        setTrainings(formattedTrainings);
      }
    } catch (error) {
      console.error("Error loading trainings:", error);
    }
  };

  const handleCreateTraining = async () => {
    if (!trainingName.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם לאימון",
        variant: "destructive",
      });
      return;
    }

    if (selectedFileIndexes.length === 0) {
      toast({
        title: "שגיאה",
        description: "נא לבחור לפחות יחידה אחת",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      if (DEV_MODE) {
        // Use mock data in dev mode
        console.log("[v0] Dev mode: Creating mock training");
        const mockTraining = addMockTraining(
          trainingName,
          selectedFileIndexes,
          selectedDataType
        );

        const newTraining: Training = {
          name: mockTraining.name,
          fileIndexes: mockTraining.fileIndexes,
          createdAt: new Date().toISOString(),
          numUniqueWords: mockTraining.wordCount,
          totalItems: mockTraining.wordCount,
          wordCount: mockTraining.wordCount,
          lastModified: mockTraining.lastModified,
          dataType: mockTraining.dataType || DEFAULT_DATA_TYPE,
        };

        setTrainings([newTraining, ...trainings]);
        setIsDialogOpen(false);
        setTrainingName("");
        setSelectedFileIndexes([]);
        setSelectedDataType(DEFAULT_DATA_TYPE);

        toast({
          title: "✓ האימון נוצר בהצלחה",
          description: `${mockTraining.wordCount} מילים ייחודיות, ${mockTraining.wordCount} פריטים לתרגול`,
          className: "bg-success text-success-foreground",
        });

        setTimeout(() => {
          if (confirm("האימון נוצר בהצלחה! האם ברצונך להתחיל עכשיו?")) {
            handleLoadTraining(trainingName);
          } else {
            loadExistingTrainings();
          }
        }, 500);
        setIsCreating(false);
        return;
      }

      const userUid = user?.uid;
      if (!userUid) {
        throw new Error("לא זוהה משתמש מחובר. נא להתחבר ולנסות שוב.");
      }

      const response = await fetch("/api/proxy/create_training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uid: userUid,
          training_name: trainingName,
          file_indexes: selectedFileIndexes,
          data_type: selectedDataType,
        }),
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Failed to create training");

      const newTraining: Training = {
        name: trainingName,
        fileIndexes: selectedFileIndexes,
        createdAt: new Date().toISOString(),
        numUniqueWords: data.num_unique_words,
        totalItems: data.total_items_in_sequence,
        wordCount: data.word_count,
        lastModified: data.last_modified,
        dataType: selectedDataType,
      };

      setTrainings([newTraining, ...trainings]);
      setIsDialogOpen(false);
      setTrainingName("");
      setSelectedFileIndexes([]);
      setSelectedDataType(DEFAULT_DATA_TYPE);

      toast({
        title: "✓ האימון נוצר בהצלחה",
        description: `${data.num_unique_words} מילים ייחודיות, ${data.total_items_in_sequence} פריטים לתרגול`,
        className: "bg-success text-success-foreground",
      });

      setTimeout(() => {
        if (confirm("האימון נוצר בהצלחה! האם ברצונך להתחיל עכשיו?")) {
          handleLoadTraining(trainingName);
        } else {
          loadExistingTrainings();
        }
      }, 500);
    } catch (error) {
      toast({
        title: "שגיאה ביצירת אימון",
        description:
          error instanceof Error ? error.message : "לא ניתן ליצור אימון כרגע",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLoadTraining = async (trainingName: string) => {
    setIsLoading(trainingName);

    try {
      if (DEV_MODE) {
        // Use mock data in dev mode
        console.log("[v0] Dev mode: Loading mock training");

        // Find the training to get file indexes
        const allTrainings = getMockTrainings();
        const training = allTrainings.find((t) => t.name === trainingName);

        if (!training) {
          throw new Error("אימון לא נמצא");
        }

        // Initialize the training queue
        const dataType = training.dataType || DEFAULT_DATA_TYPE;
        initializeMockTraining(trainingName, training.fileIndexes, dataType);
        localStorage.setItem("currentTrainingName", trainingName);
        localStorage.setItem("currentTrainingDataType", dataType);

        toast({
          title: "✓ האימון נטען בהצלחה",
          description: "מתחיל את האימון...",
          className: "bg-success text-success-foreground",
        });

        setTimeout(() => {
          router.push("/training");
        }, 500);
        setIsLoading(null);
        return;
      }

      const userUid = user?.uid;
      if (!userUid) {
        throw new Error("לא זוהה משתמש מחובר. נא להתחבר ולנסות שוב.");
      }

      const response = await fetch("/api/proxy/load_training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uid: userUid,
          training_name: trainingName,
        }),
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Failed to load training");

      // Get dataType from training object if available, or from response
      const training = trainings.find((t) => t.name === trainingName);
      const dataType = training?.dataType || data.data_type || DEFAULT_DATA_TYPE;

      localStorage.setItem("currentTrainingName", trainingName);
      localStorage.setItem("currentTrainingDataType", dataType);

      toast({
        title: "✓ האימון נטען בהצלחה",
        description: "מתחיל את האימון...",
        className: "bg-success text-success-foreground",
      });

      setTimeout(() => {
        router.push("/training");
      }, 500);
    } catch (error) {
      toast({
        title: "שגיאה בטעינת אימון",
        description:
          error instanceof Error ? error.message : "לא ניתן לטעון את האימון",
        variant: "destructive",
      });
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background p-4 md:p-8 relative overflow-hidden" dir="rtl">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in relative z-10">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/20 shadow-lg">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-foreground bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text tracking-tight">
                  האימונים שלי
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  צור אימון חדש או המשך אימון קיים
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 border-2 shadow-sm hover:shadow-md"
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Create New Training Button */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="w-full h-20 text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-2 border-primary/20 hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-foreground/20">
                  <Plus className="h-6 w-6" />
                </div>
                <span>יצירת אימון חדש</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg animate-scale-in shadow-2xl border-2" dir="rtl">
            <DialogHeader className="space-y-3 pb-4">
              <div className="flex items-center justify-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  אימון חדש
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  שם האימון
                </Label>
                <Input
                  id="name"
                  placeholder="למשל: מילים באנגלית - רמה 1"
                  value={trainingName}
                  onChange={(e) => setTrainingName(e.target.value)}
                  className="h-14 text-base rounded-xl border-2 focus:border-primary transition-all"
                  dir="rtl"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  שפה
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {getAllDataTypes().map((dataTypeInfo) => {
                    const isSelected = selectedDataType === dataTypeInfo.code;
                    const isEnglish = dataTypeInfo.code === "en_he";
                    return (
                      <Button
                        key={dataTypeInfo.code}
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedDataType(dataTypeInfo.code)}
                        className={`h-16 text-base rounded-xl font-semibold transition-all border-2 ${
                          isSelected
                            ? isEnglish
                              ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-lg scale-[1.02] ring-2 ring-blue-500/50"
                              : "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-lg scale-[1.02] ring-2 ring-emerald-500/50"
                            : isEnglish
                            ? "hover:bg-blue-500/5 hover:border-blue-500/50 hover:scale-[1.02]"
                            : "hover:bg-emerald-500/5 hover:border-emerald-500/50 hover:scale-[1.02]"
                        }`}
                      >
                        {dataTypeInfo.label}
                      </Button>
                    );
                  })}
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground text-center">
                    {getDataTypeInfo(selectedDataType).description}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  בחירת יחידות מקור (1-10)
                </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedFileIndexes.length === 10) {
                        setSelectedFileIndexes([]);
                      } else {
                        setSelectedFileIndexes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
                      }
                    }}
                    className="h-9 text-xs rounded-lg border-2 hover:scale-105 transition-transform"
                  >
                    {selectedFileIndexes.length === 10
                      ? "ביטול הכל"
                      : "בחר הכל"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const isSelected = selectedFileIndexes.includes(num);
                    return (
                      <label
                        key={num}
                        className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-md scale-[1.02]"
                            : "border-border hover:bg-secondary hover:border-primary/50 hover:scale-[1.01]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFileIndexes([
                                ...selectedFileIndexes,
                                num,
                              ]);
                            } else {
                              setSelectedFileIndexes(
                                selectedFileIndexes.filter((f) => f !== num)
                              );
                            }
                          }}
                          className="w-5 h-5 rounded border-2 cursor-pointer"
                        />
                        <span className={`text-sm font-medium ${isSelected ? "text-primary font-semibold" : "text-foreground"}`}>
                          יחידה {num}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handleCreateTraining}
                disabled={isCreating}
                className="w-full h-14 text-lg font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    יוצר אימון...
                  </>
                ) : (
                  <>
                    <Plus className="ml-2 h-5 w-5" />
                    צור אימון
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Previous Trainings */}
        {trainings.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-primary to-transparent rounded-full"></div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                אימונים קודמים
              </h2>
            </div>
            <div className="grid gap-4">
              {trainings.map((training, index) => (
                <Card
                  key={training.name}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/30 hover:scale-[1.01] group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Dumbbell className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-xl text-foreground mb-2">
                              {training.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              {training.wordCount && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span className="font-semibold text-primary">
                                    {training.wordCount} מילים
                                  </span>
                                </div>
                              )}
                              {training.dataType && (
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                                  training.dataType === "en_he"
                                    ? "bg-blue-500/10 border-blue-500/20"
                                    : "bg-emerald-500/10 border-emerald-500/20"
                                }`}>
                                  <Sparkles className={`h-4 w-4 ${
                                    training.dataType === "en_he"
                                      ? "text-blue-600 dark:text-blue-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }`} />
                                  <span className={`font-medium ${
                                    training.dataType === "en_he"
                                      ? "text-blue-600 dark:text-blue-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }`}>
                                    {getDataTypeInfo(training.dataType).label}
                                  </span>
                                </div>
                              )}
                              {training.lastModified && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {new Date(
                                      training.lastModified * 1000
                                    ).toLocaleDateString("he-IL")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleLoadTraining(training.name)}
                        disabled={isLoading === training.name}
                        className="h-14 px-8 rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg hover:shadow-xl font-semibold min-w-[120px]"
                      >
                        {isLoading === training.name ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Play className="ml-2 h-5 w-5" />
                            המשך
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {trainings.length === 0 && (
          <Card className="p-16 text-center border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-primary/10">
                  <Dumbbell className="h-12 w-12 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">
                  עדיין אין אימונים
                </h3>
                <p className="text-muted-foreground text-lg">
                  צור אימון חדש כדי להתחיל את המסע שלך!
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
