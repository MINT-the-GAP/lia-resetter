import {
  cloneQuizVector,
  type JsonObject,
  type SerializedQuizVector,
} from "./reset-state";

const PROBE_QUIZ_ID = 2_147_483_647;
const CAPTURE_TIMEOUT_MS = 2_500;
let capabilityProbe: Promise<boolean> | undefined;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function send(event: LiaRuntimeEvent): void {
  if (!window.LIA || typeof window.LIA.send !== "function") {
    throw new Error("Die LiaScript-Ereignisschnittstelle ist noch nicht bereit.");
  }

  window.LIA.send(event);
}

function quizEvent(
  sectionId: number,
  topic: string,
  quizId: number,
  command: string,
  parameter: unknown,
): LiaRuntimeEvent {
  return {
    reply: true,
    track: [
      ["quiz", sectionId],
      [topic, quizId],
    ],
    service: "",
    message: { cmd: command, param: parameter },
  };
}

function sendProbe(sectionId: number): void {
  send(
    quizEvent(sectionId, "eval", PROBE_QUIZ_ID, "eval", {
      ok: true,
      result: "LIA: stop",
      details: [],
    }),
  );
}

/**
 * Reads the marker installed by the supplied core patch. Version 2 guarantees
 * both the single-quiz event and lossless Drop JSON. Stock LiaScript has no
 * marker, so detection is synchronous and emits no unknown-command warning.
 */
export function supportsLosslessNativeReset(
  _sectionId: number,
): Promise<boolean> {
  capabilityProbe ??= Promise.resolve(
    window.LIA?.singleQuizResetVersion === 2,
  );

  return capabilityProbe;
}

/**
 * Requests a no-op evaluation at an impossible quiz index. LiaScript then
 * serializes the unchanged, current quiz vector for its database service.
 */
export function captureQuizVector(sectionId: number): Promise<SerializedQuizVector> {
  return new Promise((resolve, reject) => {
    const lia = window.LIA;
    const previousDebug = lia.debug;
    const previousLog = lia.log;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const cleanup = (): void => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }

      if (lia.log === hook) {
        lia.log = previousLog;
      }

      lia.debug = previousDebug;
    };

    const finish = (value: unknown): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      try {
        resolve(cloneQuizVector(value));
      } catch (error) {
        reject(error);
      }
    };

    const hook: LiaLog = (type, args) => {
      try {
        if (Array.isArray(args) && args[1] === "db" && isObject(args[2])) {
          const message = args[2];
          const parameter = isObject(message.param) ? message.param : undefined;

          if (
            message.cmd === "store" &&
            parameter?.table === "quiz" &&
            parameter.id === sectionId
          ) {
            finish(parameter.data);
          }
        }
      } finally {
        try {
          previousLog?.(type, args);
        } catch (error) {
          console.warn("Der vorherige LiaScript-Log-Hook ist fehlgeschlagen.", error);
        }
      }
    };

    try {
      lia.debug = true;
      lia.log = hook;
      timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error("LiaScript hat den aktuellen Quiz-Zustand nicht geliefert."));
        }
      }, CAPTURE_TIMEOUT_MS);
      sendProbe(sectionId);
    } catch (error) {
      settled = true;
      cleanup();
      reject(error);
    }
  });
}

export function sendNativeReset(sectionId: number, quizId: number): void {
  send(quizEvent(sectionId, "reset", quizId, "reset", null));
}

export function sendRestore(
  sectionId: number,
  vector: SerializedQuizVector,
): void {
  send(quizEvent(sectionId, "restore", -1, "restore", vector));
}

export function waitForLiaRender(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
