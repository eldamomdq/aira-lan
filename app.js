// Año footer
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// ✅ API real (UNA sola vez)
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
        serverStatus.style.color = "rgba(255,255,255,.86)";
      }
      if (statOnline) statOnline.textContent = "—"; // si después armás endpoint real de players, lo conectamos acá
    } else {
      throw new Error("health ok:false");
    }
  } catch (e) {
    if (serverStatus) {
      serverStatus.textContent = "Offline";
      serverStatus.style.borderColor = "rgba(255,255,255,.14)";
      serverStatus.style.background = "rgba(255,255,255,.03)";
      serverStatus.style.color = "rgba(233,238,246,.72)";
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
        const friendly =
          ({
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
