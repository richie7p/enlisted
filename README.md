# ENLISTED

**繁體中文** | [English](README.en.md)

**[線上展示 / Live Demo](https://birch-civic-bolt-wood.grok.me/)**

**從小兵開始** — 俯視戰術射擊 × 軍旅生涯模擬

從二兵入伍，一路打到少校。階級不是數字，它改的是你能帶幾個人、能用什麼槍、能不能呼叫火力。

![ENLISTED](docs/cover.jpg)

[![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)](#tech-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](#tech-stack)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](#tech-stack)
[![Tailwind](https://img.shields.io/badge/Tailwind_v4-38BDF8?logo=tailwindcss&logoColor=white)](#tech-stack)

| 選單 | 基地 |
| --- | --- |
| ![選單](docs/menu.png) | ![基地](docs/base.png) |

| 戰鬥 | 結算 |
| --- | --- |
| ![戰鬥](docs/combat.png) | ![結算](docs/debrief.png) |

---

## 玩什麼

完整閉環：

**開始服役 → 取名／選難度 → 基地 → 接任務 → 部署 → 移動／瞄準／射擊 → 完成目標 → 結算（XP／功績／紀律）→ 可能晉升 → 存檔**

- 九階軍銜，從服從班長到營級指揮
- 俯視 Canvas 戰術射擊，掩體、小隊 AI、手榴彈、火力支援
- 巡邏、攻堅、救援、防禦、靶場
- 存檔在瀏覽器 `localStorage`，重整後可繼續

## 軍階

| 階級 | 代號 | 解鎖 |
| --- | --- | --- |
| 二兵 | PVT | M4／M9／M870，跟隨班長 |
| 一兵 | PFC | MP5、手榴彈、靶場 |
| 上等兵 | SPC | M249、專長 |
| 下士 | CPL | 指揮 2 人、M110 |
| 中士 | SGT | 4 人小隊、無人機、M24 |
| 少尉 | 2LT | 排級火力、AT4、指揮中心 |
| 中尉 | 1LT | 5 人小隊、M320、三輪彈著 |
| 上尉 | CPT | SCAR-H、連級火力 |
| 少校 | MAJ | 6 人小隊、標槍、營級火力 |

晉升看 **XP、功績、紀律、完成任務數**，缺一不可。

## 操作

**鍵鼠**

| 鍵 | 動作 |
| --- | --- |
| WASD / 方向鍵 | 移動 |
| 滑鼠 | 瞄準；左鍵射擊 |
| R | 換彈 |
| C | 蹲下 |
| G | 手榴彈（一兵以上） |
| 1–5 | 小隊命令（下士以上） |
| 右鍵 | 標記移動點 |
| Q | 無人機（中士以上） |
| F | 火力支援（少尉以上） |
| Esc | 暫停 |

**觸控**：左搖桿移動、右搖桿瞄準／射擊。

## 地圖與任務

地圖：七號公路、第九區、河谷村、靶場。

任務隨階級開放，例如公路巡邏（二兵）、街區攻堅、河谷救援、堅守陣地、夜間掃蕩、翼側搜索、連級防禦、營長決心。

---

## 本機執行

需要 **Node.js 22+**。

```bash
npm install
npm run dev
```

瀏覽器開開發伺服器位址即可玩。

```bash
npm run build        # 正式打包
npm run typecheck    # TypeScript
```

進度存在本機瀏覽器，鍵名 `enlisted.career.v1`。設定裡可重置存檔。

## Tech stack

- React 19 + TypeScript
- Vite + TanStack Start / Router
- Tailwind CSS v4
- Zustand（生涯狀態）
- Canvas 2D（戰鬥模擬與繪製）
- Web Audio API（合成槍火／UI 音，無外部音檔）

核心程式在 `src/game/`：

```
src/game/
  combat/     模擬與 Canvas 繪製
  ui/         選單、基地、軍械庫、任務、結算
  ranks.ts    軍階表
  weapons.ts  武器數據
  missions.ts 任務
  maps.ts     地圖與掩體
  store.ts    存檔與晉升
```

## 授權

個人專案／原型。素材與程式僅供展示與學習。
