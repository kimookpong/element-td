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
    name: 'Fire', th: 'ไฟ', icon: 'el_fire', color: '#ff5a2a', glow: '#ffb347',
    rate: 1.0, range: 100, dpsF: 0.85,
    desc: 'ระเบิดวงกว้าง เผาไหม้ต่อเนื่อง', en: { desc: 'Wide explosions with lasting burn' },
  },
  water: {
    name: 'Water', th: 'น้ำ', icon: 'el_water', color: '#2f8fff', glow: '#8fd3ff',
    rate: 1.2, range: 105, dpsF: 0.95,
    desc: 'กระจายเป็นวง ทำให้เปียกชุ่มและช้าลง', en: { desc: 'Splashes in a ring, soaking and slowing' },
  },
  earth: {
    name: 'Earth', th: 'ดิน', icon: 'el_earth', color: '#c08a42', glow: '#e9c27a',
    rate: 0.55, range: 92, dpsF: 1.25,
    desc: 'ดาเมจหนัก มีโอกาสทำให้มึนงง', en: { desc: 'Heavy damage with a chance to stun' },
  },
  wind: {
    name: 'Wind', th: 'ลม', icon: 'el_wind', color: '#3fe0a8', glow: '#b6ffe3',
    rate: 2.4, range: 115, dpsF: 0.5,
    desc: 'ยิงรัวหลายเป้า สะสมพลังปล่อยลมผลักถอย', en: { desc: 'Rapid multi-target fire, builds up knock-back gusts' },
  },
  light: {
    name: 'Light', th: 'แสง', icon: 'el_light', color: '#ffe14a', glow: '#fffbd0',
    rate: 0.8, range: 150, dpsF: 0.8,
    desc: 'ลำแสงชาร์จยิงได้ทั่วแผนที่ ดาเมจต่อนัดสูง', en: { desc: 'Charged map-wide beam with huge single hits' },
  },
  dark: {
    name: 'Dark', th: 'มืด', icon: 'el_dark', color: '#a24dff', glow: '#d6b3ff',
    rate: 0.9, range: 105, dpsF: 0.9,
    desc: 'กัดกร่อนชีวิตตาม % HP ปัจจุบัน', en: { desc: 'Corrodes a % of current HP' },
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

/* ป้อมพื้นฐาน (ไม่มีธาตุ) */
export const BASIC = {
  arrow: {
    th: 'ป้อมธนู', name: 'Arrow', icon: 't_arrow', color: '#d9b26a',
    cost: [50, 60, 150], dps: [15, 33, 75], rate: 1.4, range: 120,
    desc: 'ยิงเร็ว เป้าเดียว ราคาถูก', en: { th: 'Arrow Tower', desc: 'Fast, single target, cheap' },
  },
  cannon: {
    th: 'ป้อมปืนใหญ่', name: 'Cannon', icon: 't_cannon', color: '#8a8f99',
    cost: [70, 80, 200], dps: [14, 30, 70], rate: 0.6, range: 100, splash: [40, 46, 52],
    desc: 'ระเบิดวงกว้าง ยิงช้า', en: { th: 'Cannon Tower', desc: 'Wide splash, slow fire' },
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

/* ป้อมธาตุทั้งหมดอยู่ใน towers.js */

export const comboKey = (els) => els.slice().sort().join('+');

/* ความสามารถของมอนสเตอร์ */
export const ABILITIES = {
  normal:  { th: 'ปกติ', creature: 'หมาป่าคริสตัล', icon: 'c_wolf', model: 'wolf', hp: 1, speed: 46, size: 12, reward: 1, lives: 1, desc: 'มอนสเตอร์ธรรมดา' , en: { th: 'Normal', creature: 'Crystal Wolf', desc: 'An ordinary monster' } },
  fast:    { th: 'ว่องไว', creature: 'ยูนิคอร์น', icon: 'c_unicorn', model: 'unicorn', hp: 0.6, speed: 80, size: 10, reward: 0.9, lives: 1, desc: 'เคลื่อนที่เร็วมาก' , en: { th: 'Fast', creature: 'Unicorn', desc: 'Moves very fast' } },
  armored: { th: 'เกราะหิน', creature: 'เต่ามังกร', icon: 'c_turtle', model: 'turtle', hp: 1.3, speed: 34, size: 14, reward: 1.3, lives: 1, desc: 'ไม่ติดสถานะชะลอ/มึนงง/ผลัก และลดดาเมจ 20%' , en: { th: 'Stone armor', creature: 'Dragon Turtle', desc: 'Immune to slow/stun/knock-back and takes 20% less damage' } },
  regen:   { th: 'ฟื้นฟู', creature: 'ไฮดรา', icon: 'c_hydra', model: 'hydra', hp: 1.0, speed: 44, size: 12, reward: 1.1, lives: 1, desc: 'ฟื้นพลังชีวิต 2.5% ต่อวินาที' , en: { th: 'Regenerate', creature: 'Hydra', desc: 'Regenerates 2.5% HP per second' } },
  split:   { th: 'แยกร่าง', creature: 'คิทสึเนะ', icon: 'c_kitsune', model: 'kitsune', hp: 0.75, speed: 42, size: 12, reward: 0.6, lives: 1, desc: 'ตายแล้วแยกร่างเป็นจิ้งจอก 2 ตัว' , en: { th: 'Split', creature: 'Kitsune', desc: 'Splits into 2 foxes on death' } },
  undead:  { th: 'อมตะ', creature: 'ฟีนิกซ์', icon: 'c_phoenix', model: 'phoenix', hp: 0.8, speed: 44, size: 12, reward: 1.2, lives: 1, desc: 'ฟื้นคืนชีพจากเถ้าถ่านครั้งเดียวด้วย HP 50%' , en: { th: 'Undying', creature: 'Phoenix', desc: 'Rises from its ashes once with 50% HP' } },
  flying:  { th: 'บินได้', creature: 'กริฟฟิน', icon: 'c_griffin', model: 'griffin', hp: 0.6, speed: 42, size: 12, reward: 1, lives: 1, desc: 'บินข้ามเขาวงกตเป็นเส้นตรง' , en: { th: 'Flying', creature: 'Griffin', desc: 'Flies straight over mazes' } },
  boss:    { th: 'บอสมังกร', creature: 'มังกรโบราณ', icon: 'c_dragon', model: 'dragon', hp: 12, speed: 26, size: 24, reward: 20, lives: 1, desc: 'พลังชีวิตมหาศาล ต้านสถานะ' , en: { th: 'Dragon boss', creature: 'Ancient Dragon', desc: 'Massive HP, resists status effects' } },
  elemental: { th: 'ภูตธาตุ', creature: 'ภูตพิทักษ์ธาตุ', icon: 'c_dragon', model: 'dragon', hp: 1, speed: 36, size: 18, reward: 0, lives: 1, desc: 'เรียกด้วยผลึกธาตุ — กำจัดให้ได้เพื่อปลดล็อก/อัปเลเวลธาตุนั้น' , en: { th: 'Guardian', creature: 'Elemental Guardian', desc: 'Summoned with essence — defeat it to unlock / level up its element' } },
  child:   { th: 'ร่างแยก', creature: 'จิ้งจอกร่างแยก', icon: 'c_kitsune', model: 'kitsune', hp: 0.35, speed: 52, size: 8, reward: 0.25, lives: 1, desc: '' , en: { th: 'Split spawn', creature: 'Fox Spawn', desc: '' } },
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
// วางหินกีดขวาง ('R') บนช่องที่สร้างได้
function withRocks(layout, spots) {
  const g = layout.map((row) => row.split(''));
  for (const [c, r] of spots) if (g[r] && g[r][c] === '#') g[r][c] = 'R';
  return g.map((row) => row.join(''));
}

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
    name: 'ลานวงกตแห่งทุ่งหญ้า', en: { name: 'Meadow Maze', desc: 'Open field in classic Element TD style — build your own maze' },
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
    name: 'ซากปราการโบราณ', en: { name: 'Ancient Ruins', desc: 'A desert maze among ruined walls, pyramids and a sphinx — 2 checkpoints' },
    desc: 'เขาวงกตกลางซากกำแพงในทะเลทราย มีพีระมิดและสฟิงซ์ — จุดตรวจ 2 จุด',
    theme: 'desert',
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
    name: 'หุบเขาคดเคี้ยว', en: { name: 'Winding Canyon', desc: 'Fixed path — build on the ridges along the road' },
    desc: 'ทางเดินตายตัว วางป้อมบนเนินสองข้างทาง',
    theme: 'canyon',
    layout: laneLayout([[0, 6], [2, 6], [2, 1], [6, 1], [6, 10], [10, 10], [10, 1], [14, 1], [14, 10], [17, 10], [17, 4], [19, 4]]),
  },
  {
    id: 'spiral',
    name: 'วังวนแห่งห้วงมืด', en: { name: 'Abyss Spiral', desc: 'A short spiral path at night — hard' },
    desc: 'ทางวนสั้นยามค่ำคืน — ยาก',
    theme: 'night',
    layout: laneLayout([[0, 1], [18, 1], [18, 10], [1, 10], [1, 4], [15, 4], [15, 7], [6, 7]]),
  },
  {
    id: 'volcano', element: 'fire',
    name: 'ภูเขาไฟลาวา', en: { name: 'Lava Volcano', desc: 'Fire map — maze around rivers of lava at the foot of an erupting volcano' },
    desc: 'แผนที่ธาตุไฟ — สร้างเขาวงกตหลบธารลาวาเชิงภูเขาไฟ',
    theme: 'volcano',
    layout: [
      '####################',
      '#.....XX...........#',
      'S.....XX.....1.....#',
      '#.....XX...........#',
      '#..........XXX.....#',
      '#..........XXX.....#',
      '#...XX.............#',
      '#...XX......2......#',
      '#.........XX.......#',
      '#.........XX.......C',
      '#..................#',
      '####################',
    ],
  },
  {
    id: 'river', element: 'water',
    name: 'แม่น้ำไหลวน', en: { name: 'Swirling River', desc: 'Water map — monsters wade along a long serpentine river' },
    desc: 'แผนที่ธาตุน้ำ — มอนสเตอร์ลุยตามสายน้ำที่คดเคี้ยวไปมา',
    theme: 'river',
    layout: laneLayout([[0, 1], [17, 1], [17, 4], [2, 4], [2, 7], [17, 7], [17, 10], [19, 10]]),
  },
  {
    id: 'clouds', element: 'wind',
    name: 'ก้อนเมฆ', en: { name: 'Sky Clouds', desc: 'Wind map — a maze on a floating cloud island full of holes to the sky' },
    desc: 'แผนที่ธาตุลม — เขาวงกตบนเกาะเมฆลอยฟ้าที่มีช่องโหว่มองเห็นท้องฟ้า',
    theme: 'sky',
    layout: [
      '####################',
      '#....XX......XX....#',
      'S....XX......XX....#',
      '#..........1.......#',
      '#..XX..........XX..#',
      '#..XX....XX....XX..#',
      '#........XX........#',
      '#..XX..........XX..#',
      '#..XX...2......XX..#',
      '#....XX......XX....C',
      '#....XX......XX....#',
      '####################',
    ],
  },
  {
    id: 'underground', element: 'earth',
    name: 'ใต้ดิน', en: { name: 'Underground', desc: 'Earth map — winding tunnels through a crystal cavern' },
    desc: 'แผนที่ธาตุดิน — อุโมงค์คดเคี้ยวในถ้ำคริสตัลใต้พิภพ',
    theme: 'cave',
    layout: withRocks(laneLayout([[0, 10], [3, 10], [3, 6], [1, 6], [1, 1], [7, 1], [7, 8], [10, 8], [10, 3], [13, 3], [13, 10], [16, 10], [16, 1], [19, 1]]),
      [[5, 4], [5, 9], [12, 6], [18, 6], [8, 11], [15, 5]]),
  },
];

export const DIFFICULTIES = {
  easy:   { en: { th: 'Easy' }, th: 'ง่าย', hp: 0.75, gold: 280, lives: 30 },
  normal: { en: { th: 'Normal' }, th: 'ปกติ', hp: 1.0, gold: 220, lives: 20 },
  hard:   { en: { th: 'Hard' }, th: 'ยาก', hp: 1.4, gold: 190, lives: 10 },
};

export const TOTAL_WAVES = 100;
// มอนสเตอร์ทุกตัวที่หลุดถึงแกนกลาง (รวมบอส/ภูตธาตุ) เสีย 1 ชีวิตเสมอ
export const LEAK_LIVES = 1;
// แผนที่ประจำธาตุ: มอนสเตอร์เป็นธาตุนั้นบ่อย + ป้อมที่มีธาตุนั้นได้ "พลังถิ่น"
export const MAP_AFFINITY_CHANCE = 0.5;
export const MAP_AFFINITY_BONUS = 1.15;
export const ELEMENT_POINT_EVERY = 5;
export const START_ELEMENT_POINTS = 1;
export const SELL_RATIO = 0.75;
export const INTEREST_RATE = 0.03;

/* เวลา (วินาที) */
export const FIRST_WAVE_DELAY = 30;   // ช่วงเตรียมตัวก่อนเวฟแรก
export const CLEAR_GAP = 10;          // เวฟถัดไปจะนับถอยหลังเมื่อเคลียร์สนามหมดแล้วเท่านั้น
export const ELEMENTAL_HP = [5, 10, 16]; // HP ภูตธาตุ (×HP มอนสเตอร์เวฟถัดไป) ตามเลเวลที่จะปลดล็อก
export const BUILD_TIME = { basic: 2.5, element: 3.5 };
export const upgradeTime = (type, tier, n) => (type === 'tier' ? 2 + tier * 1.5 : 4 + n * 2);
