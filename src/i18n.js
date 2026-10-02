/* ============================================================
 *  ระบบ 2 ภาษา (ไทย / English)
 *  t(key, vars)  — ข้อความ UI   ·   tr(obj, field) — ข้อมูลเกมที่มี obj.en
 * ============================================================ */
export const LANGS = ['th', 'en'];

let lang = 'th';
try {
  // ?lang=th | ?lang=en ในลิงก์ (ใช้กับ hreflang) มาก่อนค่าที่บันทึกไว้
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lang') : null;
  const saved = LANGS.includes(q) ? q : localStorage.getItem('etd_lang');
  if (LANGS.includes(saved)) lang = saved;
  else if (typeof navigator !== 'undefined' && navigator.language && !navigator.language.toLowerCase().startsWith('th')) lang = 'en';
} catch (e) { /* ignore */ }

export const getLang = () => lang;
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  try { localStorage.setItem('etd_lang', l); } catch (e) { /* ignore */ }
}

export function tr(obj, field) {
  if (!obj) return '';
  if (lang === 'en' && obj.en && obj.en[field] != null) return obj.en[field];
  return obj[field];
}
// ชื่อธาตุ
export const elName = (E) => (lang === 'en' ? E.name : E.th);

export function t(key, vars) {
  const d = STR[lang] && STR[lang][key] != null ? STR[lang][key] : STR.th[key];
  if (d == null) return key;
  if (!vars) return d;
  return d.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
}

