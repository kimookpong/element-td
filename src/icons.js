/* ============================================================
 *  ไอคอน PNG (สร้างโดย tools/icons.html → public/icons)
 * ============================================================ */
const BASE = `${import.meta.env.BASE_URL}icons/`;

export const iconUrl = (name) => `${BASE}${name}.png`;

// แท็ก <img> สำหรับใช้ใน innerHTML
export const ico = (name, cls = '') => `<img class="ico${cls ? ' ' + cls : ''}" src="${iconUrl(name)}" alt="" draggable="false">`;

// แทนที่ :ชื่อไอคอน: ในข้อความด้วยรูป
export const withIcons = (text) => String(text).replace(/:([a-z0-9_]+):/g, (_, n) => ico(n));
