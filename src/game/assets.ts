export type Sheet = { img: HTMLImageElement; cols: number; rows: number; cw: number; ch: number };

const cache = new Map<string, HTMLImageElement>();

function loadImg(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit && hit.complete) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = hit ?? new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

export type GameArt = {
  player: Sheet;
  enemy: Sheet;
  ally: Sheet;
  medic: Sheet;
  gunner: Sheet;
  hostage: Sheet;
  muzzle: Sheet;
  impact: Sheet;
  props: Record<string, HTMLImageElement>;
  ground: Record<string, HTMLImageElement>;
  menu: HTMLImageElement;
  base: HTMLImageElement;
};

function sheet(img: HTMLImageElement, cols: number, rows: number): Sheet {
  return { img, cols, rows, cw: img.width / cols, ch: img.height / rows };
}

let art: GameArt | null = null;
let pending: Promise<GameArt> | null = null;

export function getArt(): GameArt | null {
  return art;
}

export function loadArt(): Promise<GameArt> {
  if (art) return Promise.resolve(art);
  if (pending) return pending;
  pending = (async () => {
    const names = ["player", "enemy", "ally", "medic", "gunner", "hostage", "muzzle", "impact"] as const;
    const imgs = await Promise.all(names.map((n) => loadImg(`/game/sprites/${n}.png`)));
    const propNames = ["crate", "barrel", "sandbags", "barrier", "ammo", "bush", "tires", "rocks", "tent"];
    const propImgs = await Promise.all(propNames.map((n) => loadImg(`/game/sprites/prop-${n}.png`)));
    const [dirt, asphalt, scrub, menu, base] = await Promise.all([
      loadImg("/game/ground/dirt.jpg"),
      loadImg("/game/ground/asphalt.jpg"),
      loadImg("/game/ground/scrub.jpg"),
      loadImg("/game/ui/menu-bg.jpg"),
      loadImg("/game/ui/base-hub.jpg"),
    ]);
    const props: Record<string, HTMLImageElement> = {};
    propNames.forEach((n, i) => {
      props[n] = propImgs[i];
    });
    art = {
      player: sheet(imgs[0], 2, 2),
      enemy: sheet(imgs[1], 2, 2),
      ally: sheet(imgs[2], 2, 2),
      medic: sheet(imgs[3], 2, 2),
      gunner: sheet(imgs[4], 2, 2),
      hostage: sheet(imgs[5], 2, 2),
      muzzle: sheet(imgs[6], 2, 2),
      impact: sheet(imgs[7], 2, 2),
      props,
      ground: { dirt, asphalt, scrub },
      menu,
      base,
    };
    return art;
  })();
  return pending;
}
