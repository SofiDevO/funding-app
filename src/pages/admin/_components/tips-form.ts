type TipStatus = "active" | "inactive";

interface TipPayload {
  title: string;
  productName: string;
  productImage: string;
  category?: string;
  price: number;
  status: TipStatus;
  sortOrder: number;
}

const UPLOAD_ENDPOINT = "/api/admin/upload";
const TIPS_ENDPOINT = "/api/admin/tips";
const uploadedUrls = new WeakMap<File, string>();

function readText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readPayload(form: HTMLFormElement): TipPayload | null {
  const data = new FormData(form);
  const price = Number.parseFloat(readText(data, "price"));
  const sortOrder = Number.parseInt(readText(data, "sortOrder"), 10);
  const category = readText(data, "category");

  if (!Number.isFinite(price) || price < 1 || price > 999) return null;
  if (!Number.isInteger(sortOrder) || sortOrder < 0) return null;

  return {
    title: readText(data, "title"),
    productName: readText(data, "productName"),
    productImage: readText(data, "productImage"),
    ...(category ? { category } : {}),
    price,
    status: readText(data, "status") as TipStatus,
    sortOrder,
  };
}

function firstZodMessage(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") return null;

  const fieldErrors = (errors as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return null;

  for (const value of Object.values(fieldErrors)) {
    if (!Array.isArray(value)) continue;
    const message = value.find((item): item is string => typeof item === "string");
    if (message) return message;
  }

  return null;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.error === "string" && record.error) return record.error;
      const zodMessage = firstZodMessage(record.errors);
      if (zodMessage) return zodMessage;
    }
  } catch {
    // The endpoint may return a non-JSON error page.
  }

  return `No se pudo completar la operación (HTTP ${response.status}).`;
}

function parseUploadUrl(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const url = (body as { url?: unknown }).url;
  return typeof url === "string" && url ? url : null;
}

async function uploadImage(file: File): Promise<string> {
  const cachedUrl = uploadedUrls.get(file);
  if (cachedUrl) return cachedUrl;

  const data = new FormData();
  data.append("file", file);

  const response = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: data });
  if (!response.ok) throw new Error(await readErrorMessage(response));

  const url = parseUploadUrl(await response.json().catch(() => null));
  if (!url) throw new Error("El servidor no devolvió la URL de la imagen subida.");

  uploadedUrls.set(file, url);
  return url;
}

function bindTipForm(shell: HTMLElement): void {
  if (shell.dataset.tipFormBound === "true") return;
  shell.dataset.tipFormBound = "true";

  const form = shell.querySelector<HTMLFormElement>("[data-tip-form]");
  const submitButton = shell.querySelector<HTMLButtonElement>("[data-tip-submit]");
  const deleteButton = shell.querySelector<HTMLButtonElement>("[data-tip-delete]");
  const errorBox = shell.querySelector<HTMLElement>("[data-tip-error]");
  const coverInput = shell.querySelector<HTMLInputElement>("[data-tip-cover-input]");
  const coverPreview = shell.querySelector<HTMLImageElement>("[data-tip-cover-preview]");
  const coverName = shell.querySelector<HTMLElement>("[data-tip-cover-name]");
  const coverUrlInput = shell.querySelector<HTMLInputElement>("[data-tip-cover-url]");

  if (!form || !submitButton) return;

  const submit = submitButton;
  const isEdit = shell.dataset.tipMode === "edit";
  const tipId = shell.dataset.tipId ?? "";
  const idleLabel = submit.textContent?.trim() || (isEdit ? "Actualizar tip" : "Crear tip");
  let coverObjectUrl: string | null = null;

  function clearFeedback(): void {
    if (!errorBox) return;
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function showError(message: string): void {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function setPending(pending: boolean, busyLabel = "Guardando..."): void {
    submit.disabled = pending;
    submit.textContent = pending ? busyLabel : idleLabel;
    if (deleteButton) deleteButton.disabled = pending;
  }

  coverInput?.addEventListener("change", () => {
    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);

    const file = coverInput.files?.[0];
    if (!file) {
      if (coverPreview) coverPreview.src = coverUrlInput?.value || "/image/goal.png";
      if (coverName) {
        coverName.hidden = true;
        coverName.textContent = "";
      }
      coverObjectUrl = null;
      return;
    }

    coverObjectUrl = URL.createObjectURL(file);
    if (coverPreview) coverPreview.src = coverObjectUrl;
    if (coverName) {
      coverName.textContent = file.name;
      coverName.hidden = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFeedback();

    const payload = readPayload(form);
    if (!payload) {
      showError("Revisa el precio y el orden: el precio debe ser de $1 a $999 y el orden un entero no negativo.");
      return;
    }

    setPending(true);

    try {
      const coverFile = coverInput?.files?.[0];
      if (!coverFile && !payload.productImage) {
        showError("Selecciona una imagen del producto.");
        return;
      }

      if (coverFile) {
        payload.productImage = await uploadImage(coverFile);
        if (coverUrlInput) coverUrlInput.value = payload.productImage;
      }

      const response = await fetch(isEdit ? `${TIPS_ENDPOINT}/${tipId}` : TIPS_ENDPOINT, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        showError(await readErrorMessage(response));
        return;
      }

      window.location.href = "/admin/tips";
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "No se pudo conectar con el servidor. Intenta de nuevo.",
      );
    } finally {
      setPending(false);
    }
  });

  deleteButton?.addEventListener("click", async () => {
    if (!isEdit || !tipId) return;

    const confirmed = window.confirm(
      "¿Eliminar este tip? Si tiene pedidos vinculados, cambia su estado a inactivo.",
    );
    if (!confirmed) return;

    clearFeedback();
    setPending(true, "Eliminando...");

    try {
      const response = await fetch(`${TIPS_ENDPOINT}/${tipId}`, { method: "DELETE" });
      if (!response.ok) {
        showError(await readErrorMessage(response));
        return;
      }

      window.location.href = "/admin/tips";
    } catch {
      showError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  });
}

function initTipForms(): void {
  document.querySelectorAll<HTMLElement>("[data-tip-form-shell]").forEach(bindTipForm);
}

initTipForms();
document.addEventListener("astro:page-load", initTipForms);