/* ============================================================
 *  Element TD — ข้อมูลเกม
 *  กลไกอ้างอิงจาก Element TD (Warcraft III):
 *   - ได้ "ผลึกธาตุ" ทุก ๆ 5 เวฟ ใช้ปลดล็อก/อัปเลเวลธาตุ (สูงสุด 3)
 *   - ป้อมพื้นฐาน (ธนู/ปืนใหญ่) → ป้อมธาตุเดี่ยว → ป้อมสองธาตุ (15) → ป้อมสามธาตุ (20)
 *   - เลเวลของป้อมถูกจำกัดด้วยเลเวลธาตุที่ปลดล็อก
 *   - วางป้อมขวางทางเพื่อสร้างเขาวงกต (ห้ามปิดทางทั้งหมด)
 *   - มอนสเตอร์ทุกเวฟมีธาตุ และมีความสามารถพิเศษบางเวฟ
 * ============================================================ */

export const TILE = 40;
export const COLS = 20;
export const ROWS = 12;
export const WIDTH = COLS * TILE;
export const HEIGHT = ROWS * TILE;

export const ELEMENT_ORDER = ['light', 'dark', 'water', 'fire', 'wind', 'earth'];

/* โปรไฟล์ธาตุ: rate = นัด/วินาที, range = พิกเซล, dpsF = ตัวคูณ DPS ต่อเป้า */
export const ELEMENTS = {
  fire: {
    name: 'Fire', th: 'ไฟ', icon: '🔥', color: '#ff5a2a', glow: '#ffb347',
    rate: 1.0, range: 100, dpsF: 0.85,
    desc: 'ระเบิดวงกว้าง + เผาไหม้ต่อเนื่อง',
  },
  water: {
    name: 'Water', th: 'น้ำ', icon: '💧', color: '#2f8fff', glow: '#8fd3ff',
    rate: 1.2, range: 105, dpsF: 0.95,
    desc: 'ทำให้มอนสเตอร์ช้าลง',
  },
  earth: {
    name: 'Earth', th: 'ดิน', icon: '🪨', color: '#c08a42', glow: '#e9c27a',
    rate: 0.55, range: 92, dpsF: 1.25,
    desc: 'ดาเมจหนัก มีโอกาสทำให้มึนงง',
  },
  wind: {
    name: 'Wind', th: 'ลม', icon: '🌪️', color: '#3fe0a8', glow: '#b6ffe3',
    rate: 2.4, range: 115, dpsF: 0.5,
    desc: 'ยิงรัวหลายเป้าพร้อมกัน ผลักถอยหลัง',
  },
  light: {
    name: 'Light', th: 'แสง', icon: '✨', color: '#ffe14a', glow: '#fffbd0',
    rate: 0.8, range: 150, dpsF: 0.8,
    desc: 'ลำแสงระยะไกล ทะลุทุกตัวในแนว',
  },
  dark: {
    name: 'Dark', th: 'มืด', icon: '🌑', color: '#a24dff', glow: '#d6b3ff',
    rate: 0.9, range: 105, dpsF: 0.9,
    desc: 'สาปให้รับดาเมจเพิ่ม + ดาเมจตาม % HP',
  },
};

/* วงจรธาตุแบบ Element TD: แสง → มืด → น้ำ → ไฟ → ลม → ดิน → แสง */
export const BEATS = {
  light: 'dark',
  dark: 'water',
  water: 'fire',
  fire: 'wind',
  wind: 'earth',
  earth: 'light',
};
export const MULT_STRONG = 2.0;
export const MULT_WEAK = 0.5;

export function elementMultiplier(atk, def) {
  if (!atk || !def) return 1;
  if (BEATS[atk] === def) return MULT_STRONG;
  if (BEATS[def] === atk) return MULT_WEAK;
  return 1;
}

