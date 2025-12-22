"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Plus, BookOpen, LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/user-menu";

export default function HomePage() {
  const [hasLastTraining, setHasLastTraining] = useState(false);
  const { user, loading } = useAuth();

  const checkForLastTraining = () => {
    const currentTraining = localStorage.getItem("currentTrainingName");
    console.log("[v0] Current training from localStorage:", currentTraining);
    setHasLastTraining(!!currentTraining);
  };

  useEffect(() => {
    checkForLastTraining();

    // Check when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForLastTraining();
      }
    };

    // Check when window gains focus
    const handleFocus = () => {
      checkForLastTraining();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/50 to-background p-4 relative overflow-hidden"
      dir="rtl"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute top-4 left-4 z-10">
        {!loading &&
          (user ? (
            <UserMenu />
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                <LogIn className="ml-2 h-4 w-4" />
                התחבר
              </Button>
            </Link>
          ))}
      </div>

      <div className="w-full max-w-md space-y-10 animate-fade-in relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-lg tracking-tight animate-gradient">
            PsychoVocab
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-foreground/90 tracking-wide">
            לימוד מילים לפסיכומטרי
          </p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">טוען...</div>
        ) : user ? (
          <>
            {/* Action Buttons */}
            <div className="space-y-5">
              <Link href="/trainings">
                <Button
                  size="lg"
                  className="w-full h-20 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] bg-primary text-primary-foreground border-2 border-primary/20"
                >
                  <Plus className="ml-2 h-5 w-5" />
                  התחל/צור אימון
                </Button>
              </Link>

              <Link href="/memorize">
                <Button
                  size="lg"
                  className="w-full h-20 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] bg-accent text-accent-foreground border-2 border-accent/20"
                >
                  <BookOpen className="ml-2 h-5 w-5" />
                  שינון מילים
                </Button>
              </Link>

              {hasLastTraining && (
                <Link href="/training">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-16 text-base font-medium rounded-2xl border-2 hover:bg-secondary/80 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] bg-background/50 backdrop-blur-sm"
                  >
                    <Play className="ml-2 h-5 w-5" />
                    המשך אימון אחרון
                  </Button>
                </Link>
              )}
            </div>

            {/* Footer hint */}
            <p className="text-center text-sm font-medium text-muted-foreground/80">
              בחר באפשרות כדי להתחיל
            </p>
          </>
        ) : (
          <div className="text-center space-y-6">
            <p className="text-base font-medium text-muted-foreground/90">
              יש להתחבר כדי להשתמש באפליקציה
            </p>
            <Link href="/login">
              <Button size="lg" className="w-full h-16 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]">
                <LogIn className="ml-2 h-5 w-5" />
                התחבר עם Google
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
