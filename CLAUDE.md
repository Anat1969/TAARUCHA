# TAARUCHA

אתר תערוכות של ענת. Vite + React + framer-motion, עברית ו-RTL. Supabase (פרויקט ktqmwpbzcnzkhjskqisy, קידומת `taarucha_`), פריסה ב-Vercel מ-main.

## כללי עבודה
- עובדים מקצה לקצה: קוד, בדיקה, דחיפה ומיזוג ל-main, אימות פריסה. ענת רואה שינויים ברענון האתר בלבד.
- בלי אייקונים. עיצוב אדריכלי, גווני אפור, הנפשות ועומק.

## כניסה
- Google עדיין כבוי ב-Supabase (צריך הגדרה בלוח הבקרה של Supabase ושל Google Cloud).
- עד אז: דוא״ל וסיסמה, או קישור כניסה לדוא״ל. החלפת סיסמה ב"אודות והגדרות" בסטודיו.
- כפתור Google מוצג רק כש-`/auth/v1/settings` מחזיר google פעיל.
- אדמין: טבלת `taarucha_admins` לפי user_id או email.

## בדיקה
- הסביבה לא מגיעה ל-supabase.co. Playwright מול `vite preview` עם מוקים לכל `*.supabase.co`.