/* ผลพิเศษของแต่ละธาตุตามระดับพลัง (1–3) — dps คือ DPS ของป้อม */
export function elementEffects(el, lv, dps) {
  switch (el) {
    case 'fire': return { splash: 38 + 8 * lv, burn: { dps: dps * 0.3, dur: 3 } };
    case 'water': return { slow: { factor: 0.62 - 0.07 * lv, dur: 1.8 + 0.2 * lv } };
    case 'earth': return { stun: { chance: 0.12 + 0.05 * lv, dur: 0.75 } };
    case 'wind': return { multi: 1 + lv, knock: { chance: 0.08 + 0.04 * lv, dist: 26 } };
    case 'light': return { pierce: true };
    case 'dark': return { curse: { amp: 1.15 + 0.1 * lv, dur: 3 }, percent: 0.015 + 0.01 * lv };
    default: return {};
  }
}

/* ป้อมพื้นฐาน (ไม่มีธาตุ) */
export const BASIC = {
  arrow: {
    th: 'ป้อมธนู', name: 'Arrow', icon: '🏹', color: '#d9b26a',
    cost: [50, 60, 150], dps: [15, 33, 75], rate: 1.4, range: 120,
    desc: 'ยิงเร็ว เป้าเดียว ราคาถูก',
  },
  cannon: {
    th: 'ป้อมปืนใหญ่', name: 'Cannon', icon: '💣', color: '#8a8f99',
    cost: [70, 80, 200], dps: [14, 30, 70], rate: 0.6, range: 100, splash: [40, 46, 52],
    desc: 'ระเบิดวงกว้าง ยิงช้า',
  },
};

/* ราคาสะสมและ DPS ตามจำนวนธาตุ (index = tier-1) */
export const ELEMENT_TOWER = {
  1: { cum: [120, 420, 1220], dps: [30, 110, 330] },
  2: { cum: [570, 1570, 3770], dps: [190, 520, 1300] },
  3: { cum: [2170, 5970], dps: [800, 2300] },
};
export const MAX_TIER = { 1: 3, 2: 3, 3: 2 };
export const MAX_ELEMENT_LEVEL = 3;

export const DUALS = {
  'fire+water': { name: 'Steam', th: 'ไอน้ำเดือด' },
  'earth+fire': { name: 'Magma', th: 'แมกมา' },
  'fire+wind': { name: 'Wildfire', th: 'พายุเพลิง' },
  'fire+light': { name: 'Solar', th: 'สุริยะ' },
  'dark+fire': { name: 'Hellfire', th: 'เพลิงนรก' },
  'earth+water': { name: 'Swamp', th: 'หนองโคลน' },
  'water+wind': { name: 'Blizzard', th: 'พายุหิมะ' },
  'light+water': { name: 'Prism', th: 'ปริซึม' },
  'dark+water': { name: 'Abyss', th: 'ห้วงลึก' },
  'earth+wind': { name: 'Sandstorm', th: 'พายุทราย' },
  'earth+light': { name: 'Crystal', th: 'คริสตัล' },
  'dark+earth': { name: 'Gravity', th: 'แรงโน้มถ่วง' },
  'light+wind': { name: 'Thunder', th: 'อัสนี' },
  'dark+wind': { name: 'Void', th: 'ความว่างเปล่า' },
  'dark+light': { name: 'Eclipse', th: 'สุริยคราส' },
};

