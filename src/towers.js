/* ============================================================
 *  ป้อมธาตุทั้ง 25 แบบ: ธาตุเดี่ยว 6 · สองธาตุ 15 · สามธาตุ 4
 *  key = ธาตุเรียงตามตัวอักษร คั่นด้วย '+'
 *
 *  rate = นัด/วิ, range = พิกเซล, dpsF = ตัวคูณ DPS พื้นฐานของระดับ
 *  atk  = รูปแบบการโจมตีที่ sim ใช้
 *  fx(lv, dps, dmg) = ค่าความสามารถพิเศษตามพลังธาตุ (1–3)
 * ============================================================ */
export const TOWERS = {
  /* ---------------- ธาตุเดี่ยว ---------------- */
  light: {
    th: 'สุริยเนตร', name: 'Sun Eye',
    look: 'หอคอยขาวทอง มีผลึกแสงกลางวงแหวน',
    attack: 'ชาร์จลำแสงยิงเป้าหมายเดียวได้ทั่วแผนที่ ดาเมจต่อครั้งสูง เหมาะกับเก็บตัวหลุด',
    weak: 'ยิงช้ามาก รับมือฝูงไม่ดี',
    atk: 'beam', rate: 0.3, range: 2000, dpsF: 0.62,
    fx: () => ({ global: true, charge: 0.6 }),
  },
  dark: {
    th: 'เนตรอเวจี', name: 'Abyss Eye',
    look: 'กรงเล็บหินดำโอบลูกแก้วม่วง',
    attack: 'ยิงพลังมืดแรง พร้อมกัดกร่อนชีวิต ทำดาเมจต่อเนื่องตาม %HP ปัจจุบัน',
    weak: 'ระยะปานกลาง คำสาปเบาลงเมื่อศัตรูเลือดน้อย',
    atk: 'proj', rate: 0.9, range: 105, dpsF: 0.9,
    fx: (lv, dps) => ({ corrode: { pct: 0.025 + 0.01 * lv, dur: 3, cap: dps * 0.6 } }),
  },
  water: {
    th: 'วังวนธารา', name: 'Whirlpool',
    look: 'อ่างน้ำทรงเตี้ย มีเกลียวคลื่นลอยเหนือป้อม',
    attack: 'ยิงน้ำกระจายเป็นวง ดาเมจเบา ติดเปียกชุ่ม ลดความเร็วเคลื่อนที่',
    weak: 'ดาเมจต่ำ ต้องพึ่งป้อมอื่นฆ่า',
    atk: 'proj', rate: 1.1, range: 105, dpsF: 0.62,
    fx: (lv) => ({ splash: 36 + 6 * lv, wet: { factor: 0.64 - 0.07 * lv, dur: 2 } }),
  },
  fire: {
    th: 'เตาอัคคี', name: 'Furnace',
    look: 'เตาอิฐดำกับปืนใหญ่ทองแดง',
    attack: 'ยิงลูกไฟระเบิดวงกว้าง พร้อมเผาไหม้ต่อเนื่อง',
    weak: 'กระสุนเดินทางช้า ศัตรูเร็วอาจพ้นจุดระเบิด',
    atk: 'proj', rate: 0.8, range: 100, dpsF: 0.78, speed: 210,
    fx: (lv, dps) => ({ splash: 40 + 8 * lv, burn: { dps: dps * 0.32, dur: 3 } }),
  },
  wind: {
    th: 'จักรวายุ', name: 'Wind Wheel',
    look: 'ใบมีดสามชิ้นโคจรรอบแกนลม',
    attack: 'ยิงรัวหลายเป้าหมาย สะสมการยิงเพื่อปล่อยลมผลักถอยตามทางเดิน',
    weak: 'ดาเมจต่อเป้าต่ำ บอสต้านแรงผลัก',
    atk: 'proj', rate: 2.4, range: 115, dpsF: 0.52,
    fx: (lv) => ({ multi: 1 + lv, gust: { every: 10 - lv, dist: 34 + 6 * lv } }),
  },
  earth: {
    th: 'หมัดปฐพี', name: 'Earth Fist',
    look: 'โกเลมหินหมัดใหญ่ มีผลึกอำพัน',
    attack: 'ขว้างหินหนัก มีโอกาสมึนงง หยุดการเดินและใช้สกิลชั่วคราว',
    weak: 'ระยะสั้น ยิงช้า สตันไม่แน่นอน',
    atk: 'proj', rate: 0.5, range: 100, dpsF: 1.6,
    fx: (lv) => ({ stun: { chance: 0.14 + 0.05 * lv, dur: 0.9 } }),
  },

  /* ---------------- สองธาตุ ---------------- */
  'dark+light': {
    th: 'คราสพิพากษา', name: 'Judgement Eclipse',
    look: 'วงแหวนทองล้อมดวงอาทิตย์ดำ',
    attack: 'ยิงสะสมตราคราสบนเป้าเดียว ครบจำนวนแล้วระเบิดดาเมจตาม HP ที่เป้าหมายเสียไป',
    weak: 'ไม่คุ้มกับตัวเลือดเต็มหรือตัวที่ตายก่อนสะสมตราครบ',
    atk: 'beam', rate: 1.25, range: 125, dpsF: 0.8,
    fx: (lv, dps, dmg) => ({ marks: { need: 4, pct: 0.14 + 0.04 * lv, cap: dmg * 5, dur: 4 } }),
  },
  'light+water': {
    th: 'ปริซึมธารา', name: 'Tide Prism',
    look: 'ผลึกใสล้อมด้วยหยดน้ำลอยตัว',
    attack: 'ลำแสงหักเหชิ่งระหว่างศัตรู พร้อมสโลว์เบา ๆ ดาเมจลดลงทุกครั้งที่ชิ่ง',
    weak: 'ศัตรูอยู่ห่างกันจะชิ่งไม่ได้',
    atk: 'chain', rate: 1.0, range: 125, dpsF: 0.5,
    fx: (lv) => ({ chain: { bounces: 2 + lv, falloff: 0.78, jump: 80 }, slow: { factor: 0.82, dur: 1 } }),
  },
  'fire+light': {
    th: 'สุริยะเผาผลาญ', name: 'Solar Burn',
    look: 'หอรวมแสง มีแกนดวงอาทิตย์',
    attack: 'ยิงลำแสงต่อเนื่อง ยิ่งโจมตีเป้าเดิมนานยิ่งร้อนและแรง',
    weak: 'เปลี่ยนเป้าแล้วพลังสะสมรีเซ็ต',
    atk: 'ramp', rate: 6, range: 112, dpsF: 0.72,
    fx: (lv) => ({ ramp: { time: 3.2 - 0.3 * lv, min: 0.45, max: 2.1 + 0.2 * lv } }),
  },
  'light+wind': {
    th: 'ศรแสง', name: 'Light Arrow',
    look: 'หน้าไม้ลอยตัว มีปีกลม',
    attack: 'ยิงศรแสงความเร็วสูง ทะลุศัตรูเป็นเส้นตรง',
    weak: 'ต้องวางให้แนวยิงตรงกับทางเดิน',
    atk: 'pierce', rate: 1.4, range: 145, dpsF: 0.62,
    fx: () => ({ pierce: true }),
  },
  'earth+light': {
    th: 'เสาศิลารุ่งอรุณ', name: 'Dawn Pillar',
    look: 'เสาหินรูน มีผลึกทองบนยอด',
    attack: 'ยิงช้า พร้อมปล่อยคลื่นเปิดเผยจุดอ่อน ทำให้ศัตรูรับดาเมจจากการโจมตีโดยตรงเพิ่ม',
    weak: 'ดาเมจตัวเองต่ำ ต้องมีป้อมอื่นยิงร่วม',
    atk: 'pulse', rate: 0.45, range: 110, dpsF: 0.32,
    fx: (lv) => ({ expose: { amp: 1.2 + 0.06 * lv, dur: 4.5 } }),
  },
  'dark+water': {
    th: 'บ่ออาถรรพ์', name: 'Cursed Well',
    look: 'บ่อน้ำดำกับวังวนม่วง',
    attack: 'สร้างบ่อคำสาปกัดกร่อน ยิ่งอยู่ในบ่อนาน ดาเมจตาม %HP ปัจจุบันยิ่งแรงจนถึงเพดาน',
    weak: 'ศัตรูเร็วผ่านบ่อก่อนคำสาปรุนแรง',
    atk: 'zone', rate: 0.4, range: 110, dpsF: 0.75,
    fx: (lv, dps) => ({ zone: { kind: 'abyss', r: 42, dur: 4.5, dps: dps * 0.3, pct: 0.025, grow: 0.03, capPct: 0.1 + 0.02 * lv, cap: dps * 0.7 } }),
  },
  'dark+fire': {
    th: 'เพลิงวิญญาณ', name: 'Soul Fire',
    look: 'เตาหัวกะโหลก มีไฟม่วงแดง',
    attack: 'ติดไฟคำสาป หากเป้าหมายตาย ไฟที่เหลือแพร่ไปยังศัตรูใกล้เคียง',
    weak: 'ประสิทธิภาพลดลงเมื่อศัตรูเดินกระจาย',
    atk: 'proj', rate: 0.9, range: 110, dpsF: 0.62, proj: 'soul',
    fx: (lv, dps) => ({ soul: { dps: dps * 0.55, dur: 4, spread: 2 + lv, jump: 70 } }),
  },
  'dark+wind': {
    th: 'วังวนสูญญะ', name: 'Void Vortex',
    look: 'วงแหวนแตกโคจรรอบหลุมดำ',
    attack: 'สร้างแรงดึงศัตรูตามทางเข้าหาศูนย์กลาง เพื่อรวมฝูง',
    weak: 'ดาเมจต่ำ บอสต้านแรงดึง',
    atk: 'zone', rate: 0.42, range: 118, dpsF: 0.5,
    fx: (lv, dps) => ({ zone: { kind: 'void', r: 58, dur: 1.8, dps: dps * 0.45, pull: 55 + 10 * lv } }),
  },
  'dark+earth': {
    th: 'สุสานพันธนาการ', name: 'Shackle Tomb',
    look: 'หลุมศพหินดำ มีโซ่เงาจากพื้น',
    attack: 'ตรึงเป้าหมายให้อยู่กับที่ พร้อมคำสาปกัดกร่อน',
    weak: 'ศัตรูที่ถูกตรึงยังใช้สกิลได้ รอบโจมตีนาน',
    atk: 'proj', rate: 0.38, range: 108, dpsF: 0.9, proj: 'chain',
    fx: (lv, dps) => ({ root: { dur: 1.3 + 0.2 * lv }, corrode: { pct: 0.03 + 0.01 * lv, dur: 3, cap: dps * 0.4 } }),
  },
  'fire+water': {
    th: 'บ่อลาวา', name: 'Lava Pit',
    look: 'เตาภูเขาไฟ มีรางน้ำและลาวาไหล',
    attack: 'ทิ้งแอ่งลาวา ทำดาเมจต่อเนื่อง ติดหนืดและเผาไหม้',
    weak: 'ต้องให้ศัตรูอยู่ในแอ่งนานจึงคุ้ม',
    atk: 'zone', rate: 0.5, range: 105, dpsF: 0.95,
    fx: (lv, dps) => ({ zone: { kind: 'lava', r: 40, dur: 4, dps: dps * 0.28, sticky: 0.7 - 0.04 * lv, burn: { dps: dps * 0.1, dur: 2 } } }),
  },
  'water+wind': {
    th: 'พายุเหมันต์', name: 'Winter Storm',
    look: 'ผลึกน้ำแข็งกลางวงพายุ',
    attack: 'พายุหิมะสะสมความเย็นจนเต็มแล้วแช่แข็ง',
    weak: 'ต้องใช้เวลาสะสม และมีช่วงต้านทานการแช่ซ้ำ',
    atk: 'proj', rate: 1.2, range: 112, dpsF: 0.65, proj: 'ice',
    fx: (lv) => ({ splash: 44, chill: { add: 26 + 6 * lv, freeze: 1.4 + 0.15 * lv, imm: 3 } }),
  },
  'earth+water': {
    th: 'บึงดูด', name: 'Sucking Bog',
    look: 'บ่อโคลนล้อมด้วยเสาหิน',
    attack: 'สร้างโคลนติดจมโคลน ยิ่งอยู่ในพื้นที่นานยิ่งเดินช้า',
    weak: 'ดาเมจต่ำ ไม่เด่นกับทางผ่านสั้น ๆ',
    atk: 'zone', rate: 0.4, range: 108, dpsF: 0.5,
    fx: (lv, dps) => ({ zone: { kind: 'mud', r: 46, dur: 5, dps: dps * 0.26, sink: 0.3, minF: 0.4 - 0.02 * lv } }),
  },
  'fire+wind': {
    th: 'พายุเพลิง', name: 'Firestorm',
    look: 'กังหันโลหะโอบกรวยไฟ',
    attack: 'ปล่อยพายุไฟเคลื่อนตามทาง เผาศัตรูที่สัมผัสต่อเนื่อง',
    weak: 'พายุมีอายุจำกัด อาจเคลื่อนไปยังช่วงที่ไม่มีศัตรู',
    atk: 'tornado', rate: 0.36, range: 118, dpsF: 0.85,
    fx: (lv, dps) => ({ tornado: { r: 32, dur: 3.6, speed: 52, dps: dps * 0.75, burn: { dps: dps * 0.18, dur: 2 } } }),
  },
  'earth+fire': {
    th: 'ปืนหลอมเกราะ', name: 'Armor Melter',
    look: 'ปืนใหญ่เหล็กบนฐานเตาหิน',
    attack: 'ยิงกระสุนร้อนหนัก ระเบิดวงเล็ก ติดเกราะแตก ลดเกราะชั่วคราว',
    weak: 'ยิงช้า ประโยชน์ลดลงกับศัตรูไร้เกราะ',
    atk: 'proj', rate: 0.5, range: 102, dpsF: 1.1, speed: 300, proj: 'shell',
    fx: (lv) => ({ splash: 30, shred: { amp: 1.15 + 0.05 * lv, dur: 4 } }),
  },
  'earth+wind': {
    th: 'พายุทราย', name: 'Sandstorm',
    look: 'เสาหินทรายกับวงหินบด',
    attack: 'ยิงทรายเป็นกรวย สะสมกัดเซาะจนครบแล้วขัดจังหวะสกิลที่กำลังร่าย',
    weak: 'ระยะสั้น ต้องหันกรวยให้ครอบคลุมฝูง',
    atk: 'cone', rate: 1.4, range: 100, dpsF: 0.8,
    fx: (lv) => ({ cone: { spread: 0.55 }, erosion: { need: 6 - Math.min(2, lv - 1), silence: 3, stun: 0.4 } }),
  },

  /* ---------------- สามธาตุ ---------------- */
  'fire+water+wind': {
    th: 'พายุลาวา', name: 'Lava Storm',
    look: 'เกลียวลาวาหมุนรอบแกนไอน้ำ',
    attack: 'ปล่อยพายุลาวาเคลื่อนตามทาง ทิ้งแอ่งด้านหลัง ศัตรูติดหนืดและเผาไหม้',
    weak: 'ดาเมจเน้นสะสม พื้นที่ด้านหลังคงอยู่ไม่นาน',
    atk: 'tornado', rate: 0.36, range: 125, dpsF: 0.85,
    fx: (lv, dps) => ({
      tornado: { r: 36, dur: 4, speed: 48, dps: dps * 0.4, burn: { dps: dps * 0.1, dur: 2 }, trail: { every: 0.5, r: 30, dur: 2, dps: dps * 0.1, sticky: 0.65 } },
    }),
  },
  'earth+fire+water': {
    th: 'ปล่องปะทุ', name: 'Eruption Vent',
    look: 'เนินหินแตกร้าว มีลาวาและช่องไอน้ำ',
    attack: 'วางจุดปะทุบนทาง หน่วงเวลาก่อนระเบิดแรง ทำให้มึนงงช่วงสั้น และทิ้งแอ่งลาวา',
    weak: 'ศัตรูเร็วอาจผ่านจุดก่อนปะทุ คูลดาวน์นาน',
    atk: 'erupt', rate: 0.3, range: 125, dpsF: 0.6,
    fx: (lv, dps) => ({ erupt: { delay: 1.1, r: 62, stun: 0.7, lava: { r: 40, dur: 3, dps: dps * 0.15, sticky: 0.7 } } }),
  },
  'earth+water+wind': {
    th: 'ธารน้ำแข็ง', name: 'Glacier',
    look: 'กังหันศิลาหุ้มผลึกน้ำแข็ง',
    attack: 'สร้างแนวพายุเย็น สะสมจนแช่แข็ง เมื่อยิงซ้ำใส่ตัวที่แข็งจะเกิดน้ำแข็งแตก ทำดาเมจรอบตัวและจบสถานะแช่แข็ง',
    weak: 'ต้องโจมตีหลายครั้ง ศัตรูต้านความเย็นทำให้คอมโบเกิดยาก',
    atk: 'pierce', rate: 0.9, range: 130, dpsF: 0.48,
    fx: () => ({ pierce: true, chill: { add: 34, freeze: 1.6, imm: 2.5 }, shatter: { r: 55, mul: 1.6 } }),
  },
  'earth+fire+wind': {
    th: 'ฝนอุกกาบาต', name: 'Meteor Rain',
    look: 'วงหินลอยเหนือปล่องเพลิง',
    attack: 'ระดมหินไฟลงพื้นที่ แต่ละลูกระเบิดและเผาไหม้ ลูกหลักสร้างแรงกระแทกขัดจังหวะสกิล',
    weak: 'มีเวลารอกระสุนตก กระจายดาเมจจึงไม่เด่นกับเป้าเดี่ยว',
    atk: 'meteor', rate: 0.4, range: 135, dpsF: 0.65,
    fx: (lv, dps) => ({ meteor: { count: 4, area: 55, r: 30, mainR: 46, small: 0.35, delay: 0.75, silence: 2, stun: 0.35 }, burn: { dps: dps * 0.12, dur: 2.5 } }),
  },
};

export const TOWER_KEYS = Object.keys(TOWERS);
export const towerDef = (els) => TOWERS[els.slice().sort().join('+')] || null;
