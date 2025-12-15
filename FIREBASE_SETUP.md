# הגדרת Firebase ו-Google Sign-In

## שלב 1: יצירת פרויקט Firebase

1. היכנס ל-[Firebase Console](https://console.firebase.google.com/)
2. לחץ על "Add project" או "הוסף פרויקט"
3. תן שם לפרויקט (לדוגמה: "vocabulary-app")
4. בחר אם אתה רוצה Google Analytics (אופציונלי)
5. לחץ על "Create project"

## שלב 2: הוספת Web App

1. בדף הבית של הפרויקט, לחץ על אייקון ה-Web (`</>`)
2. תן שם לאפליקציה (לדוגמה: "Vocabulary Learning App")
3. סמן "Also set up Firebase Hosting" (אופציונלי)
4. לחץ על "Register app"
5. העתק את ה-configuration object שמופיע

## שלב 3: הפעלת Google Sign-In

1. בתפריט הצד, לחץ על "Authentication"
2. לחץ על "Get started"
3. בטאב "Sign-in method", לחץ על "Google"
4. הפעל את המתג (Enable)
5. בחר את כתובת המייל של התמיכה (Support email)
6. לחץ על "Save"

## שלב 4: הגדרת Authorized Domains

1. עדיין ב-Authentication → Settings
2. בטאב "Authorized domains"
3. הוסף את הדומיין שלך:
   - `localhost` (כבר צריך להיות)
   - הדומיין של ה-deployment שלך ב-Vercel (לדוגמה: `your-app.vercel.app`)

## שלב 5: עדכון קובץ .env.local

העתק את הערכים מה-Firebase configuration שקיבלת בשלב 2 לקובץ `.env.local`:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
\`\`\`

## שלב 6: הוספת משתני סביבה ב-Vercel

1. היכנס ל-Vercel Dashboard
2. בחר את הפרויקט שלך
3. לך ל-Settings → Environment Variables
4. הוסף את כל משתני הסביבה מקובץ `.env.local`
5. לחץ על "Redeploy" כדי להחיל את השינויים

## בדיקה

1. הרץ את האפליקציה מקומית: `npm run dev`
2. גש לדף ההתחברות: `http://localhost:3000/login`
3. לחץ על "התחבר עם Google"
4. בחר חשבון Google
5. אמור להתבצע ניתוב אוטומטי לדף האימונים

## שימוש ב-user.uid בשרת

לאחר התחברות, ה-`user.uid` זמין דרך:

\`\`\`tsx
import { useAuth } from '@/contexts/auth-context'

const { user } = useAuth()
console.log(user?.uid) // המזהה הייחודי של המשתמש
\`\`\`

תוכל לשלוח אותו לשרת שלך בכל בקשה:

\`\`\`tsx
const response = await fetch('/api/proxy/create_training', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-ID': user.uid, // שלח את ה-UID בheader
  },
  body: JSON.stringify({ training_name, file_indexes }),
})
\`\`\`