export const TRIPLES = {
  'dark+earth+fire': { name: 'Inferno Pit', th: 'หลุมนรก' },
  'dark+earth+light': { name: 'Obsidian', th: 'ศิลาออบซิเดียน' },
  'dark+earth+water': { name: 'Plague Bog', th: 'บึงพิษ' },
  'dark+earth+wind': { name: 'Dust Wraith', th: 'วิญญาณฝุ่น' },
  'dark+fire+light': { name: 'Supernova', th: 'ซูเปอร์โนวา' },
  'dark+fire+water': { name: 'Witch Cauldron', th: 'หม้อแม่มด' },
  'dark+fire+wind': { name: 'Ash Storm', th: 'พายุเถ้าถ่าน' },
  'dark+light+water': { name: 'Moonwell', th: 'บ่อจันทรา' },
  'dark+light+wind': { name: 'Astral Gate', th: 'ประตูดารา' },
  'dark+water+wind': { name: 'Kraken', th: 'คราเคน' },
  'earth+fire+light': { name: 'Sunforge', th: 'เตาหลอมสุริยะ' },
  'earth+fire+water': { name: 'Geyser', th: 'น้ำพุร้อน' },
  'earth+fire+wind': { name: 'Meteor', th: 'อุกกาบาต' },
  'earth+light+water': { name: 'Life Tree', th: 'ต้นไม้แห่งชีวิต' },
  'earth+light+wind': { name: 'Crystal Spire', th: 'ยอดคริสตัล' },
  'earth+water+wind': { name: 'Tsunami', th: 'สึนามิ' },
  'fire+light+water': { name: 'Aurora', th: 'ออโรร่า' },
  'fire+light+wind': { name: 'Storm Lord', th: 'จ้าวอัสนี' },
  'fire+water+wind': { name: 'Tempest', th: 'พายุคลั่ง' },
  'light+water+wind': { name: 'Heaven Tide', th: 'กระแสสวรรค์' },
};

export const comboKey = (els) => els.slice().sort().join('+');

/* ความสามารถของมอนสเตอร์ */
export const ABILITIES = {
  normal:  { th: 'ปกติ', creature: 'หมาป่าคริสตัล', icon: '🐺', model: 'wolf', hp: 1, speed: 46, size: 12, reward: 1, lives: 1, desc: 'มอนสเตอร์ธรรมดา' },
  fast:    { th: 'ว่องไว', creature: 'ยูนิคอร์น', icon: '🦄', model: 'unicorn', hp: 0.6, speed: 80, size: 10, reward: 0.9, lives: 1, desc: 'เคลื่อนที่เร็วมาก' },
  armored: { th: 'เกราะหิน', creature: 'เต่ามังกร', icon: '🐢', model: 'turtle', hp: 1.3, speed: 34, size: 14, reward: 1.3, lives: 1, desc: 'ไม่ติดสถานะชะลอ/มึนงง/ผลัก และลดดาเมจ 20%' },
  regen:   { th: 'ฟื้นฟู', creature: 'ไฮดรา', icon: '🐍', model: 'hydra', hp: 1.0, speed: 44, size: 12, reward: 1.1, lives: 1, desc: 'ฟื้นพลังชีวิต 2.5% ต่อวินาที' },
  split:   { th: 'แยกร่าง', creature: 'คิทสึเนะ', icon: '🦊', model: 'kitsune', hp: 0.75, speed: 42, size: 12, reward: 0.6, lives: 1, desc: 'ตายแล้วแยกร่างเป็นจิ้งจอก 2 ตัว' },
  undead:  { th: 'อมตะ', creature: 'ฟีนิกซ์', icon: '🔥', model: 'phoenix', hp: 0.8, speed: 44, size: 12, reward: 1.2, lives: 1, desc: 'ฟื้นคืนชีพจากเถ้าถ่านครั้งเดียวด้วย HP 50%' },
  flying:  { th: 'บินได้', creature: 'กริฟฟิน', icon: '🦅', model: 'griffin', hp: 0.6, speed: 42, size: 12, reward: 1, lives: 1, desc: 'บินข้ามเขาวงกตเป็นเส้นตรง' },
  boss:    { th: 'บอสมังกร', creature: 'มังกรโบราณ', icon: '🐉', model: 'dragon', hp: 16, speed: 26, size: 24, reward: 20, lives: 10, desc: 'พลังชีวิตมหาศาล ต้านสถานะ' },
  child:   { th: 'ร่างแยก', creature: 'จิ้งจอกร่างแยก', icon: '🦊', model: 'kitsune', hp: 0.35, speed: 52, size: 8, reward: 0.25, lives: 1, desc: '' },
};

