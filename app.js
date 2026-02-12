const year = document.getElementById("year");
year.textContent = new Date().getFullYear();

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

navToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Placeholders de estado (luego se conecta a una API real)
const serverStatus = document.getElementById("serverStatus");
const statOnline = document.getElementById("statOnline");

// Simulación visual (podés borrar esto cuando lo conectes de verdad)
const fakeOnline = Math.floor(Math.random() * 12); // 0..11
statOnline.textContent = String(fakeOnline);

serverStatus.textContent = (fakeOnline > 0) ? "Online (mock)" : "Idle (mock)";
serverStatus.style.borderColor = "rgba(255,122,24,.35)";
serverStatus.style.background = "rgba(255,122,24,.08)";
serverStatus.style.color = "rgba(255,255,255,.86)";

const API_BASE = "http://aira.hopto.org:8787";

const form = document.getElementById("registerForm");
const btn = document.getElementById("registerBtn");
const msg = document.getElementById("registerMsg");

function setMsg(text, ok = true) {
  if (!msg) return;
  msg.textContent = text;
  msg.style.opacity = "1";
  msg.style.color = ok ? "#9ae6b4" : "#feb2b2"; // verde/rojo suave
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      username: form.username.value.trim(),
      password: form.password.value,
      confirmPassword: form.confirmPassword.value,
      email: form.email.value.trim()
    };

    btn.disabled = true;
    setMsg("Creando cuenta...", true);

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // mensajes más amigables
        const code = data?.error || "UNKNOWN";
        const friendly = ({
          USERNAME_TAKEN: "Ese usuario ya existe. Probá otro.",
          USERNAME_INVALID: "Usuario inválido (solo letras/números/_ y 3–32 caracteres).",
          PASSWORD_INVALID: "Password inválida (mínimo 6 caracteres).",
          PASSWORD_MISMATCH: "Las contraseñas no coinciden.",
          SERVER_ERROR: "Error del servidor. Probá de nuevo en unos segundos."
        })[code] || (data?.details || "Error desconocido.");

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
