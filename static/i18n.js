"use strict";

const I18N = {
  es: {
    "a11y.skip": "Saltar al contenido",

    "lang.label": "Idioma",

    "theme.toDark": "Cambiar a modo oscuro",
    "theme.toLight": "Cambiar a modo claro",

    "auth.login": "Iniciar sesión",
    "auth.register": "Crear cuenta",
    "auth.user": "Usuario",
    "auth.password": "Contraseña",
    "auth.welcome": "Cuenta creada. ¡Bienvenido!",

    "tb.logout": "Cerrar sesión",
    "tb.sessionClosed": "Sesión cerrada",

    "err.generic": "Ocurrió un error",
    "err.connection": "No se pudo conectar con el servidor",
    "err.sessionExpired": "Tu sesión expiró. Vuelve a iniciar sesión.",
    "err.badCredentials": "Credenciales incorrectas",
    "err.userExists": "El usuario ya existe",

    "dash.title": "Tus mazos",
    "dash.subtitle": "Crea mazos de estudio y repasa con repetición espaciada.",
    "dash.reviewNow": "Repasar ahora",
    "dash.newDeck": "+ Nuevo mazo",
    "dash.loading": "Cargando…",
    "dash.emptyTitle": "Empieza tu primer mazo",
    "dash.emptyText": "Crea un mazo con las preguntas que quieras dominar y Flashlearn decide cuándo repasar cada una.",
    "dash.emptyCta": "+ Crear mi primer mazo",
    "dash.created": "Mazo creado",
    "dash.updated": "Mazo actualizado",
    "dash.deleted": "Mazo eliminado",
    "dash.confirmDelete": "¿Eliminar el mazo \"{name}\" y todas sus tarjetas?",
    "cards.sing": "tarjeta",
    "cards.plur": "tarjetas",
    "noDescription": "Sin descripción",
    "editDeck": "Editar mazo",
    "deleteDeck": "Eliminar mazo",

    "deck.decksCrumb": "Mazos",
    "deck.review": "Repasar",
    "deck.newCard": "+ Nueva tarjeta",
    "deck.emptyTitle": "Este mazo está vacío",
    "deck.emptyText": "Añade el par pregunta–respuesta que quieras memorizar.",
    "deck.emptyCta": "+ Crear la primera tarjeta",
    "deck.cardAdded": "Tarjeta añadida",
    "deck.cardUpdated": "Tarjeta actualizada",
    "deck.cardDeleted": "Tarjeta eliminada",
    "deck.confirmDeleteCard": "¿Eliminar esta tarjeta?",
    "deck.answer": "Respuesta",
    "editCard": "Editar tarjeta",
    "deleteCard": "Eliminar tarjeta",

    "rev.review": "Repaso",
    "rev.deckLabel": "Mazo:",
    "rev.counter": "Tarjeta {cur} de {total}",
    "rev.question": "Pregunta",
    "rev.answer": "Respuesta",
    "rev.hint": "Haz clic en la tarjeta para ver la respuesta",
    "rev.g1": "No lo recordaba",
    "rev.g2": "Difícil",
    "rev.g3": "Regular",
    "rev.g4": "Bien",
    "rev.g5": "Fácil",
    "rev.showQuestion": "Mostrar pregunta",
    "rev.showAnswer": "Mostrar respuesta",
    "rev.ok": "Repasada correctamente",
    "rev.rescheduled": "Se repasará antes",
    "rev.nextPrefix": "Próxima revisión en",
    "rev.nextOne": "{n} día",
    "rev.nextMany": "{n} días",
    "rev.nextCard": "Siguiente tarjeta",
    "rev.noneTitle": "Nada por repasar",
    "rev.noneText": "No hay tarjetas pendientes para hoy. Vuelve cuando el algoritmo lo indique.",
    "rev.back": "Volver a tus mazos",
    "rev.done": "Sesión completada",
    "rev.reviewedToday": "tarjetas repasadas hoy",

    "modal.newDeck": "Nuevo mazo",
    "modal.editDeck": "Editar mazo",
    "modal.newCard": "Nueva tarjeta",
    "modal.editCard": "Editar tarjeta",
    "modal.name": "Nombre",
    "modal.description": "Descripción",
    "modal.optional": "(opcional)",
    "modal.pregunta": "Pregunta",
    "modal.respuesta": "Respuesta",
    "modal.cancel": "Cancelar",
    "modal.save": "Guardar",
    "modal.errName": "El nombre es obligatorio.",
    "modal.errCard": "Pregunta y respuesta son obligatorias."
  },

  en: {
    "a11y.skip": "Skip to content",

    "lang.label": "Language",

    "theme.toDark": "Switch to dark mode",
    "theme.toLight": "Switch to light mode",

    "auth.login": "Sign in",
    "auth.register": "Create account",
    "auth.user": "Username",
    "auth.password": "Password",
    "auth.welcome": "Account created. Welcome!",

    "tb.logout": "Sign out",
    "tb.sessionClosed": "Session closed",

    "err.generic": "Something went wrong",
    "err.connection": "Could not reach the server",
    "err.sessionExpired": "Your session expired. Please sign in again.",
    "err.badCredentials": "Incorrect username or password",
    "err.userExists": "That username is already taken",

    "dash.title": "Your decks",
    "dash.subtitle": "Create study decks and review with spaced repetition.",
    "dash.reviewNow": "Review now",
    "dash.newDeck": "+ New deck",
    "dash.loading": "Loading…",
    "dash.emptyTitle": "Start your first deck",
    "dash.emptyText": "Create a deck with the questions you want to master and Flashlearn decides when to review each one.",
    "dash.emptyCta": "+ Create my first deck",
    "dash.created": "Deck created",
    "dash.updated": "Deck updated",
    "dash.deleted": "Deck deleted",
    "dash.confirmDelete": "Delete deck \"{name}\" and all its cards?",
    "cards.sing": "card",
    "cards.plur": "cards",
    "noDescription": "No description",
    "editDeck": "Edit deck",
    "deleteDeck": "Delete deck",

    "deck.decksCrumb": "Decks",
    "deck.review": "Review",
    "deck.newCard": "+ New card",
    "deck.emptyTitle": "This deck is empty",
    "deck.emptyText": "Add the question–answer pair you want to memorize.",
    "deck.emptyCta": "+ Create the first card",
    "deck.cardAdded": "Card added",
    "deck.cardUpdated": "Card updated",
    "deck.cardDeleted": "Card deleted",
    "deck.confirmDeleteCard": "Delete this card?",
    "deck.answer": "Answer",
    "editCard": "Edit card",
    "deleteCard": "Delete card",

    "rev.review": "Review",
    "rev.deckLabel": "Deck:",
    "rev.counter": "Card {cur} of {total}",
    "rev.question": "Question",
    "rev.answer": "Answer",
    "rev.hint": "Click the card to reveal the answer",
    "rev.g1": "Didn't remember",
    "rev.g2": "Hard",
    "rev.g3": "Okay",
    "rev.g4": "Good",
    "rev.g5": "Easy",
    "rev.showQuestion": "Show question",
    "rev.showAnswer": "Show answer",
    "rev.ok": "Reviewed correctly",
    "rev.rescheduled": "Will be reviewed sooner",
    "rev.nextPrefix": "Next review in",
    "rev.nextOne": "{n} day",
    "rev.nextMany": "{n} days",
    "rev.nextCard": "Next card",
    "rev.noneTitle": "Nothing to review",
    "rev.noneText": "No cards are due today. Check back when the algorithm says so.",
    "rev.back": "Back to your decks",
    "rev.done": "Session complete",
    "rev.reviewedToday": "cards reviewed today",

    "modal.newDeck": "New deck",
    "modal.editDeck": "Edit deck",
    "modal.newCard": "New card",
    "modal.editCard": "Edit card",
    "modal.name": "Name",
    "modal.description": "Description",
    "modal.optional": "(optional)",
    "modal.pregunta": "Question",
    "modal.respuesta": "Answer",
    "modal.cancel": "Cancel",
    "modal.save": "Save",
    "modal.errName": "Name is required.",
    "modal.errCard": "Question and answer are required."
  }
};

function getLang() {
  const lang = localStorage.getItem("flashlearn_lang");
  return lang === "en" ? "en" : "es";
}

function setLang(lang) {
  localStorage.setItem("flashlearn_lang", lang === "en" ? "en" : "es");
  syncHtmlLang();
  document.dispatchEvent(new CustomEvent("langchange"));
}

function syncHtmlLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  return lang;
}

function t(key, params = {}) {
  const dict = I18N[getLang()] || I18N.es;
  let s = dict[key] ?? I18N.es[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    s = s.replaceAll("{" + k + "}", String(v));
  }
  return s;
}

function tp(oneKey, manyKey, n) {
  return t(n === 1 ? oneKey : manyKey, { n });
}

/* ============ Tema ============ */
function getTheme() {
  return localStorage.getItem("flashlearn_theme") === "light" ? "light" : "dark";
}

function setTheme(theme) {
  localStorage.setItem("flashlearn_theme", theme === "light" ? "light" : "dark");
  document.documentElement.dataset.theme = getTheme();
  document.dispatchEvent(new CustomEvent("themechange"));
}