/* รูปแบบความสามารถตามเวฟ (วนทุก 10 เวฟ) */
export const WAVE_PATTERN = ['normal', 'fast', 'normal', 'armored', 'split', 'regen', 'flying', 'undead', 'fast', 'boss'];

/* ---------------- แผนที่ ----------------
 * '.' ลานหินที่เดินได้ + สร้างป้อมได้ (ใช้สร้างเขาวงกต)
 * '#' เนินหญ้า สร้างป้อมได้ แต่มอนสเตอร์เดินไม่ได้
 * '=' ทางเดินหิน (สร้างไม่ได้)
 * 'R' โขดหิน  'W' กำแพงปรักหักพัง (ขวางทาง)
 * 'S' จุดเกิด  'C' แกนกลาง  '1'..'3' จุดตรวจที่มอนสเตอร์ต้องผ่านตามลำดับ
 */
function laneLayout(points) {
  const g = [];
  for (let r = 0; r < ROWS; r++) g.push(new Array(COLS).fill('#'));
  const inside = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
  let first = null, last = null;
  for (let i = 0; i < points.length - 1; i++) {
    let [c, r] = points[i];
    const [c2, r2] = points[i + 1];
    const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
    for (;;) {
      if (inside(c, r)) {
        g[r][c] = '=';
        if (!first) first = [c, r];
        last = [c, r];
      }
      if (c === c2 && r === r2) break;
      c += dc; r += dr;
    }
  }
  g[first[1]][first[0]] = 'S';
  g[last[1]][last[0]] = 'C';
  return g.map((row) => row.join(''));
}

export const MAPS = [
  {
    id: 'meadow',
    name: 'ลานวงกตแห่งทุ่งหญ้า',
    desc: 'สนามเปิดแบบ Element TD — วางป้อมสร้างเขาวงกตเอง',
    theme: 'meadow',
    layout: [
      '####################',
      '#.......R..........#',
      'S.................1#',
      '#..................#',
      '#........RR........#',
      '#..................#',
      '#..................#',
      '#........RR........#',
      '#..................#',
      '#2.................C',
      '#...........R......#',
      '####################',
    ],
  },
  {
    id: 'ruins',
    name: 'ซากปราการโบราณ',
    desc: 'เขาวงกตกลางซากกำแพง มีจุดตรวจ 2 จุด',
    theme: 'ruins',
    layout: [
      '########W###########',
      '#.......W.....W....#',
      'S.......W.....W....#',
      '#.......W.....W....#',
      '#.............W....#',
      '#WWW....1.....W.2..#',
      '#......WWWW........#',
      '#.......W..........#',
      '#.......W....WWWW..#',
      '#..W....W..........#',
      '#..W.........W.....C',
      '###W#########W######',
    ],
  },
  {
    id: 'canyon',
    name: 'หุบเขาคดเคี้ยว',
    desc: 'ทางเดินตายตัว วางป้อมบนเนินสองข้างทาง',
    theme: 'canyon',
    layout: laneLayout([[0, 6], [2, 6], [2, 1], [6, 1], [6, 10], [10, 10], [10, 1], [14, 1], [14, 10], [17, 10], [17, 4], [19, 4]]),
  },
  {
    id: 'spiral',
    name: 'วังวนแห่งห้วงมืด',
    desc: 'ทางวนสั้นยามค่ำคืน — ยาก',
    theme: 'night',
    layout: laneLayout([[0, 1], [18, 1], [18, 10], [1, 10], [1, 4], [15, 4], [15, 7], [6, 7]]),
  },
];

export const DIFFICULTIES = {
  easy:   { th: 'ง่าย', hp: 0.75, gold: 280, lives: 30 },
  normal: { th: 'ปกติ', hp: 1.0, gold: 220, lives: 20 },
  hard:   { th: 'ยาก', hp: 1.4, gold: 190, lives: 10 },
};

export const TOTAL_WAVES = 30;
export const ELEMENT_POINT_EVERY = 5;
export const START_ELEMENT_POINTS = 1;
export const SELL_RATIO = 0.75;
export const INTEREST_RATE = 0.03;
