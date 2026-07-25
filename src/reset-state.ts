export type JsonObject = Record<string, unknown>;

export interface SerializedQuizElement extends JsonObject {
  solved: number;
  state: JsonObject;
  trial: number;
  hint: number;
  error_msg: string;
}

export type SerializedQuizVector = SerializedQuizElement[];

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function resetBooleanList(value: unknown, name: string): boolean[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "boolean")) {
    throw new Error(`Ungültiger LiaScript-Zustand für ${name}.`);
  }

  return value.map(() => false);
}

/** Mirrors Lia.Markdown.Quiz.Types.reset for its serialized JSON states. */
export function resetSerializedState(value: unknown): JsonObject {
  if (!isObject(value)) {
    throw new Error("Der LiaScript-Quiz-Zustand ist kein Objekt.");
  }

  if (hasOwn(value, "Generic")) {
    return { Generic: null };
  }

  if (hasOwn(value, "Text")) {
    return { Text: "" };
  }

  if (hasOwn(value, "Select")) {
    return { Select: -1 };
  }

  if (hasOwn(value, "Drop")) {
    return { Drop: -1 };
  }

  if (hasOwn(value, "SingleChoice")) {
    return {
      SingleChoice: resetBooleanList(value.SingleChoice, "SingleChoice"),
    };
  }

  if (hasOwn(value, "MultipleChoice")) {
    return {
      MultipleChoice: resetBooleanList(value.MultipleChoice, "MultipleChoice"),
    };
  }

  if (hasOwn(value, "Matrix")) {
    if (!Array.isArray(value.Matrix)) {
      throw new Error("Ungültiger LiaScript-Zustand für Matrix.");
    }

    return { Matrix: value.Matrix.map(resetSerializedState) };
  }

  if (hasOwn(value, "Multi")) {
    if (!Array.isArray(value.Multi)) {
      throw new Error("Ungültiger LiaScript-Zustand für Multi.");
    }

    return { Multi: value.Multi.map(resetSerializedState) };
  }

  throw new Error("Unbekannter LiaScript-Quiz-Zustand.");
}

export function resetQuizElement(value: unknown): SerializedQuizElement {
  if (!isObject(value) || !isObject(value.state)) {
    throw new Error("Der LiaScript-Quiz-Eintrag ist unvollständig.");
  }

  return {
    ...value,
    solved: 0,
    state: resetSerializedState(value.state),
    trial: 0,
    hint: 0,
    error_msg: "",
  } as SerializedQuizElement;
}

export function cloneQuizVector(value: unknown): SerializedQuizVector {
  if (!Array.isArray(value)) {
    throw new Error("LiaScript hat keinen Quiz-Vektor geliefert.");
  }

  return JSON.parse(JSON.stringify(value)) as SerializedQuizVector;
}

export function containsDropState(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsDropState);
  }

  if (!isObject(value)) {
    return false;
  }

  if (hasOwn(value, "Drop")) {
    return true;
  }

  return Object.values(value).some(containsDropState);
}

export function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function isIsolatedReset(
  before: SerializedQuizVector,
  after: SerializedQuizVector,
  quizId: number,
  expected: SerializedQuizElement,
): boolean {
  if (before.length !== after.length || !sameJson(after[quizId], expected)) {
    return false;
  }

  return before.every((entry, index) =>
    index === quizId ? true : sameJson(entry, after[index]),
  );
}
