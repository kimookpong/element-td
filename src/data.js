/* ============================================================
 *  Element TD — ข้อมูลเกม (ธาตุ, การหลอมรวม, ศัตรู, แผนที่)
 * ============================================================ */

export const TILE = 40;
export const COLS = 20;
export const ROWS = 12;
export const WIDTH = COLS * TILE;
export const HEIGHT = ROWS * TILE;

export const ELEMENT_ORDER = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];

/*
 * ป้อมธาตุพื้นฐาน — แต่ละธาตุมีความสามารถเฉพาะตัว
 *  rate  = จำนวนนัดต่อวินาที
 *  range = ระยะยิง (px)
 */
export const ELEMENTS = {
  fire: {
    name: 'Fire', th: 'ไฟ', icon: '🔥', color: '#ff5a36', glow: '#ffb347',
    cost: 60, dmg: 13, range: 95, rate: 1.0,
    desc: 'ระเบิดวงกว้าง + เผาไหม้ต่อเนื่อง',
    splash: 48, burn: { dps: 6, dur: 2.5 },
  },
  water: {
    name: 'Water', th: 'น้ำ', icon: '💧', color: '#2f8fff', glow: '#8fd3ff',
    cost: 50, dmg: 8, range: 100, rate: 1.25,
    desc: 'ทำให้ศัตรูเคลื่อนที่ช้าลง',
    slow: { factor: 0.55, dur: 1.8 },
  },
  earth: {
    name: 'Earth', th: 'ดิน', icon: '🪨', color: '#b07a3c', glow: '#e0b872',
    cost: 70, dmg: 40, range: 85, rate: 0.55,
    desc: 'ดาเมจหนัก มีโอกาสทำให้มึนงง',
    stun: { chance: 0.22, dur: 0.8 },
  },
  wind: {
    name: 'Wind', th: 'ลม', icon: '🌪️', color: '#3fd9a4', glow: '#b6ffe3',
    cost: 55, dmg: 6, range: 115, rate: 3.0,
    desc: 'ยิงรัวหลายเป้า มีโอกาสผลักถอยหลัง',
    multi: 2, knock: { chance: 0.12, dist: 22 },
  },
  light: {
    name: 'Light', th: 'แสง', icon: '✨', color: '#ffe35a', glow: '#fffbd0',
    cost: 80, dmg: 22, range: 150, rate: 0.8,
    desc: 'ลำแสงระยะไกล ทะลุศัตรูทุกตัวในแนว',
    pierce: true,
  },
  dark: {
    name: 'Dark', th: 'มืด', icon: '🌑', color: '#9b4dff', glow: '#d6b3ff',
    cost: 75, dmg: 10, range: 100, rate: 0.9,
    desc: 'สาปให้รับดาเมจเพิ่ม + ดูดพลังชีวิตตาม % HP',
    curse: { amp: 1.3, dur: 3 }, percent: 0.03,
  },
};

/*
 * วงจรธาตุ:  ไฟ → ลม → ดิน → น้ำ → ไฟ   และ   แสง ⇄ มืด
 * ธาตุทางซ้ายชนะธาตุทางขวา
 */
export const BEATS = {
  fire: 'wind',
  wind: 'earth',
  earth: 'water',
  water: 'fire',
  light: 'dark',
  dark: 'light',
};

export const MULT_STRONG = 1.75;
export const MULT_WEAK = 0.65;
export const MULT_SAME = 0.5;

export function elementMultiplier(atk, def) {
  if (!def) return 1;
  if (atk === def) return MULT_SAME;
  if (BEATS[atk] === def) return MULT_STRONG;
  if (BEATS[def] === atk) return MULT_WEAK;
  return 1;
}

/* ป้อมหลอมรวม — รวมป้อมเลเวล 3 สองธาตุเข้าด้วยกัน */
export const FUSIONS = {
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

export const FUSION_COST = 150;
export const MAX_LEVEL = 3;

export function fusionKey(a, b) {
  return [a, b].sort().join('+');
}

/* ชนิดศัตรู */
export const ENEMY_TYPES = {
  grunt:  { th: 'ทหาร',     hp: 1.0,  speed: 48, size: 11, reward: 1.0, lives: 1 },
  runner: { th: 'นักวิ่ง',   hp: 0.55, speed: 88, size: 9,  reward: 0.8, lives: 1 },
  tank:   { th: 'ยักษ์',     hp: 3.2,  speed: 30, size: 15, reward: 2.2, lives: 2 },
  swarm:  { th: 'ฝูง',       hp: 0.32, speed: 62, size: 7,  reward: 0.4, lives: 1 },
  boss:   { th: 'บอสธาตุ',   hp: 22,   speed: 24, size: 22, reward: 18,  lives: 10 },
};

/* แผนที่ — waypoint เป็นพิกัดช่อง (col,row) เส้นทางต้องเป็นแนวตรงแกน x/y */
export const MAPS = [
  {
    id: 'meadow',
    name: 'ทุ่งหญ้าเริ่มต้น',
    desc: 'เส้นทางยาว เหมาะกับมือใหม่',
    grass: ['#3d7a3a', '#428040'],
    path: '#c9a86a',
    points: [[-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [17, 9], [17, 5], [20, 5]],
  },
  {
    id: 'canyon',
    name: 'หุบเขาคดเคี้ยว',
    desc: 'ทางวกวนหลายโค้ง วางป้อมตรงมุมให้ดี',
    grass: ['#7a5a3a', '#80603f'],
    path: '#d9c29a',
    points: [[-1, 6], [2, 6], [2, 1], [6, 1], [6, 10], [10, 10], [10, 1], [14, 1], [14, 10], [17, 10], [17, 4], [20, 4]],
  },
  {
    id: 'spiral',
    name: 'วังวนแห่งห้วงมืด',
    desc: 'ทางสั้นวนเข้าหาแกนกลาง — ยาก',
    grass: ['#2c2f4a', '#30344f'],
    path: '#6a6f94',
    points: [[-1, 1], [18, 1], [18, 10], [1, 10], [1, 4], [15, 4], [15, 7], [6, 7]],
  },
];

export const DIFFICULTIES = {
  easy:   { th: 'ง่าย',   hp: 0.75, gold: 260, lives: 30 },
  normal: { th: 'ปกติ',   hp: 1.0,  gold: 200, lives: 20 },
  hard:   { th: 'ยาก',    hp: 1.5,  gold: 170, lives: 10 },
};

export const TOTAL_WAVES = 30;
