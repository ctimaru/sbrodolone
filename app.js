(() => {
  "use strict";

  const page = document.querySelector("#site-content");
  const triggers = [...document.querySelectorAll("[data-order]")];
  const source = document.querySelector("[data-glf-cuid]");
  const loading = document.querySelector("#order-loading");
  const description = document.querySelector("#loading-description");
  const status = document.querySelector("#order-status");
  const cancel = document.querySelector("#loading-cancel");
  let phase = "idle";
  let opener = null;
  let pollTimer;
  let slowTimer;
  let frame = null;
  let previousOverflow = "";

  const setBusy = (busy) =>
    triggers.forEach((button) => {
      button.setAttribute("aria-busy", String(busy));
      button.setAttribute("aria-disabled", String(busy));
    });

  function restorePage() {
    clearInterval(pollTimer);
    clearTimeout(slowTimer);
    loading.hidden = true;
    page.inert = false;
    document.body.classList.remove("order-is-open");
    document.body.style.overflow = previousOverflow;
    setBusy(false);
    phase = "idle";
    frame = null;
    status.textContent = "Menu chiuso. Puoi continuare a navigare.";
    opener?.focus({ preventScroll: true });
  }

  function showSlowMessage() {
    description.textContent =
      "Il servizio sta impiegando più del previsto. Puoi aprire il menu in una nuova scheda oppure tornare al sito.";
  }

  function markOpen() {
    if (!frame || !frame.isConnected || phase === "idle") return;
    clearTimeout(slowTimer);
    phase = "open";
    loading.hidden = true;
    status.textContent = "Menu di ordinazione aperto.";
    frame.focus({ preventScroll: true });
  }

  function launchWidget() {
    clearInterval(pollTimer);
    if (phase !== "waiting") return;
    phase = "loading";
    try {
      window.glfOpenWidget({
        url: "https://www.foodbooking.com/",
        companyUID: source.dataset.glfCuid,
        restaurantUID: source.dataset.glfRuid,
        // Mantiene il menu in sovrapposizione anche su Android.
        forceMode: "desktop",
        closeHandler: restorePage,
      });
    } catch {
      showSlowMessage();
    }
  }

  function openMenu(event) {
    // I clic modificati conservano il comportamento nativo del link alternativo.
    event.stopImmediatePropagation();
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    if (phase !== "idle") return;
    opener = event.currentTarget;
    previousOverflow = document.body.style.overflow;
    phase = "waiting";
    setBusy(true);
    page.inert = true;
    document.body.classList.add("order-is-open");
    document.body.style.overflow = "hidden";
    description.textContent =
      "Un momento, ti colleghiamo al servizio di ordinazione.";
    status.textContent = "";
    loading.hidden = false;
    loading.focus({ preventScroll: true });
    slowTimer = setTimeout(showSlowMessage, 12000);
    if (typeof window.glfOpenWidget === "function") {
      launchWidget();
    } else {
      const started = Date.now();
      pollTimer = setInterval(() => {
        if (typeof window.glfOpenWidget === "function") launchWidget();
        else if (Date.now() - started > 8000) {
          clearInterval(pollTimer);
          clearTimeout(slowTimer);
          showSlowMessage();
        }
      }, 80);
    }
  }

  // Capture evita doppie aperture con gli handler aggiunti dallo script ufficiale.
  triggers.forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("aria-haspopup", "dialog");
    button.addEventListener("click", openMenu, true);
    button.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") event.stopImmediatePropagation();
        if (event.key === " ") {
          event.preventDefault();
          event.stopImmediatePropagation();
          button.click();
        }
      },
      true,
    );
  });

  function cancelLoading() {
    if (phase === "waiting") restorePage();
    else {
      // Il trasporto interno del fornitore non espone abort: una navigazione
      // allo stesso URL annulla in sicurezza anche le richieste ancora in corso.
      window.location.reload();
    }
  }
  cancel.addEventListener("click", cancelLoading);
  loading.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelLoading();
    }
    if (event.key === "Tab") {
      const first = document.querySelector("#order-fallback");
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === loading)
      ) {
        event.preventDefault();
        cancel.focus();
      } else if (!event.shiftKey && document.activeElement === cancel) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Non si legge né modifica il contenuto cross-origin del menu.
  new MutationObserver(() => {
    const currentFrame = document.querySelector("#gfOrderFrm");
    if (currentFrame && currentFrame !== frame && phase !== "idle") {
      frame = currentFrame;
      frame.title = "Menu e ordinazione — Sbrodolone";
      frame.setAttribute("tabindex", "0");
      frame.addEventListener("load", markOpen, { once: true });
    } else if (!currentFrame && frame && phase === "open") {
      restorePage();
    }
  }).observe(document.body, { childList: true });
})();
