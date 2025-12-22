/**
 * Script לייבוא מילים בעברית מ-JSON files ל-Firestore
 * 
 * שימוש:
 * 1. התקן dependencies: npm install firebase-admin
 * 2. הורד Service Account Key מ-Firebase Console
 * 3. עדכן את הנתיב ל-serviceAccountKey.json למטה
 * 4. הרץ: node scripts/import-hebrew-words.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// עדכן את הנתיב לקובץ Service Account Key שלך
const serviceAccountPath = path.join(__dirname, '../service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ לא נמצא קובץ Service Account Key!');
  console.error('   אנא הורד את הקובץ מ-Firebase Console → Project Settings → Service accounts');
  console.error('   ושמור אותו בשם: service-account-key.json בתיקיית הבסיס');
  process.exit(1);
}

// אתחול Firebase Admin SDK
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * המר choice ל-knowing_grade התחלתי
 */
function getInitialGrade(choice) {
  switch (choice) {
    case 'yes':
      return 7.0;
    case 'no':
      return 3.0;
    case 'maybe':
      return 5.0;
    default:
      return 5.0;
  }
}

/**
 * חלץ file_index משם הקובץ
 * דוגמאות: "words (1).json" -> 1, "words(2).json" -> 2
 */
function extractFileIndex(filename) {
  const match = filename.match(/\((\d+)\)/);
  return match ? parseInt(match[1]) : 1;
}

/**
 * ייבוא מילים מקובץ JSON אחד
 */
async function importWordsFromFile(filePath, fileIndex) {
  console.log(`\n📄 קורא קובץ: ${path.basename(filePath)}`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const words = JSON.parse(fileContent);
  
  console.log(`   נמצאו ${words.length} מילים`);
  
  const batch = db.batch();
  let count = 0;
  let totalImported = 0;
  
  for (const word of words) {
    const wordRef = db.collection('hebrew_words').doc(word.id);
    
    const initialGrade = getInitialGrade(word.choice);
    
    batch.set(wordRef, {
      id: word.id,
      word: word.word,
      meaning: word.meaning,
      choice: word.choice || 'maybe',
      choice_mark: word.choice_mark || '?',
      file_index: fileIndex,
      knowing_grade: initialGrade,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    count++;
    totalImported++;
    
    // Firestore מגביל batches ל-500 operations
    if (count >= 500) {
      await batch.commit();
      console.log(`   ✓ נשמרו ${count} מילים (סה"כ: ${totalImported})`);
      count = 0;
    }
  }
  
  // Commit את ה-batch האחרון
  if (count > 0) {
    await batch.commit();
    console.log(`   ✓ נשמרו ${count} מילים (סה"כ: ${totalImported})`);
  }
  
  return totalImported;
}

/**
 * פונקציה ראשית לייבוא כל הקבצים
 */
async function importHebrewWords() {
  console.log('🚀 מתחיל ייבוא מילים בעברית ל-Firestore...\n');
  
  // עדכן את הנתיב לתיקיית dataH
  const dataHPath = path.join(__dirname, '../dataH');
  
  if (!fs.existsSync(dataHPath)) {
    console.error(`❌ התיקייה ${dataHPath} לא נמצאה!`);
    console.error('   ודא שהתיקייה dataH קיימת בתיקיית הבסיס');
    process.exit(1);
  }
  
  // מצא את כל קבצי ה-JSON
  const files = fs.readdirSync(dataHPath)
    .filter(f => f.startsWith('words') && f.endsWith('.json'))
    .sort((a, b) => {
      // מיון לפי file_index
      const indexA = extractFileIndex(a);
      const indexB = extractFileIndex(b);
      return indexA - indexB;
    });
  
  if (files.length === 0) {
    console.error('❌ לא נמצאו קבצי JSON בתיקיית dataH!');
    console.error('   ודא שהקבצים נקראים: words (1).json, words (2).json וכו\'');
    process.exit(1);
  }
  
  console.log(`📁 נמצאו ${files.length} קבצים לייבוא\n`);
  
  let totalWords = 0;
  
  for (const file of files) {
    const filePath = path.join(dataHPath, file);
    const fileIndex = extractFileIndex(file);
    
    try {
      const imported = await importWordsFromFile(filePath, fileIndex);
      totalWords += imported;
    } catch (error) {
      console.error(`❌ שגיאה בייבוא ${file}:`, error.message);
      // המשך לקבצים הבאים
    }
  }
  
  console.log(`\n✅ ייבוא הושלם בהצלחה!`);
  console.log(`   סה"כ מילים שיובאו: ${totalWords}`);
  console.log(`   סה"כ קבצים: ${files.length}`);
  
  process.exit(0);
}

// הרץ את הייבוא
importHebrewWords().catch((error) => {
  console.error('❌ שגיאה קריטית:', error);
  process.exit(1);
});

