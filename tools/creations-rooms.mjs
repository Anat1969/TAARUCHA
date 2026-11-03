// הופך creations.json של אפליקציה לקובץ חדרים מוכן (seed/rooms-<app>.json), באותו מיפוי של הייבוא בסטודיו.
// הרצה: node tools/creations-rooms.mjs <כתובת creations.json>
// תלייה: select taarucha_import_rooms((select content::jsonb from http_get('<כתובת jsDelivr של הקובץ>')));
// הפונקציה (supabase/migrations/20261103_taarucha_import_rooms.sql) סגורה לציבור ורצה רק מחיבור מנהל.
import { writeFileSync, mkdirSync } from 'fs'
import { roomsFromCreations } from '../src/lib/creations.js'
const url = process.argv[2]
if (!url) { console.error('usage: creations-rooms.mjs <creations.json url>'); process.exit(1) }
const data = await (await fetch(url)).json()
const rooms = roomsFromCreations(data, url)
mkdirSync('seed', { recursive: true })
const file = `seed/rooms-${data.app.id}.json`
writeFileSync(file, JSON.stringify(rooms, null, 1) + '\n')
console.log(`${file}: ${rooms.length} חדרים, ${rooms.reduce((n, r) => n + r.works.length, 0)} עבודות`)
