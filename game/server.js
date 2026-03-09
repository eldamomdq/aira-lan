import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8787 });
console.log("[AIRA-LAN] WS server → ws://0.0.0.0:8787");

// ── Map constants (mirrored from client) ──────────────────────────────────────
const WORLD = { w: 2400, h: 1500 };
const SITES = {
  A: { x: 1900, y: 260,  w: 260, h: 220 },
  B: { x: 300,  y: 250,  w: 260, h: 220 },
};
const SPAWNS = {
  T:  [{ x: 220, y: 1300 }, { x: 320, y: 1260 }, { x: 260, y: 1180 }],
  CT: [{ x: 2140, y: 240  }, { x: 2040, y: 320  }, { x: 2200, y: 340  }],
};
const PLAYER_R    = 18;
const PLANT_TIME  = 1.6;
const DEFUSE_TIME = 3.2;
const BOMB_TIMER  = 35.0;
const FREEZE_TIME = 4.0;
const LIVE_TIME   = 70.0;
const END_TIME    = 4.0;

// ── Game state (server-authoritative) ────────────────────────────────────────
let roundNum   = 1;
let roundState = freshRound();
let bombState  = freshBomb();
const score    = { T: 0, CT: 0 };
const killFeed = []; // [{killer, victim}] newest first, max 10

function freshRound() {
  return { phase: "freeze", phaseLeft: FREEZE_TIME, liveLeft: LIVE_TIME, winner: null, reason: "" };
}
function freshBomb() {
  return { status: "carried", plantedSite: null, x: null, y: null, timer: 0, plantProgress: 0, defuseProgress: 0 };
}

// ── Clients ───────────────────────────────────────────────────────────────────
let nextId = 1;
// ws → { id, name, team, x, y, aim, hp, alive }
const clients = new Map();

// ── Utilities ─────────────────────────────────────────────────────────────────
function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}
function broadcast(obj, exclude = null) {
  const s = JSON.stringify(obj);
  for (const ws of clients.keys()) {
    if (ws !== exclude && ws.readyState === 1) ws.send(s);
  }
}
function inRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
function randSpawn(team) {
  const list = SPAWNS[team] ?? SPAWNS.T;
  return list[Math.floor(Math.random() * list.length)];
}
function snapshot() {
  return Array.from(clients.values()).map(p => ({
    id: p.id, name: p.name, team: p.team,
    x: p.x,  y: p.y,       aim: p.aim,
    hp: p.hp, alive: p.alive,
  }));
}
function broadcastFull() {
  broadcast({
    t:       "full",
    players: snapshot(),
    round:   { ...roundState, roundNum },
    bomb:    { ...bombState },
    score:   { ...score },
    kills:   killFeed.slice(0, 5),
  });
}
function addKill(killer, victim) {
  killFeed.unshift({ killer, victim, ts: Date.now() });
  if (killFeed.length > 10) killFeed.pop();
}

// ── Round management ─────────────────────────────────────────────────────────
function endRound(winner, reason) {
  if (roundState.phase === "end") return;
  roundState.phase    = "end";
  roundState.winner   = winner;
  roundState.reason   = reason;
  roundState.phaseLeft = END_TIME;
  score[winner]++;
  console.log(`[round ${roundNum}] ${winner} wins — ${reason} | Score T:${score.T} CT:${score.CT}`);
  broadcastFull();
}

function resetRound() {
  roundNum++;
  roundState = freshRound();
  bombState  = freshBomb();
  for (const [ws, p] of clients) {
    p.hp    = 100;
    p.alive = true;
    const sp = randSpawn(p.team);
    p.x = sp.x; p.y = sp.y;
    send(ws, { t: "respawn", x: sp.x, y: sp.y });
  }
  console.log(`[round ${roundNum}] starting — freeze`);
  broadcastFull();
}

function checkElimination() {
  if (roundState.phase !== "live") return;
  const all     = Array.from(clients.values());
  const tAlive  = all.some(p => p.team === "T"  && p.alive);
  const ctAlive = all.some(p => p.team === "CT" && p.alive);
  if (!tAlive && bombState.status !== "planted") {
    endRound("CT", "Eliminación T");
  } else if (!ctAlive) {
    endRound("T", "Eliminación CT");
  }
}

// ── Server loop (10 Hz) ───────────────────────────────────────────────────────
let lastTick = Date.now();
setInterval(() => {
  if (clients.size === 0) return;

  const now = Date.now();
  const dt  = Math.min(0.2, (now - lastTick) / 1000);
  lastTick  = now;

  if (roundState.phase === "freeze") {
    roundState.phaseLeft -= dt;
    if (roundState.phaseLeft <= 0) {
      roundState.phase    = "live";
      roundState.phaseLeft = 0;
    }
  } else if (roundState.phase === "live") {
    if (bombState.status === "planted") {
      bombState.timer -= dt;
      if (bombState.timer <= 0) {
        bombState.status = "exploded";
        endRound("T", "Bomba explotó");
        return;
      }
    } else {
      roundState.liveLeft -= dt;
      if (roundState.liveLeft <= 0) {
        endRound("CT", "Tiempo");
        return;
      }
    }
  } else if (roundState.phase === "end") {
    roundState.phaseLeft -= dt;
    if (roundState.phaseLeft <= 0) {
      resetRound();
      return;
    }
  }

  broadcastFull();
}, 100);

