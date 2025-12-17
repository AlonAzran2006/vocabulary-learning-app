# Hebrew Vocabulary Learning App

אפליקציית לימוד אוצר מילים בעברית עם ממשק RTL מלא ואנימציות חלקות.

## התקנה

\`\`\`bash
npm install
\`\`\`

## הרצה

\`\`\`bash
npm run dev
\`\`\`

הפרויקט יפעל על `http://localhost:3000`

## מצב פיתוח (Development Mode)

כדי להריץ את האפליקציה מקומית ללא צורך בהתחברות Firebase:

1. צור קובץ `.env.local` בתיקיית הבסיס (אם לא קיים)
2. הוסף את השורה הבאה:

\`\`\`
NEXT_PUBLIC_DEV_MODE=true
\`\`\`

במצב זה, האפליקציה תשתמש במשתמש דמה ותאפשר לך לגשת לכל העמודים ללא אימות.
**שים לב:** השתמש במצב זה רק בפיתוח מקומי, לעולם לא בפרודקשן!

## חיבור לשרת Backend

האפליקציה מתחברת לשרת backend. כדי להגדיר את כתובת השרת:

1. צור קובץ `.env.local` בתיקיית הבסיס (אם לא קיים)
2. הוסף את השורה הבאה:

\`\`\`
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
\`\`\`

### Endpoints הנדרשים בשרת Backend

השרת שלך צריך לספק את ה-endpoints הבאים:

#### POST /create_training

יוצר אימון חדש.

**Request Body:**
\`\`\`json
{
"training_name": "שם האימון",
"file_indexes": [1, 2, 3]
}
\`\`\`

**Response:**
\`\`\`json
{
"status": "ok",
"training_name": "my_training",
"num_unique_words": 123,
"total_items_in_sequence": 250,
"message": "Training 'my_training' created successfully."
}
\`\`\`

#### POST /load_training

טוען אימון לזיכרון ומחזיר את המילה הראשונה.

**Request Body:**
\`\`\`json
{
"training_name": "my_training"
}
\`\`\`

**Response (יש מילים):**
\`\`\`json
{
"status": "ok",
"training_name": "my_training",
"training_complete": false,
"queue_size_remaining": 249,
"first_word": {
"id": "w_11630",
"word": "example",
"meaning": "דוגמה",
"file_index": 1
}
}
\`\`\`

**Response (אין מילים):**
\`\`\`json
{
"status": "ok",
"training_name": "my_training",
"training_complete": true,
"queue_size_remaining": 0,
"message": "No words to practice in this training."
}
\`\`\`

#### POST /update_knowing_grade

מעדכן את רמת הידע של מילה ומחזיר את המילה הבאה.

**Request Body:**
\`\`\`json
{
"file_index": 1,
"word_id": "w_11630",
"test_grade": -1
}
\`\`\`

הערכים האפשריים ל-`test_grade`:

- `-1` = לא יודע (הציון יצומצם פי 0.5 והמילה תתווסף לסוף התור)
- `0` = בערך (הציון נשאר ללא שינוי)
- `1` = יודע (הציון מתקרב ל-10: `old + 0.5 * (10 - old)`)

**Response (יש עוד מילים):**
\`\`\`json
{
"status": "ok",
"training_complete": false,
"next_word": {
"id": "w_11631",
"word": "another",
"meaning": "אחר",
"file_index": 2
},
"updated": {
"word_id": "w_11630",
"test_grade": -1,
"old_knowing_grade": 5.0,
"new_knowing_grade": 2.5
}
}
\`\`\`

**Response (נגמר התור):**
\`\`\`json
{
"status": "ok",
"training_complete": true,
"message": "No more words in the training queue."
}
\`\`\`

### מבנה קבצי השרת

השרת מצפה למבנה קבצים הבא:

- `data/words (1).json` ... `data/words (10).json` — מאגר המילים (קבצי JSON עם מערך של אובייקטים עם השדות: `id`, `word`, `meaning`/`meaning_he`, `knowing_grade`)
- `trainings/<training_name>.json` — קבצי אימון (מערכי מזהי מילים)

## מבנה הפרויקט

- `/` - מסך הבית
- `/trainings` - ניהול וסינון אימונים
- `/training` - מסך האימון עצמו

## טכנולוגיות

- Next.js 16 with App Router
- React 19
- Tailwind CSS v4
- shadcn/ui components
- TypeScript
