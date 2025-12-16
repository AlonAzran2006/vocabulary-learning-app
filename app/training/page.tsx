"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Eye, Sparkles, ArrowRight, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import Confetti from "react-confetti"
import { auth } from "@/lib/firebase"

interface Word {
  id: string
  word: string
  meaning: string
  file_index: number
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://word-psicho-server.onrender.com"

export default function TrainingPage() {
  const [currentWord, setCurrentWord] = useState<Word | null>(null)
  const [showMeaning, setShowMeaning] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [queueRemaining, setQueueRemaining] = useState<number>(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [totalWords, setTotalWords] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    initializeTraining()
  }, [])

  const initializeTraining = async () => {
    const trainingName = localStorage.getItem("currentTrainingName")
    if (!trainingName) {
      toast({
        title: "שגיאה",
        description: "לא נמצא אימון פעיל",
        variant: "destructive",
      })
      router.push("/trainings")
      return
    }

    try {
      console.log("[v0] Initializing training:", trainingName)

      const userUid = auth?.currentUser?.uid
      if (!userUid) {
        throw new Error("לא זוהה משתמש מחובר. נא להתחבר ולנסות שוב.")
      }

      const response = await fetch("/api/proxy/load_training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_uid: userUid, training_name: trainingName }),
      })

      console.log("[v0] Load training response status:", response.status)
      const data = await response.json()
      console.log("[v0] Load training data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to load training")
      }

      if (data.training_complete) {
        setIsCompleted(true)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      } else {
        setCurrentWord(data.first_word)
        setQueueRemaining(data.queue_size_remaining)
      }
    } catch (error) {
      console.error("Error initializing training:", error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "לא ניתן לטעון את האימון",
        variant: "destructive",
      })
      router.push("/trainings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (selectedGrade === null || !currentWord) {
      toast({
        title: "בחר רמת ידע",
        description: "נא לבחור אחת מהאפשרויות",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      console.log("[v0] Submitting grade:", { word_id: currentWord.id, grade: selectedGrade })

      const userUid = auth?.currentUser?.uid
      if (!userUid) {
        throw new Error("לא זוהה משתמש מחובר. נא להתחבר ולנסות שוב.")
      }

      const response = await fetch("/api/proxy/update_knowing_grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_uid: userUid,
          file_index: currentWord.file_index,
          word_id: currentWord.id,
          test_grade: selectedGrade,
        }),
      })

      console.log("[v0] Update grade response status:", response.status)
      const data = await response.json()
      console.log("[v0] Update grade data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to update grade")
      }

      setTotalWords((prev) => prev + 1)

      toast({
        title: "✓ נשמר",
        description: "עובר למילה הבאה...",
        className: "bg-success text-success-foreground",
      })

      setTimeout(() => {
        if (data.training_complete) {
          setIsCompleted(true)
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 5000)
        } else {
          setCurrentWord(data.next_word)
          setShowMeaning(false)
          setSelectedGrade(null)
          setQueueRemaining(data.next_word ? queueRemaining - 1 : 0)
        }
      }, 300)
    } catch (error) {
      console.error("Error submitting grade:", error)
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "לא ניתן לשמור את הציון",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
        {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}
        <Card className="max-w-lg w-full animate-scale-in shadow-2xl">
          <CardContent className="p-12 text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h1 className="text-3xl font-bold text-foreground">כל הכבוד!</h1>
            <p className="text-lg text-muted-foreground">סיימת את האימון בהצלחה</p>
            <div className="p-6 bg-secondary rounded-xl">
              <p className="text-2xl font-bold text-primary">{totalWords}</p>
              <p className="text-sm text-muted-foreground">מילים תורגלו</p>
            </div>
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
    )
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
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
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            נותרו בתור: <span className="font-bold text-primary">{queueRemaining}</span>
          </p>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${queueRemaining > 0 ? (totalWords / (totalWords + queueRemaining)) * 100 : 100}%` }}
            />
          </div>
        </div>

        {/* Word Card */}
        <Card className="overflow-hidden shadow-xl">
          <CardContent className="p-8 md:p-12 space-y-8">
            {/* English Word */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground animate-scale-in">{currentWord.word}</h2>

              {!showMeaning ? (
                <Button
                  onClick={() => setShowMeaning(true)}
                  variant="outline"
                  className="h-12 px-6 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Eye className="ml-2 h-5 w-5" />
                  הצג פירוש
                </Button>
              ) : (
                <div className="p-6 rounded-xl animate-fade-in">
                  <p className="text-2xl font-semibold text-foreground">{currentWord.meaning}</p>
                </div>
              )}
            </div>

            {/* Grade Selection */}
            <div className="space-y-4">
              {/* Label component is imported but not used here, it can be used as needed */}
              <div className="text-center block text-base font-medium">עד כמה אתה מכיר את המילה?</div>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => setSelectedGrade(-1)}
                  variant={selectedGrade === -1 ? "default" : "outline"}
                  className={`h-20 rounded-xl text-base transition-all hover:scale-[1.05] active:scale-[0.97] ${
                    selectedGrade === -1
                      ? "bg-destructive text-destructive-foreground shadow-lg scale-[1.05]"
                      : "hover:bg-destructive/10 hover:border-destructive"
                  }`}
                >
                  לא יודע
                </Button>
                <Button
                  onClick={() => setSelectedGrade(0)}
                  variant={selectedGrade === 0 ? "default" : "outline"}
                  className={`h-20 rounded-xl text-base transition-all hover:scale-[1.05] active:scale-[0.97] ${
                    selectedGrade === 0
                      ? "bg-primary text-primary-foreground shadow-lg scale-[1.05]"
                      : "hover:bg-primary/10 hover:border-primary"
                  }`}
                >
                  בערך
                </Button>
                <Button
                  onClick={() => setSelectedGrade(1)}
                  variant={selectedGrade === 1 ? "default" : "outline"}
                  className={`h-20 rounded-xl text-base transition-all hover:scale-[1.05] active:scale-[0.97] ${
                    selectedGrade === 1
                      ? "bg-success text-success-foreground shadow-lg scale-[1.05]"
                      : "hover:bg-success/10 hover:border-success"
                  }`}
                >
                  יודע
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedGrade === null}
              className="w-full h-16 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  שומר...
                </>
              ) : (
                "אישור ←"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Label component is imported but not used here, it can be used as needed
function Label({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  )
}