const STR = {
  th: {
    'doc.title': 'Element TD 3D — เกม Tower Defense หกธาตุ เล่นฟรีบนเว็บ',
    'doc.desc': 'Element TD 3D เกม Tower Defense สามมิติ เล่นฟรีบนเบราว์เซอร์ — เรียกพลัง 6 ธาตุ แสง มืด น้ำ ไฟ ลม ดิน สร้างเขาวงกต หลอมรวมป้อม 25 แบบ ปราบภูตธาตุและมังกร',
    'hud.gold': 'ทอง', 'hud.lives': 'พลังชีวิตแกนกลาง', 'hud.wave': 'เวฟ',
    'hud.essence': 'ผลึกธาตุ — ใช้เรียกภูตธาตุเพื่อปลดล็อกธาตุ', 'hud.saved': 'บันทึกอัตโนมัติ',
    'btn.speed': 'ความเร็ว (F)', 'btn.settings': 'ตั้งค่า (O)',
    'set.title': 'ตั้งค่า', 'set.music': 'เพลง', 'set.sfx': 'เสียงเอฟเฟกต์', 'set.graphics': 'กราฟิก', 'set.high': 'สูง', 'set.low': 'ประหยัด', 'set.lang': 'ภาษา', 'set.full': 'เต็มจอ', 'btn.mute': 'เสียง (M)', 'btn.signs': 'ป้ายผู้สร้าง (G)', 'btn.camera': 'รีเซ็ตมุมกล้อง (C)',
    'btn.help': 'วิธีเล่น (H)', 'btn.full': 'เต็มจอ (Z)', 'btn.lang': 'เปลี่ยนภาษา / Language (L)', 'btn.close': 'ปิด (Esc)',
    'btn.play': 'เล่นต่อ (Space)', 'btn.pause': 'หยุดชั่วคราว (Space)',
    'btn.qHigh': 'กราฟิก: สูง (เงา + แสงเรือง) — กดเพื่อโหมดประหยัด', 'btn.qLow': 'กราฟิก: ประหยัด — กดเพื่อคุณภาพสูง',
    'dock.elements': 'ธาตุ', 'dock.build': 'สร้างป้อม', 'paused': 'หยุดชั่วคราว',
    'menu.saved': 'มีเกมที่บันทึกไว้', 'menu.resume': 'เล่นต่อ', 'menu.discard': 'ลบเกมที่บันทึกไว้',
    'menu.start': 'เริ่มเกม', 'menu.howto': 'วิธีเล่น', 'menu.new': 'เริ่มใหม่', 'menu.back': 'ย้อนกลับ',
    'menu.resumeText': '{map} · {diff} · ผ่านแล้ว {wave} เวฟ',
    'help.title': 'วิธีเล่น', 'help.cycle': 'ลูกศรชี้ไปยังธาตุที่แพ้ทาง<br>ชนะทาง ×2 · โดนแพ้ทาง ×0.5',
    'help.creatures': 'มอนสเตอร์ในเทพนิยาย', 'help.singles': 'ป้อมธาตุเดี่ยว', 'help.combos': 'ตำราป้อมผสม — สองธาตุ 15 · สามธาตุ 4',
    'help.keys': 'คีย์ลัด & กล้อง',
    'help.keysText': '1–8 เลือกป้อม · Space หยุด/เล่นต่อ · U อัปเกรด · S ขาย · T โหมดเล็งเป้า · F ความเร็ว · M ปิด/เปิดเสียง · O ตั้งค่า · L ภาษา · C รีเซ็ตกล้อง · Z เต็มจอ · Esc ยกเลิก<br>คลิกซ้ายค้างลาก = เลื่อนกระดาน · คลิกขวาลาก = หมุนกล้อง · ล้อเมาส์ = ซูม · มือถือ: นิ้วเดียวลาก = เลื่อน, สองนิ้ว = หมุน/ซูม',
    'help.ok': 'เข้าใจแล้ว',
    'help.i1': 'กดเริ่มเกมแล้วเวฟแรกมาใน 30 วิ — <b>เวฟถัดไปจะมาหลังเคลียร์สนามหมดแล้ว 10 วิ</b> เท่านั้น ใช้ปุ่มหยุดชั่วคราวได้ทุกเมื่อ',
    'help.i2': 'มอนสเตอร์ที่หลุดถึงประตูแกนกลางจะทำให้เสียชีวิต แล้ว <b>วนกลับไปเริ่มที่ประตูทางเข้าใหม่</b> จนกว่าจะถูกกำจัด',
    'help.i3': '<b>การสร้างและอัปเกรดป้อมใช้เวลา</b> ระหว่างก่อสร้างป้อมจะ <b>ยิงไม่ได้</b> — วางแผนล่วงหน้าก่อนมอนสเตอร์มาถึง',
    'help.i4': '<b>ผลึกธาตุ</b> — เริ่มเกมได้ 1 ชิ้น และได้เพิ่มทุก 5 เวฟ กดที่ธาตุเพื่อ <b>เรียกภูตพิทักษ์ธาตุ</b> ออกมา เมื่อกำจัดได้จึง <b>ปลดล็อก/เพิ่มเลเวลธาตุ</b> นั้น (สูงสุด 3) — ภูตยิ่งเลเวลสูงยิ่งอึด',
    'help.i5': '<b>ป้อมพื้นฐาน</b> ธนู/ปืนใหญ่ สร้างได้ทันที · <b>ป้อมธาตุ</b> สร้างได้เมื่อปลดล็อกธาตุนั้น · ระดับป้อมต้องไม่เกินเลเวลธาตุ',
    'help.i6': '<b>เพิ่มธาตุ</b> ให้ป้อมเพื่อกลายเป็น <b>ป้อมสองธาตุ (15 แบบ)</b> และ <b>ป้อมสามธาตุ (4 แบบ)</b> — รวมทั้งหมด 25 ป้อม แต่ละแบบมีวิธีโจมตีและจุดอ่อนต่างกัน',
    'help.i7': '<b>สร้างเขาวงกต</b> — ในลานหิน มอนสเตอร์จะเดินอ้อมป้อม (ห้ามปิดทางทั้งหมด) และต้องผ่านจุดตรวจตามลำดับ',
    'help.i8': 'จบแต่ละเวฟได้โบนัส + <b>ดอกเบี้ย 3%</b> ของทองที่เก็บไว้ · เกมบันทึกอัตโนมัติระหว่างเวฟ',
    'help.i9': 'ปุ่มตั้งค่า (เฟือง) ปรับเพลง เสียงเอฟเฟกต์ กราฟิก ภาษา และโหมดเต็มจอ · ป้ายผู้สร้างเกมที่มุมแผนที่คลิกเพื่อไปหน้าเว็บผู้พัฒนา',
    'help.elemCard': '{el} — {tower}', 'help.beats': 'ชนะทาง',
    'end.over': 'จบเกม', 'end.continue': 'เล่นต่อ (ไม่รู้จบ)', 'end.retry': 'เล่นอีกครั้ง', 'end.menu': 'เมนูหลัก',
    'end.win': 'ชัยชนะ!', 'end.lose': 'แกนกลางถูกทำลาย',
    'end.winText': 'คุณปกป้องแกนกลางได้ครบ {n} เวฟ!<br>กำจัดมอนสเตอร์ {kills} ตัว · ชีวิตเหลือ {lives}',
    'end.loseText': 'คุณผ่านไปได้ {n} เวฟ · กำจัดมอนสเตอร์ {kills} ตัว',
    'nogl': 'เบราว์เซอร์นี้ไม่รองรับ WebGL — ลองเปิดด้วย Chrome, Edge, Firefox หรือ Safari รุ่นใหม่',
    'toast.saveBroken': 'ไฟล์บันทึกเสียหาย — เริ่มเกมใหม่', 'toast.resumed': ':play: เล่นต่อจากเวฟ {wave} — {map}',
    'confirm.overwrite': 'เริ่มเกมใหม่จะเขียนทับเกมที่บันทึกไว้ ต้องการเริ่มใหม่หรือไม่?', 'confirm.discard': 'ลบเกมที่บันทึกไว้?',
    'toast.mapStart': '{map} — เตรียมสร้างป้อม!', 'toast.waveDone': 'เวฟ {n} ผ่าน! +{bonus} :gold:', 'toast.interest': '  ดอกเบี้ย +{n}',
    'toast.essence': ':essence: ได้รับผลึกธาตุ! เลือกธาตุที่แถบด้านล่าง', 'toast.noFullscreen': 'เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ',
    'toast.unlockFirst': ':lock: ปลดล็อกธาตุ{el}ก่อน (ใช้ผลึกธาตุ)', 'toast.lang': 'ภาษา: ไทย',
    'sec': '{n} วิ',
    'wave.over': 'จบเกม', 'wave.left': 'เวฟ {n} · เหลือ {left} ตัว', 'wave.guardian': 'กำจัดภูตธาตุก่อน!',
    'wave.first': 'เวฟแรกใน {s} วิ', 'wave.next': 'เวฟ {n} ใน {s} วิ', 'wave.last': 'เวฟสุดท้าย!', 'wave.upcoming': 'ถัดไป', 'wave.boss': 'บอส!',
    'wave.popTitle': 'เวฟ {n}: {creature}', 'wave.popEl': 'ธาตุ', 'wave.hp': 'HP {hp} ต่อตัว', 'wave.weakTo': 'แพ้ทาง:',
    'el.title': 'ธาตุ{el} ({name}) เลเวล {lv}/{max}', 'el.beats': 'ชนะทาง: {el}',
    'el.pending': 'ภูตธาตุ{el} Lv.{lv} อยู่ในสนาม — กำจัดเพื่อปลดล็อก',
    'el.can': 'คลิกใช้ผลึกธาตุ 1 ชิ้น เพื่อเรียกภูตธาตุ{el} Lv.{lv} — กำจัดได้จึงปลดล็อก',
    'build.locked': 'ต้องปลดล็อกธาตุ{el}ด้วยผลึกธาตุ',
    'fx.global': 'ยิงได้ทั่วแผนที่ (ชาร์จ)', 'fx.splash': 'ระเบิดรัศมี {r}', 'fx.burn': 'เผาไหม้ {dps}/วิ ({dur} วิ)',
    'fx.wet': 'เปียกชุ่ม ช้าลง {p}%', 'fx.slow': 'สโลว์ {p}%', 'fx.stun': 'มึนงง {p}% ({dur} วิ)', 'fx.multi': 'ยิง {n} เป้าพร้อมกัน',
    'fx.gust': 'ทุก {n} นัด ปล่อยลมผลักถอย', 'fx.corrode': 'กัดกร่อน {p}% ของ HP ปัจจุบัน/วิ',
    'fx.marks': 'ตราคราส {n} ครั้ง → ระเบิด {p}% ของ HP ที่เสียไป', 'fx.chain': 'ชิ่ง {n} ครั้ง (ลดลง {p}%/ครั้ง)',
    'fx.ramp': 'ยิ่งยิงนานยิ่งแรง สูงสุด ×{m}', 'fx.pierce': 'ทะลุศัตรูเป็นเส้นตรง', 'fx.expose': 'เปิดจุดอ่อน รับดาเมจโดยตรง ×{m}',
    'fx.soul': 'ไฟคำสาป {dps}/วิ · แพร่ {n} ตัวเมื่อตาย', 'fx.root': 'ตรึงอยู่กับที่ {dur} วิ', 'fx.chill': 'สะสมความเย็น → แช่แข็ง {dur} วิ',
    'fx.shatter': 'น้ำแข็งแตก ×{m} รอบตัว', 'fx.shred': 'เกราะแตก รับดาเมจ ×{m}', 'fx.cone': 'ยิงเป็นกรวย',
    'fx.erosion': 'กัดเซาะ {n} ครั้ง → ขัดจังหวะสกิล', 'fx.zone.abyss': 'บ่อคำสาป (ยิ่งอยู่นานยิ่งแรง)', 'fx.zone.lava': 'แอ่งลาวา หนืด {p}%',
    'fx.zone.mud': 'โคลนดูด ยิ่งอยู่นานยิ่งช้า', 'fx.zone.void': 'หลุมดำดึงศัตรูรวมฝูง', 'fx.tornado': 'พายุเคลื่อนตามทาง {dur} วิ',
    'fx.tornadoTrail': ' ทิ้งแอ่งลาวา', 'fx.erupt': 'ปะทุหลัง {d} วิ · มึนงง + แอ่งลาวา', 'fx.meteor': 'อุกกาบาต {n} ลูก · ลูกหลักขัดจังหวะสกิล',
    'fx.interrupt': 'ขัดจังหวะ!',
    'info.global': 'ทั่วแผนที่', 'info.neutral': '— (กลาง)', 'info.dmg': 'ดาเมจ/นัด', 'info.rate': 'ความเร็วยิง', 'info.perSec': '{n}/วิ',
    'info.range': 'ระยะ', 'info.strong': 'ชนะทาง (×2)', 'info.buildTime': 'เวลาก่อสร้าง', 'info.kills': 'กำจัด / ดาเมจรวม',
    'info.placeHint': 'คลิกบนพื้นเพื่อวาง · วางในลานหินเพื่อทำเขาวงกต · Esc ยกเลิก',
    'info.basic': 'ป้อมพื้นฐาน', 'info.k1': 'ธาตุเดี่ยว', 'info.k2': 'สองธาตุ', 'info.k3': 'สามธาตุ',
    'info.building': 'กำลังก่อสร้าง', 'info.upgrading': 'กำลังอัปเกรด', 'info.upgrade': 'อัปเกรดระดับ {n}', 'info.maxed': 'ระดับสูงสุดแล้ว',
    'info.addEl': 'เพิ่มธาตุ → {kind}', 'info.toDual': 'ป้อมสองธาตุ', 'info.toTriple': 'ป้อมสามธาตุ', 'info.sell': 'ขาย {n}',
    'info.tierOf': '{name} ระดับ {n}', 'info.noGold': 'ทองไม่พอ',
    'target.first': 'หัวแถว', 'target.last': 'ท้ายแถว', 'target.strong': 'HP มากสุด', 'target.close': 'ใกล้สุด',
    'sim.outside': 'นอกพื้นที่', 'sim.cantBuild': 'สร้างตรงนี้ไม่ได้', 'sim.occupied': 'มีป้อมอยู่แล้ว', 'sim.creepHere': 'มีมอนสเตอร์ขวางอยู่',
    'sim.blockPath': 'ห้ามปิดทางเดินทั้งหมด!', 'sim.trap': 'ห้ามขังมอนสเตอร์!', 'sim.noEssence': 'ไม่มีผลึกธาตุเหลือ',
    'sim.guardianAlive': 'ภูตธาตุ{el}ยังอยู่ในสนาม', 'sim.guardianSpawn': ':{icon}: ภูตธาตุ{el} Lv.{lv} ปรากฏ! กำจัดเพื่อปลดล็อก',
    'sim.guardianDown': ':{icon}: ปราบภูตธาตุ{el}! ธาตุ{el} เลเวล {lv}', 'sim.killGuardian': 'ต้องกำจัดภูตธาตุ{el}ก่อน',
    'sim.summonGuardian': 'ใช้ผลึกธาตุเรียกภูตธาตุ{el}แล้วกำจัดเพื่อปลดล็อก', 'sim.noGold': 'ทองไม่พอ!',
    'sim.needLv': 'ต้องมีธาตุ {els} เลเวล {lv}', 'sim.upTo': 'อัปเกรดเป็นระดับ {n}', 'sim.needElLv': 'ต้องมีธาตุ{el} เลเวล {lv}',
    'sim.needSame': ' (และธาตุเดิมเลเวลเท่ากัน)', 'sim.building': 'ป้อมกำลังก่อสร้างอยู่', 'sim.fusing': 'กำลังหลอมรวม: {name}',
    'sim.bossWave': ':warning: มังกรโบราณธาตุ{el}กำลังมา!', 'sim.wave': 'เวฟ {n}: :{icon}: {creature}ธาตุ{el}', 'sim.bossDown': 'บอสถูกกำจัด!',
    'sign.l1': 'เกมนี้คิดและพัฒนาโดย', 'sign.l3': 'สนใจติดต่อได้เลย!', 'sign.l4': '▶ คลิกที่ป้ายนี้',
  },
  en: {
    'doc.title': 'Element TD 3D — Free 3D Elemental Tower Defense Game',
    'doc.desc': 'Element TD 3D is a free 3D tower defense browser game — summon six elements, build mazes and fuse 25 unique towers to defend the core from mythical creatures.',
    'hud.gold': 'Gold', 'hud.lives': 'Core lives', 'hud.wave': 'Wave',
    'hud.essence': 'Essence — summon an elemental guardian to unlock an element', 'hud.saved': 'Autosaved',
    'btn.speed': 'Speed (F)', 'btn.settings': 'Settings (O)',
    'set.title': 'Settings', 'set.music': 'Music', 'set.sfx': 'Sound effects', 'set.graphics': 'Graphics', 'set.high': 'High', 'set.low': 'Low', 'set.lang': 'Language', 'set.full': 'Fullscreen', 'btn.mute': 'Sound (M)', 'btn.signs': 'Creator sign (G)', 'btn.camera': 'Reset camera (C)',
    'btn.help': 'How to play (H)', 'btn.full': 'Fullscreen (Z)', 'btn.lang': 'Language / เปลี่ยนภาษา (L)', 'btn.close': 'Close (Esc)',
    'btn.play': 'Resume (Space)', 'btn.pause': 'Pause (Space)',
    'btn.qHigh': 'Graphics: high (shadows + bloom) — click for low', 'btn.qLow': 'Graphics: low — click for high',
    'dock.elements': 'Elements', 'dock.build': 'Build', 'paused': 'Paused',
    'menu.saved': 'Saved game found', 'menu.resume': 'Continue', 'menu.discard': 'Delete saved game',
    'menu.start': 'Start', 'menu.howto': 'How to play', 'menu.new': 'New game', 'menu.back': 'Back',
    'menu.resumeText': '{map} · {diff} · {wave} waves cleared',
    'help.title': 'How to play', 'help.cycle': 'Arrows point to the element each one beats<br>Strong ×2 · Weak ×0.5',
    'help.creatures': 'Mythical creatures', 'help.singles': 'Single-element towers', 'help.combos': 'Combo towers — 15 dual · 4 triple',
    'help.keys': 'Hotkeys & camera',
    'help.keysText': '1–8 pick tower · Space pause/resume · U upgrade · S sell · T targeting · F speed · M mute · O settings · L language · C reset camera · Z fullscreen · Esc cancel<br>Left-drag = pan board · Right-drag = rotate · Wheel = zoom · Touch: one finger = pan, two fingers = rotate/zoom',
    'help.ok': 'Got it',
    'help.i1': 'The first wave arrives 30 s after you start — <b>each next wave only comes 10 s after the field is cleared</b>. Pause any time.',
    'help.i2': 'Monsters that reach the core cost lives, then <b>loop back to the entrance portal</b> until they are killed.',
    'help.i3': '<b>Building and upgrading takes time</b> and towers <b>cannot attack</b> while under construction — plan ahead.',
    'help.i4': '<b>Essence</b> — you start with 1 and gain one every 5 waves. Click an element to <b>summon its guardian</b>; defeat it to <b>unlock / level up</b> that element (max 3). Higher levels mean tougher guardians.',
    'help.i5': '<b>Basic towers</b> (arrow / cannon) can be built right away · <b>Element towers</b> need their element unlocked · tower tier cannot exceed element level.',
    'help.i6': '<b>Add elements</b> to a tower to make <b>dual towers (15)</b> and <b>triple towers (4)</b> — 25 towers in total, each with its own attack and weakness.',
    'help.i7': '<b>Build mazes</b> — on stone courtyards monsters path around your towers (never block the path completely) and must pass the checkpoints in order.',
    'help.i8': 'Each cleared wave pays a bonus + <b>3% interest</b> on banked gold · the game autosaves between waves.',
    'help.i9': 'The settings button (gear) controls music, sound effects, graphics, language and fullscreen · the creator sign in the map corner links to the developer\'s site.',
    'help.elemCard': '{el} — {tower}', 'help.beats': 'Beats',
    'end.over': 'Game over', 'end.continue': 'Continue (endless)', 'end.retry': 'Play again', 'end.menu': 'Main menu',
    'end.win': 'Victory!', 'end.lose': 'The core has fallen',
    'end.winText': 'You defended the core for all {n} waves!<br>{kills} monsters slain · {lives} lives left',
    'end.loseText': 'You survived {n} waves · {kills} monsters slain',
    'nogl': 'This browser does not support WebGL — try a recent Chrome, Edge, Firefox or Safari.',
    'toast.saveBroken': 'Save file is corrupted — starting a new game', 'toast.resumed': ':play: Resumed at wave {wave} — {map}',
    'confirm.overwrite': 'Starting a new game will overwrite your saved game. Continue?', 'confirm.discard': 'Delete the saved game?',
    'toast.mapStart': '{map} — get building!', 'toast.waveDone': 'Wave {n} cleared! +{bonus} :gold:', 'toast.interest': '  interest +{n}',
    'toast.essence': ':essence: Essence gained! Pick an element in the bottom bar', 'toast.noFullscreen': 'Fullscreen is not supported in this browser',
    'toast.unlockFirst': ':lock: Unlock {el} first (use essence)', 'toast.lang': 'Language: English',
    'sec': '{n}s',
    'wave.over': 'Game over', 'wave.left': 'Wave {n} · {left} left', 'wave.guardian': 'Defeat the guardian!',
    'wave.first': 'First wave in {s}s', 'wave.next': 'Wave {n} in {s}s', 'wave.last': 'Final wave!', 'wave.upcoming': 'Next', 'wave.boss': 'Boss!',
    'wave.popTitle': 'Wave {n}: {creature}', 'wave.popEl': 'Element', 'wave.hp': 'HP {hp} each', 'wave.weakTo': 'Weak to:',
    'el.title': '{el} ({name}) level {lv}/{max}', 'el.beats': 'Beats: {el}',
    'el.pending': '{el} guardian Lv.{lv} is on the field — defeat it to unlock',
    'el.can': 'Spend 1 essence to summon the {el} guardian Lv.{lv} — defeat it to unlock',
    'build.locked': 'Unlock {el} with essence first',
    'fx.global': 'Map-wide range (charged)', 'fx.splash': 'Splash radius {r}', 'fx.burn': 'Burn {dps}/s ({dur}s)',
    'fx.wet': 'Soaked: {p}% slower', 'fx.slow': 'Slow {p}%', 'fx.stun': 'Stun {p}% ({dur}s)', 'fx.multi': 'Hits {n} targets at once',
    'fx.gust': 'Every {n} shots: knock-back gust', 'fx.corrode': 'Corrode {p}% of current HP/s',
    'fx.marks': '{n} eclipse marks → burst for {p}% of missing HP', 'fx.chain': 'Bounces {n}× (−{p}% per bounce)',
    'fx.ramp': 'Ramps up on the same target, up to ×{m}', 'fx.pierce': 'Pierces in a straight line', 'fx.expose': 'Exposes weakness: direct damage ×{m}',
    'fx.soul': 'Soul fire {dps}/s · spreads to {n} on death', 'fx.root': 'Roots in place {dur}s', 'fx.chill': 'Builds chill → freeze {dur}s',
    'fx.shatter': 'Shatter ×{m} around the target', 'fx.shred': 'Armor break: takes ×{m} damage', 'fx.cone': 'Cone attack',
    'fx.erosion': '{n} erosion stacks → interrupts skills', 'fx.zone.abyss': 'Cursed pool (stronger the longer they stay)', 'fx.zone.lava': 'Lava pool, {p}% sticky',
    'fx.zone.mud': 'Sucking mud, slower the longer they stay', 'fx.zone.void': 'Black hole pulls enemies together', 'fx.tornado': 'Storm travels the path for {dur}s',
    'fx.tornadoTrail': ', leaving lava', 'fx.erupt': 'Erupts after {d}s · stun + lava pool', 'fx.meteor': '{n} meteors · main one interrupts skills',
    'fx.interrupt': 'Interrupted!',
    'info.global': 'Map-wide', 'info.neutral': '— (neutral)', 'info.dmg': 'Damage/hit', 'info.rate': 'Fire rate', 'info.perSec': '{n}/s',
    'info.range': 'Range', 'info.strong': 'Strong vs (×2)', 'info.buildTime': 'Build time', 'info.kills': 'Kills / total damage',
    'info.placeHint': 'Click the ground to place · place on stone courtyards to maze · Esc to cancel',
    'info.basic': 'Basic tower', 'info.k1': 'Single element', 'info.k2': 'Dual element', 'info.k3': 'Triple element',
    'info.building': 'Building', 'info.upgrading': 'Upgrading', 'info.upgrade': 'Upgrade to tier {n}', 'info.maxed': 'Max tier',
    'info.addEl': 'Add element → {kind}', 'info.toDual': 'dual tower', 'info.toTriple': 'triple tower', 'info.sell': 'Sell {n}',
    'info.tierOf': '{name} tier {n}', 'info.noGold': 'Not enough gold',
    'target.first': 'First', 'target.last': 'Last', 'target.strong': 'Strongest', 'target.close': 'Closest',
    'sim.outside': 'Out of bounds', 'sim.cantBuild': 'Cannot build here', 'sim.occupied': 'Tile already has a tower', 'sim.creepHere': 'A monster is in the way',
    'sim.blockPath': 'You cannot block the path!', 'sim.trap': 'You cannot trap monsters!', 'sim.noEssence': 'No essence left',
    'sim.guardianAlive': 'The {el} guardian is still on the field', 'sim.guardianSpawn': ':{icon}: {el} guardian Lv.{lv} appears! Defeat it to unlock',
    'sim.guardianDown': ':{icon}: {el} guardian defeated! {el} is now level {lv}', 'sim.killGuardian': 'Defeat the {el} guardian first',
    'sim.summonGuardian': 'Spend essence to summon the {el} guardian, then defeat it', 'sim.noGold': 'Not enough gold!',
    'sim.needLv': 'Requires {els} level {lv}', 'sim.upTo': 'Upgrade to tier {n}', 'sim.needElLv': 'Requires {el} level {lv}',
    'sim.needSame': ' (and the current elements at the same level)', 'sim.building': 'Tower is under construction', 'sim.fusing': 'Fusing: {name}',
    'sim.bossWave': ':warning: An ancient {el} dragon approaches!', 'sim.wave': 'Wave {n}: :{icon}: {el} {creature}', 'sim.bossDown': 'Boss defeated!',
    'sign.l1': 'Game designed & built by', 'sign.l3': 'Let\'s get in touch!', 'sign.l4': '▶ Click this sign',
  },
};
