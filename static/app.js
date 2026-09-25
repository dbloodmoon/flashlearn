"use strict";

/* ============ Constantes ============ */
const STORAGE_KEY = "flashlearn_token";
const $ = (sel) => document.querySelector(sel);
const view = $("#view");

/* ============ Estado ============ */
let usuario = null;
let token = localStorage.getItem(STORAGE_KEY) || null;

/* Estado del repaso: vive fuera de renderReview para sobrevivir un re-render
   por cambio de idioma sin perder la cola ni el avance. */
const review = { cola: null, idx: 0, respondidas: 0, result: null };

function resetReview() {
  review.cola = null;
  review.idx = 0;
  review.respondidas = 0;
  review.result = null;
}

/* Errores del backend que sí queremos traducir (el resto se muestra tal cual). */
const API_ERROR_KEYS = {
  "Credenciales incorrectas": "err.badCredentials",
  "El usuario ya existe": "err.userExists"
};

/* ============ Idioma ============ */
const LANGS = [["es", "ES"], ["en", "EN"]];

function langSwitchHtml() {
  const actual = getLang();
  return LANGS.map(([code, label]) => `
    <button type="button" class="lang-opt${code === actual ? " is-active" : ""}"
            data-lang="${code}" aria-pressed="${code === actual}">${label}</button>`).join("");
}

function wireLangSwitch(root) {
  root.setAttribute("aria-label", t("lang.label"));
  root.querySelectorAll("[data-lang]").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.dataset.lang !== getLang()) setLang(b.dataset.lang);
    });
  });
}

