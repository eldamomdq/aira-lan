import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8787 });
console.log("WS server on ws://0.0.0.0:8787");

let nextId = 1;
const clients = new Map(); // ws -> {id,name,team,x,y,hp}

function broadcast(obj){
  const msg = JSON.stringify(obj);
  for (const ws of clients.keys()){
    if (ws.readyState === 1) ws.send(msg);
  }
}

function snapshot(){
  return Array.from(clients.values()).map(p => ({
    id:p.id, name:p.name, team:p.team, x:p.x, y:p.y, hp:p.hp
  }));
}

wss.on("connection", (ws) => {
  const id = nextId++;
  clients.set(ws, { id, name:`P${id}`, team:"T", x:1200, y:750, hp:100 });

  ws.send(JSON.stringify({ t:"you", id }));

  ws.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(String(data)); } catch { return; }

    const me = clients.get(ws);
    if (!me) return;

    if (msg.t === "join"){
      me.name = msg.name || me.name;
      me.team = msg.team === "CT" ? "CT" : "T";
      broadcast({ t:"state", players: snapshot() });
      return;
    }

    if (msg.t === "pos"){
      me.x = msg.x; me.y = msg.y;
      me.hp = msg.hp ?? me.hp;
      me.team = msg.team === "CT" ? "CT" : "T";
      me.name = msg.name || me.name;
      // rate simple: broadcast state always (ok para LAN pequeña)
      broadcast({ t:"state", players: snapshot() });
      return;
    }

    if (msg.t === "shot"){
      broadcast({ t:"shot", id: me.id, x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy });
      return;
    }

    if (msg.t === "bomb"){
      broadcast({ t:"bomb", bombState: msg.bombState });
      return;
    }

    if (msg.t === "round"){
      broadcast({ t:"round", roundState: msg.roundState });
      return;
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    broadcast({ t:"state", players: snapshot() });
  });

  broadcast({ t:"state", players: snapshot() });
});