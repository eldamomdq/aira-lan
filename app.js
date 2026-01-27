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