/* ============ Utilidades ============ */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toast(msg, type = "") {
  const el = document.createElement("div");
  el.className = `toast ${type}`.trim();
  el.textContent = msg;
  $("#toast-root").appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .3s ease";
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function leerDetalle(msj) {
  if (!msj) return t("err.generic");
  if (typeof msj === "string") {
    const key = API_ERROR_KEYS[msj];
    return key ? t(key) : msj;
  }
  if (Array.isArray(msj)) return msj.map((m) => m.msg || String(m)).join(" · ");
  return String(msj);
}

/* ============ Cliente API ============ */
async function api(path, opts = {}) {
  const headers = {};
  if (token) headers["Authorization"] = "Bearer " + token;

  let body = null;
  if (opts.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(opts.form).toString();
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let res;
  try {
    res = await fetch(path, { method: opts.method || "GET", headers, body });
  } catch {
    throw new Error(t("err.connection"));
  }

  if (res.status === 401 && !opts.public) {
    cerrarSesion(false);
    throw new Error(t("err.sessionExpired"));
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }

  if (!res.ok) {
    throw new Error(leerDetalle(data?.detail));
  }
  return data;
}

/* ============ Autenticación ============ */
async function cargarUsuario() {
  try {
    usuario = await api("/usuarios/yo");
  } catch {
    usuario = null;
  }
  return usuario;
}

function cerrarSesion(toastear = true) {
  token = null;
  usuario = null;
  localStorage.removeItem(STORAGE_KEY);
  resetReview();
  if (toastear) toast(t("tb.sessionClosed"));
  navegar("#/login");
}

function mostrarBarra() {
  const barra = $("#topbar");
  barra.hidden = !usuario;
  $("#who").textContent = usuario ? "@" + usuario.username : "";
  $("#btn-logout").textContent = t("tb.logout");
  const sw = $("#lang-switch-top");
  sw.innerHTML = langSwitchHtml();
  wireLangSwitch(sw);
}

function requireAuth() {
  if (!token) {
    navegar("#/login");
    return false;
  }
  return true;
}

/* ============ Router ============ */
function navegar(hash) {
  location.hash = hash;
}

async function render() {
  const hash = location.hash || "#/dashboard";

  if (!usuario && token) await cargarUsuario();
  mostrarBarra();

  if (hash !== "#/review") resetReview();

  if (hash.startsWith("#/deck/")) {
    if (!requireAuth()) return;
    const id = hash.split("/")[2];
    await renderDeck(id);
  } else if (hash === "#/review") {
    if (!requireAuth()) return;
    await renderReview();
  } else if (hash.startsWith("#/login")) {
    renderAuth();
  } else {
    if (!requireAuth()) return;
    await renderDashboard();
  }
}

window.addEventListener("hashchange", render);

document.addEventListener("langchange", () => {
  pintarChrome();
  render();
});

/* Texto del HTML estático (skip link y botón de salida). */
function pintarChrome() {
  syncHtmlLang();
  $("#skip-link").textContent = t("a11y.skip");
  $("#btn-logout").textContent = t("tb.logout");
}

/* ============ Vista: Auth ============ */
function renderAuth() {
  view.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <span class="brand">
          <span class="brand-mark" aria-hidden="true"></span>
          <span class="brand-name">Flashlearn</span>
        </span>
        <div class="auth-tabs" role="tablist">
          <button class="auth-tab" role="tab" id="tab-login" aria-selected="true">${t("auth.login")}</button>
          <button class="auth-tab" role="tab" id="tab-register" aria-selected="false">${t("auth.register")}</button>
        </div>
        <form id="auth-form" novalidate>
          <div id="form-error" class="form-error" hidden></div>
          <div class="field">
            <label for="f-user">${t("auth.user")}</label>
            <input id="f-user" name="username" autocomplete="username" minlength="3" maxlength="25" required>
          </div>
          <div class="field" id="field-pass">
            <label for="f-pass">${t("auth.password")}</label>
            <input id="f-pass" name="password" type="password"
                   autocomplete="current-password" minlength="6" maxlength="120" required>
          </div>
          <button class="primary" id="submit-auth" type="submit" style="width:100%; justify-content:center;">${t("auth.login")}</button>
        </form>
        <div class="lang-switch auth-lang" id="lang-switch-auth" role="group"></div>
      </div>
    </div>`;

  const swAuth = $("#lang-switch-auth");
  swAuth.innerHTML = langSwitchHtml();
  wireLangSwitch(swAuth);

  let modo = "login";
  const tabs = { login: $("#tab-login"), register: $("#tab-register") };
  const btn = $("#submit-auth");
  const err = $("#form-error");

  function setModo(m) {
    modo = m;
    tabs.login.setAttribute("aria-selected", String(m === "login"));
    tabs.register.setAttribute("aria-selected", String(m === "register"));
    btn.textContent = m === "login" ? t("auth.login") : t("auth.register");
    $("#f-pass").autocomplete = m === "login" ? "current-password" : "new-password";
    err.hidden = true;
  }

  tabs.login.addEventListener("click", () => setModo("login"));
  tabs.register.addEventListener("click", () => setModo("register"));

  $("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $("#f-user").value.trim();
    const password = $("#f-pass").value;
    err.hidden = true;

    try {
      if (modo === "login") {
        const data = await api("/usuarios/login", {
          method: "POST",
          public: true,
          form: { username, password },
        });
        token = data.access_token;
        localStorage.setItem(STORAGE_KEY, token);
      } else {
        await api("/usuarios/registrar", {
          method: "POST",
          public: true,
          body: { username, password },
        });
        const data = await api("/usuarios/login", {
          method: "POST",
          public: true,
          form: { username, password },
        });
        token = data.access_token;
        localStorage.setItem(STORAGE_KEY, token);
        toast(t("auth.welcome"), "success");
      }
      usuario = await api("/usuarios/yo");
      navegar("#/dashboard");
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
}

/* ============ Vista: Dashboard ============ */
async function renderDashboard() {
  view.innerHTML = `
    <div class="container">
      <div class="page-head">
        <div>
          <h1>${t("dash.title")}</h1>
          <p class="sub">${t("dash.subtitle")}</p>
        </div>
        <div class="head-actions">
          <a class="outline" href="#/review" style="text-decoration:none; display:inline-flex; align-items:center;">${t("dash.reviewNow")}</a>
          <button class="primary" id="btn-nuevo-mazo">${t("dash.newDeck")}</button>
        </div>
      </div>
      <div id="deck-grid" class="deck-grid">
        <div class="empty" style="grid-column:1/-1;"><p class="muted">${t("dash.loading")}</p></div>
      </div>
    </div>`;

  $("#btn-nuevo-mazo").addEventListener("click", async () => {
    const datos = await modalMazo();
    if (!datos) return;
    try {
      await api("/mazos", { method: "POST", body: datos });
      toast(t("dash.created"), "success");
      render();
    } catch (ex) { toast(ex.message, "error"); }
  });

  let mazos;
  try {
    mazos = await api("/mazos");
  } catch (ex) {
    toast(ex.message, "error");
    return;
  }

  if (!mazos.length) {
    $("#deck-grid").innerHTML = `
      <div class="empty" style="grid-column:1/-1;">
        <div class="glyph" aria-hidden="true">✦</div>
        <h2>${t("dash.emptyTitle")}</h2>
        <p>${t("dash.emptyText")}</p>
        <button class="primary" id="btn-primer-mazo">${t("dash.emptyCta")}</button>
      </div>`;
    $("#btn-primer-mazo").addEventListener("click", async () => {
      const datos = await modalMazo();
      if (!datos) return;
      try {
        await api("/mazos", { method: "POST", body: datos });
        toast(t("dash.created"), "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
    return;
  }

  const conteos = await Promise.allSettled(
    mazos.map((m) => api(`/mazo/${m.id}/tarjetas`))
  );

  $("#deck-grid").innerHTML = mazos.map((mazo, i) => {
    const n = conteos[i].status === "fulfilled" ? conteos[i].value.length : 0;
    const desc = mazo.descripcion || t("noDescription");
    return `
      <a class="deck-card" href="#/deck/${mazo.id}" data-mazo="${mazo.id}">
        <div class="deck-count"><big>${n}</big><span>${tp("cards.sing", "cards.plur", n)}</span></div>
        <div class="deck-menu">
          <button class="icon-btn" data-edit title="${t("editDeck")}" aria-label="${t("editDeck")}">✎</button>
          <button class="icon-btn danger" data-del title="${t("deleteDeck")}" aria-label="${t("deleteDeck")}">✕</button>
        </div>
        <h2>${escapeHtml(mazo.nombre)}</h2>
        <p class="deck-desc">${escapeHtml(desc)}</p>
      </a>`;
  }).join("");

  $("#deck-grid").querySelectorAll("[data-edit]").forEach((b) => {
    b.addEventListener("click", async (e) => {
      e.preventDefault();
      const mazo = mazos[Number(b.closest(".deck-card").dataset.mazo)] &&
        mazos.find((m) => String(m.id) === b.closest(".deck-card").dataset.mazo);
      if (!mazo) return;
      const datos = await modalMazo({ nombre: mazo.nombre, descripcion: mazo.descripcion, title: t("modal.editDeck") });
      if (!datos) return;
      try {
        await api(`/mazo/${mazo.id}`, { method: "PUT", body: datos });
        toast(t("dash.updated"), "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
  });

  $("#deck-grid").querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", async (e) => {
      e.preventDefault();
      const mazo = mazos.find((m) => String(m.id) === b.closest(".deck-card").dataset.mazo);
      if (!mazo) return;
      if (!confirm(t("dash.confirmDelete", { name: mazo.nombre }))) return;
      try {
        await api(`/mazo/${mazo.id}`, { method: "DELETE" });
        toast(t("dash.deleted"), "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
  });
}

/* ============ Vista: Detalle de mazo ============ */
async function renderDeck(id) {
  view.innerHTML = `
    <div class="container">
      <div class="crumb">
        <a href="#/dashboard">${t("deck.decksCrumb")}</a><span aria-hidden="true">/</span><span id="crumb-name">…</span>
      </div>
      <div class="page-head">
        <div>
          <h1 id="deck-title">…</h1>
          <p class="sub" id="deck-desc"></p>
        </div>
        <div class="head-actions">
          <a class="outline" href="#/review">${t("deck.review")}</a>
          <button class="primary" id="btn-nueva-tarjeta">${t("deck.newCard")}</button>
        </div>
      </div>
      <div id="card-list" class="card-list"><p class="muted">${t("dash.loading")}</p></div>
    </div>`;

  let mazo, tarjetas;
  try {
    [mazo, tarjetas] = await Promise.all([api(`/mazo/${id}`), api(`/mazo/${id}/tarjetas`)]);
  } catch (ex) {
    toast(ex.message, "error");
    navegar("#/dashboard");
    return;
  }

  $("#deck-title").textContent = mazo.nombre;
  $("#crumb-name").textContent = mazo.nombre;
  $("#deck-desc").textContent = mazo.descripcion || t("noDescription");

  $("#btn-nueva-tarjeta").addEventListener("click", async () => {
    const datos = await modalTarjeta({ mazo_id: Number(id) });
    if (!datos) return;
    try {
      await api("/mazos/tarjetas", { method: "POST", body: datos });
      toast(t("deck.cardAdded"), "success");
      render();
    } catch (ex) { toast(ex.message, "error"); }
  });

  if (!tarjetas.length) {
    $("#card-list").innerHTML = `
      <div class="empty">
        <div class="glyph" aria-hidden="true">✦</div>
        <h2>${t("deck.emptyTitle")}</h2>
        <p>${t("deck.emptyText")}</p>
        <button class="primary" id="btn-primera-tarjeta">${t("deck.emptyCta")}</button>
      </div>`;
    $("#btn-primera-tarjeta").addEventListener("click", async () => {
      const datos = await modalTarjeta({ mazo_id: Number(id) });
      if (!datos) return;
      try {
        await api("/mazos/tarjetas", { method: "POST", body: datos });
        toast(t("deck.cardAdded"), "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
    return;
  }

  $("#card-list").innerHTML = tarjetas.map((tarjeta) => `
    <div class="card-row" data-tarjeta="${tarjeta.id}">
      <div class="card-row-main" role="button" tabindex="0" aria-expanded="false" data-toggle>
        <div>
          <div class="card-q">${escapeHtml(tarjeta.pregunta)}</div>
          <div class="card-a">${escapeHtml(tarjeta.respuesta)}</div>
        </div>
        <div class="row-actions">
          <button class="icon-btn" data-edit title="${t("editCard")}" aria-label="${t("editCard")}">✎</button>
          <button class="icon-btn danger" data-del title="${t("deleteCard")}" aria-label="${t("deleteCard")}">✕</button>
        </div>
      </div>
    </div>`).join("");

  $("#card-list").querySelectorAll("[data-toggle]").forEach((row) => {
    const contenedor = row.closest(".card-row");
    const expand = () => {
      const ya = row.getAttribute("aria-expanded") === "true";
      contenedor.querySelectorAll(".card-answer").forEach((c) => c.remove());
      row.setAttribute("aria-expanded", "false");
      if (!ya) {
        const ans = document.createElement("div");
        ans.className = "card-answer";
        ans.innerHTML = `<span class="lbl">${t("deck.answer")}</span>${escapeHtml(
          contenedor.querySelector(".card-a").textContent
        )}`;
        contenedor.appendChild(ans);
        row.setAttribute("aria-expanded", "true");
      }
    };
    row.addEventListener("click", expand);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); expand(); }
    });
  });

  $("#card-list").querySelectorAll("[data-edit]").forEach((b) => {
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      const tarjeta = tarjetas.find((x) => String(x.id) === b.closest(".card-row").dataset.tarjeta);
      const datos = await modalTarjeta({ pregunta: tarjeta.pregunta, respuesta: tarjeta.respuesta, title: t("modal.editCard") });
      if (!datos) return;
      try {
        await api(`/tarjeta/${tarjeta.id}`, { method: "PUT", body: datos });
        toast(t("deck.cardUpdated"), "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
  });

  $("#card-list").querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      const tarjeta = tarjetas.find((x) => String(x.id) === b.closest(".card-row").dataset.tarjeta);
      if (!confirm(t("deck.confirmDeleteCard"))) return;
      try {
        await api(`/tarjeta/${tarjeta.id}`, { method: "DELETE" });
        toast(t("deck.cardDeleted"), "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
  });
}

/* ============ Vista: Repaso ============ */
async function renderReview() {
  if (!review.cola) {
    try {
      review.cola = await api("/tarjetas/repasar");
    } catch (ex) {
      toast(ex.message, "error");
      return;
    }
  }
  const cola = review.cola;

  if (!cola.length) {
    view.innerHTML = `
      <div class="container"><div class="review-shell">
        <div class="empty">
          <div class="glyph" aria-hidden="true">✓</div>
          <h2>${t("rev.noneTitle")}</h2>
          <p>${t("rev.noneText")}</p>
          <a class="primary" href="#/dashboard" style="text-decoration:none; display:inline-flex;">${t("rev.back")}</a>
        </div>
      </div></div>`;
    return;
  }

  view.innerHTML = `
    <div class="container"><div class="review-shell">
      <div class="crumb"><a href="#/dashboard">${t("deck.decksCrumb")}</a><span aria-hidden="true">/</span><span>${t("rev.review")}</span></div>
      <div class="review-meta">
        <span id="rev-progress-text">${t("rev.counter", { cur: 1, total: cola.length })}</span>
        <span>${t("rev.deckLabel")} <strong id="rev-mazo">…</strong></span>
      </div>
      <div class="progress-track"><div class="progress-fill" id="rev-progress"></div></div>

      <div class="flip-wrap">
        <div class="flip-card" id="flip-card">
          <div class="face front">
            <span class="face-lbl">${t("rev.question")}</span>
            <span class="face-txt" id="rev-q"></span>
          </div>
          <div class="face back">
            <span class="face-lbl">${t("rev.answer")}</span>
            <span class="face-txt" id="rev-a"></span>
          </div>
        </div>
      </div>
      <p class="hint-flip">${t("rev.hint")}</p>

      <div class="grade-pad" id="grade-pad"></div>
      <div id="rev-result"></div>
      <div id="rev-done"></div>
    </div></div>`;

  const card = $("#flip-card");

  card.addEventListener("click", () => {
    card.classList.toggle("is-flipped");
    card.setAttribute("aria-label", card.classList.contains("is-flipped") ? t("rev.showQuestion") : t("rev.showAnswer"));
  });

  function pintarResultado() {
    const { ok, dias } = review.result;
    $("#rev-result").innerHTML = `
      <div class="review-result ${ok ? "ok" : "fail"}">
        <span class="verdict">${ok ? t("rev.ok") : t("rev.rescheduled")}</span>
        <span class="next">${t("rev.nextPrefix")} <strong>${tp("rev.nextOne", "rev.nextMany", dias)}</strong></span>
      </div>
      <div style="text-align:center; margin-top:14px;">
        <button class="primary" id="btn-next">${t("rev.nextCard")}</button>
      </div>`;
    $("#btn-next").addEventListener("click", siguiente);
  }

  function mostrar(tarjeta) {
    $("#rev-q").textContent = tarjeta.pregunta;
    $("#rev-a").textContent = tarjeta.respuesta;
    $("#rev-mazo").textContent = tarjeta.mazo?.nombre || "—";
    card.classList.remove("is-flipped");
    card.setAttribute("aria-label", t("rev.showAnswer"));

    $("#rev-result").innerHTML = "";
    if (review.result) {
      $("#grade-pad").innerHTML = "";
      pintarResultado();
    } else {
      $("#grade-pad").innerHTML = [
        [1, t("rev.g1")],
        [2, t("rev.g2")],
        [3, t("rev.g3")],
        [4, t("rev.g4")],
        [5, t("rev.g5")],
      ].map(([g, lbl]) =>
        `<button class="grade-btn" data-grade="${g}" type="button"><b>${g}</b><span>${lbl}</span></button>`
      ).join("");

      $("#grade-pad").querySelectorAll(".grade-btn").forEach((b) => {
        b.addEventListener("click", () => calificar(tarjeta, Number(b.dataset.grade)));
      });
    }
  }

  async function calificar(tarjeta, g) {
    $("#grade-pad").innerHTML = "";
    try {
      const res = await api(`/tarjeta/${tarjeta.id}/repasar`, { method: "POST", body: { calificacion: g } });
      review.result = { ok: g >= 3, dias: res.intervalo_dias };
      review.respondidas += 1;
      pintarResultado();
      $("#rev-progress").style.width = `${(review.respondidas / cola.length) * 100}%`;
      $("#rev-progress-text").textContent = t("rev.counter", {
        cur: Math.min(review.respondidas + 1, cola.length),
        total: cola.length
      });
    } catch (ex) {
      review.result = null;
      toast(ex.message, "error");
      mostrar(tarjeta);
    }
  }

  function siguiente() {
    review.idx += 1;
    review.result = null;
    if (review.idx >= cola.length) {
      $("#rev-done").innerHTML = `
        <div class="review-done">
          <p class="muted">${t("rev.done")}</p>
          <div class="big">${review.respondidas}</div>
          <p class="sub" style="color: var(--ink-soft); margin-bottom: 22px;">${t("rev.reviewedToday")}</p>
          <a class="primary" href="#/dashboard" style="text-decoration:none; display:inline-flex;">${t("rev.back")}</a>
        </div>`;
      $("#grade-pad").innerHTML = "";
      $("#rev-result").innerHTML = "";
      return;
    }
    mostrar(cola[review.idx]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("#rev-progress").style.width = `${(review.respondidas / cola.length) * 100}%`;
  mostrar(cola[review.idx]);
}

/* ============ Modales ============ */
function modalBase(title, body, onGuardar) {
  return new Promise((resolve) => {
    const root = $("#modal-root");
    root.hidden = false;
    root.innerHTML = `
      <div class="modal-scrim" data-scrim>
        <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
          <h2>${escapeHtml(title)}</h2>
          <form data-form novalidate>
            ${body}
            <div class="modal-foot">
              <button class="outline" data-cancel type="button">${t("modal.cancel")}</button>
              <button class="primary" data-ok type="submit">${t("modal.save")}</button>
            </div>
          </form>
        </div>
      </div>`;

    const primerInput = root.querySelector("input, textarea");
    if (primerInput) setTimeout(() => primerInput.focus(), 0);

    const cerrar = (valor) => {
      root.innerHTML = "";
      root.hidden = true;
      document.removeEventListener("keydown", keyHandler);
      resolve(valor);
    };

    const keyHandler = (e) => {
      if (e.key === "Escape") { e.preventDefault(); cerrar(null); }
    };
    document.addEventListener("keydown", keyHandler);
    root.querySelector("[data-scrim]").addEventListener("mousedown", (e) => {
      if (e.target === e.currentTarget) cerrar(null);
    });
    root.querySelector("[data-cancel]").addEventListener("click", () => cerrar(null));

    root.querySelector("[data-form]").addEventListener("submit", (e) => {
      e.preventDefault();
      const valor = onGuardar();
      if (valor === false) return;
      cerrar(valor);
    });
  });
}

function modalMazo(props = {}) {
  const title = props.title || t("modal.newDeck");
  const body = `
    <div id="modal-err" class="form-error" hidden></div>
    <div class="field">
      <label for="m-nombre">${t("modal.name")}</label>
      <input id="m-nombre" name="nombre" maxlength="50" value="${escapeHtml(props.nombre || "")}" required>
    </div>
    <div class="field">
      <label for="m-desc">${t("modal.description")} <span class="muted">${t("modal.optional")}</span></label>
      <textarea id="m-desc" name="descripcion" maxlength="255" rows="3">${escapeHtml(props.descripcion || "")}</textarea>
    </div>`;

  return modalBase(title, body, () => {
    const err = $("#modal-err");
    const nombre = $("#m-nombre").value.trim();
    const descripcion = $("#m-desc").value.trim();
    if (!nombre) {
      err.textContent = t("modal.errName");
      err.hidden = false;
      return false;
    }
    return { nombre, descripcion };
  });
}

function modalTarjeta(props = {}) {
  const title = props.title || t("modal.newCard");
  const body = `
    <div id="modal-err" class="form-error" hidden></div>
    <div class="field">
      <label for="c-pregunta">${t("modal.pregunta")}</label>
      <input id="c-pregunta" name="pregunta" maxlength="255" value="${escapeHtml(props.pregunta || "")}" required>
    </div>
    <div class="field">
      <label for="c-respuesta">${t("modal.respuesta")}</label>
      <input id="c-respuesta" name="respuesta" maxlength="255" value="${escapeHtml(props.respuesta || "")}" required>
    </div>`;

  return modalBase(title, body, () => {
    const err = $("#modal-err");
    const pregunta = $("#c-pregunta").value.trim();
    const respuesta = $("#c-respuesta").value.trim();
    if (!pregunta || !respuesta) {
      err.textContent = t("modal.errCard");
      err.hidden = false;
      return false;
    }
    const valor = { pregunta, respuesta };
    if (props.mazo_id !== undefined) valor.mazo_id = props.mazo_id;
    return valor;
  });
}

/* ============ Init ============ */
pintarChrome();
$("#btn-logout").addEventListener("click", () => cerrarSesion());
render();