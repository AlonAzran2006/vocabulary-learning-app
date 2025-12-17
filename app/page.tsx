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
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4"
      dir="rtl"
    >
      <div className="absolute top-4 left-4">
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

      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            אוצר מילים
          </h1>
          <p className="text-lg text-muted-foreground">למידת אנגלית</p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">טוען...</div>
        ) : user ? (
          <>
            {/* Action Buttons */}
            <div className="space-y-4">
              <Link href="/trainings">
                <Button
                  size="lg"
                  className="w-full h-16 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-primary text-primary-foreground"
                >
                  <Plus className="ml-2 h-5 w-5" />
                  התחל/צור אימון
                </Button>
              </Link>

              <Link href="/memorize">
                <Button
                  size="lg"
                  className="w-full h-16 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-accent text-accent-foreground"
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
                    className="w-full h-14 text-base rounded-xl border-2 hover:bg-secondary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-transparent"
                  >
                    <Play className="ml-2 h-5 w-5" />
                    המשך אימון אחרון
                  </Button>
                </Link>
              )}
            </div>

            {/* Footer hint */}
            <p className="text-center text-sm text-muted-foreground">
              בחר באפשרות כדי להתחיל
            </p>
          </>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              יש להתחבר כדי להשתמש באפליקציה
            </p>
            <Link href="/login">
              <Button size="lg" className="w-full h-14 rounded-xl">
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
