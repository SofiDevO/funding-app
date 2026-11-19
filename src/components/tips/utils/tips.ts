// Interaccion del carrusel de tips: solo frontend, con la data del JSON mock.
// El boton "Invitar" queda como hook (`data-tip-invite`) hasta que exista el checkout.

import { MAX_QUANTITY, MIN_QUANTITY } from "./quantity";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const CARD_SELECTOR = "[data-tip-card]";
const CONTROL_SELECTOR = "[data-tip-plus], [data-tip-minus]";

function clampQuantity(value: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, value));
}

function getQuantity(card: HTMLElement): number {
  const value = Number.parseInt(card.dataset.tipQuantity ?? "", 10);
  return Number.isFinite(value) ? clampQuantity(value) : MIN_QUANTITY;
}

/** Sincroniza cantidad, total y estado de los botones de una card. */
function renderCard(card: HTMLElement): void {
  const quantity = getQuantity(card);
  const price = Number.parseFloat(card.dataset.tipPrice ?? "0");
  const unitPrice = Number.isFinite(price) ? price : 0;

  card.dataset.tipQuantity = String(quantity);

  const quantityOutput = card.querySelector<HTMLOutputElement>("[data-tip-qty]");
  const totalOutput = card.querySelector<HTMLElement>("[data-tip-total]");
  const minusButton = card.querySelector<HTMLButtonElement>("[data-tip-minus]");
  const plusButton = card.querySelector<HTMLButtonElement>("[data-tip-plus]");

  if (quantityOutput) quantityOutput.textContent = String(quantity);
  if (totalOutput) totalOutput.textContent = usd.format(unitPrice * quantity);

  if (minusButton) minusButton.disabled = quantity <= MIN_QUANTITY;
  if (plusButton) plusButton.disabled = quantity >= MAX_QUANTITY;
}

function stepCard(card: HTMLElement, delta: number): void {
  card.dataset.tipQuantity = String(clampQuantity(getQuantity(card) + delta));
  renderCard(card);
}

/**
 * Handler delegado. Al escuchar en `document` no necesita cablear cada card:
 * funciona con las cards que llegan despues por el server island
 * (`server:defer`) y con las que reemplaza ClientRouter en cada navegacion.
 */
function onTipControlClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;

  const control = event.target.closest(CONTROL_SELECTOR);
  if (!control) return;

  const card = control.closest<HTMLElement>(CARD_SELECTOR);
  if (!card) return;

  stepCard(card, control.hasAttribute("data-tip-plus") ? 1 : -1);
}

/**
 * Monta la interaccion una sola vez por documento. El listener delegado vive
 * en `document`, que ClientRouter no reemplaza (solo reemplaza `<body>`), asi
 * que sobrevive a las navegaciones aunque el script del componente no vuelva
 * a ejecutarse.
 */
export function mountTipCards(): void {
  const registry = window as Window & { __tipsCardsMounted?: boolean };
  if (registry.__tipsCardsMounted) return;
  registry.__tipsCardsMounted = true;

  document.addEventListener("click", onTipControlClick);

  // Normaliza las cards que ya estaban en el DOM al montar.
  document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(renderCard);
}
