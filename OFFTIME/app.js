const screenElement = document.querySelector("#screen");
const headerElement = document.querySelector("#app-header");
const navElement = document.querySelector("#bottom-nav");
const toastElement = document.querySelector("#toast");

const dailyUsageMinutes = 205;
const defaultPreferences = {
  dailyGoalMinutes: 240,
  reminderEnabled: false,
  reminderTime: "18:00",
  notificationWeeklySummary: false,
  notificationGoals: false,
  notificationMindfulActivities: false,
};
const defaultAppLimits = {
  instagram: 90,
  whatsapp: 60,
  tiktok: 45,
  youtube: 45,
  calendar: 30,
  maps: 60,
  mercadoPago: 30,
  mercadoLibre: 30,
  netflix: 60,
  primeVideo: 60,
  snapchat: 45,
  pinterest: 45,
  spotify: 90,
};
const weeklyUsage = [
  { day: "L", minutes: 190 },
  { day: "M", minutes: 225 },
  { day: "X", minutes: 175 },
  { day: "J", minutes: 245 },
  { day: "V", minutes: 205 },
  { day: "S", minutes: 160 },
  { day: "D", minutes: dailyUsageMinutes },
];

function readStorage(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.error(`No se pudo leer el almacenamiento local (${key}).`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`No se pudo guardar en el almacenamiento local (${key}).`, error);
    showToast("No se pudieron guardar los cambios en este navegador.");
    return false;
  }
}

const storedPreferences = readStorage("offtime-preferences", {});
const storedHistory = readStorage("offtime-pause-history", []);
const storedAppLimits = readStorage("offtime-app-limits", {});
const storedProfile = readStorage("offtime-profile", {});
const storedPrivacy = readStorage("offtime-privacy", {});
const storedGoals = readStorage("offtime-goals", {});
const storedPersonalReminders = readStorage("offtime-personal-reminders", []);
const storedRestSchedules = readStorage("offtime-rest-schedules", []);

const state = {
  screen: "home",
  period: "Día",
  pauseType: "Respiración",
  selectedPlan: "",
  selectedMindfulPause: "",
  historyReturn: "space",
  goalsReturn: "space",
  restReturn: "space",
  profile: {
    name: "",
    age: "",
    pronouns: "",
    personalGoal: "",
    email: "",
    ...(storedProfile && typeof storedProfile === "object" && !Array.isArray(storedProfile) ? storedProfile : {}),
  },
  privacy: {
    savePauseHistory: true,
    ...(storedPrivacy && typeof storedPrivacy === "object" && !Array.isArray(storedPrivacy) ? storedPrivacy : {}),
  },
  goals: {
    selected: [],
    custom: [],
    ...(storedGoals && typeof storedGoals === "object" && !Array.isArray(storedGoals) ? storedGoals : {}),
  },
  personalReminders: Array.isArray(storedPersonalReminders) ? storedPersonalReminders : [],
  restSchedules: Array.isArray(storedRestSchedules) ? storedRestSchedules : [],
  breathing: false,
  breathStep: 1,
  elapsed: 0,
  preferences: {
    ...defaultPreferences,
    ...(storedPreferences && typeof storedPreferences === "object" ? storedPreferences : {}),
  },
  appLimits: {
    ...defaultAppLimits,
    ...(storedAppLimits && typeof storedAppLimits === "object" ? storedAppLimits : {}),
  },
  pauseHistory: Array.isArray(storedHistory) ? storedHistory : [],
};
state.goals.selected = Array.isArray(state.goals.selected) ? state.goals.selected : [];
state.goals.custom = Array.isArray(state.goals.custom) ? state.goals.custom : [];
state.personalReminders = state.personalReminders.filter((reminder) =>
  reminder && typeof reminder.id === "string" && typeof reminder.time === "string" && typeof reminder.message === "string");
state.restSchedules = state.restSchedules.filter((schedule) =>
  schedule && typeof schedule.id === "string" && typeof schedule.name === "string" &&
  typeof schedule.start === "string" && typeof schedule.end === "string" && Array.isArray(schedule.days));

let breathInterval;
let toastTimeout;

