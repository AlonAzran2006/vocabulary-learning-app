# מבנה תמיכה בסוגי נתונים חדשים

## סקירה כללית

האתר תומך כעת בשני סוגי לימוד:
- **en_he**: מילים באנגלית עם פירושים בעברית (ברירת מחדל, תאימות לאחור)
- **he_he**: מילים בעברית עם פירושים בעברית

## שינויים שנעשו ב-Frontend

### 1. קבצי Types חדשים
- `lib/types.ts` - הגדרת סוגי נתונים ותמיכה בהם

### 2. עדכון Interfaces
- `MockTraining` - הוסף שדה `dataType?: DataType`
- `Training` - הוסף שדה `dataType?: DataType`

### 3. עדכון UI
- **עמוד יצירת אימון** (`app/trainings/page.tsx`):
  - נוסף בחירת סוג נתונים בדיאלוג יצירת אימון
  - שדה `selectedDataType` נשמר ונשלח לשרת
  
- **רשימת אימונים**: מציג את סוג הנתונים ליד כל אימון

### 4. עדכון Mock Data
- `lib/mock-data.ts` - תומך ב-`dataType` בכל הפונקציות

### 5. Endpoints (Proxy)
ה-Proxy endpoints כבר מעבירים את כל הנתונים מהשרת, כך שהם יעבדו אוטומטית:
- `/api/proxy/create_training` - מעביר `data_type` מהגוף
- `/api/proxy/list_trainings` - מעביר את כל הנתונים מהשרת
- `/api/proxy/load_training` - מעביר את כל הנתונים מהשרת

## עדכונים נדרשים ב-Backend

### 1. POST /create_training

**Request Body** (עם השינוי החדש):
```json
{
  "user_uid": "user123",
  "training_name": "שם האימון",
  "file_indexes": [1, 2, 3],
  "data_type": "en_he"  // ← שדה חדש (אופציונלי, ברירת מחדל: "en_he")
}
```

**Response** (מומלץ להוסיף):
```json
{
  "status": "ok",
  "training_name": "שם האימון",
  "data_type": "en_he",  // ← מומלץ להחזיר
  "num_unique_words": 123,
  "total_items_in_sequence": 250,
  "word_count": 123,
  "last_modified": 1234567890
}
```

### 2. GET /list_trainings

**Response** (מומלץ להוסיף `data_type` לכל אימון):
```json
{
  "status": "ok",
  "trainings": [
    {
      "name": "שם האימון",
      "word_count": 123,
      "last_modified": 1234567890,
      "data_type": "en_he"  // ← שדה חדש (אופציונלי)
    }
  ]
}
```

### 3. POST /memorize_unit

**Request Body** (עם השינוי החדש):
```json
{
  "user_uid": "user123",
  "file_index": 1,
  "data_type": "en_he"  // ← שדה חדש (אופציונלי, ברירת מחדל: "en_he")
}
```

**Response**: כמו קודם, מערך של מילים

### 4. POST /load_training

**Request Body**:
```json
{
  "user_uid": "user123",
  "training_name": "שם האימון"
}
```

**Response** (מומלץ להוסיף `data_type`):
```json
{
  "status": "ok",
  "training_name": "שם האימון",
  "data_type": "en_he",  // ← מומלץ להוסיף
  "training_complete": false,
  "queue_size_remaining": 249,
  "first_word": {
    "id": "w_11630",
    "word": "example",
    "meaning": "דוגמה",
    "file_index": 1
  }
}
```

### 5. POST /load_training_full

**Response** (מומלץ להוסיף `data_type`):
```json
{
  "status": "ok",
  "training_name": "שם האימון",
  "data_type": "en_he",  // ← מומלץ להוסיף
  "words": [...],
  "initial_grades": {...}
}
```

### 5. מבנה קבצי Data

השרת צריך לטפל בקבצי נתונים שונים לפי `data_type`:

- `en_he`: `data/words (1).json` ... `data/words (10).json` (כמו לפני)
- `he_he`: `data/he_he/words (1).json` ... `data/he_he/words (10).json` (מומלץ)

**או** לפי naming אחר שאתה בוחר. העיקר שתמפה בין `data_type` לקובץ המתאים.

## תאימות לאחור

- אם `data_type` לא נשלח או לא קיים, ברירת המחדל היא `"en_he"` (התנהגות ישנה)
- כל השדות החדשים הם אופציונליים (`?`)

## דוגמאות שימוש

### יצירת אימון חדש עם עברית:
```typescript
POST /api/proxy/create_training
{
  "user_uid": "user123",
  "training_name": "מילים בעברית",
  "file_indexes": [1, 2],
  "data_type": "he_he"
}
```

### שינון יחידה עם עברית:
```typescript
POST /api/proxy/memorize_unit
{
  "user_uid": "user123",
  "file_index": 1,
  "data_type": "he_he"
}
```

## הערות

1. ה-Frontend כבר מוכן לעבוד עם השרת החדש
2. אם השרת עדיין לא תומך ב-`data_type`, האפליקציה תתפקד כרגיל עם ברירת המחדל `en_he`
3. מומלץ לבדוק שכל endpoint מחזיר/מקבל `data_type` כדי למנוע בעיות

