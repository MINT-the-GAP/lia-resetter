const INSTALL_KEY = "__liaResetterReconstructionPrecreateInstalled";
const WRAP_KEY = "__liaResetterReconstructionPrecreateWrapped";
const SETUP_NAMES = [
  "__setupReconstructionQuiz",
  "__setupRekonstruktionQuiz",
] as const;

export function installCoordinateReconstructionPrelude(): void {
  const globals = window as unknown as Record<string, unknown>;
  if (globals[INSTALL_KEY] === true) return;

  Object.defineProperty(globals, INSTALL_KEY, {
    value: true,
    configurable: true,
  });

  const ensureBodyAnchor = (uidValue: unknown): void => {
    const uid = String(uidValue ?? "").trim();
    if (!uid) return;
    const id = `regression-ui-${uid}`;
    if (document.getElementById(id)) return;
    if (!document.body) {
      throw new Error(
        "Der Reconstruction-Anker kann vor document.body nicht angelegt werden.",
      );
    }
    const anchor = document.createElement("span");
    anchor.id = id;
    anchor.hidden = true;
    anchor.style.display = "none";
    anchor.setAttribute("aria-hidden", "true");
    anchor.dataset.liaResetterExternal = "reconstruction";
    document.body.append(anchor);
  };

  const wrap = (value: unknown): unknown => {
    if (typeof value !== "function") return value;
    const original = value as ((...args: unknown[]) => unknown) &
      Record<string, unknown>;
    if (original[WRAP_KEY] === true) return original;
    const wrapped = function (
      this: unknown,
      uid: unknown,
      ...args: unknown[]
    ): unknown {
      ensureBodyAnchor(uid);
      return Reflect.apply(original, this, [uid, ...args]);
    } as ((...args: unknown[]) => unknown) & Record<string, unknown>;
    Object.defineProperty(wrapped, WRAP_KEY, { value: true });
    return wrapped;
  };

  for (const name of SETUP_NAMES) {
    const current = globals[name];
    if (typeof current === "function") {
      globals[name] = wrap(current);
      continue;
    }
    let assigned = current;
    Object.defineProperty(globals, name, {
      configurable: true,
      enumerable: true,
      get(): unknown {
        return assigned;
      },
      set(value: unknown): void {
        assigned = wrap(value);
      },
    });
  }
}
