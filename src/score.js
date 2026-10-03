/* ============================================================
 *  คะแนนและการตรวจผลเกม (ใช้ร่วมกันทั้งในเกมและบน Cloudflare Worker)
 *  คะแนน = (เวฟที่เคลียร์ × 1000 + ชีวิตที่เหลือ × 100 + จำนวนที่ฆ่า) × ตัวคูณความยาก
 * ============================================================ */
export const DIFF_MULT = { easy: 0.75, normal: 1, hard: 1.5 };
export const DIFF_LIVES = { easy: 30, normal: 20, hard: 10 };
export const MAP_IDS = ['meadow', 'ruins', 'canyon', 'spiral', 'volcano', 'river', 'clouds', 'underground'];

export function computeScore({ cleared, lives, kills, diff }) {
  const m = DIFF_MULT[diff] || 1;
  return Math.round((cleared * 1000 + Math.max(0, lives) * 100 + kills) * m);
}

// จำนวนมอนสเตอร์ในเวฟ n (ตรงกับ makeWave ใน sim.js)
const waveCount = (n) => 10 + Math.floor(n * 0.35);

/* ตรวจว่าผลเกมเป็นไปได้จริง (กันการส่งตัวเลขปลอมแบบง่าย ๆ)
 * elapsed = วินาทีจริงตั้งแต่เริ่มรอบเล่นจนส่งผล */
export function checkResult(r, elapsed) {
  const int = (v) => Number.isInteger(v) && v >= 0;
  if (!int(r.cleared) || !int(r.lives) || !int(r.kills)) return 'bad_numbers';
  if (!DIFF_MULT[r.diff] || !MAP_IDS.includes(r.map)) return 'bad_map';
  if (r.cleared > 1000) return 'too_many_waves';
  // ชีวิตเพิ่มได้จากบอส (ทุก 10 เวฟ) และศาลหัวใจ (สูงสุดทุก 3 เวฟ)
  if (r.lives > DIFF_LIVES[r.diff] + Math.ceil(r.cleared / 3) + Math.ceil(r.cleared / 10)) return 'too_many_lives';
  // ฆ่าได้ไม่เกินจำนวนมอนสเตอร์ทั้งหมด (คิทสึเนะแยกร่างได้ + ภูตธาตุ)
  let max = 0;
  for (let n = 1; n <= r.cleared + 1; n++) max += waveCount(n) * 3 + 2;
  if (r.kills > max) return 'too_many_kills';
  // แม้เร่ง 3 เท่า แต่ละเวฟก็ใช้เวลาจริงอย่างน้อยราว 3 วินาที
  if (r.cleared > 0 && elapsed < r.cleared * 3) return 'too_fast';
  return null;
}
