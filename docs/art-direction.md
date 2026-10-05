# Sculpted Realms — ดีไซน์ชุดใหม่

ทิศทางงานภาพเป็นแฟนตาซีศิลารูนที่เน้นโครงสร้าง วัสดุ และกายวิภาค โมเดลต้องอ่านได้จากมุมเล่นเกม และมีรายละเอียดให้เห็นเมื่อซูมใกล้ สีธาตุยังเป็นตัวช่วยแยกประเภทระหว่างต่อสู้

## สิ่งที่ออกแบบใหม่

| กลุ่ม | ดีไซน์ใหม่ |
|---|---|
| Tower | เปลี่ยนหัวป้อมครบ 31 แบบ รวมป้อมพื้นฐาน 6 และป้อมธาตุ 25: ฐานเครื่องยิง หอดาราศาสตร์ กรงลูกตา ปริซึม อ่างน้ำ เตาหลอม กังหัน โกเลม เสาศิลา สุสาน ศาลา กลอง และเหมือง รายละเอียดประกอบด้วยขอบมน ช่องปืนกลวง สายหน้าไม้ เฟือง แถบโลหะ รอยผิว และชิ้นส่วนเคลื่อนไหว |
| Monster | ปั้นลำตัวและใบหน้าใหม่ เพิ่มมวลกล้ามเนื้อ หัวไหล่/สะโพก เบ้าตา รูม่านตา ปาก ฟัน และเขา ขนเป็นเส้นโค้ง เกล็ดเป็นแผ่นมีขอบหนา กระดองแบ่งแผ่น และปีกขนนกซ้อนสามชั้นพร้อมก้านขน |
| Map | พุ่มไม้และต้นสนใหม่ ลำต้นมีรากและกิ่ง เฟิร์น หินผุ เนินด้านหลัง ซุ้มศิลา ประตูพอร์ทัลหลายชิ้น ภูเขาไฟมีสันผิว หินงอก/ออบซิเดียนมีร่อง และลาวามีเปลือกดำกับรอยแยกเคลื่อนไหว ใช้สีตามแต่ละธีม |
| Skill effect | ลาวา/โคลน/คำสาป/วังวนใช้ noise หลายชั้นและการไหล เกลียวลำแสงล้อมแกนกลาง พายุเป็นริบบอนหมุนสามชั้น อุกกาบาตมีผิวหินแตกและรอยเรืองแสง พร้อมวงเตือนก่อนตก/ปะทุ |
| Lighting | เพิ่มแสงสะท้อนจาก environment สำหรับโลหะและผลึก พร้อมผิวละเอียดที่แยกหิน ไม้ และโลหะ |

## ป้อมและระดับ

ป้อมทั้ง 31 แบบใช้แนวอาคารแฟนตาซีจากภาพอ้างอิง: ฐาน ตัวอาคาร ทางขึ้น ช่องประตู/ยิง ระเบียง และหลังคา แทนกลไกวางบนแท่น สูตรอาคารใน `towerArchitecture.js` แยกผัง ความสูง วัสดุ หลังคา และส่วนเสริมของแต่ละชนิด กลไกยิงเฉพาะตัวอยู่บนอาคาร รายละเอียดประกอบด้วยก้อนหินวางคลาดกันเล็กน้อย ไม้คด เชือกพัน กระเบื้อง/แผ่นหลังคาซ้อน โครงค้ำ รากไม้ ปล่องเตา และแสงโคม

ระดับ 1 เป็นอาคารเริ่มต้น ระดับ 2 เพิ่มความสูง ผนัง/โครงค้ำและโคม ระดับ 3 เพิ่มชายผ้าสำหรับหอไม้ หรือหอเสริมสำหรับอาคารหิน และยอดประดับ หลังคาทรงเจดีย์เพิ่มชั้นตามระดับ สิ่งปลูกสร้างยังคงจำได้ว่าเป็นชนิดเดิม ป้อมธนูเป็นหอไม้ ปืนใหญ่เป็นป้อมหินหลังคาแดง แสงเป็นประภาคาร มืดเป็นหอรากไม้ คราสเป็นประตูสองเสา น้ำแข็งเป็นหอผลึก และดิน+แสงเป็นวิหารขั้นบันได

ตรวจ geometry, indices และ animation ครบ 93 ชุด ฉากยิงกับโมเดลอาคารใหม่ครบ 27 ป้อมโจมตี และสลับดูสามระดับของทั้ง 31 แบบในเบราว์เซอร์ไม่พบ error โหมด “เทียบระดับป้อม” แสดงระดับ 1 → 2 → 3 พร้อมกัน เพื่อดูวิวัฒนาการแบบภาพอ้างอิง ยังไม่ได้วัด FPS ของสนามที่มีป้อมจำนวนมาก

