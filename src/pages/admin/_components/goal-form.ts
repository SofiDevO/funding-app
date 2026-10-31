import type { Goal } from "@/domain/entities/goal";

/**
 * Logica cliente del formulario de metas (GoalForm.astro).
 *
 * Flujo:
 * 1. Sube la portada y las imagenes nuevas de la galeria a
 *    POST /api/admin/upload (multipart, campo `file`) y recibe `{ url, key }`.
 *    El formulario usa `url`; `key` queda para limpieza/rollback del backend.
 * 2. Envia el resto como JSON:
 *    - mode="edit"    -> PUT    /api/goals/:id
 *    - mode="create"  -> POST   /api/goals
 *    - "Eliminar"     -> DELETE /api/goals/:id
 *
 * `POST /api/admin/upload` esta documentado en `Tips Feature.md` (reutilizable
 * para metas y tips) y las rutas de metas pertenecen a la Guia 05.3. Hasta que
 * existan, el formulario muestra el error del servidor en `[data-goal-error]`.
 */

const UPLOAD_ENDPOINT = "/api/admin/upload";
const MAX_GALLERY = 10;

/** Evita re-subir el mismo archivo si el guardado falla y se reintenta. */
const uploadedUrls = new WeakMap<File, string>();

interface GoalPayload {
  title: string;
  excerpt: string;
  description: string;
  imageUrl: string;
  productUrl?: string;
  targetAmount: number;
  rewards: string[];
  gallery: string[];
  status: Goal["status"];
}

function readText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readLines(data: FormData, name: string): string[] {
  return readText(data, name)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function readPayload(form: HTMLFormElement): GoalPayload | null {
  const data = new FormData(form);
  const targetAmount = Number.parseFloat(readText(data, "targetAmount"));

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null;

  const productUrl = readText(data, "productUrl");

  return {
    title: readText(data, "title"),
    excerpt: readText(data, "excerpt"),
    description: readText(data, "description"),
    imageUrl: readText(data, "imageUrl"),
    // Opcional: se omite cuando esta vacio para no enviar "" a z.url().
    ...(productUrl ? { productUrl } : {}),
    targetAmount,
    rewards: readLines(data, "rewards"),
    gallery: readLines(data, "gallery"),
    status: readText(data, "status") as Goal["status"],
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

      if (typeof record.error === "string" && record.error) {
        return record.error;
      }

      const zodMessage = firstZodMessage(record.errors);
      if (zodMessage) return zodMessage;
    }
  } catch {
    // Respuesta sin JSON (endpoint pendiente, HTML de 404, etc.).
  }

  return `No se pudo completar la operación (HTTP ${response.status}).`;
}

function parseUploadUrl(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const url = (body as { url?: unknown }).url;
  return typeof url === "string" && url ? url : null;
}

async function uploadImage(file: File): Promise<string> {
  const cached = uploadedUrls.get(file);
  if (cached) return cached;

  const data = new FormData();
  data.append("file", file);

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: data,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const url = parseUploadUrl(await response.json().catch(() => null));
  if (!url) {
    throw new Error("El servidor no devolvió la URL de la imagen subida.");
  }

  uploadedUrls.set(file, url);
  return url;
}

