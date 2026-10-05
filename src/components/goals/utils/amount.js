const LS_FEE_RATE = 0.05;
  const LS_FEE_FIXED = 0.50;

  function grossUpFees(net) {
    return Math.ceil(((net + LS_FEE_FIXED) / (1 - LS_FEE_RATE)) * 100) / 100;
  }

  document.querySelectorAll("[data-donation-form]").forEach((form) => {
    const amountInput = form.querySelector("input[name='amount']");
    const coverFeesCheckbox = form.querySelector("[data-cover-fees]");
    const feeSpan = form.querySelector("[data-fee]");
    const totalP = form.querySelector("[data-total]");
    const errorP = form.querySelector("[data-form-error]");
    const goalId = form.dataset.goalId ?? "";

    function updateFeePreview() {
      if (errorP && !errorP.hidden) {
        errorP.hidden = true;
        errorP.textContent = "";
      }

      const net = parseFloat(amountInput?.value ?? "0");
      if (!net || net < 1) {
        if (feeSpan) feeSpan.textContent = "";
        if (totalP) { totalP.textContent = ""; totalP.hidden = true; }
        return;
      }

      if (coverFeesCheckbox?.checked) {
        const gross = grossUpFees(net);
        const fee = (gross - net).toFixed(2);
        if (feeSpan) feeSpan.textContent = ` (+$${fee})`;
        if (totalP) { totalP.textContent = `Total cobrado: $${gross.toFixed(2)}`; totalP.hidden = false; }
      } else {
        if (feeSpan) feeSpan.textContent = "";
        if (totalP) { totalP.hidden = true; totalP.textContent = ""; }
      }
    }

    // Amount buttons → fill input + update preview
    form.querySelectorAll("button[data-amount]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!amountInput) return;
        amountInput.value = btn.dataset.amount ?? "";
        amountInput.focus();
        updateFeePreview();
      });
    });

    amountInput?.addEventListener("input", updateFeePreview);
    coverFeesCheckbox?.addEventListener("change", updateFeePreview);

    // Submit via fetch
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (errorP) { errorP.hidden = true; errorP.textContent = ""; }

      const net = parseFloat(amountInput?.value ?? "0");

      if (!net || net < 1) {
        if (errorP) { errorP.textContent = "Ingresa un monto de al menos $1."; errorP.hidden = false; }
        amountInput?.focus();
        return;
      }

      const coverFees = coverFeesCheckbox?.checked ?? false;

      try {
        const res = await fetch("/api/donations/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalId, amount: net, coverFees }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data).error ?? `Error ${res.status}`);
        }

        const { url } = await res.json();
        window.location.href = url;
      } catch (err) {
        if (errorP) {
          errorP.textContent = err instanceof Error ? err.message : "Ocurrio un error. Intenta de nuevo.";
          errorP.hidden = false;
        }
      }
    });
  });