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
import { Plus, Play, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://word-psicho-server.onrender.com";

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [trainingName, setTrainingName] = useState("");
  const [selectedFileIndexes, setSelectedFileIndexes] = useState<number[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    loadExistingTrainings();
  }, []);

  const loadExistingTrainings = async () => {
    try {
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
      };

      setTrainings([newTraining, ...trainings]);
      setIsDialogOpen(false);
      setTrainingName("");
      setSelectedFileIndexes([]);

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
      const userUid = user?.uid;
      if (!userUid) {
        throw new Error("לא זוהה משתמש מחובר. נא להתחבר ולנסות שוב.");
      }

      const response = await fetch(`${BACKEND_URL}/load_training`, {
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

      localStorage.setItem("currentTrainingName", trainingName);

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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2 py-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            האימונים שלי
          </h1>
          <p className="text-muted-foreground">
            צור אימון חדש או המשך אימון קיים
          </p>
        </div>

        <Button
          onClick={() => router.push("/")}
          variant="outline"
          className="h-12 px-6 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          ← חזרה למסך הראשי
        </Button>

        {/* Create New Training Button */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="w-full h-16 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-primary text-primary-foreground"
            >
              <Plus className="ml-2 h-6 w-6" />
              יצירת אימון חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md animate-scale-in" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">
                אימון חדש
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">
                  שם האימון
                </Label>
                <Input
                  id="name"
                  placeholder="למשל: מילים באנגלית - רמה 1"
                  value={trainingName}
                  onChange={(e) => setTrainingName(e.target.value)}
                  className="h-12 text-base rounded-lg"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">בחירת יחידות מקור (1-10)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <label
                      key={num}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFileIndexes.includes(num)}
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
                        className="w-4 h-4"
                      />
                      <span className="text-sm">יחידה {num}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateTraining}
                disabled={isCreating}
                className="w-full h-12 text-base rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    יוצר אימון...
                  </>
                ) : (
                  "צור אימון"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Previous Trainings */}
        {trainings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              אימונים קודמים
            </h2>
            <div className="grid gap-4">
              {trainings.map((training) => (
                <Card
                  key={training.name}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-lg text-foreground">
                          {training.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {training.wordCount && `${training.wordCount} מילים`}
                          {training.lastModified &&
                            ` • ${new Date(
                              training.lastModified * 1000
                            ).toLocaleDateString("he-IL")}`}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleLoadTraining(training.name)}
                        disabled={isLoading === training.name}
                        className="h-12 px-6 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
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
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              עדיין אין אימונים. צור אימון חדש כדי להתחיל!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