function bindGoalForm(shell: HTMLElement): void {
  if (shell.dataset.goalFormBound === "true") return;
  shell.dataset.goalFormBound = "true";

  const form = shell.querySelector<HTMLFormElement>("[data-goal-form]");
  const submitButton = shell.querySelector<HTMLButtonElement>("[data-goal-submit]");
  const deleteButton = shell.querySelector<HTMLButtonElement>("[data-goal-delete]");
  const errorBox = shell.querySelector<HTMLElement>("[data-goal-error]");

  const coverInput = shell.querySelector<HTMLInputElement>("[data-cover-input]");
  const coverPreview = shell.querySelector<HTMLImageElement>("[data-cover-preview]");
  const coverName = shell.querySelector<HTMLElement>("[data-cover-name]");
  const coverUrlInput = shell.querySelector<HTMLInputElement>("[data-cover-url]");

  const galleryInput = shell.querySelector<HTMLInputElement>("[data-gallery-input]");
  const galleryNew = shell.querySelector<HTMLElement>("[data-gallery-new]");

  if (!form || !submitButton) return;

  const submit = submitButton;
  const isEdit = shell.dataset.goalMode === "edit";
  const goalId = shell.dataset.goalId ?? "";
  const idleLabel = submit.textContent?.trim() || (isEdit ? "Actualizar" : "Crear meta");

  let coverObjectUrl: string | null = null;
  let galleryObjectUrls: string[] = [];

  function clearFeedback(): void {
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = "";
    }
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
    if (coverObjectUrl) {
      URL.revokeObjectURL(coverObjectUrl);
      coverObjectUrl = null;
    }

    const file = coverInput.files?.[0];
    if (!file) {
      if (coverPreview) {
        coverPreview.src = coverUrlInput?.value || "/image/goal.png";
      }
      if (coverName) {
        coverName.hidden = true;
        coverName.textContent = "";
      }
      return;
    }

    coverObjectUrl = URL.createObjectURL(file);
    if (coverPreview) coverPreview.src = coverObjectUrl;
    if (coverName) {
      coverName.textContent = file.name;
      coverName.hidden = false;
    }
  });

  galleryInput?.addEventListener("change", () => {
    for (const url of galleryObjectUrls) URL.revokeObjectURL(url);
    galleryObjectUrls = [];
    galleryNew?.replaceChildren();

    const files = Array.from(galleryInput.files ?? []);

    for (const file of files) {
      const url = URL.createObjectURL(file);
      galleryObjectUrls.push(url);

      const figure = document.createElement("figure");
      figure.className = "overflow-hidden rounded-md border border-slate-300 bg-white";

      const image = document.createElement("img");
      image.src = url;
      image.alt = file.name;
      image.className = "h-20 w-28 object-cover";

      const caption = document.createElement("figcaption");
      caption.textContent = file.name;
      caption.title = file.name;
      caption.className =
        "max-w-28 truncate border-t border-slate-200 px-2 py-1 text-xs text-slate-600";

      figure.appendChild(image);
      figure.appendChild(caption);
      galleryNew?.appendChild(figure);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFeedback();

    const payload = readPayload(form);
    if (!payload) {
      showError("El objetivo debe ser un monto mayor que cero.");
      return;
    }

    setPending(true);

    try {
      const coverFile = coverInput?.files?.[0];
      if (!coverFile && !payload.imageUrl) {
        showError("Selecciona una imagen de portada.");
        return;
      }

      // Galeria: conserva las URLs no marcadas y sube los archivos nuevos.
      const removedIndices = new Set(
        Array.from(
          shell.querySelectorAll<HTMLInputElement>("[data-gallery-remove]:checked"),
        ).map((input) => Number.parseInt(input.value, 10)),
      );
      const gallery = payload.gallery.filter((_, index) => !removedIndices.has(index));
      const newFiles = Array.from(galleryInput?.files ?? []);

      if (gallery.length + newFiles.length > MAX_GALLERY) {
        showError(`La galería admite como máximo ${MAX_GALLERY} imágenes.`);
        return;
      }

      if (coverFile) {
        payload.imageUrl = await uploadImage(coverFile);
        if (coverUrlInput) coverUrlInput.value = payload.imageUrl;
      }

      for (const file of newFiles) {
        gallery.push(await uploadImage(file));
      }

      payload.gallery = gallery;

      // El backend borra de R2 las imagenes viejas que ya no estan en el
      // payload DESPUES de este PUT; el cliente nunca borra objetos.
      const response = await fetch(isEdit ? `/api/goals/${goalId}` : "/api/goals", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        showError(await readErrorMessage(response));
        return;
      }

      window.location.href = "/admin/goals";
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
    if (!isEdit || !goalId) return;

    const confirmed = window.confirm(
      "¿Eliminar esta meta? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    clearFeedback();
    setPending(true, "Eliminando...");

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        showError(await readErrorMessage(response));
        return;
      }

      window.location.href = "/admin/goals";
    } catch {
      showError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  });
}

function initGoalForms(): void {
  document
    .querySelectorAll<HTMLElement>("[data-goal-form-shell]")
    .forEach(bindGoalForm);
}

initGoalForms();
document.addEventListener("astro:page-load", initGoalForms);
