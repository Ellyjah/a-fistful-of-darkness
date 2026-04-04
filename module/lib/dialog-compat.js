/**
 * dialog-compat.js — Capa de compatibilidad para diálogos Foundry v11-v14
 * Copiado de Blades in the Dark (Dez384) sin modificaciones.
 * Soporta tanto la API legacy Dialog (v11/v12) como DialogV2 (v13+).
 */

const FORCE_DIALOG_V1 = false; // Poner true para forzar diálogos v1 en tests locales.

function supportsDialogV2() {
  if (FORCE_DIALOG_V1) return false;
  const dialogV2 = foundry?.applications?.api?.DialogV2;
  return Boolean(dialogV2 && typeof dialogV2.wait === "function");
}

function iconClassToHtml(iconClass) {
  if (!iconClass) return undefined;
  return `<i class="${iconClass}"></i>`;
}

function normalizeFormData(form) {
  if (!form) return {};
  const formData = new FormData(form);
  const result = {};
  for (const [key, value] of formData.entries()) {
    if (key in result) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function findFormElement(html) {
  if (!html) return null;
  if (html instanceof HTMLFormElement) return html;
  if (html[0] instanceof HTMLFormElement) return html[0];
  const form = html.find?.("form")?.[0];
  return form instanceof HTMLFormElement ? form : null;
}

/**
 * Abre un diálogo compatible con Application V1 y DialogV2.
 * El contenido debe incluir un elemento <form> para serializar sus valores.
 *
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.content
 * @param {string} options.okLabel
 * @param {string} [options.cancelLabel]
 * @param {string} [options.okIcon="fas fa-check"]
 * @param {string} [options.cancelIcon="fas fa-times"]
 * @param {"ok"|"cancel"} [options.defaultButton="ok"]
 * @returns {Promise<object|undefined>} Valores del formulario o undefined si se cancela.
 */
export async function openFormDialog({
  title,
  content,
  okLabel,
  cancelLabel,
  okIcon = "fas fa-check",
  cancelIcon = "fas fa-times",
  defaultButton = "ok",
  window: windowOptions = {},
  dialog: legacyDialogOptions = {},
} = {}) {
  if (!title)    throw new Error("openFormDialog requires a title");
  if (!content)  throw new Error("openFormDialog requires dialog content");
  if (!okLabel)  throw new Error("openFormDialog requires an okLabel");

  if (supportsDialogV2()) {
    const { DialogV2 } = foundry.applications.api;

    const buttons = [
      {
        action: "ok",
        label: okLabel,
        icon: okIcon,
        default: defaultButton === "ok",
        callback: (event, button, dialog) => {
          const formElement =
            dialog.element?.querySelector("form") ||
            event.target?.closest("dialog")?.querySelector("form") ||
            document.querySelector("dialog[open] form");
          return normalizeFormData(formElement);
        },
      },
    ];

    if (cancelLabel) {
      buttons.push({
        action: "cancel",
        label: cancelLabel,
        icon: cancelIcon,
        default: defaultButton === "cancel",
        callback: () => undefined,
      });
    }

    const result = await DialogV2.wait({
      window: { title, ...windowOptions },
      content,
      buttons,
    });

    if (result === undefined || result === "cancel" || result === null) {
      return undefined;
    }
    return result;
  }

  return await new Promise((resolve) => {
    let resolved = false;
    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const buttons = {
      ok: {
        icon: iconClassToHtml(okIcon),
        label: okLabel,
        callback: (html) => {
          const form = findFormElement(html);
          finish(normalizeFormData(form));
        },
      },
    };

    if (cancelLabel) {
      buttons.cancel = {
        icon: iconClassToHtml(cancelIcon),
        label: cancelLabel,
        callback: () => finish(undefined),
      };
    }

    const defaultKey = cancelLabel ? defaultButton : "ok";

    const dialog = new Dialog(
      {
        title,
        content,
        buttons,
        default: defaultKey,
        close: () => finish(undefined),
      },
      legacyDialogOptions
    );

    dialog.render(true);
  });
}
