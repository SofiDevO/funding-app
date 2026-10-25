// Interacción del carrusel de tips: solo frontend, con la data del JSON mock.
// El botón "Invitar" queda como hook (`data-tip-invite`) hasta que exista el checkout.

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function clampQuantity(value) {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, value));
}

function initTipCards() {
  document.querySelectorAll("[data-tip-card]").forEach((card) => {
    // Evita inicializar dos veces la misma card (View Transitions).
    if (card.dataset.tipInit) return;
    card.dataset.tipInit = "true";

    const price = Number.parseFloat(card.dataset.tipPrice ?? "0");
    const unitPrice = Number.isFinite(price) ? price : 0;

    const quantityOutput = card.querySelector("[data-tip-qty]");
    const totalOutput = card.querySelector("[data-tip-total]");
    const minusButton = card.querySelector("[data-tip-minus]");
    const plusButton = card.querySelector("[data-tip-plus]");

    function getQuantity() {
      const value = Number.parseInt(card.dataset.tipQuantity ?? "", 10);
      return Number.isFinite(value) ? clampQuantity(value) : MIN_QUANTITY;
    }

    function render() {
      const quantity = getQuantity();

      card.dataset.tipQuantity = String(quantity);

      if (quantityOutput) quantityOutput.textContent = String(quantity);
      if (totalOutput) {
        totalOutput.textContent = usd.format(unitPrice * quantity);
      }

      if (minusButton) minusButton.disabled = quantity <= MIN_QUANTITY;
      if (plusButton) plusButton.disabled = quantity >= MAX_QUANTITY;
    }

    function step(delta) {
      card.dataset.tipQuantity = String(getQuantity() + delta);
      render();
    }

    minusButton?.addEventListener("click", () => step(-1));
    plusButton?.addEventListener("click", () => step(1));

    render();
  });
}

document.addEventListener("astro:page-load", initTipCards);