// ── WebSocket connections ─────────────────────────────────────────────────────
wss.on("connection", (ws) => {
  const id = nextId++;
  const sp = randSpawn("T");
  clients.set(ws, { id, name: `P${id}`, team: "T", x: sp.x, y: sp.y, aim: 0, hp: 100, alive: true });
  send(ws, { t: "you", id });
  send(ws, { t: "respawn", x: sp.x, y: sp.y });
  broadcastFull();
  console.log(`[connect] P${id} joined (${clients.size} online)`);

  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(String(raw)); } catch { return; }
    const me = clients.get(ws);
    if (!me) return;

    switch (msg.t) {

      // ── join ──────────────────────────────────────────────────────────────
      case "join": {
        me.name = String(msg.name || me.name).slice(0, 32);
        me.team = msg.team === "CT" ? "CT" : "T";
        if (roundState.phase !== "live") {
          const sp = randSpawn(me.team);
          me.x = sp.x; me.y = sp.y;
          send(ws, { t: "respawn", x: sp.x, y: sp.y });
        }
        broadcastFull();
        break;
      }

      // ── pos (position update from client) ─────────────────────────────────
      case "pos": {
        if (!me.alive) break;
        if (typeof msg.x === "number") me.x = Math.max(0, Math.min(WORLD.w, msg.x));
        if (typeof msg.y === "number") me.y = Math.max(0, Math.min(WORLD.h, msg.y));
        if (typeof msg.aim === "number") me.aim = msg.aim;
        me.name = String(msg.name || me.name).slice(0, 32);
        me.team = msg.team === "CT" ? "CT" : "T";
        // Position updates are batched — broadcast happens in tick loop
        break;
      }

      // ── shot (visual relay only — hit detection is client-reported) ────────
      case "shot": {
        if (!me.alive || roundState.phase !== "live") break;
        broadcast({ t: "shot", id: me.id, x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy }, ws);
        break;
      }

      // ── hit (client detected bullet hitting a remote player) ───────────────
      case "hit": {
        if (!me.alive || roundState.phase !== "live") break;
        const targetId = Number(msg.targetId);
        const damage   = Math.max(1, Math.min(100, Math.round(Number(msg.damage) || 20)));

        let target = null, targetWs = null;
        for (const [tw, tp] of clients) {
          if (tp.id === targetId) { target = tp; targetWs = tw; break; }
        }
        if (!target || !target.alive || target.team === me.team) break;

        // Plausibility check: positions must be within a reasonable range
        const dx = target.x - me.x, dy = target.y - me.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 1200) break; // too far — likely stale position

        target.hp = Math.max(0, target.hp - damage);
        console.log(`[hit] ${me.name} → ${target.name} (${damage}dmg, hp=${target.hp})`);

        if (target.hp === 0) {
          target.alive = false;
          addKill(me.name, target.name);
          send(targetWs, { t: "killed", by: me.name });
          broadcastFull();
          checkElimination();
        } else {
          send(targetWs, { t: "damage", amount: damage, from: me.name });
          broadcastFull();
        }
        break;
      }

      // ── plant (T presses E in bomb site) ──────────────────────────────────
      case "plant": {
        if (!me.alive || roundState.phase !== "live" || me.team !== "T") break;
        if (bombState.status !== "carried") break;
        const site = inRect(me.x, me.y, SITES.A) ? "A"
                   : inRect(me.x, me.y, SITES.B) ? "B" : null;
        if (!site) { bombState.plantProgress = 0; break; }

        bombState.plantProgress = Math.min(1, Number(msg.progress) || 0);
        if (bombState.plantProgress >= 1) {
          bombState.status        = "planted";
          bombState.plantedSite   = site;
          bombState.x             = me.x;
          bombState.y             = me.y;
          bombState.timer         = BOMB_TIMER;
          bombState.plantProgress = 0;
          console.log(`[bomb] planted at site ${site} by ${me.name}`);
        }
        break;
      }

      // ── defuse (CT presses E near bomb) ───────────────────────────────────
      case "defuse": {
        if (!me.alive || roundState.phase !== "live" || me.team !== "CT") break;
        if (bombState.status !== "planted") break;
        const dx = me.x - (bombState.x || 0);
        const dy = me.y - (bombState.y || 0);
        if (dx*dx + dy*dy > 80*80) { bombState.defuseProgress = 0; break; }

        bombState.defuseProgress = Math.min(1, Number(msg.progress) || 0);
        if (bombState.defuseProgress >= 1) {
          bombState.status         = "defused";
          bombState.defuseProgress = 0;
          endRound("CT", "Defuse");
        }
        break;
      }

      // ── actionStop (released E) ────────────────────────────────────────────
      case "actionStop": {
        bombState.plantProgress  = 0;
        bombState.defuseProgress = 0;
        break;
      }
    }
  });

  ws.on("close", () => {
    const p = clients.get(ws);
    clients.delete(ws);
    console.log(`[disconnect] ${p?.name ?? "?"} left (${clients.size} online)`);
    broadcastFull();
    checkElimination();
  });
});
