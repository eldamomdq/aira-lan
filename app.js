// ====== Config ======
const API_BASE = "https://api.airalan.com";

// ====== Año footer ======
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// ====== Navbar mobile ======
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

// ====== Mock UI server status (dejalo o borralo después) ======
const serverStatus = document.getElementById("serverStatus");
const statOnline = document.getElementById("statOnline");

if (serverStatus && statOnline) {
  const fakeOnline = Math.floor(Math.random() * 12); // 0..11
  statOnline.textContent = String(fakeOnline);

  serverStatus.textContent = fakeOnline > 0 ? "Online (mock)" : "Idle (mock)";
  serverStatus.style.borderColor = "rgba(255,122,24,.35)";
  serverStatus.style.background = "rgba(255,122,24,.08)";
  serverStatus.style.color = "rgba(255,255,255,.86)";
}

// ====== Register form ======
const form = document.getElementById("registerForm");
const msg = document.getElementById("formMsg");     // <- del HTML que te pasé
const btn = document.getElementById("submitBtn");   // <- del HTML que te pasé

function setMsg(text, type = "info") {
  if (!msg) return;
  msg.textContent = text;
  msg.dataset.type = type; // success | error | info
}

function setLoading(isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Creando..." : "Crear cuenta";
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const username = (document.getElementById("username")?.value || "").trim();
    const password = document.getElementById("password")?.value || "";
    const confirmPassword = document.getElementById("confirmPassword")?.value || "";
    const email = (document.getElementById("email")?.value || "").trim();

    // Validaciones rápidas (match backend)
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      return setMsg("Usuario inválido. Usá 3-32 caracteres: letras, números o _", "error");
    }
    if (password.length < 6 || password.length > 64) {
      return setMsg("Password inválida. Usá entre 6 y 64 caracteres.", "error");
    }
    if (password !== confirmPassword) {
      return setMsg("Las passwords no coinciden.", "error");
    }

    setLoading(true);
    setMsg("Creando cuenta...", "info");

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, confirmPassword, email }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setMsg("✅ Cuenta creada. Ya podés loguearte.", "success");
        form.reset();
        return;
      }

      const code = data?.error || "UNKNOWN";
      const friendly = ({
        USERNAME_TAKEN: "Ese usuario ya existe. Probá otro.",
        USERNAME_INVALID: "Usuario inválido (solo letras/números/_ y 3–32).",
        PASSWORD_INVALID: "Password inválida (6–64).",
        PASSWORD_MISMATCH: "Las contraseñas no coinciden.",
        DB_ERROR: "Error de base de datos. Avisale al admin.",
        SERVER_ERROR: "Error del servidor. Probá de nuevo en unos segundos.",
      })[code] || (data?.details || "Error desconocido.");

      setMsg(`❌ ${friendly}`, "error");
    } catch (err) {
      setMsg(`❌ No pude conectar con la API. (${err?.message || err})`, "error");
    } finally {
      setLoading(false);
    }
  });
}
