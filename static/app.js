"use strict";

/* ============ Constantes ============ */
const STORAGE_KEY = "flashlearn_token";
const $ = (sel) => document.querySelector(sel);
const view = $("#view");

/* ============ Estado ============ */
let usuario = null;
let token = localStorage.getItem(STORAGE_KEY) || null;

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
  if (!msj) return "Ocurrió un error";
  if (typeof msj === "string") return msj;
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
    throw new Error("No se pudo conectar con el servidor");
  }

  if (res.status === 401 && !opts.public) {
    cerrarSesion(false);
    throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
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
  if (toastear) toast("Sesión cerrada");
  navegar("#/login");
}

function mostrarBarra() {
  const barra = $("#topbar");
  barra.hidden = !usuario;
  $("#who").textContent = usuario ? "@" + usuario.username : "";
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
          <button class="auth-tab" role="tab" id="tab-login" aria-selected="true">Iniciar sesión</button>
          <button class="auth-tab" role="tab" id="tab-register" aria-selected="false">Crear cuenta</button>
        </div>
        <form id="auth-form" novalidate>
          <div id="form-error" class="form-error" hidden></div>
          <div class="field">
            <label for="f-user">Usuario</label>
            <input id="f-user" name="username" autocomplete="username" minlength="3" maxlength="25" required>
          </div>
          <div class="field" id="field-pass">
            <label for="f-pass">Contraseña</label>
            <input id="f-pass" name="password" type="password"
                   autocomplete="current-password" minlength="6" maxlength="120" required>
          </div>
          <button class="primary" id="submit-auth" type="submit" style="width:100%; justify-content:center;">Iniciar sesión</button>
        </form>
      </div>
    </div>`;

  let modo = "login";
  const tabs = { login: $("#tab-login"), register: $("#tab-register") };
  const btn = $("#submit-auth");
  const err = $("#form-error");

  function setModo(m) {
    modo = m;
    tabs.login.setAttribute("aria-selected", String(m === "login"));
    tabs.register.setAttribute("aria-selected", String(m === "register"));
    btn.textContent = m === "login" ? "Iniciar sesión" : "Crear cuenta";
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
        toast("Cuenta creada. ¡Bienvenido!", "success");
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
          <h1>Tus mazos</h1>
          <p class="sub">Crea mazos de estudio y repasa con repetición espaciada.</p>
        </div>
        <div class="head-actions">
          <a class="outline" href="#/review" style="text-decoration:none; display:inline-flex; align-items:center;">Repasar ahora</a>
          <button class="primary" id="btn-nuevo-mazo">+ Nuevo mazo</button>
        </div>
      </div>
      <div id="deck-grid" class="deck-grid">
        <div class="empty" style="grid-column:1/-1;"><p class="muted">Cargando…</p></div>
      </div>
    </div>`;

  $("#btn-nuevo-mazo").addEventListener("click", async () => {
    const datos = await modalMazo();
    if (!datos) return;
    try {
      await api("/mazos", { method: "POST", body: datos });
      toast("Mazo creado", "success");
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
        <h2>Empieza tu primer mazo</h2>
        <p>Crea un mazo con las preguntas que quieras dominar y Flashlearn decide cuándo repasar cada una.</p>
        <button class="primary" id="btn-primer-mazo">+ Crear mi primer mazo</button>
      </div>`;
    $("#btn-primer-mazo").addEventListener("click", async () => {
      const datos = await modalMazo();
      if (!datos) return;
      try {
        await api("/mazos", { method: "POST", body: datos });
        toast("Mazo creado", "success");
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
    const desc = mazo.descripcion || "Sin descripción";
    return `
      <a class="deck-card" href="#/deck/${mazo.id}" data-mazo="${mazo.id}">
        <div class="deck-count"><big>${n}</big><span>${n === 1 ? "tarjeta" : "tarjetas"}</span></div>
        <div class="deck-menu">
          <button class="icon-btn" data-edit title="Editar mazo" aria-label="Editar mazo">✎</button>
          <button class="icon-btn danger" data-del title="Eliminar mazo" aria-label="Eliminar mazo">✕</button>
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
      const datos = await modalMazo({ nombre: mazo.nombre, descripcion: mazo.descripcion, title: "Editar mazo" });
      if (!datos) return;
      try {
        await api(`/mazo/${mazo.id}`, { method: "PUT", body: datos });
        toast("Mazo actualizado", "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
  });

  $("#deck-grid").querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", async (e) => {
      e.preventDefault();
      const mazo = mazos.find((m) => String(m.id) === b.closest(".deck-card").dataset.mazo);
      if (!mazo) return;
      if (!confirm(`¿Eliminar el mazo "${mazo.nombre}" y todas sus tarjetas?`)) return;
      try {
        await api(`/mazo/${mazo.id}`, { method: "DELETE" });
        toast("Mazo eliminado", "success");
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
        <a href="#/dashboard">Mazos</a><span aria-hidden="true">/</span><span id="crumb-name">…</span>
      </div>
      <div class="page-head">
        <div>
          <h1 id="deck-title">…</h1>
          <p class="sub" id="deck-desc"></p>
        </div>
        <div class="head-actions">
          <a class="outline" href="#/review">Repasar</a>
          <button class="primary" id="btn-nueva-tarjeta">+ Nueva tarjeta</button>
        </div>
      </div>
      <div id="card-list" class="card-list"><p class="muted">Cargando…</p></div>
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
  $("#deck-desc").textContent = mazo.descripcion || "Sin descripción";

  $("#btn-nueva-tarjeta").addEventListener("click", async () => {
    const datos = await modalTarjeta({ mazo_id: Number(id) });
    if (!datos) return;
    try {
      await api("/mazos/tarjetas", { method: "POST", body: datos });
      toast("Tarjeta añadida", "success");
      render();
    } catch (ex) { toast(ex.message, "error"); }
  });

  if (!tarjetas.length) {
    $("#card-list").innerHTML = `
      <div class="empty">
        <div class="glyph" aria-hidden="true">✦</div>
        <h2>Este mazo está vacío</h2>
        <p>Añade el par pregunta–respuesta que quieras memorizar.</p>
        <button class="primary" id="btn-primera-tarjeta">+ Crear la primera tarjeta</button>
      </div>`;
    $("#btn-primera-tarjeta").addEventListener("click", async () => {
      const datos = await modalTarjeta({ mazo_id: Number(id) });
      if (!datos) return;
      try {
        await api("/mazos/tarjetas", { method: "POST", body: datos });
        toast("Tarjeta añadida", "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
    return;
  }

  $("#card-list").innerHTML = tarjetas.map((t) => `
    <div class="card-row" data-tarjeta="${t.id}">
      <div class="card-row-main" role="button" tabindex="0" aria-expanded="false" data-toggle>
        <div>
          <div class="card-q">${escapeHtml(t.pregunta)}</div>
          <div class="card-a">${escapeHtml(t.respuesta)}</div>
        </div>
        <div class="row-actions">
          <button class="icon-btn" data-edit title="Editar tarjeta" aria-label="Editar tarjeta">✎</button>
          <button class="icon-btn danger" data-del title="Eliminar tarjeta" aria-label="Eliminar tarjeta">✕</button>
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
        ans.innerHTML = `<span class="lbl">Respuesta</span>${escapeHtml(
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
      const t = tarjetas.find((x) => String(x.id) === b.closest(".card-row").dataset.tarjeta);
      const datos = await modalTarjeta({ pregunta: t.pregunta, respuesta: t.respuesta, title: "Editar tarjeta" });
      if (!datos) return;
      try {
        await api(`/tarjeta/${t.id}`, { method: "PUT", body: datos });
        toast("Tarjeta actualizada", "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
  });

  $("#card-list").querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      const t = tarjetas.find((x) => String(x.id) === b.closest(".card-row").dataset.tarjeta);
      if (!confirm("¿Eliminar esta tarjeta?")) return;
      try {
        await api(`/tarjeta/${t.id}`, { method: "DELETE" });
        toast("Tarjeta eliminada", "success");
        render();
      } catch (ex) { toast(ex.message, "error"); }
    });
  });
}

/* ============ Vista: Repaso ============ */
async function renderReview() {
  let cola;
  try {
    cola = await api("/tarjetas/repasar");
  } catch (ex) {
    toast(ex.message, "error");
    return;
  }

  if (!cola.length) {
    view.innerHTML = `
      <div class="container"><div class="review-shell">
        <div class="empty">
          <div class="glyph" aria-hidden="true">✓</div>
          <h2>Nada por repasar</h2>
          <p>No hay tarjetas pendientes para hoy. Vuelve cuando el algoritmo lo indique.</p>
          <a class="primary" href="#/dashboard" style="text-decoration:none; display:inline-flex;">Volver a tus mazos</a>
        </div>
      </div></div>`;
    return;
  }

  view.innerHTML = `
    <div class="container"><div class="review-shell">
      <div class="crumb"><a href="#/dashboard">Mazos</a><span aria-hidden="true">/</span><span>Repaso</span></div>
      <div class="review-meta">
        <span id="rev-progress-text">Tarjeta 1 de ${cola.length}</span>
        <span>Mazo: <strong id="rev-mazo">…</strong></span>
      </div>
      <div class="progress-track"><div class="progress-fill" id="rev-progress"></div></div>

      <div class="flip-wrap">
        <div class="flip-card" id="flip-card">
          <div class="face front">
            <span class="face-lbl">Pregunta</span>
            <span class="face-txt" id="rev-q"></span>
          </div>
          <div class="face back">
            <span class="face-lbl">Respuesta</span>
            <span class="face-txt" id="rev-a"></span>
          </div>
        </div>
      </div>
      <p class="hint-flip">Haz clic en la tarjeta para ver la respuesta</p>

      <div class="grade-pad" id="grade-pad"></div>
      <div id="rev-result"></div>
      <div id="rev-done"></div>
    </div></div>`;

  let idx = 0;
  let respondidas = 0;
  const card = $("#flip-card");

  card.addEventListener("click", () => {
    card.classList.toggle("is-flipped");
    card.setAttribute("aria-label", card.classList.contains("is-flipped") ? "Mostrar pregunta" : "Mostrar respuesta");
  });

  function mostrar(tarjeta) {
    $("#rev-q").textContent = tarjeta.pregunta;
    $("#rev-a").textContent = tarjeta.respuesta;
    $("#rev-mazo").textContent = tarjeta.mazo?.nombre || "—";
    card.classList.remove("is-flipped");

    $("#grade-pad").innerHTML = [
      [1, "No lo recordaba"],
      [2, "Difícil"],
      [3, "Regular"],
      [4, "Bien"],
      [5, "Fácil"],
    ].map(([g, lbl]) =>
      `<button class="grade-btn" data-grade="${g}" type="button"><b>${g}</b><span>${lbl}</span></button>`
    ).join("");
    $("#rev-result").innerHTML = "";

    $("#grade-pad").querySelectorAll(".grade-btn").forEach((b) => {
      b.addEventListener("click", () => calificar(tarjeta, Number(b.dataset.grade)));
    });
  }

  async function calificar(tarjeta, g) {
    $("#grade-pad").innerHTML = "";
    try {
      const res = await api(`/tarjeta/${tarjeta.id}/repasar`, { method: "POST", body: { calificacion: g } });
      const ok = g >= 3;
      const dias = res.intervalo_dias;
      $("#rev-result").innerHTML = `
        <div class="review-result ${ok ? "ok" : "fail"}">
          <span class="verdict">${ok ? "Repasada correctamente" : "Se repasará antes"}</span>
          <span class="next">Próxima revisión en <strong>${dias} ${dias === 1 ? "día" : "días"}</strong></span>
        </div>
        <div style="text-align:center; margin-top:14px;">
          <button class="primary" id="btn-next">Siguiente tarjeta</button>
        </div>`;
      respondidas += 1;
      $("#rev-progress").style.width = `${(respondidas / cola.length) * 100}%`;
      $("#rev-progress-text").textContent = `Tarjeta ${Math.min(respondidas + 1, cola.length)} de ${cola.length}`;
      $("#btn-next").addEventListener("click", siguiente);
    } catch (ex) {
      toast(ex.message, "error");
      mostrar(tarjeta);
    }
  }

  function siguiente() {
    idx += 1;
    if (idx >= cola.length) {
      $("#rev-done").innerHTML = `
        <div class="review-done">
          <p class="muted">Sesión completada</p>
          <div class="big">${respondidas}</div>
          <p class="sub" style="color: var(--ink-soft); margin-bottom: 22px;">tarjetas repasadas hoy</p>
          <a class="primary" href="#/dashboard" style="text-decoration:none; display:inline-flex;">Volver a tus mazos</a>
        </div>`;
      $("#grade-pad").innerHTML = "";
      $("#rev-result").innerHTML = "";
      return;
    }
    mostrar(cola[idx]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  mostrar(cola[0]);
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
              <button class="outline" data-cancel type="button">Cancelar</button>
              <button class="primary" data-ok type="submit">Guardar</button>
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
  const title = props.title || "Nuevo mazo";
  const body = `
    <div id="modal-err" class="form-error" hidden></div>
    <div class="field">
      <label for="m-nombre">Nombre</label>
      <input id="m-nombre" name="nombre" maxlength="50" value="${escapeHtml(props.nombre || "")}" required>
    </div>
    <div class="field">
      <label for="m-desc">Descripción <span class="muted">(opcional)</span></label>
      <textarea id="m-desc" name="descripcion" maxlength="255" rows="3">${escapeHtml(props.descripcion || "")}</textarea>
    </div>`;

  return modalBase(title, body, () => {
    const err = $("#modal-err");
    const nombre = $("#m-nombre").value.trim();
    const descripcion = $("#m-desc").value.trim();
    if (!nombre) {
      err.textContent = "El nombre es obligatorio.";
      err.hidden = false;
      return false;
    }
    return { nombre, descripcion };
  });
}

function modalTarjeta(props = {}) {
  const title = props.title || "Nueva tarjeta";
  const body = `
    <div id="modal-err" class="form-error" hidden></div>
    <div class="field">
      <label for="c-pregunta">Pregunta</label>
      <input id="c-pregunta" name="pregunta" maxlength="255" value="${escapeHtml(props.pregunta || "")}" required>
    </div>
    <div class="field">
      <label for="c-respuesta">Respuesta</label>
      <input id="c-respuesta" name="respuesta" maxlength="255" value="${escapeHtml(props.respuesta || "")}" required>
    </div>`;

  return modalBase(title, body, () => {
    const err = $("#modal-err");
    const pregunta = $("#c-pregunta").value.trim();
    const respuesta = $("#c-respuesta").value.trim();
    if (!pregunta || !respuesta) {
      err.textContent = "Pregunta y respuesta son obligatorias.";
      err.hidden = false;
      return false;
    }
    const valor = { pregunta, respuesta };
    if (props.mazo_id !== undefined) valor.mazo_id = props.mazo_id;
    return valor;
  });
}

/* ============ Init ============ */
$("#btn-logout").addEventListener("click", () => cerrarSesion());
render();