const navigation = [
  { id: "home", label: "Inicio", icon: '<svg viewBox="0 0 24 24"><path d="m3.5 10 8.5-7 8.5 7v10a1 1 0 0 1-1 1h-5.5v-6h-4v6H4.5a1 1 0 0 1-1-1z"/></svg>' },
  { id: "habits", label: "Hábitos", icon: '<svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9" rx="2"/><rect x="10" y="7" width="4" height="14" rx="2"/><rect x="17" y="3" width="4" height="18" rx="2"/></svg>' },
  { id: "pause", label: "Pausa", icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8v8m4-8v8"/></svg>' },
  { id: "settings", label: "Configuración", icon: '<svg viewBox="0 0 24 24"><path d="M10 2h4l.7 2.4a8 8 0 0 1 1.7 1l2.4-.7 2 3.5-1.8 1.8a8 8 0 0 1 0 2l1.8 1.8-2 3.5-2.4-.7a8 8 0 0 1-1.7 1L14 20h-4l-.7-2.4a8 8 0 0 1-1.7-1l-2.4.7-2-3.5L5 12a8 8 0 0 1 0-2L3.2 8.2l2-3.5 2.4.7a8 8 0 0 1 1.7-1z"/><circle cx="12" cy="11" r="3"/></svg>' },
  { id: "space", label: "Mi espacio", icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/></svg>' },
];

const apps = [
  { name: "Instagram", time: "1 h 06 min", minutes: 66, percent: "32%", icon: "◎", className: "instagram" },
  { name: "WhatsApp", time: "37 min", minutes: 37, percent: "18%", icon: "◉", className: "whatsapp" },
  { name: "TikTok", time: "24 min", minutes: 24, percent: "12%", icon: "♪", className: "tiktok" },
  { name: "YouTube", time: "18 min", minutes: 18, percent: "9%", icon: "▶", className: "youtube" },
  { name: "Calendario", time: "15 min", minutes: 15, percent: "7%", icon: "31", className: "calendar" },
  { name: "Google Maps", time: "22 min", minutes: 22, percent: "11%", icon: "➤", className: "maps" },
  { name: "Mercado Pago", time: "12 min", minutes: 12, percent: "6%", icon: "MP", className: "mercado-pago" },
  { name: "Mercado Libre", time: "14 min", minutes: 14, percent: "7%", icon: "M", className: "mercado-libre" },
  { name: "Netflix", time: "48 min", minutes: 48, percent: "23%", icon: "N", className: "netflix" },
  { name: "Prime Video", time: "32 min", minutes: 32, percent: "16%", icon: "▶", className: "prime-video" },
  { name: "Snapchat", time: "19 min", minutes: 19, percent: "9%", icon: "👻", className: "snapchat" },
  { name: "Pinterest", time: "26 min", minutes: 26, percent: "13%", icon: "P", className: "pinterest" },
  { name: "Spotify", time: "55 min", minutes: 55, percent: "27%", icon: "♫", className: "spotify" },
];

const spaceItems = [
  ["⚯", "Objetivos personales", "Definí qué querés lograr"],
  ["◷", "Horarios de descanso", "Elegí tus momentos de pausa"],
  ["♧", "Notificaciones", "Gestioná tus recordatorios"],
  ["◷", "Historial de pausas", "Tus pausas y tiempo dedicado"],
  ["▥", "Progreso", "Evolución con tus hábitos"],
];

const configGroups = [
  { title: "Cuenta", items: [["♙", "Perfil", "Tu información personal"], ["▣", "Privacidad", "Datos y permisos"]] },
  { title: "App", items: [["◎", "Idioma", "Español"], ["☼", "Tema", "Claro"], ["TA", "Tamaño de texto", "Normal"]] },
  { title: "Soporte", items: [["ⓘ", "Ayuda", "Preguntas frecuentes y guía de uso"], ["✉", "Contacto", "Escribinos"]] },
];

function setHeader() {
  if (state.screen === "home") {
    headerElement.innerHTML = `
      <div class="header-spacer"></div>
      <div class="brand"><div class="brand-name">OFFTIME</div><div class="brand-subtitle">PAUSA CONSCIENTE</div></div>
      <button class="avatar-button" type="button" aria-label="Abrir configuración" data-screen="settings">♙</button>`;
    return;
  }
  const titles = {
    habits: "Mis hábitos",
    pause: "Pausa consciente",
    plans: "Ideas sin pantalla",
    mindful: "Un momento para vos",
    progress: "Cada pequeño cambio cuenta",
    space: "Mi espacio",
    settings: "Configuración",
    profile: "Perfil",
    privacy: "Privacidad",
    help: "Ayuda",
    goals: "Objetivos personales",
    rest: "Mi horario de descanso",
    notifications: "Notificaciones",
    history: "Historial de pausas",
  };
  const rightButton = state.screen === "habits"
    ? '<button class="icon-button" type="button" aria-label="Ver calendario" data-action="calendar">▦</button>'
    : state.screen === "space"
      ? '<button class="avatar-button" type="button" aria-label="Abrir configuración" data-screen="settings">♙</button>'
      : '<div class="header-spacer"></div>';
  const backButton = ["plans", "mindful", "progress"].includes(state.screen)
    ? '<button class="back-button" type="button" aria-label="Volver a Pausa consciente" data-screen="pause">‹</button>'
    : state.screen === "history"
      ? `<button class="back-button" type="button" aria-label="Volver" data-screen="${state.historyReturn}">‹</button>`
      : state.screen === "profile"
        ? '<button class="back-button" type="button" aria-label="Volver a Configuración" data-screen="settings">‹</button>'
        : state.screen === "privacy"
          ? '<button class="back-button" type="button" aria-label="Volver a Configuración" data-screen="settings">‹</button>'
          : state.screen === "help"
            ? '<button class="back-button" type="button" aria-label="Volver a Configuración" data-screen="settings">‹</button>'
              : state.screen === "goals"
                ? `<button class="back-button" type="button" aria-label="Volver" data-screen="${state.goalsReturn}">‹</button>`
                : state.screen === "rest"
                  ? `<button class="back-button" type="button" aria-label="Volver" data-screen="${state.restReturn}">‹</button>`
                  : state.screen === "notifications"
                    ? '<button class="back-button" type="button" aria-label="Volver a Mi espacio" data-screen="space">‹</button>'
          : state.screen === "settings"
          ? '<button class="back-button" type="button" aria-label="Volver a Mi espacio" data-screen="space">‹</button>'
      : '<div class="header-spacer"></div>';
  headerElement.innerHTML = `${backButton}<h1 class="page-title">${titles[state.screen]}</h1>${rightButton}`;
}

function setNavigation() {
  navElement.innerHTML = navigation.map(({ id, label, icon }) => {
    const active = state.screen === id || (["plans", "mindful", "progress"].includes(state.screen) && id === "pause");
    return `
    <button class="nav-button ${active ? "active" : ""}" type="button"
      data-screen="${id}" aria-current="${active ? "page" : "false"}">
      <span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>
    </button>`;
  }).join("");
}

function renderHome() {
  const goal = Number(state.preferences.dailyGoalMinutes) || defaultPreferences.dailyGoalMinutes;
  const progress = Math.min(Math.round((dailyUsageMinutes / goal) * 100), 100);
  const remainingMinutes = Math.max(goal - dailyUsageMinutes, 0);
  return `
    <div class="greeting"><h1>Hola, ¿cómo viene tu día?</h1><p>Tomate un momento para conectar con vos.</p></div>
    <section class="home-visual-card">
      <img src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85" alt="Luz suave del amanecer entre las montañas" loading="lazy">
      <div class="home-visual-copy"><span>UN RESPIRO EN TU DÍA</span><strong>Hacé espacio para lo que te hace bien.</strong></div>
    </section>
    <section class="card usage-card" aria-label="Resumen de uso">
      <p class="section-label">Tu uso de hoy</p>
      <div class="usage-summary"><span class="usage-symbol" aria-hidden="true">▯</span>
        <div><div class="usage-number">3 h 25 min</div><div class="usage-caption">Tiempo total de pantalla</div></div>
      </div>
      <div class="card-divider"></div>
      <div class="unlock-row"><span aria-hidden="true">♙</span><div>
        <div class="usage-number">42 desbloqueos</div><div class="usage-caption">Veces que revisaste tu celular</div>
      </div></div>
    </section>
    <section class="card goal-card">
      <div class="card-heading"><p class="section-label">Tu meta diaria</p>
        <button class="text-button" type="button" data-screen="settings">Editar</button></div>
      <div class="goal-summary"><strong>${formatMinutes(dailyUsageMinutes)}</strong><span>de ${formatMinutes(goal)}</span><strong>${progress}%</strong></div>
      <div class="goal-track" role="progressbar" aria-label="Progreso de tu meta diaria" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
        <div class="goal-value" style="width:${progress}%"></div>
      </div>
      <p class="goal-note">${remainingMinutes ? `Te quedan ${formatMinutes(remainingMinutes)} para alcanzar tu meta.` : "¡Alcanzaste tu meta diaria!"}</p>
    </section>
    <section class="card">
      <div class="card-heading"><p class="section-label">Aplicaciones más utilizadas</p>
        <button class="text-button" type="button" data-screen="habits">Ver más →</button></div>
      <div class="apps-grid">
        ${apps.slice(0, 4).map((app) => `
          <div class="app-item"><span class="app-icon ${app.className}" aria-hidden="true">${app.icon}</span>
            <div class="app-meta"><div class="app-name">${app.name}</div><div class="app-time">${app.percent} · ${app.time}</div></div>
          </div>`).join("")}
        <button class="text-button" type="button" data-screen="habits">Ver más →</button>
      </div>
    </section>
    <section class="pause-promo"><h2>Un momento para vos</h2>
      <p>No hace falta desconectarte de todo.<br />Solo hacer una pausa.</p>
      <button class="primary-button" type="button" data-screen="pause">Iniciar pausa consciente</button>
    </section>`;
}

function renderHabits() {
  const chartData = {
    Día: [42, 70, 58, 60, 53, 49, 67, 45],
    Semana: [55, 74, 62, 48, 69, 58, 78],
    Mes: [38, 46, 60, 55, 73, 67, 80, 58, 70, 49, 62, 76],
  };
  const labels = {
    Día: ["6", "8", "10", "12", "14", "16", "18", "20"],
    Semana: ["L", "M", "X", "J", "V", "S", "D"],
    Mes: ["1", "3", "5", "7", "9", "11", "13", "15", "17", "19", "21", "23"],
  };
  const weekTotal = weeklyUsage.reduce((total, day) => total + day.minutes, 0);
  const previousWeekTotal = 1500;
  const change = Math.round(((weekTotal - previousWeekTotal) / previousWeekTotal) * 100);
  return `
    <div class="period-switch" role="group" aria-label="Período del resumen">
      ${["Día", "Semana", "Mes"].map((period) => `
        <button class="period-button ${state.period === period ? "active" : ""}" type="button"
          data-period="${period}" aria-pressed="${state.period === period}">${period}</button>`).join("")}
    </div>
    ${state.period === "Semana" ? `
      <section class="card chart-card"><div class="chart-title"><strong>Esta semana</strong><span>${formatMinutes(weekTotal)} en total</span></div>
        <div class="bar-chart" role="img" aria-label="Tiempo de pantalla por día esta semana">
          ${weeklyUsage.map(({ day, minutes }) => `
            <div class="bar-column"><div class="bar ${day === "D" ? "today" : ""}" style="height:${Math.round((minutes / 300) * 100)}%"></div><span>${day}</span></div>`).join("")}
        </div>
        <div class="week-comparison">
          <div><strong class="${change < 0 ? "positive-change" : change > 0 ? "negative-change" : ""}">
            ${change === 0 ? "Igual" : `${Math.abs(change)}% ${change < 0 ? "menos" : "más"}`}
          </strong><span> que la semana pasada</span></div>
          <span>${change === 0 ? "Mismo tiempo" : `${formatMinutes(Math.abs(weekTotal - previousWeekTotal))} ${change < 0 ? "menos" : "más"}`}</span>
        </div>
        <p class="sample-note">Comparación de ejemplo · Promedio: ${formatMinutes(Math.round(weekTotal / 7))} por día</p>
      </section>
    ` : `
      <section class="card chart-card"><div class="chart-title"><strong>Tiempo de uso</strong><span>${state.period === "Día" ? "3 h 25 min" : "Últimos 30 días"}</span></div>
        <div class="bar-chart" role="img" aria-label="Gráfico de tiempo de pantalla por ${state.period.toLowerCase()}">
          ${chartData[state.period].map((height, index) => `
            <div class="bar-column"><div class="bar" style="height:${height}%"></div><span>${labels[state.period][index]}</span></div>`).join("")}
        </div>
        <div class="chart-axis"><span>${state.period === "Día" ? "Hoy" : "Inicio"}</span><span>${state.period === "Día" ? "Horas" : "Período"}</span></div>
      </section>
    `}
    <section class="card app-limits-card">
      <div class="card-heading"><div><p class="section-label">Aplicaciones más utilizadas</p><p class="limits-intro">Definí un límite diario para cada app.</p></div></div>
      <div class="app-limits-list">${apps.map((app) => {
        const limit = getAppLimit(app.className);
        const progress = limit ? Math.min(Math.round((app.minutes / limit) * 100), 100) : 0;
        const remaining = limit - app.minutes;
        return `
          <article class="app-limit-row">
            <div class="app-row">
              <span class="app-icon ${app.className}" aria-hidden="true">${app.icon}</span>
              <div class="app-meta"><div class="app-name">${app.name}</div><div class="app-time">${app.time} hoy</div></div>
              <span class="app-percent">${app.percent}</span>
            </div>
            ${limit ? `<div class="app-limit-track" role="progressbar" aria-label="Uso de ${app.name} respecto al límite" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
              <div class="app-limit-value ${remaining < 0 ? "over-limit" : ""}" style="width:${progress}%"></div></div>
              <p class="limit-status ${remaining < 0 ? "over-limit-text" : ""}">${remaining >= 0 ? `Quedan ${formatMinutes(remaining)} de uso` : `Superaste el límite por ${formatMinutes(Math.abs(remaining))}`}</p>`
              : '<p class="limit-status">Sin límite diario</p>'}
            <label class="limit-control"><span>Límite diario</span>
              <select data-app-limit="${app.className}" aria-label="Límite diario de ${app.name}">
                ${[0, 30, 45, 60, 90, 120].map((option) => `
                  <option value="${option}" ${limit === option ? "selected" : ""}>${formatLimit(option)}</option>`).join("")}
              </select>
            </label>
          </article>`;
      }).join("")}</div>
      <p class="sample-note">Tiempos de uso de ejemplo; los límites se guardan en este dispositivo.</p>
    </section>
    <section class="card"><p class="section-label">Momentos de mayor actividad</p>
      <div class="activity-chart" role="img" aria-label="Actividad a lo largo del día">
        ${[5, 12, 8, 18, 30, 43, 52, 38, 60, 74, 63, 48, 28, 19, 12].map((height) => `
          <span class="activity-bar" style="height:${height}%"></span>`).join("")}
      </div><div class="chart-axis"><span>00</span><span>6</span><span>12</span><span>18</span><span>24</span></div>
    </section>`;
}

function getAppLimit(appId) {
  const allowedLimits = [0, 30, 45, 60, 90, 120];
  const limit = Number(state.appLimits[appId]);
  return allowedLimits.includes(limit) ? limit : defaultAppLimits[appId];
}

function formatLimit(minutes) {
  if (minutes === 0) return "Sin límite";
  if (minutes < 60) return `${minutes} min`;
  return minutes === 60 ? "1 hora" : `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim();
}

function renderPause() {
  const breathPhases = ["Inhalá", "Sostené", "Exhalá", "Soltá"];
  const breathPhaseIndex = state.breathing ? Math.floor((state.elapsed % 16) / 4) : 0;
  const breathingLabel = breathPhases[breathPhaseIndex];
  const subtitle = state.pauseType === "Respiración"
    ? "Inhalá profundo... y exhalá lento."
    : state.pauseType === "Movimiento" ? "Estirá el cuerpo y soltá los hombros." : "Dejá el celular y mirá a tu alrededor.";
  const selectedDuration = state.pauseType === "Respiración" ? "4 segundos" : "1 minuto";
  return `
    <div class="pause-screen"><h1>${state.pauseType}</h1><p>${subtitle}</p>
      <div class="breathing-orb ${state.breathing ? "active" : ""}" style="--breath-delay:${state.elapsed % 16}s" role="img" aria-label="Guía de respiración: inhalá, sostené, exhalá y soltá">
        <span class="breath-sector breath-sector-top ${breathPhaseIndex === 0 && state.breathing ? "current" : ""}" aria-hidden="true">Inhalá</span>
        <span class="breath-sector breath-sector-right ${breathPhaseIndex === 1 && state.breathing ? "current" : ""}" aria-hidden="true">Sostené</span>
        <span class="breath-sector breath-sector-bottom ${breathPhaseIndex === 2 && state.breathing ? "current" : ""}" aria-hidden="true">Exhalá</span>
        <span class="breath-sector breath-sector-left ${breathPhaseIndex === 3 && state.breathing ? "current" : ""}" aria-hidden="true">Soltá</span>
        <span class="orb-center" aria-hidden="true"><strong>${state.breathing ? breathingLabel : "Respirá"}</strong><small>a tu ritmo</small></span>
      </div>
      <p class="breath-phase">${state.breathing ? breathingLabel : "Inhalá"}</p>
      <div class="breath-timer">${state.breathing ? `${selectedDuration} · ${formatElapsed(state.elapsed)}` : selectedDuration}</div>
      <div class="breath-sequence" role="img" aria-label="Secuencia de respiración: inhalá, sostené, exhalá y soltá">
        ${["Inhalá", "Sostené", "Exhalá", "Soltá"].map((phase, index) => `
          <div class="${state.breathing && breathPhaseIndex === index ? "active" : ""}"><span>${index + 1}</span><small>${phase}</small></div>${index < 3 ? '<i aria-hidden="true"></i>' : ""}`).join("")}
      </div>
      <div class="progress-track"><div class="progress-value" style="width:${state.breathing ? Math.min((state.breathStep / 4) * 100, 100) : 25}%"></div></div>
      <div class="step-count">${state.breathing ? Math.min(state.breathStep, 4) : 1} / 4</div>
    </div>
    <div class="pause-options">
      <article class="pause-info-card screen-break">
        <span class="pause-info-icon" aria-hidden="true">▣</span>
        <span class="pause-info-copy">
          <strong>Descubrí algo más allá de la pantalla</strong>
          <span>Encontrá pequeñas ideas para disfrutar de tu tiempo libre, conectar con tu entorno y dedicarte a eso que te gusta, sin necesidad de estar pendiente del celular.</span>
        </span>
        <button class="pause-card-arrow" type="button" aria-label="Ver ideas de planes sin pantalla" data-screen="plans">›</button>
      </article>
      <article class="pause-info-card mindful-break">
        <span class="pause-info-icon" aria-hidden="true">☾</span>
        <span class="pause-info-copy">
          <strong>Regálate un momento para vos</strong>
          <span>Elegí un momento de tu rutina para hacer una pausa y estar más presente. Adaptá tus descansos a tus horarios y encontrá un equilibrio que funcione para vos.</span>
        </span>
        <button class="pause-card-arrow" type="button" aria-label="Elegir una pausa para vos" data-screen="mindful">›</button>
      </article>
      <article class="pause-info-card progress-break">
        <span class="pause-info-icon" aria-hidden="true">↗</span>
        <span class="pause-info-copy">
          <strong>Cada pequeño cambio cuenta</strong>
          <span>Reconocé tus avances, revisá las pausas que realizaste y descubrí cómo evolucionan tus hábitos. No se trata de hacerlo perfecto, sino de encontrar tu propia manera de relacionarte con el celular.</span>
        </span>
        <button class="pause-card-arrow" type="button" aria-label="Ver tu progreso" data-screen="progress">›</button>
      </article>
      <button class="primary-button" type="button" data-action="${state.breathing ? "stop-breathing" : "start-breathing"}">
        ${state.breathing ? "Finalizar pausa" : "Empezar pausa"}</button>
    </div>`;
}

function renderPlans() {
  const plans = [
    {
      id: "comer",
      title: "Comer sin pantallas",
      description: "Prepará algo rico y disfrutá cada bocado con calma.",
      image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
      alt: "Comida fresca servida en un plato para disfrutar sin apuro",
    },
    {
      id: "pasear",
      title: "Dar un paseo",
      description: "Salí a caminar y descubrí algo nuevo cerca de vos.",
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=85",
      alt: "Paisaje natural para inspirar un paseo al aire libre",
    },
    {
      id: "leer",
      title: "Leer un rato",
      description: "Retomá ese libro o revista que tenías pendiente.",
      image: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=85",
      alt: "Libro abierto en un espacio tranquilo",
    },
    {
      id: "compartir",
      title: "Compartir tiempo",
      description: "Conversá, jugá o tomá algo con alguien querido.",
      image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85",
      alt: "Grupo de amigos compartiendo un momento juntos",
    },
  ];

  return `<div class="plans-screen">
    <p class="subtle-copy">Ideas sencillas para disfrutar tu tiempo lejos del celular. Elegí la que más te guste.</p>
    <div class="plans-grid">${plans.map((plan) => `
      <button class="plan-card ${state.selectedPlan === plan.id ? "selected" : ""}" type="button"
        data-plan="${plan.id}" aria-pressed="${state.selectedPlan === plan.id}">
        <img src="${plan.image}" alt="${plan.alt}" loading="lazy">
        <span class="plan-copy"><strong>${plan.title}</strong><span>${plan.description}</span></span>
        <span class="plan-check" aria-hidden="true">${state.selectedPlan === plan.id ? "✓" : "+"}</span>
      </button>`).join("")}
    </div>
    ${state.selectedPlan ? '<p class="plan-confirmation" role="status">¡Plan elegido! Cuando quieras, dejá el celular y disfrutalo.</p>' : ""}
  </div>`;
}

function renderMindfulPause() {
  const pauseOptions = [
    {
      id: "Respiración",
      title: "Respirá con calma",
      description: "Tomate un minuto para inhalar profundo y soltar el aire despacio.",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=85",
      alt: "Persona disfrutando un momento de respiración tranquila",
    },
    {
      id: "Movimiento",
      title: "Estirá el cuerpo",
      description: "Mové los hombros y estirá la espalda después de un rato de pantalla.",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=85",
      alt: "Persona haciendo estiramientos suaves",
    },
    {
      id: "Sin pantalla",
      title: "Descansá la vista",
      description: "Mirá por la ventana y dejá descansar tus ojos por un momento.",
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=85",
      alt: "Luz natural entre árboles para inspirar una pausa",
    },
  ];

  return `<div class="mindful-screen">
    <p class="subtle-copy">Elegí una pausa que se adapte a cómo te sentís ahora. No hay una forma correcta de descansar.</p>
    <div class="plans-grid">${pauseOptions.map((option) => `
      <button class="plan-card ${state.selectedMindfulPause === option.id ? "selected" : ""}" type="button"
        data-mindful-pause="${option.id}" aria-pressed="${state.selectedMindfulPause === option.id}">
        <img src="${option.image}" alt="${option.alt}" loading="lazy">
        <span class="plan-copy"><strong>${option.title}</strong><span>${option.description}</span></span>
        <span class="plan-check" aria-hidden="true">${state.selectedMindfulPause === option.id ? "✓" : "+"}</span>
      </button>`).join("")}</div>
    <button class="primary-button mindful-start" type="button" data-action="begin-selected-pause" ${state.selectedMindfulPause ? "" : "disabled"}>
      Empezar mi pausa
    </button>
  </div>`;
}

function renderProgress() {
  const totalPauses = state.pauseHistory.length;
  const totalSeconds = state.pauseHistory.reduce((total, entry) => total + (Number(entry.duration) || 0), 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const longestPause = state.pauseHistory.reduce((longest, entry) => Math.max(longest, Number(entry.duration) || 0), 0);
  const latestPause = state.pauseHistory.at(-1);
  return `<div class="progress-screen">
    <section class="progress-hero">
      <img class="progress-hero-art" src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85" alt="" loading="lazy">
      <div class="progress-hero-icon" aria-hidden="true">✦</div>
      <strong>Tu progreso se construye pausa a pausa</strong>
      <p>Cada momento que elegís para vos cuenta. Seguí a tu ritmo.</p>
    </section>
    <div class="progress-stats">
      <article class="progress-stat"><span class="stat-icon" aria-hidden="true">☾</span><strong>${totalPauses}</strong><span>pausas realizadas</span></article>
      <article class="progress-stat"><span class="stat-icon" aria-hidden="true">◷</span><strong>${totalMinutes}</strong><span>minutos para vos</span></article>
      <article class="progress-stat"><span class="stat-icon" aria-hidden="true">↗</span><strong>${formatElapsed(longestPause)}</strong><span>tu pausa más larga</span></article>
    </div>
    <section class="card progress-note-card">
      <div class="progress-note-icon" aria-hidden="true">🌱</div>
      <div><strong>${latestPause ? "¡Bien por hacerte un espacio!" : "Todo empieza con una pausa"}</strong>
        <p>${latestPause ? `Tu última pausa fue de ${formatElapsed(Number(latestPause.duration) || 0)}. Cada pequeño momento suma.` : "Probá una pausa breve hoy y empezá a registrar tus pequeños avances."}</p>
      </div>
    </section>
    <button class="setting-row progress-history-link" type="button" data-history="progress">
      <span class="setting-icon" aria-hidden="true">▤</span>
      <span class="setting-copy"><strong>Ver historial de pausas</strong><span>${totalPauses} ${totalPauses === 1 ? "pausa registrada" : "pausas registradas"}</span></span>
      <span class="chevron" aria-hidden="true">›</span>
    </button>
    <button class="primary-button progress-cta" type="button" data-screen="pause">Regalarme una pausa</button>
  </div>`;
}

function renderSpace() {
  return `<div class="space-screen"><h1>Mi espacio</h1>
    <section class="card quote-card"><div class="plant-art" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M32 54V28M32 41c-1-12-10-19-22-17 1 11 8 19 22 17Zm0-8c1-13 10-20 22-18-1 12-8 20-22 18Z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 31c4 2 8 5 12 10m12-13c-5 2-9 5-12 10M21 54h22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></div>
      <div><strong>Pequeños cambios, grandes resultados</strong><p>Adaptá la app a lo que necesitás y hacé que funcione para vos.</p></div>
    </section>
    <div class="setting-list">${spaceItems.map(([icon, title, description]) => `
      <button class="setting-row" type="button" ${title === "Historial de pausas" ? 'data-screen="history"' : title === "Objetivos personales" ? 'data-screen="goals"' : title === "Horarios de descanso" ? 'data-screen="rest"' : title === "Notificaciones" ? 'data-screen="notifications"' : `data-setting="${title}"`}>
        <span class="setting-icon" aria-hidden="true">${icon}</span>
        <span class="setting-copy"><strong>${title}</strong><span>${title === "Historial de pausas" ? `${state.pauseHistory.length} pausas registradas` : title === "Objetivos personales" ? `${state.goals.selected.length} objetivos elegidos` : title === "Horarios de descanso" ? `${state.restSchedules.length} horarios configurados` : title === "Notificaciones" ? `${Number(state.preferences.reminderEnabled) + Number(state.preferences.notificationWeeklySummary) + Number(state.preferences.notificationGoals) + Number(state.preferences.notificationMindfulActivities)} opciones activadas` : description}</span></span><span class="chevron" aria-hidden="true">›</span>
      </button>`).join("")}</div>
  </div>`;
}

function renderGoals() {
  const options = [
    ["consciente", "🌿", "Usar el celular de forma más consciente"],
    ["menos-revisiones", "📱", "Reducir las veces que reviso el teléfono automáticamente"],
    ["pausas", "🧘", "Dedicar más tiempo a las pausas conscientes"],
    ["concentracion", "📚", "Concentrarme mejor mientras estudio o trabajo"],
    ["sin-pantallas", "🌅", "Disfrutar de momentos sin pantallas"],
    ["desconexion", "🌙", "Crear una rutina de desconexión antes de dormir"],
  ];
  const allGoals = [...options.map(([id, icon, title]) => ({ id, icon, title })), ...state.goals.custom];
  return `<div class="goals-screen">
    <section class="profile-intro">
      <span class="profile-avatar" aria-hidden="true">⚯</span>
      <h2>Elegí qué querés mejorar</h2>
      <p>Seleccioná los objetivos que te acompañen. Podés cambiarlos cuando quieras.</p>
    </section>
    <section class="goal-options" aria-label="Objetivos disponibles">
      ${allGoals.map(({ id, icon = "✦", title }) => {
        const selected = state.goals.selected.includes(id);
        return `<article class="goal-option ${selected ? "selected" : ""}">
          <span class="goal-option-icon" aria-hidden="true">${icon}</span>
          <strong>${escapeHTML(title)}</strong>
          <button class="${selected ? "secondary-button" : "primary-button"} goal-select" type="button"
            data-goal-id="${escapeHTML(id)}" aria-pressed="${selected}">${selected ? "Objetivo elegido" : "Elegir objetivo"}</button>
          ${id.startsWith("custom-") ? `<button class="goal-remove" type="button" data-remove-goal="${escapeHTML(id)}" aria-label="Eliminar objetivo ${escapeHTML(title)}">Eliminar</button>` : ""}
        </article>`;
      }).join("")}
    </section>
    <section class="goal-section">
      <h2 class="settings-group-title">Crear mi propio objetivo</h2>
      <form class="preference-card goal-custom-form" id="custom-goal-form">
        <label class="profile-field" for="custom-goal"><span>Mi objetivo personal</span>
          <input id="custom-goal" name="goal" type="text" maxlength="100" placeholder="Por ejemplo: leer antes de dormir" required>
        </label>
        <button class="primary-button" type="submit">Agregar objetivo</button>
      </form>
    </section>
    <section class="goal-section">
      <h2 class="settings-group-title">Recordatorios personales</h2>
      <p class="subtle-copy goal-reminder-note">Agregá un horario y un mensaje. Se te avisará mientras OFFTIME esté abierta.</p>
      ${state.personalReminders.length ? `<div class="personal-reminder-list">
        ${state.personalReminders.slice().sort((a, b) => a.time.localeCompare(b.time)).map((reminder) => `
          <article class="personal-reminder">
            <label class="reminder-toggle">
              <span class="personal-reminder-time">${escapeHTML(reminder.time)}</span>
              <span class="setting-copy"><strong>${escapeHTML(reminder.message)}</strong><span>${reminder.enabled === false ? "Desactivado" : "Activado mientras la app está abierta"}</span></span>
              <input type="checkbox" data-personal-reminder="${escapeHTML(reminder.id)}" aria-label="Activar recordatorio ${escapeHTML(reminder.message)}" ${reminder.enabled === false ? "" : "checked"}>
            </label>
            <button class="goal-remove" type="button" data-remove-reminder="${escapeHTML(reminder.id)}">Eliminar</button>
          </article>`).join("")}
      </div>` : '<p class="goal-empty-reminders">Todavía no agregaste recordatorios personales.</p>'}
      <form class="preference-card goal-custom-form" id="personal-reminder-form">
        <label class="profile-field" for="personal-reminder-time"><span>Hora</span>
          <input id="personal-reminder-time" name="time" type="time" required>
        </label>
        <label class="profile-field" for="personal-reminder-message"><span>Mensaje</span>
          <input id="personal-reminder-message" name="message" type="text" maxlength="100" placeholder="Tomarme una pausa" required>
        </label>
        <button class="primary-button" type="submit">Agregar recordatorio</button>
      </form>
    </section>
  </div>`;
}

function renderNotifications() {
  return `<div class="notifications-screen">
    <section class="profile-intro">
      <span class="profile-avatar" aria-hidden="true">♧</span>
      <h2>Notificaciones a tu manera</h2>
      <p>Elegí qué avisos querés recibir. Se revisan mientras OFFTIME está abierta, en el horario que configures.</p>
    </section>
    <form class="notification-form" id="notifications-form">
      <label class="notification-option" for="notification-breaks">
        <span class="notification-option-icon" aria-hidden="true">☾</span>
        <span class="setting-copy"><strong>Recordatorios de descanso</strong><span>Un aviso para hacer una pausa durante el día.</span></span>
        <input id="notification-breaks" name="breaks" type="checkbox" ${state.preferences.reminderEnabled ? "checked" : ""}>
      </label>
      <label class="notification-option" for="notification-summary">
        <span class="notification-option-icon" aria-hidden="true">▥</span>
        <span class="setting-copy"><strong>Resumen de mis hábitos</strong><span>Un aviso semanal para revisar tu resumen. Las estadísticas actuales son datos de ejemplo.</span></span>
        <input id="notification-summary" name="weeklySummary" type="checkbox" ${state.preferences.notificationWeeklySummary ? "checked" : ""}>
      </label>
      <label class="notification-option" for="notification-goals">
        <span class="notification-option-icon" aria-hidden="true">⚯</span>
        <span class="setting-copy"><strong>Recordatorios de objetivos</strong><span>Un mensaje diario relacionado con los objetivos personales que elegiste.</span></span>
        <input id="notification-goals" name="goals" type="checkbox" ${state.preferences.notificationGoals ? "checked" : ""} ${state.goals.selected.length ? "" : "disabled"}>
      </label>
      ${state.goals.selected.length ? "" : '<p class="notification-hint">Elegí al menos un objetivo personal para activar este aviso.</p>'}
      <label class="notification-option" for="notification-activities">
        <span class="notification-option-icon" aria-hidden="true">✦</span>
        <span class="setting-copy"><strong>Actividades de pausa consciente</strong><span>Una propuesta diaria de respiración, relajación o una actividad sin pantalla.</span></span>
        <input id="notification-activities" name="mindfulActivities" type="checkbox" ${state.preferences.notificationMindfulActivities ? "checked" : ""}>
      </label>
      <section class="preference-card notification-time-card">
        <label class="profile-field" for="notification-time"><span>Horario de los avisos diarios</span>
          <input id="notification-time" name="time" type="time" value="${escapeHTML(state.preferences.reminderTime)}" required>
        </label>
        <p class="subtle-copy">El resumen semanal se enviará ese día y hora. Los avisos requieren que OFFTIME esté abierta.</p>
      </section>
      <button class="primary-button profile-save" type="submit">Guardar notificaciones</button>
    </form>
  </div>`;
}

function renderRestSchedules() {
  const weekdays = [["1", "Lun"], ["2", "Mar"], ["3", "Mié"], ["4", "Jue"], ["5", "Vie"], ["6", "Sáb"], ["0", "Dom"]];
  const daysLabel = (days) => weekdays.filter(([day]) => days.includes(day)).map(([, label]) => label).join(", ");
  return `<div class="rest-screen">
    <section class="profile-intro">
      <span class="profile-avatar" aria-hidden="true">☾</span>
      <h2>Creá tu momento de desconexión</h2>
      <p>Elegí vos el nombre, las horas y los días. Los horarios se guardan en este dispositivo y funcionan mientras OFFTIME esté abierta.</p>
    </section>
    ${state.restSchedules.length ? `<section class="rest-schedule-list" aria-label="Mis horarios">
      ${state.restSchedules.map((schedule) => `
        <article class="rest-schedule-card">
          <label class="reminder-toggle">
            <span class="setting-copy">
              <strong>${escapeHTML(schedule.name)}</strong>
              <span>${escapeHTML(schedule.start)} a ${escapeHTML(schedule.end)} · ${escapeHTML(daysLabel(schedule.days))}</span>
            </span>
            <input type="checkbox" data-rest-schedule="${escapeHTML(schedule.id)}" aria-label="Activar ${escapeHTML(schedule.name)}" ${schedule.enabled === false ? "" : "checked"}>
          </label>
          <button class="goal-remove" type="button" data-remove-rest-schedule="${escapeHTML(schedule.id)}">Eliminar</button>
        </article>`).join("")}
    </section>` : '<p class="goal-empty-reminders">Todavía no creaste horarios de descanso.</p>'}
    <section class="goal-section">
      <h2 class="settings-group-title">Crear un horario personalizado</h2>
      <form class="preference-card rest-schedule-form" id="rest-schedule-form">
        <label class="profile-field" for="rest-schedule-name"><span>Nombre del horario</span>
          <input id="rest-schedule-name" name="name" type="text" maxlength="60" placeholder="Por ejemplo: Mi pausa de la noche" required>
        </label>
        <div class="rest-time-fields">
          <label class="profile-field" for="rest-schedule-start"><span>Desde</span>
            <input id="rest-schedule-start" name="start" type="time" required>
          </label>
          <label class="profile-field" for="rest-schedule-end"><span>Hasta</span>
            <input id="rest-schedule-end" name="end" type="time" required>
          </label>
        </div>
        <fieldset class="rest-days-field">
          <legend>Repetir</legend>
          <div class="rest-days-options">${weekdays.map(([day, label]) => `
            <label><input type="checkbox" name="days" value="${day}"><span>${label}</span></label>`).join("")}
          </div>
        </fieldset>
        <p class="subtle-copy rest-days-note">Elegí uno o más días para repetir este horario. No se selecciona ningún día por defecto.</p>
        <button class="primary-button" type="submit">Guardar horario</button>
      </form>
    </section>
  </div>`;
}

function renderHistory() {
  const entries = state.pauseHistory.slice().reverse();
  return `<div class="history-screen">
    <p class="subtle-copy">Tus momentos para desconectar, guardados en este dispositivo.</p>
    ${entries.length ? `<div class="history-list">${entries.map((entry) => `
      <article class="history-entry">
        <span class="setting-icon" aria-hidden="true">☾</span>
        <div class="setting-copy"><strong>${escapeHTML(entry.type)}</strong>
          <span>${new Date(entry.date).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        <span class="app-percent">${formatElapsed(entry.duration)}</span>
      </article>`).join("")}</div>` : `
      <section class="card empty-history"><span aria-hidden="true">☾</span><strong>Todavía no hay pausas</strong>
        <p>Cuando completes una pausa, aparecerá acá.</p><button class="primary-button" type="button" data-screen="pause">Hacer una pausa</button>
      </section>`}
  </div>`;
}

function renderSettings() {
  return `<div class="settings-screen">
    <h2 class="settings-group-title">Tus objetivos</h2>
    <form class="preference-card" id="goal-form">
      <label class="form-label" for="daily-goal">Meta diaria de pantalla</label>
      <p class="subtle-copy">Elegí cuántas horas querés usar el celular como máximo.</p>
      <div class="input-with-action">
        <input id="daily-goal" name="dailyGoal" type="number" min="1" max="24" step="0.5" value="${(Number(state.preferences.dailyGoalMinutes) || defaultPreferences.dailyGoalMinutes) / 60}" required>
        <span>horas</span><button class="small-save-button" type="submit">Guardar</button>
      </div>
    </form>
    <div class="setting-list settings-quick-links">
      <button class="setting-row" type="button" data-screen="goals">
        <span class="setting-icon" aria-hidden="true">⚯</span>
        <span class="setting-copy"><strong>Objetivos personales</strong><span>Elegí qué querés mejorar y tus recordatorios</span></span>
        <span class="chevron" aria-hidden="true">›</span>
      </button>
      <button class="setting-row" type="button" data-screen="rest">
        <span class="setting-icon" aria-hidden="true">☾</span>
        <span class="setting-copy"><strong>Mi horario de descanso</strong><span>${state.restSchedules.length ? `${state.restSchedules.length} horarios personalizados` : "Configurá tus momentos de desconexión"}</span></span>
        <span class="chevron" aria-hidden="true">›</span>
      </button>
    </div>
    <h2 class="settings-group-title">Recordatorios</h2>
    <form class="preference-card" id="reminder-form">
      <label class="reminder-toggle" for="reminder-enabled">
        <span class="setting-copy"><strong>Recordarme hacer una pausa</strong><span>Se avisa mientras la app esté abierta.</span></span>
        <input id="reminder-enabled" name="enabled" type="checkbox" ${state.preferences.reminderEnabled ? "checked" : ""}>
      </label>
      <label class="form-label time-label" for="reminder-time">Hora del recordatorio</label>
      <div class="input-with-action">
        <input id="reminder-time" name="time" type="time" value="${escapeHTML(state.preferences.reminderTime)}" required>
        <button class="small-save-button" type="submit">Guardar</button>
      </div>
    </form>
    ${configGroups.map(({ title, items }) => `
      <h2 class="settings-group-title">${title}</h2><div class="setting-list">
        ${items.map(([icon, label, description]) => `
          <button class="setting-row" type="button" ${label === "Perfil" ? 'data-screen="profile"' : label === "Privacidad" ? 'data-screen="privacy"' : label === "Ayuda" ? 'data-screen="help"' : label === "Contacto" ? 'data-screen="help" data-help-section="contact"' : `data-setting="${label}"`}>
            <span class="setting-icon" aria-hidden="true">${icon}</span>
            <span class="setting-copy"><strong>${label}</strong><span>${label === "Perfil" ? (state.profile.name ? `Hola, ${escapeHTML(state.profile.name)}` : "Completá tu información personal") : label === "Privacidad" ? (state.privacy.savePauseHistory ? "Historial de pausas activado" : "Historial de pausas desactivado") : description}</span></span><span class="chevron" aria-hidden="true">›</span>
          </button>`).join("")}</div>`).join("")}
    <button class="secondary-button" type="button" data-action="sign-out">Cerrar sesión</button>
  </div>`;
}

function renderPrivacy() {
  return `<div class="profile-screen">
    <section class="profile-intro">
      <span class="profile-avatar" aria-hidden="true">▣</span>
      <h2>Tu privacidad, a tu manera</h2>
      <p>Consultá y administrá tus datos personales. En esta versión, la información se guarda solo en este dispositivo.</p>
    </section>
    <form class="profile-form" id="privacy-email-form">
      <section class="preference-card privacy-section">
        <h2>Correo electrónico</h2>
        <p class="subtle-copy">Tu correo guardado en este dispositivo.</p>
        <label class="profile-field" for="privacy-email">
          <span>Correo electrónico</span>
          <input id="privacy-email" name="email" type="email" maxlength="254" autocomplete="email"
            placeholder="nombre@correo.com" value="${escapeHTML(state.profile.email || "")}">
        </label>
        <button class="primary-button privacy-action" type="submit">Guardar correo</button>
      </section>
    </form>
    <form class="profile-form" id="privacy-form">
      <section class="preference-card">
        <label class="reminder-toggle" for="save-pause-history">
          <span class="setting-copy"><strong>Guardar historial de pausas</strong><span>Si lo desactivás, las próximas pausas no se agregarán al historial.</span></span>
          <input id="save-pause-history" name="savePauseHistory" type="checkbox" ${state.privacy.savePauseHistory ? "checked" : ""}>
        </label>
      </section>
      <button class="primary-button profile-save" type="submit">Guardar preferencias de privacidad</button>
    </form>
    <section class="preference-card privacy-section">
      <h2>Cambiar contraseña</h2>
      <p class="subtle-copy">La versión actual no tiene cuentas ni un servicio de acceso. No ingreses tu contraseña aquí; esta opción estará disponible al conectar la autenticación.</p>
      <button class="secondary-button privacy-action" type="button" data-privacy-action="change-password">Cambiar contraseña</button>
    </section>
    <section class="preference-card privacy-section">
      <h2>Descargar mis datos</h2>
      <p class="subtle-copy">Descargá un archivo JSON con tu perfil, preferencias, límites y el historial de pausas guardado en este dispositivo.</p>
      <button class="secondary-button privacy-action" type="button" data-privacy-action="download-data">Descargar mis datos</button>
    </section>
    <section class="preference-card privacy-section privacy-danger">
      <h2>Eliminar mi cuenta</h2>
      <p class="subtle-copy">No hay una cuenta en servidor para eliminar en esta demo. Esta acción solo borra los datos locales de OFFTIME en este dispositivo.</p>
      <button class="secondary-button privacy-action" type="button" data-privacy-action="delete-account">Eliminar mi cuenta</button>
    </section>
  </div>`;
}

function renderHelp() {
  const faqs = [
    ["¿Cómo funciona OFFTIME?", "OFFTIME reúne herramientas para observar tus hábitos digitales, definir límites y hacer pausas conscientes. Los datos de uso que ves en esta demostración son ilustrativos; la aplicación no está conectada al registro de uso real del celular."],
    ["¿Cómo se registran mis hábitos digitales?", "En esta versión no se recopila automáticamente el uso de otras aplicaciones. Los gráficos y tiempos son ejemplos. Sí se guardan en este dispositivo los límites que configures y las pausas que completes, si el historial está activado."],
    ["¿Cómo puedo interpretar mis estadísticas?", "El resumen organiza los tiempos de ejemplo por día, semana o mes. Los límites por aplicación se comparan con esos valores; no representan una medición real del dispositivo."],
    ["¿Cómo inicio una pausa consciente?", "Entrá en Pausa, elegí una pausa de respiración, movimiento o descanso de pantalla y seguí las indicaciones. También podés elegir ideas sin pantalla para tu tiempo libre."],
    ["¿Cómo configuro mis recordatorios?", "En Configuración, activá “Recordarme hacer una pausa”, elegí una hora y guardá. El recordatorio funciona mientras OFFTIME permanece abierta; para notificaciones del navegador también puede ser necesario conceder permiso."],
  ];
  const guide = [
    ["Inicio", "Consultá el resumen diario y el acceso rápido a una pausa. Los valores de uso son datos de ejemplo."],
    ["Mis hábitos", "Explorá los gráficos por período y ajustá límites diarios para las aplicaciones. Los tiempos mostrados son ilustrativos."],
    ["Pausa consciente", "Iniciá un ejercicio guiado o elegí una actividad para desconectarte de la pantalla."],
    ["Mi espacio", "Encontrá tu historial de pausas, objetivos, recordatorios y otras herramientas personales."],
  ];
  const issues = [
    ["Mis estadísticas no se actualizan", "Los gráficos de uso son ilustrativos en esta versión y no se actualizan con datos reales del celular. Las pausas completadas se registran en el historial si está activado."],
    ["No recibo notificaciones", "Verificá que los recordatorios estén activados en Configuración y que el navegador permita notificaciones. El recordatorio de esta versión solo funciona mientras la app está abierta."],
    ["La aplicación no registra el uso del celular", "La demo no tiene permisos de acceso al uso del dispositivo ni recopila actividad de otras aplicaciones; sus estadísticas son de ejemplo."],
    ["No puedo acceder a mi cuenta", "Esta versión demostrativa no cuenta con inicio de sesión ni cuentas de servidor. Tus datos de perfil y preferencias se guardan localmente en este navegador."],
  ];

  const disclosureList = (items) => items.map(([question, answer]) => `
    <details class="help-detail">
      <summary>${question}</summary>
      <p>${answer}</p>
    </details>`).join("");

  return `<div class="help-screen">
    <section class="profile-intro">
      <span class="profile-avatar" aria-hidden="true">ⓘ</span>
      <h2>¿En qué podemos ayudarte?</h2>
      <p>Encontrá respuestas, aprendé a usar OFFTIME o prepará un mensaje para soporte.</p>
    </section>
    <section class="help-section">
      <h2 class="settings-group-title">Preguntas frecuentes</h2>
      <div class="help-list">${disclosureList(faqs)}</div>
    </section>
    <section class="help-section">
      <h2 class="settings-group-title">Guía de uso</h2>
      <div class="help-list">${guide.map(([title, description]) => `
        <article class="help-guide-item"><strong>${title}</strong><p>${description}</p></article>`).join("")}</div>
    </section>
    <section class="help-section">
      <h2 class="settings-group-title">Solución de problemas</h2>
      <div class="help-list">${disclosureList(issues)}</div>
    </section>
    <section class="help-section" id="help-contact">
      <h2 class="settings-group-title">Contactar con soporte</h2>
      <form class="preference-card help-contact-form" id="help-contact-form">
        <p class="subtle-copy">Prepará una consulta, un reporte de problema o una sugerencia. Se abrirá tu aplicación de correo para que agregues la dirección del equipo; OFFTIME todavía no tiene un correo de soporte configurado.</p>
        <label class="profile-field" for="help-category">
          <span>¿Qué querés enviar?</span>
          <select id="help-category" name="category" required>
            <option value="Consulta">Enviar una consulta</option>
            <option value="Reporte de problema">Reportar un problema</option>
            <option value="Sugerencia">Enviar una sugerencia</option>
          </select>
        </label>
        <label class="profile-field" for="help-message">
          <span>Mensaje</span>
          <textarea id="help-message" name="message" rows="4" maxlength="2000" placeholder="Contanos cómo podemos ayudarte..." required></textarea>
        </label>
        <button class="primary-button help-submit" type="submit">Preparar mensaje</button>
      </form>
    </section>
  </div>`;
}

function renderProfile() {
  const profile = state.profile;
  return `<div class="profile-screen">
    <section class="profile-intro">
      <span class="profile-avatar" aria-hidden="true">♙</span>
      <h2>Tu espacio, a tu manera</h2>
      <p>Completá tus datos para personalizar tu experiencia. La información se guarda solo en este dispositivo.</p>
    </section>
    <form class="profile-form" id="profile-form">
      <label class="profile-field" for="profile-name">
        <span>¿Cómo te llamás?</span>
        <input id="profile-name" name="name" type="text" maxlength="60" autocomplete="given-name"
          placeholder="Tu nombre" value="${escapeHTML(profile.name)}">
      </label>
      <label class="profile-field" for="profile-age">
        <span>Edad <small>(opcional)</small></span>
        <input id="profile-age" name="age" type="number" min="13" max="120" inputmode="numeric"
          placeholder="Tu edad" value="${escapeHTML(profile.age)}">
      </label>
      <label class="profile-field" for="profile-pronouns">
        <span>¿Cómo querés que nos refiramos a vos? <small>(opcional)</small></span>
        <select id="profile-pronouns" name="pronouns">
          <option value="" ${profile.pronouns === "" ? "selected" : ""}>Prefiero no indicarlo</option>
          <option value="ella" ${profile.pronouns === "ella" ? "selected" : ""}>Ella</option>
          <option value="él" ${profile.pronouns === "él" ? "selected" : ""}>Él</option>
          <option value="elle" ${profile.pronouns === "elle" ? "selected" : ""}>Elle</option>
        </select>
      </label>
      <label class="profile-field" for="profile-goal">
        <span>¿Qué te gustaría mejorar? <small>(opcional)</small></span>
        <select id="profile-goal" name="personalGoal">
          <option value="" ${profile.personalGoal === "" ? "selected" : ""}>Elegí tu objetivo</option>
          <option value="Usar menos el celular" ${profile.personalGoal === "Usar menos el celular" ? "selected" : ""}>Usar menos el celular</option>
          <option value="Descansar mejor" ${profile.personalGoal === "Descansar mejor" ? "selected" : ""}>Descansar mejor</option>
          <option value="Estar más presente" ${profile.personalGoal === "Estar más presente" ? "selected" : ""}>Estar más presente</option>
          <option value="Tomar más pausas" ${profile.personalGoal === "Tomar más pausas" ? "selected" : ""}>Tomar más pausas</option>
        </select>
      </label>
      <button class="primary-button profile-save" type="submit">Guardar mi perfil</button>
    </form>
  </div>`;
}

function formatElapsed(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} h ${remainder ? `${remainder} min` : ""}`.trim() : `${remainder} min`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderVisualBanner({ image, alt, label, title }) {
  return `<section class="visual-banner">
    <img src="${image}" alt="${alt}" loading="lazy">
    <div><span>${label}</span><strong>${title}</strong></div>
  </section>`;
}

function render() {
  setHeader();
  setNavigation();
  screenElement.dataset.screen = state.screen;
  const templates = { home: renderHome, habits: renderHabits, pause: renderPause, plans: renderPlans, mindful: renderMindfulPause, progress: renderProgress, space: renderSpace, settings: renderSettings, profile: renderProfile, privacy: renderPrivacy, help: renderHelp, goals: renderGoals, rest: renderRestSchedules, notifications: renderNotifications, history: renderHistory };
  screenElement.innerHTML = templates[state.screen]();
  const visualBanners = {
    pause: {
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=85",
      alt: "Un momento de calma y respiración consciente",
      label: "PAUSA CONSCIENTE",
      title: "Un respiro para volver a vos",
    },
    plans: {
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85",
      alt: "Paisaje natural para inspirar una actividad al aire libre",
      label: "TIEMPO PARA DISFRUTAR",
      title: "Hay mucho por descubrir lejos de la pantalla",
    },
    mindful: {
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=85",
      alt: "Luz del sol atravesando un bosque tranquilo",
      label: "ELEGÍ TU MOMENTO",
      title: "Descansá como te haga bien",
    },
    space: {
      image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85",
      alt: "Amanecer sereno entre las montañas",
      label: "MI ESPACIO",
      title: "Un lugar para cuidar tu bienestar",
    },
    settings: {
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",
      alt: "Camino tranquilo rodeado de naturaleza",
      label: "A TU MANERA",
      title: "Ajustá OFFTIME a tu ritmo",
    },
    goals: {
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",
      alt: "Sendero que invita a avanzar paso a paso",
      label: "PEQUEÑOS PASOS",
      title: "Elegí lo que querés cultivar",
    },
    rest: {
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",
      alt: "Paisaje natural para acompañar un momento de descanso",
      label: "TU TIEMPO",
      title: "Creá un espacio para desconectar",
    },
    notifications: {
      image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85",
      alt: "Luz suave del amanecer",
      label: "RECORDATORIOS AMABLES",
      title: "Avisos que acompañan tu día",
    },
    history: {
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=85",
      alt: "Un camino sereno entre árboles",
      label: "TUS MOMENTOS",
      title: "Cada pausa también cuenta",
    },
    profile: {
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",
      alt: "Un sendero rodeado de naturaleza",
      label: "TU PERFIL",
      title: "Personalizá tu experiencia",
    },
    privacy: {
      image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85",
      alt: "Un amanecer tranquilo en la naturaleza",
      label: "TU TRANQUILIDAD",
      title: "Tus datos, bajo tu control",
    },
    help: {
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85",
      alt: "Paisaje abierto que transmite calma",
      label: "ESTAMOS PARA AYUDAR",
      title: "Encontrá respuestas con calma",
    },
  };
  if (visualBanners[state.screen]) {
    screenElement.insertAdjacentHTML("afterbegin", renderVisualBanner(visualBanners[state.screen]));
  }
}

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toastElement.classList.remove("visible"), 2600);
}

function stopBreathing() {
  window.clearInterval(breathInterval);
  breathInterval = undefined;
  state.breathing = false;
}

function finishPause() {
  if (state.privacy.savePauseHistory) {
    state.pauseHistory.push({ type: state.pauseType, duration: state.elapsed, date: new Date().toISOString() });
    state.pauseHistory = state.pauseHistory.slice(-100);
    saveStorage("offtime-pause-history", state.pauseHistory);
  }
  stopBreathing();
  showToast(state.privacy.savePauseHistory
    ? "¡Bien hecho! Tu pausa quedó guardada en el historial."
    : "¡Bien hecho! Completaste tu pausa.");
  render();
}

function checkReminder() {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const minute = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (state.preferences.reminderEnabled && minute === state.preferences.reminderTime &&
      readStorage("offtime-last-reminder", "") !== today) {
    saveStorage("offtime-last-reminder", today);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("OFFTIME", { body: "Es un buen momento para hacer una pausa." });
    } else {
      showToast("Es un buen momento para hacer una pausa.");
    }
  }

  if (minute === state.preferences.reminderTime) {
    if (state.preferences.notificationWeeklySummary && now.getDay() === 1 &&
        readStorage("offtime-last-weekly-summary", "") !== today) {
      saveStorage("offtime-last-weekly-summary", today);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("OFFTIME · Resumen semanal", { body: "Tu resumen semanal ya está disponible para revisar." });
      } else {
        showToast("Tu resumen semanal ya está disponible para revisar.");
      }
    }

    if (state.preferences.notificationGoals && state.goals.selected.length > 0 &&
        readStorage("offtime-last-goal-reminder", "") !== today) {
      saveStorage("offtime-last-goal-reminder", today);
      const body = "¿Te tomaste un momento para avanzar con tu objetivo hoy?";
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("OFFTIME · Tus objetivos", { body });
      } else {
        showToast(body);
      }
    }

    if (state.preferences.notificationMindfulActivities &&
        readStorage("offtime-last-mindful-reminder", "") !== today) {
      saveStorage("offtime-last-mindful-reminder", today);
      const body = "Regalate cinco minutos para respirar y relajarte.";
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("OFFTIME · Pausa consciente", { body });
      } else {
        showToast(body);
      }
    }
  }

  state.personalReminders.forEach((reminder) => {
    const lastReminderKey = `offtime-personal-reminder-${reminder.id}`;
    if (reminder.enabled === false || reminder.time !== minute || readStorage(lastReminderKey, "") === today) return;
    saveStorage(lastReminderKey, today);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("OFFTIME · Recordatorio personal", { body: reminder.message });
    } else {
      showToast(reminder.message);
    }
  });

  const weekday = String(now.getDay());
  state.restSchedules.forEach((schedule) => {
    const lastScheduleKey = `offtime-rest-schedule-${schedule.id}`;
    if (schedule.enabled === false || !schedule.days.includes(weekday) ||
        schedule.start !== minute || readStorage(lastScheduleKey, "") === today) return;
    saveStorage(lastScheduleKey, today);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("OFFTIME · Momento de descanso", { body: `Comienza tu horario: ${schedule.name}.` });
    } else {
      showToast(`Comienza tu horario de descanso: ${schedule.name}.`);
    }
  });
}

