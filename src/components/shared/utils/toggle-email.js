/**
 * Helper reutilizable para mostrar / ocultar emails.
 *
 * Uso:
 * ```astro
 * <span data-email-container>
 *   <span
 *     data-email-text
 *     data-email-full={email}
 *     data-email-masked={masked}
 *   >{masked}</span>
 *   <button type="button" data-email-toggle aria-pressed="false" aria-label="Mostrar email">
 *     <iconify-icon icon="andrsrxn:eye" width="16" height="16"></iconify-icon>
 *   </button>
 * </span>
 * <script>import "@/components/shared/utils/toggle-email";</script>
 * ```
 */

export function maskEmail(email) {
  if (!email || !email.includes("@")) return "*******";
  const [, domain] = email.split("@");
  return `*******@${domain ?? ""}`;
}

function toggleEmail(button) {
  const container =
    button.closest("[data-email-container]") ?? button.parentElement;
  const text = container?.querySelector("[data-email-text]");
  if (!text) return;

  const full = text.dataset.emailFull ?? text.textContent ?? "";
  // Si el SSR no pasó el masked, lo derivamos en cliente.
  const masked = text.dataset.emailMasked ?? maskEmail(full);
  if (!text.dataset.emailMasked) text.dataset.emailMasked = masked;
  if (!text.dataset.emailFull) text.dataset.emailFull = full;

  const isCurrentlyMasked = button.getAttribute("aria-pressed") !== "true";

  text.textContent = isCurrentlyMasked ? full : masked;
  button.setAttribute("aria-pressed", String(isCurrentlyMasked));
  button.setAttribute(
    "aria-label",
    isCurrentlyMasked ? "Ocultar email" : "Mostrar email",
  );
  button.classList.toggle("is-visible", isCurrentlyMasked);

  const icon = button.querySelector("iconify-icon");
  icon?.setAttribute(
    "icon",
    isCurrentlyMasked ? "andrsrxn:eye-off" : "andrsrxn:eye",
  );
}

export function initEmailToggles(root = document) {
  root.querySelectorAll("[data-email-toggle]").forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    if (button.dataset.emailBound === "true") return;
    button.dataset.emailBound = "true";
    button.addEventListener("click", () => toggleEmail(button));
  });
}

document.addEventListener("astro:page-load", () => initEmailToggles());
initEmailToggles();