## มอนสเตอร์

- Fenrir: อกและไหล่กว้าง ขนซ้อน และสันผลึกบนหลัง
- Unicorn: คอเรียว แผงคอเป็นเส้น และเขาเกลียว
- Turtle: กระดองโค้ง แผ่นหกเหลี่ยม ตราทอง และสันผลึก
- Hydra: หัวใหม่ทั้งสาม เกล็ดตามลำตัว/คอ และกรามขยับได้
- Kitsune: ใบหน้าคม หูยาว ขนแก้ม และลำตัวเบา; ร่างลูกมีขนาดต่างกัน
- Phoenix / Griffin: ขนคลุมลำตัวและปีกสามชั้น ก้านขน คิ้ว และจะงอยปาก
- Dragon: กล้ามเนื้อ เกล็ดซ้อน เส้นปีก เขา กรามและฟันใหม่

โครงกระดูกและวงจรแอนิเมชันเดิมใช้เป็นโครงสำหรับผิวใหม่ เพื่อรักษาการเดิน การบิน และการตอบสนองของเกม ค่าสมดุลและเส้นทางเดิมยังใช้ได้

## ประสิทธิภาพ

โมเดลรวมตามวัสดุและกระดูก ใช้ indexed geometry เพื่อลดจุดยอดซ้ำ และแคชแม่แบบตามชนิด/ระดับ ของตกแต่งจำนวนมากใช้ instancing พื้นผิวและเรขาคณิตเอฟเฟกต์ใช้แคช แอนิเมชันอ้างอิงเวลาและคืนวัสดุเอฟเฟกต์ชั่วคราวเมื่อหมดอายุ

ยังไม่ได้วัด FPS บนอุปกรณ์มือถือจริงหรือเล่นครบทุกเวฟ

## ตรวจงานและพรีวิว

ตรวจ build, geometry, indices, transform และแอนิเมชันของป้อม 93 ชุด (31 × 3 ระดับ) และมอนสเตอร์ 60 ชุด (10 รูปแบบ × 6 ธาตุ) พร้อม lifecycle ลำแสง แอ่ง พายุ และอุกกาบาต

ตรวจการเรนเดอร์ในเบราว์เซอร์สำหรับป้อมทั้งสามระดับ มอนสเตอร์ shader พื้นที่ และแผนที่ทั้งแปด

พรีวิว: `http://127.0.0.1:5173/tools/art-preview.html`

เลือกโมเดลทีละชิ้นเพื่อดูรายละเอียดใกล้ หรือเลือก “ทั้งหมด” เพื่อเปรียบเทียบ เปลี่ยนระดับป้อมได้ และเปิดดูแผนที่ทั้งแปดได้โดยไม่ต้องเริ่มเกม

## Tower attack effects

`src/towerAttackArt.js` defines the shape, palette, trail, muzzle flash and impact by tower identity. Metal shells scatter armor fragments; rocks have stun stars; water scatters spray; fire and soul fire have flame tails; wind fires curved blades; curses converge inward; shackles surround the target with chains; frost launches crystals. Sun beams use focusing collars, eclipse beams have a dark core, solar beams carry a hot helix, prism chains use paired strands, and piercing frost has crystals along its axis.

The art preview's tower attack mode shows all 27 attacking towers with targets. It shares projectile rendering and VFX with the game. Support towers do not fire and are excluded. Preview timing is for visual inspection and does not simulate damage or actual cooldowns.

Smoke checked all 27 stages, including trajectories, impacts, beams, zones, movers, delayed attacks and cleanup. Browser selection of all 27 types showed no console errors. Production build passes. Mass simultaneous-fire FPS has not been measured.

## Battle fantasy direction

Dota 2 is the user's mood reference: substantial silhouettes, subdued stone and flesh, worn metal, leather equipment and concentrated elemental energy. Assets remain original procedural models. `battleFantasy.js` holds the shared lighting/exposure policy and species skin palette. Creature shoulders receive armor and trim, some species have leather harnesses, hydra has dorsal armor and kitsune a metal collar. Tower stone, marble, bone, roofing and metals now use subdued albedo, reinforced iron corners and faction insignia. Spell ribbons and glow are reduced and zone shaders gain radial sigils.

Validated 60 creature variants, 27 attack stages, production build and browser previews of creatures, towers and zone shaders. This is a visual direction update within the existing procedural rendering system, not a claim of matching Dota 2's asset fidelity. Mass combat performance has not been profiled.

## Current visual constraint

Per the user's request, omit stair geometry and eye details from all towers, creatures and attack effects. The dark tower uses a faceted crystal core instead of an eyeball. Golem eye lights, skull eye sockets, creature sockets/pupils/brows and soul-projectile eyes are removed. Keep this constraint in future art changes. Production build passed after removal.