window.setInterval(checkReminder, 30000);

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.screen) {
    if (state.screen !== target.dataset.screen && state.breathing) stopBreathing();
    if (target.dataset.screen === "goals") {
      state.goalsReturn = state.screen === "settings" ? "settings" : "space";
    }
    if (target.dataset.screen === "rest") {
      state.restReturn = state.screen === "settings" ? "settings" : "space";
    }
    state.screen = target.dataset.screen;
    render();
    if (target.dataset.helpSection === "contact") {
      const contactSection = screenElement.querySelector("#help-contact");
      if (contactSection) contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return;
  }
  if (target.dataset.history) {
    state.historyReturn = target.dataset.history;
    state.screen = "history";
    render();
    return;
  }
  if (target.dataset.period) {
    state.period = target.dataset.period;
    render();
    return;
  }
  if (target.dataset.pauseType) {
    state.pauseType = target.dataset.pauseType;
    render();
    return;
  }
  if (target.dataset.mindfulPause) {
    state.selectedMindfulPause = target.dataset.mindfulPause;
    render();
    return;
  }
  if (target.dataset.plan) {
    state.selectedPlan = state.selectedPlan === target.dataset.plan ? "" : target.dataset.plan;
    render();
    return;
  }
  if (target.dataset.goalId) {
    const selected = state.goals.selected.includes(target.dataset.goalId);
    const previousGoals = state.goals;
    state.goals = {
      ...state.goals,
      selected: selected
        ? state.goals.selected.filter((id) => id !== target.dataset.goalId)
        : [...state.goals.selected, target.dataset.goalId],
    };
    if (!saveStorage("offtime-goals", state.goals)) {
      state.goals = previousGoals;
      return;
    }
    render();
    showToast(selected ? "Se quitó el objetivo." : "Objetivo elegido. ¡Un paso a la vez!");
    return;
  }
  if (target.dataset.removeGoal) {
    const previousGoals = state.goals;
    state.goals = {
      ...state.goals,
      custom: state.goals.custom.filter((goal) => goal.id !== target.dataset.removeGoal),
      selected: state.goals.selected.filter((id) => id !== target.dataset.removeGoal),
    };
    if (!saveStorage("offtime-goals", state.goals)) {
      state.goals = previousGoals;
      return;
    }
    render();
    showToast("Se eliminó el objetivo personal.");
    return;
  }
  if (target.dataset.removeRestSchedule) {
    const previousSchedules = state.restSchedules;
    state.restSchedules = state.restSchedules.filter((schedule) => schedule.id !== target.dataset.removeRestSchedule);
    if (!saveStorage("offtime-rest-schedules", state.restSchedules)) {
      state.restSchedules = previousSchedules;
      return;
    }
    try {
      window.localStorage.removeItem(`offtime-rest-schedule-${target.dataset.removeRestSchedule}`);
    } catch (error) {
      console.error("No se pudo borrar el registro del horario eliminado.", error);
    }
    render();
    showToast("Se eliminó el horario de descanso.");
    return;
  }
  if (target.dataset.removeReminder) {
    const previousReminders = state.personalReminders;
    state.personalReminders = state.personalReminders.filter((reminder) => reminder.id !== target.dataset.removeReminder);
    if (!saveStorage("offtime-personal-reminders", state.personalReminders)) {
      state.personalReminders = previousReminders;
      return;
    }
    try {
      window.localStorage.removeItem(`offtime-personal-reminder-${target.dataset.removeReminder}`);
    } catch (error) {
      console.error("No se pudo borrar el registro del recordatorio eliminado.", error);
    }
    render();
    showToast("Se eliminó el recordatorio personal.");
    return;
  }
  if (target.dataset.setting) {
    const setting = target.dataset.setting;
    showToast(setting === "Tema" ? "El tema claro ya está activado." : `${setting}: pronto vas a poder personalizar esta opción.`);
    return;
  }
  if (target.dataset.privacyAction === "change-password") {
    showToast("El cambio de contraseña estará disponible al conectar el servicio de acceso.");
    return;
  }
  if (target.dataset.privacyAction === "download-data") {
    const data = {
      exportedAt: new Date().toISOString(),
      profile: state.profile,
      preferences: state.preferences,
      privacy: state.privacy,
      goals: state.goals,
      personalReminders: state.personalReminders,
      restSchedules: state.restSchedules,
      appLimits: state.appLimits,
      pauseHistory: state.pauseHistory,
    };
    const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "offtime-mis-datos.json";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("Descargamos tus datos en un archivo JSON.");
    return;
  }
  if (target.dataset.privacyAction === "delete-account") {
    const confirmed = window.confirm("Esta demo no tiene una cuenta en servidor. Solo se borrarán los datos locales de OFFTIME en este dispositivo; no se enviará una solicitud a ningún servicio. ¿Querés continuar?");
    if (!confirmed) return;

    try {
      ["offtime-preferences", "offtime-pause-history", "offtime-app-limits", "offtime-profile", "offtime-privacy", "offtime-goals", "offtime-personal-reminders", "offtime-rest-schedules", "offtime-last-reminder", "offtime-last-weekly-summary", "offtime-last-goal-reminder", "offtime-last-mindful-reminder"]
        .forEach((key) => window.localStorage.removeItem(key));
      state.personalReminders.forEach(({ id }) => window.localStorage.removeItem(`offtime-personal-reminder-${id}`));
      state.restSchedules.forEach(({ id }) => window.localStorage.removeItem(`offtime-rest-schedule-${id}`));
    } catch (error) {
      console.error("No se pudieron eliminar todos los datos locales de OFFTIME.", error);
      showToast("No se pudieron eliminar los datos. Revisá el almacenamiento del navegador e intentá de nuevo.");
      return;
    }

    state.profile = { name: "", age: "", pronouns: "", personalGoal: "", email: "" };
    state.preferences = { ...defaultPreferences };
    state.privacy = { savePauseHistory: true };
    state.goals = { selected: [], custom: [] };
    state.personalReminders = [];
    state.restSchedules = [];
    state.appLimits = { ...defaultAppLimits };
    state.pauseHistory = [];
    state.screen = "home";
    render();
    showToast("Se eliminaron los datos locales de OFFTIME.");
    return;
  }
  if (target.dataset.action === "start-breathing") {
    startBreathing();
    return;
  }
  if (target.dataset.action === "begin-selected-pause") {
    if (!state.selectedMindfulPause) return;
    state.pauseType = state.selectedMindfulPause;
    startBreathing();
    return;
  }
  if (target.dataset.action === "stop-breathing") {
    finishPause();
    return;
  }
  if (target.dataset.action === "calendar") {
    showToast("Tu resumen muestra el uso de hoy.");
    return;
  }
  if (target.dataset.action === "sign-out") showToast("La sesión de demostración sigue activa.");
});

