console.log("app.js cargó OK ✅");

// Año footer
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// API
const API_BASE = "https://api.airalan.com";

// Navbar mobile
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
navToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});
document.querySelectorAll(".nav-links a").forEach((a) => {
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

// Countdown — Próxima LAN: Sábado 28 Feb 2026, 18:00hs Argentina (UTC-3)
function initCountdown() {
  const target = new Date("2026-03-01T21:00:00Z"); // 28 Feb 18:00 ART = UTC-3 → UTC 21:00

  function tick() {
    const now = new Date();
    const diff = target - now;

    if (diff <= 0) {
      document.getElementById("cd-d").textContent = "00";
      document.getElementById("cd-h").textContent = "00";
      document.getElementById("cd-m").textContent = "00";
      document.getElementById("cd-s").textContent = "00";
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const pad = (n) => String(n).padStart(2, "0");

    const elD = document.getElementById("cd-d");
    const elH = document.getElementById("cd-h");
    const elM = document.getElementById("cd-m");
    const elS = document.getElementById("cd-s");

    if (elD) elD.textContent = pad(d);
    if (elH) elH.textContent = pad(h);
    if (elM) elM.textContent = pad(m);
    if (elS) elS.textContent = pad(s);
  }

  tick();
  setInterval(tick, 1000);
}
initCountdown();

// Estado del servidor (REAL)
const serverStatus = document.getElementById("serverStatus");
const statOnline = document.getElementById("statOnline");

async function refreshStatus() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("health not ok");
    const data = await res.json();
    if (data?.ok) {
      if (serverStatus) {
        serverStatus.textContent = "Online";
        serverStatus.style.borderColor = "rgba(255,122,24,.35)";
        serverStatus.style.background = "rgba(255,122,24,.08)";
        serverStatus.style.color = "var(--orange2)";
      }
      if (statOnline) statOnline.textContent = "—";
    } else throw new Error("health ok:false");
  } catch (e) {
    if (serverStatus) {
      serverStatus.textContent = "Offline";
      serverStatus.style.borderColor = "rgba(255,255,255,.14)";
      serverStatus.style.background = "rgba(255,255,255,.03)";
      serverStatus.style.color = "rgba(233,238,246,.5)";
    }
    if (statOnline) statOnline.textContent = "0";
  }
}
refreshStatus();
setInterval(refreshStatus, 15000);

// Form registro
const form = document.getElementById("registerForm");
const btn = document.getElementById("registerBtn");
const msg = document.getElementById("registerMsg");

function setMsg(text, ok = true) {
  if (!msg) return;
  msg.textContent = text;
  msg.style.opacity = "1";
  msg.style.color = ok ? "#9ae6b4" : "#feb2b2";
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      username: form.username.value.trim(),
      password: form.password.value,
      confirmPassword: form.confirmPassword.value,
      email: form.email.value.trim(),
    };
    btn.disabled = true;
    setMsg("Creando cuenta...", true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.error || "UNKNOWN";
        const friendly = ({
          USERNAME_TAKEN: "Ese usuario ya existe. Probá otro.",
          USERNAME_INVALID: "Usuario inválido (solo letras/números/_ y 3–32 caracteres).",
          PASSWORD_INVALID: "Password inválida (mínimo 6 caracteres).",
          PASSWORD_MISMATCH: "Las contraseñas no coinciden.",
          SERVER_ERROR: "Error del servidor. Probá de nuevo en unos segundos.",
        })[code] || data?.details || "Error desconocido.";
        setMsg(friendly, false);
        return;
      }
      setMsg("Cuenta creada ✅ Ya podés loguearte.", true);
      form.reset();
    } catch (err) {
      setMsg("No pude conectar con el servidor. Revisá tu conexión.", false);
    } finally {
      btn.disabled = false;
    }
  });
}

(() => {
  const modal = document.getElementById("gameModal");
  const frame = document.getElementById("gameFrame");
  const openBtn = document.getElementById("openGame");
  const closeA = document.getElementById("closeGame");
  const closeB = document.getElementById("closeGameBtn");

  if (!modal || !frame || !openBtn) return;

  function openGame(){
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    frame.src = "./game/"; // carga el juego
  }
  function closeGame(){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    frame.src = ""; // descarga el iframe para que no consuma recursos
  }

  openBtn.addEventListener("click", openGame);
  closeA.addEventListener("click", closeGame);
  closeB.addEventListener("click", closeGame);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeGame();
  });
})();