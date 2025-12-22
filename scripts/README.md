# Scripts לייבוא נתונים

## ייבוא מילים בעברית ל-Firestore

### דרישות מוקדמות:

1. **התקן firebase-admin:**
   ```bash
   npm install firebase-admin
   ```

2. **הורד Service Account Key:**
   - לך ל-[Firebase Console](https://console.firebase.google.com/)
   - בחר את הפרויקט שלך
   - לך ל-**Project Settings** → **Service accounts**
   - לחץ על **"Generate new private key"**
   - שמור את הקובץ JSON בשם `service-account-key.json` בתיקיית הבסיס של הפרויקט

3. **ודא שהתיקייה `dataH` קיימת:**
   - התיקייה צריכה להכיל קבצי JSON בשם: `words (1).json`, `words (2).json` וכו'

### הרצה:

```bash
node scripts/import-hebrew-words.js
```

### מה הסקריפט עושה:

1. קורא את כל קבצי ה-JSON מתיקיית `dataH`
2. ממיר כל מילה לפורמט Firestore
3. ממיר את `choice` ל-`knowing_grade` התחלתי:
   - `yes` → 7.0
   - `no` → 3.0
   - `maybe` → 5.0
4. שומר את כל המילים ב-Collection `hebrew_words` ב-Firestore
5. מציג סיכום של המילים שיובאו

### הערות:

- הסקריפט משתמש ב-Batch writes (500 operations לכל batch) לביצועים טובים יותר
- אם מילה כבר קיימת, היא תוחלף (upsert)
- הסקריפט ממיר אוטומטית את `file_index` משם הקובץ

### פתרון בעיות:

**שגיאה: "לא נמצא קובץ Service Account Key"**
- ודא שהקובץ `service-account-key.json` קיים בתיקיית הבסיס
- ודא שהקובץ בפורמט JSON תקין

**שגיאה: "התיקייה dataH לא נמצאה"**
- ודא שהתיקייה `dataH` קיימת בתיקיית הבסיס של הפרויקט
- ודא שהקבצים נקראים: `words (1).json`, `words (2).json` וכו'

**שגיאה: "Permission denied"**
- ודא שה-Service Account Key נכון
- ודא שה-Service Account יש לו הרשאות כתיבה ל-Firestore

