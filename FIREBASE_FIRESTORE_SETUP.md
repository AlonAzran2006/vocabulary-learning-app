# הגדרת Firestore לאוצר מילים בעברית

## שלב 1: הפעלת Firestore Database

1. היכנס ל-[Firebase Console](https://console.firebase.google.com/)
2. בחר את הפרויקט שלך
3. בתפריט הצד, לחץ על **"Firestore Database"** (או **"Build" → "Firestore Database"**)
4. לחץ על **"Create database"**
5. בחר **"Start in test mode"** (לפיתוח) או **"Start in production mode"** (לפרודקשן)
   - **לתחילת עבודה:** בחר "test mode"
   - **לפרודקשן:** תצטרך להגדיר Security Rules (ראה שלב 3)
6. בחר את מיקום ה-Database (למשל: `europe-west1` או `us-central1`)
7. לחץ על **"Enable"**

## שלב 2: מבנה ה-Collections

### מבנה הנתונים המוצע:

```
firestore/
├── hebrew_words/              # Collection: כל המילים בעברית
│   ├── {word_id}/             # Document: מילה בודדת
│   │   ├── id: "w_10452"
│   │   ├── word: "אָבְנַיִים"
│   │   ├── meaning: "מתקן מסתובב להכנת כלי חרס"
│   │   ├── choice: "yes"      # "yes" | "no" | "maybe"
│   │   ├── choice_mark: "✔"   # "✔" | "✖" | "?"
│   │   ├── file_index: 1      # מספר הקובץ המקורי
│   │   └── knowing_grade: 5.0 # ציון ידיעה (0-10, ברירת מחדל: 5.0)
│   └── ...
│
├── hebrew_units/              # Collection: יחידות למידה (אופציונלי)
│   ├── {unit_id}/
│   │   ├── unit_number: 1
│   │   ├── word_ids: ["w_10452", "w_10453", ...]
│   │   └── created_at: timestamp
│   └── ...
│
└── user_progress/             # Collection: התקדמות משתמשים
    ├── {user_uid}/
    │   ├── words/             # Subcollection
    │   │   ├── {word_id}/
    │   │   │   ├── knowing_grade: 7.5
    │   │   │   ├── last_practiced: timestamp
    │   │   │   └── practice_count: 10
    │   │   └── ...
    │   └── trainings/         # Subcollection
    │       └── ...
    └── ...
```

## שלב 3: הגדרת Security Rules

1. ב-Firestore Console, לך לטאב **"Rules"**
2. החלף את הכללים הקיימים בקוד הבא:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Hebrew words - קריאה לכולם, כתיבה רק למנהלים
    match /hebrew_words/{wordId} {
      allow read: if request.auth != null;
      allow write: if false; // רק דרך Admin SDK או Cloud Functions
    }
    
    // Hebrew units - קריאה לכולם, כתיבה רק למנהלים
    match /hebrew_units/{unitId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // User progress - כל משתמש יכול לקרוא ולכתוב רק את הנתונים שלו
    match /user_progress/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcollections
      match /words/{wordId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /trainings/{trainingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. לחץ על **"Publish"**

## שלב 4: יצירת Indexes (אופציונלי)

אם תרצה לשאילתות מורכבות (למשל: מיון לפי `file_index` או חיפוש), תצטרך ליצור Indexes:

1. לך לטאב **"Indexes"** ב-Firestore
2. לחץ על **"Create Index"**
3. בחר את ה-Collection: `hebrew_words`
4. הוסף Fields:
   - `file_index` (Ascending)
   - `word` (Ascending)
5. לחץ על **"Create"**

## שלב 5: ייבוא הנתונים

### אפשרות א': ייבוא ידני דרך Console (לכמות קטנה)

1. לך ל-Firestore Console → **"Data"**
2. לחץ על **"Start collection"**
3. שם Collection: `hebrew_words`
4. הוסף Documents ידנית (לא מומלץ לכמות גדולה)

### אפשרות ב': ייבוא דרך Script (מומלץ)

צור סקריפט Node.js לייבוא הנתונים:

```javascript
// scripts/import-hebrew-words.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// אתחול Firebase Admin SDK
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importHebrewWords() {
  const dataHPath = path.join(__dirname, '../dataH');
  const files = fs.readdirSync(dataHPath).filter(f => f.startsWith('words') && f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(dataHPath, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const words = JSON.parse(fileContent);
    
    // חלץ file_index משם הקובץ (למשל: "words (1).json" -> 1)
    const fileIndexMatch = file.match(/\((\d+)\)/);
    const fileIndex = fileIndexMatch ? parseInt(fileIndexMatch[1]) : 1;
    
    console.log(`Importing ${words.length} words from ${file} (file_index: ${fileIndex})...`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const word of words) {
      const wordRef = db.collection('hebrew_words').doc(word.id);
      
      // המר choice ל-knowing_grade התחלתי
      let initialGrade = 5.0;
      if (word.choice === 'yes') initialGrade = 7.0;
      else if (word.choice === 'no') initialGrade = 3.0;
      else if (word.choice === 'maybe') initialGrade = 5.0;
      
      batch.set(wordRef, {
        id: word.id,
        word: word.word,
        meaning: word.meaning,
        choice: word.choice,
        choice_mark: word.choice_mark,
        file_index: fileIndex,
        knowing_grade: initialGrade,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      count++;
      
      // Firestore מגביל batches ל-500 operations
      if (count >= 500) {
        await batch.commit();
        console.log(`  Committed batch of ${count} words`);
        count = 0;
        // יצירת batch חדש
        const newBatch = db.batch();
        batch = newBatch;
      }
    }
    
    // Commit את ה-batch האחרון
    if (count > 0) {
      await batch.commit();
      console.log(`  Committed final batch of ${count} words`);
    }
    
    console.log(`✓ Completed ${file}`);
  }
  
  console.log('Import completed!');
  process.exit(0);
}

importHebrewWords().catch(console.error);
```

**הגדרת Service Account:**
1. ב-Firebase Console → **"Project Settings"** → **"Service accounts"**
2. לחץ על **"Generate new private key"**
3. שמור את הקובץ JSON במקום בטוח
4. **אל תעלה את הקובץ ל-Git!**

### אפשרות ג': ייבוא דרך Cloud Functions (לפרודקשן)

ניתן ליצור Cloud Function שייבוא את הנתונים מ-Cloud Storage.

## שלב 6: בדיקת הנתונים

1. לך ל-Firestore Console → **"Data"**
2. ודא שה-Collection `hebrew_words` קיים
3. פתח כמה Documents ובדוק שהנתונים נכונים
4. בדוק שה-`file_index` נכון לכל מילה

## שלב 7: עדכון קוד האפליקציה

לאחר שהנתונים ב-Firestore, תצטרך לעדכן את הקוד ב-Next.js:

1. הוסף Firestore לקובץ `lib/firebase.ts`
2. צור פונקציות לקריאת נתונים מ-Firestore
3. עדכן את ה-API routes להשתמש ב-Firestore במקום/בנוסף לשרת Backend

---

## הערות חשובות:

1. **Security Rules:** ודא שהכללים מוגדרים נכון לפני פרודקשן
2. **Costs:** Firestore גובה תשלום לפי קריאות/כתיבות. בדוק את [המחירים](https://firebase.google.com/pricing)
3. **Indexes:** ייצור Indexes אוטומטית אם תנסה שאילתה שדורשת index
4. **Backup:** שקול להגדיר [Scheduled Exports](https://firebase.google.com/docs/firestore/manage-data/export-import) לגיבוי

## שלבים הבאים:

לאחר השלמת ההגדרה, נמשיך לשלב 2: עדכון הקוד ב-Next.js לקריאת נתונים מ-Firestore.

