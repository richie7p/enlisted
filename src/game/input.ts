export type GameActions = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  aimActive: boolean;
  fire: boolean;
  firePressed: boolean;
  reload: boolean;
  crouch: boolean;
  grenade: boolean;
  swap: boolean;
  cmd: 0 | 1 | 2 | 3 | 4 | 5;
  drone: boolean;
  support: boolean;
  pause: boolean;
  worldAimX: number;
  worldAimY: number;
  moveOrder: { x: number; y: number } | null;
  supportOrder: { x: number; y: number } | null;
};

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyR",
  "KeyC",
  "KeyG",
  "KeyQ",
  "KeyF",
  "KeyE",
  "Digit1",
  "Digit2",
  "Digit3",
  "Digit4",
  "Digit5",
  "Escape",
  "Tab",
  "ControlLeft",
  "ShiftLeft",
]);

function radial(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const s = ((m - dz) / (1 - dz)) / m;
  return { x: x * s, y: y * s };
}

export class Input {
  keys = new Set<string>();
  injected = new Set<string>();
  pointer = { x: 0, y: 0, down: false, right: false };
  world = { x: 0, y: 0 };
  touchMove = { x: 0, y: 0, active: false, id: -1 };
  touchAim = { x: 0, y: 0, active: false, id: -1 };
  prevFire = false;
  consumeMoveOrder: { x: number; y: number } | null = null;
  consumeSupport: { x: number; y: number } | null = null;
  edge = new Set<string>();
  prevKeys = new Set<string>();

  attach(el: HTMLElement) {
    const kd = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
    };
    const ku = (e: KeyboardEvent) => this.keys.delete(e.code);
    const blur = () => this.keys.clear();
    const pd = (e: PointerEvent) => {
      if (e.button === 2) {
        this.pointer.right = true;
        e.preventDefault();
        return;
      }
      if (e.pointerType === "touch") this.handleTouchDown(e, el);
      else {
        this.pointer.down = true;
        this.trackPointer(e, el);
      }
    };
    const pm = (e: PointerEvent) => {
      if (e.pointerType === "touch") this.handleTouchMove(e, el);
      else this.trackPointer(e, el);
    };
    const pu = (e: PointerEvent) => {
      if (e.pointerType === "touch") this.handleTouchUp(e);
      else {
        if (e.button === 2) this.pointer.right = false;
        else this.pointer.down = false;
      }
    };
    const ctx = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    el.addEventListener("pointerdown", pd);
    el.addEventListener("pointermove", pm);
    el.addEventListener("pointerup", pu);
    el.addEventListener("pointercancel", pu);
    el.addEventListener("contextmenu", ctx);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
      el.removeEventListener("pointerdown", pd);
      el.removeEventListener("pointermove", pm);
      el.removeEventListener("pointerup", pu);
      el.removeEventListener("pointercancel", pu);
      el.removeEventListener("contextmenu", ctx);
    };
  }

  private trackPointer(e: PointerEvent, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    this.pointer.x = e.clientX - r.left;
    this.pointer.y = e.clientY - r.top;
  }

  private handleTouchDown(e: PointerEvent, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    if (x < r.width * 0.42) {
      this.touchMove = { x: 0, y: 0, active: true, id: e.pointerId };
    } else {
      this.touchAim = { x: 0, y: 0, active: true, id: e.pointerId };
      this.pointer.down = true;
    }
  }

  private handleTouchMove(e: PointerEvent, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (e.pointerId === this.touchMove.id) {
      const cx = r.width * 0.18;
      const cy = r.height * 0.78;
      const v = radial((x - cx) / 70, (y - cy) / 70, 0.12);
      this.touchMove.x = v.x;
      this.touchMove.y = v.y;
    }
    if (e.pointerId === this.touchAim.id) {
      const cx = r.width * 0.82;
      const cy = r.height * 0.78;
      const v = radial((x - cx) / 70, (y - cy) / 70, 0.12);
      this.touchAim.x = v.x;
      this.touchAim.y = v.y;
      this.pointer.x = x;
      this.pointer.y = y;
    }
  }

  private handleTouchUp(e: PointerEvent) {
    if (e.pointerId === this.touchMove.id) this.touchMove = { x: 0, y: 0, active: false, id: -1 };
    if (e.pointerId === this.touchAim.id) {
      this.touchAim = { x: 0, y: 0, active: false, id: -1 };
      this.pointer.down = false;
    }
  }

  setWorldAim(x: number, y: number) {
    this.world.x = x;
    this.world.y = y;
  }

  queueMoveOrder(x: number, y: number) {
    this.consumeMoveOrder = { x, y };
  }

  queueSupport(x: number, y: number) {
    this.consumeSupport = { x, y };
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }

  sample(): GameActions {
    const keys = new Set([...this.keys, ...this.injected]);
    this.edge = new Set([...keys].filter((k) => !this.prevKeys.has(k)));
    this.prevKeys = new Set(keys);

    let mx = 0;
    let my = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
    if (this.touchMove.active) {
      mx = this.touchMove.x;
      my = this.touchMove.y;
    }
    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() ?? [] : [];
    for (const p of pads) {
      if (!p || p.mapping !== "standard") continue;
      const ls = radial(p.axes[0] ?? 0, p.axes[1] ?? 0);
      const rs = radial(p.axes[2] ?? 0, p.axes[3] ?? 0);
      if (Math.hypot(ls.x, ls.y) > 0.01) {
        mx = ls.x;
        my = ls.y;
      }
      if (Math.hypot(rs.x, rs.y) > 0.2) {
        this.touchAim.x = rs.x;
        this.touchAim.y = rs.y;
        this.touchAim.active = true;
        this.pointer.down = (p.buttons[7]?.value ?? 0) > 0.2 || p.buttons[0]?.pressed === true;
      }
    }
    const ml = Math.hypot(mx, my);
    if (ml > 1) {
      mx /= ml;
      my /= ml;
    }

    let cmd: GameActions["cmd"] = 0;
    if (this.edge.has("Digit1")) cmd = 1;
    if (this.edge.has("Digit2")) cmd = 2;
    if (this.edge.has("Digit3")) cmd = 3;
    if (this.edge.has("Digit4")) cmd = 4;
    if (this.edge.has("Digit5")) cmd = 5;

    const fire = this.pointer.down || keys.has("Space");
    const firePressed = fire && !this.prevFire;
    this.prevFire = fire;

    const moveOrder = this.consumeMoveOrder;
    this.consumeMoveOrder = null;
    const supportOrder = this.consumeSupport;
    this.consumeSupport = null;

    return {
      moveX: mx,
      moveY: my,
      aimX: this.touchAim.active ? this.touchAim.x : 0,
      aimY: this.touchAim.active ? this.touchAim.y : 0,
      aimActive: this.touchAim.active,
      fire,
      firePressed,
      reload: this.edge.has("KeyR"),
      crouch: keys.has("KeyC") || keys.has("ControlLeft"),
      grenade: this.edge.has("KeyG"),
      swap: this.edge.has("KeyE") || this.edge.has("ShiftLeft"),
      cmd,
      drone: this.edge.has("KeyQ"),
      support: this.edge.has("KeyF"),
      pause: this.edge.has("Escape"),
      worldAimX: this.world.x,
      worldAimY: this.world.y,
      moveOrder,
      supportOrder,
    };
  }
}
