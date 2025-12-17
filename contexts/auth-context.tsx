"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, isConfigValid } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Check if dev mode is enabled
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

// Create a mock user for development mode
const createMockUser = (): User => {
  return {
    uid: "dev-user-local",
    email: "dev@local.dev",
    displayName: "משתמש פיתוח מקומי",
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    refreshToken: "dev-refresh-token",
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => "dev-token",
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: "dev",
  } as User;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If dev mode is enabled, use mock user
    if (DEV_MODE) {
      console.log("[v0] Dev mode enabled - using mock user");
      setUser(createMockUser());
      setLoading(false);
      return;
    }

    if (!isConfigValid || !auth) {
      console.error("[v0] Firebase is not configured. Skipping auth setup.");
      setLoading(false);
      return;
    }

    // Check for redirect result (when user returns from Google auth)
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const user = result.user;
          toast({
            title: "התחברת בהצלחה!",
            description: `ברוך הבא, ${user.displayName || user.email}`,
          });
          router.push("/");
        }
      })
      .catch((error) => {
        console.error("[v0] Redirect result error:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast]);

  const signInWithGoogle = async () => {
    // In dev mode, just set the mock user
    if (DEV_MODE) {
      setUser(createMockUser());
      toast({
        title: "מצב פיתוח",
        description: "משתמש דמה מופעל",
      });
      router.push("/");
      return;
    }

    if (!isConfigValid || !auth) {
      toast({
        title: "שגיאה",
        description: "Firebase לא מוגדר. אנא הוסף את משתני הסביבה הנדרשים.",
        variant: "destructive",
      });
      return;
    }

    const provider = new GoogleAuthProvider();

    // Check if we're in an embedded browser/webview (like Cursor's browser)
    // In embedded browsers, popups are often blocked, so we use redirect instead
    const isEmbeddedBrowser =
      window.navigator.userAgent.includes("Electron") ||
      window.navigator.userAgent.includes("webview") ||
      !window.navigator.userAgent.includes("Chrome") ||
      (window as any).navigator.standalone === false;

    // Try popup first for regular browsers, fallback to redirect for embedded browsers
    if (!isEmbeddedBrowser) {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        toast({
          title: "התחברת בהצלחה!",
          description: `ברוך הבא, ${user.displayName || user.email}`,
        });

        router.push("/");
        return;
      } catch (error: any) {
        // If popup is blocked, fallback to redirect
        if (
          error.code === "auth/popup-blocked" ||
          error.code === "auth/popup-closed-by-user"
        ) {
          // Fall through to redirect method
        } else {
          let errorMessage = "אירעה שגיאה בעת ההתחברות";

          if (error.code === "auth/network-request-failed") {
            errorMessage = "בעיית תקשורת. בדוק את החיבור לאינטרנט";
          }

          toast({
            title: "שגיאה",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Use redirect for embedded browsers or when popup fails
    try {
      await signInWithRedirect(auth, provider);
      // Note: The redirect will navigate away, so we don't need to handle the result here
      // The result will be handled in the useEffect above when the user returns
    } catch (error: any) {
      console.error("[v0] Redirect sign-in error:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת ההתחברות. נסה שוב.",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    // In dev mode, just clear the mock user
    if (DEV_MODE) {
      setUser(null);
      toast({
        title: "מצב פיתוח",
        description: "משתמש דמה הוסר",
      });
      router.push("/");
      return;
    }

    if (!isConfigValid || !auth) {
      return;
    }

    try {
      await firebaseSignOut(auth);
      console.log("[v0] User signed out successfully");

      toast({
        title: "התנתקת בהצלחה",
        description: "להתראות!",
      });

      router.push("/");
    } catch (error) {
      console.error("[v0] Sign-out error:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת ההתנתקות",
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
