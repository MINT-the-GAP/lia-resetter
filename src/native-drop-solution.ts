type UnknownRecord = Record<PropertyKey, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    (typeof value === "object" && value !== null) ||
    typeof value === "function"
  );
}

function recordValues(value: UnknownRecord): UnknownRecord[] {
  return Object.getOwnPropertyNames(value)
    .map((key) => {
      try {
        return value[key];
      } catch {
        return null;
      }
    })
    .filter(isRecord);
}

function elmListValues(value: unknown, maximum = 4096): unknown[] | null {
  const values: unknown[] = [];
  const seen = new Set<unknown>();
  let cursor = value;

  while (isRecord(cursor) && cursor.$ === 1) {
    if (seen.has(cursor) || values.length >= maximum) return null;
    seen.add(cursor);
    values.push(cursor.a);
    cursor = cursor.b;
  }

  return isRecord(cursor) && cursor.$ === 0 ? values : null;
}

function flattenElmArrayTree(
  node: unknown,
  output: unknown[],
  maximum: number,
  depth = 0,
): boolean {
  if (output.length > maximum || depth > 32) return false;

  if (
    isRecord(node) &&
    (node.$ === 0 || node.$ === 1) &&
    Array.isArray(node.a)
  ) {
    for (const child of node.a) {
      if (!flattenElmArrayTree(child, output, maximum, depth + 1)) return false;
    }
    return true;
  }

  output.push(node);
  return output.length <= maximum;
}

function elmArrayValues(value: unknown, maximum = 4096): unknown[] | null {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.a) ||
    Number(value.a) < 0 ||
    Number(value.a) > maximum ||
    !Array.isArray(value.c) ||
    !Array.isArray(value.d)
  ) {
    return null;
  }

  const expectedLength = Number(value.a);
  const values: unknown[] = [];
  for (const node of value.c) {
    if (!flattenElmArrayTree(node, values, maximum)) return null;
  }
  values.push(...value.d);

  return values.length === expectedLength ? values : null;
}

function solutionIndexesFromState(
  value: unknown,
  optionCounts: readonly number[],
): number[] | null {
  const states = elmArrayValues(value);
  if (!states || states.length !== optionCounts.length) return null;

  const indexes: number[] = [];
  for (let target = 0; target < optionCounts.length; target += 1) {
    const state = states[target];
    if (!isRecord(state)) return null;

    const selected = elmListValues(state.c);
    if (selected?.length !== 1) return null;

    const option = Number(selected[0]);
    if (
      !Number.isSafeInteger(option) ||
      option < 0 ||
      option >= optionCounts[target]
    ) {
      return null;
    }
    indexes.push(option);
  }

  return indexes;
}

function isOptionsState(
  value: unknown,
  optionCounts: readonly number[],
): boolean {
  const optionsByTarget = elmArrayValues(value);
  if (!optionsByTarget || optionsByTarget.length !== optionCounts.length) {
    return false;
  }

  return optionCounts.every((count, target) => {
    const options = elmListValues(optionsByTarget[target]);
    return options?.length === count;
  });
}

/**
 * Reads the compiled native Multi-Drop solution from LiaScript's Check
 * listener without depending on minified property names. It accepts only one
 * structurally verified solution and otherwise fails closed.
 */
export function extractNativeCorrectOptionIndexes(
  checkButton: Element,
  optionCounts: readonly number[],
): number[] | null {
  const button = checkButton as Element & {
    elmFs?: { click?: unknown };
  };
  const click = button.elmFs?.click;
  if (!isRecord(click) || !optionCounts.length) return null;

  const roots = recordValues(click);
  if (!roots.length) roots.push(click);

  const seen = new Set<unknown>();
  const stack: Array<{ depth: number; value: UnknownRecord }> = roots.map(
    (value) => ({ depth: 0, value }),
  );
  const candidates = new Map<string, number[]>();
  let visited = 0;

  while (stack.length && visited < 10000) {
    const entry = stack.pop();
    if (!entry || seen.has(entry.value)) continue;

    seen.add(entry.value);
    visited += 1;
    const children = recordValues(entry.value);

    for (const child of children) {
      const indexes = solutionIndexesFromState(child, optionCounts);
      if (!indexes) continue;

      const hasMatchingOptions = children.some(
        (sibling) => sibling !== child && isOptionsState(sibling, optionCounts),
      );
      if (hasMatchingOptions) candidates.set(indexes.join(","), indexes);
    }

    if (entry.depth >= 18) continue;
    for (const child of children) {
      if (!seen.has(child)) stack.push({ depth: entry.depth + 1, value: child });
    }
  }

  return candidates.size === 1
    ? Array.from(candidates.values())[0]
    : null;
}