function startBreathing() {
  state.screen = "pause";
  state.breathing = true;
  state.elapsed = 0;
  state.breathStep = 1;
  breathInterval = window.setInterval(() => {
    state.elapsed += 1;
    state.breathStep = Math.floor(state.elapsed / 4) + 1;
    if (state.elapsed >= 16) {
      finishPause();
      return;
    }
    render();
  }, 1000);
  render();
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.dataset.restSchedule) {
    const previousSchedules = state.restSchedules;
    state.restSchedules = state.restSchedules.map((schedule) =>
      schedule.id === target.dataset.restSchedule ? { ...schedule, enabled: target.checked } : schedule);
    if (!saveStorage("offtime-rest-schedules", state.restSchedules)) {
      state.restSchedules = previousSchedules;
      render();
      return;
    }
    render();
    showToast(target.checked ? "Horario de descanso activado." : "Horario de descanso desactivado.");
    return;
  }

  if (target instanceof HTMLInputElement && target.dataset.personalReminder) {
    const previousReminders = state.personalReminders;
    state.personalReminders = state.personalReminders.map((reminder) =>
      reminder.id === target.dataset.personalReminder ? { ...reminder, enabled: target.checked } : reminder);
    if (!saveStorage("offtime-personal-reminders", state.personalReminders)) {
      state.personalReminders = previousReminders;
      render();
      return;
    }
    render();
    showToast(target.checked ? "Recordatorio personal activado." : "Recordatorio personal desactivado.");
    return;
  }

  if (!(target instanceof HTMLSelectElement) || !target.dataset.appLimit) return;

  const appId = target.dataset.appLimit;
  const limit = Number(target.value);
  if (!Object.prototype.hasOwnProperty.call(defaultAppLimits, appId) || ![0, 30, 45, 60, 90, 120].includes(limit)) {
    showToast("Elegí un límite válido para esta aplicación.");
    render();
    return;
  }

  const previousLimit = getAppLimit(appId);
  state.appLimits[appId] = limit;
  if (!saveStorage("offtime-app-limits", state.appLimits)) {
    state.appLimits[appId] = previousLimit;
    render();
    return;
  }
  render();
  showToast(limit ? `Límite diario actualizado: ${formatLimit(limit)}.` : "Se quitó el límite diario.");
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  if (form.id === "notifications-form") {
    const formData = new FormData(form);
    const time = String(formData.get("time") || "");
    if (!/^\d{2}:\d{2}$/.test(time)) {
      showToast("Elegí un horario válido para las notificaciones.");
      return;
    }

    const nextPreferences = {
      ...state.preferences,
      reminderEnabled: formData.has("breaks"),
      reminderTime: time,
      notificationWeeklySummary: formData.has("weeklySummary"),
      notificationGoals: state.goals.selected.length > 0 && formData.has("goals"),
      notificationMindfulActivities: formData.has("mindfulActivities"),
    };
    const hasEnabledNotifications = nextPreferences.reminderEnabled ||
      nextPreferences.notificationWeeklySummary || nextPreferences.notificationGoals ||
      nextPreferences.notificationMindfulActivities;
    if (hasEnabledNotifications && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const previousPreferences = state.preferences;
    state.preferences = nextPreferences;
    if (!saveStorage("offtime-preferences", state.preferences)) {
      state.preferences = previousPreferences;
      return;
    }
    showToast("Se guardaron tus opciones de notificaciones.");
    render();
    return;
  }

  if (form.id === "rest-schedule-form") {
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const start = String(formData.get("start") || "");
    const end = String(formData.get("end") || "");
    const days = formData.getAll("days").map(String);
    if (!name || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || days.length === 0) {
      showToast("Completá el nombre, las horas y elegí al menos un día.");
      return;
    }
    const previousSchedules = state.restSchedules;
    state.restSchedules = [...state.restSchedules, {
      id: `rest-${Date.now()}`,
      name,
      start,
      end,
      days,
      enabled: true,
    }];
    if (!saveStorage("offtime-rest-schedules", state.restSchedules)) {
      state.restSchedules = previousSchedules;
      return;
    }
    showToast("Se guardó tu horario personalizado.");
    render();
    return;
  }

  if (form.id === "custom-goal-form") {
    const title = String(new FormData(form).get("goal") || "").trim();
    if (!title) {
      showToast("Escribí tu objetivo personal.");
      return;
    }
    const previousGoals = state.goals;
    const goal = { id: `custom-${Date.now()}`, icon: "✦", title };
    state.goals = {
      ...state.goals,
      custom: [...state.goals.custom, goal],
      selected: [...state.goals.selected, goal.id],
    };
    if (!saveStorage("offtime-goals", state.goals)) {
      state.goals = previousGoals;
      return;
    }
    showToast("Se agregó y eligió tu objetivo personal.");
    render();
    return;
  }

  if (form.id === "personal-reminder-form") {
    const formData = new FormData(form);
    const time = String(formData.get("time") || "");
    const message = String(formData.get("message") || "").trim();
    if (!/^\d{2}:\d{2}$/.test(time) || !message) {
      showToast("Elegí una hora y escribí el mensaje del recordatorio.");
      return;
    }
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    const previousReminders = state.personalReminders;
    state.personalReminders = [...state.personalReminders, {
      id: `reminder-${Date.now()}`,
      time,
      message,
      enabled: true,
    }];
    if (!saveStorage("offtime-personal-reminders", state.personalReminders)) {
      state.personalReminders = previousReminders;
      return;
    }
    showToast("Se agregó tu recordatorio personal.");
    render();
    return;
  }

  if (form.id === "help-contact-form") {
    const formData = new FormData(form);
    const category = String(formData.get("category") || "").trim();
    const message = String(formData.get("message") || "").trim();
    if (!category || !message) {
      showToast("Elegí un tipo de mensaje y escribí tu consulta.");
      return;
    }
    const subject = `OFFTIME - ${category}`;
    const body = `${category}\n\n${message}\n\nEnviado desde OFFTIME.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast("Se preparó un borrador. Agregá la dirección de soporte para enviarlo.");
    return;
  }

  if (form.id === "privacy-form") {
    const previousPrivacy = state.privacy;
    state.privacy = { savePauseHistory: new FormData(form).has("savePauseHistory") };
    if (!saveStorage("offtime-privacy", state.privacy)) {
      state.privacy = previousPrivacy;
      return;
    }
    showToast("Tus preferencias de privacidad se guardaron en este dispositivo.");
    render();
    return;
  }

  if (form.id === "privacy-email-form") {
    const previousProfile = state.profile;
    state.profile = { ...state.profile, email: String(new FormData(form).get("email") || "").trim() };
    if (!saveStorage("offtime-profile", state.profile)) {
      state.profile = previousProfile;
      return;
    }
    showToast("Tu correo se guardó en este dispositivo.");
    render();
    return;
  }

  if (form.id === "profile-form") {
    const formData = new FormData(form);
    const ageValue = String(formData.get("age") || "").trim();
    const age = ageValue ? Number(ageValue) : "";
    if (ageValue && (!Number.isInteger(age) || age < 13 || age > 120)) {
      showToast("Ingresá una edad entre 13 y 120, o dejá el campo vacío.");
      return;
    }

    const previousProfile = state.profile;
    state.profile = {
      name: String(formData.get("name") || "").trim(),
      age,
      pronouns: String(formData.get("pronouns") || ""),
      personalGoal: String(formData.get("personalGoal") || ""),
      email: state.profile.email || "",
    };
    if (!saveStorage("offtime-profile", state.profile)) {
      state.profile = previousProfile;
      return;
    }
    showToast("Tu perfil se guardó en este dispositivo.");
    render();
    return;
  }

  if (form.id === "goal-form") {
    const hours = Number(new FormData(form).get("dailyGoal"));
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      showToast("La meta debe estar entre 1 y 24 horas.");
      return;
    }
    state.preferences.dailyGoalMinutes = Math.round(hours * 60);
    if (saveStorage("offtime-preferences", state.preferences)) {
      showToast("Meta diaria guardada.");
      render();
    }
    return;
  }

  if (form.id === "reminder-form") {
    const formData = new FormData(form);
    const enabled = formData.has("enabled");
    const time = String(formData.get("time") || "");
    if (!/^\d{2}:\d{2}$/.test(time)) {
      showToast("Elegí una hora válida para el recordatorio.");
      return;
    }
    if (enabled && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    state.preferences.reminderEnabled = enabled;
    state.preferences.reminderTime = time;
    if (saveStorage("offtime-preferences", state.preferences)) {
      showToast(enabled ? `Recordatorio guardado para las ${time}.` : "Recordatorio desactivado.");
      render();
    }
  }
});

render();
