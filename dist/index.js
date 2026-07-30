function $324cd378b98fe1c3$var$isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function $324cd378b98fe1c3$var$hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}
function $324cd378b98fe1c3$var$resetBooleanList(value, name) {
    if (!Array.isArray(value) || !value.every((entry)=>typeof entry === "boolean")) throw new Error(`Ung\xfcltiger LiaScript-Zustand f\xfcr ${name}.`);
    return value.map(()=>false);
}
function $324cd378b98fe1c3$export$a8c52df751fe36f2(value) {
    if (!$324cd378b98fe1c3$var$isObject(value)) throw new Error("Der LiaScript-Quiz-Zustand ist kein Objekt.");
    if ($324cd378b98fe1c3$var$hasOwn(value, "Generic")) return {
        Generic: null
    };
    if ($324cd378b98fe1c3$var$hasOwn(value, "Text")) return {
        Text: ""
    };
    if ($324cd378b98fe1c3$var$hasOwn(value, "Select")) return {
        Select: -1
    };
    if ($324cd378b98fe1c3$var$hasOwn(value, "Drop")) return {
        Drop: -1
    };
    if ($324cd378b98fe1c3$var$hasOwn(value, "SingleChoice")) return {
        SingleChoice: $324cd378b98fe1c3$var$resetBooleanList(value.SingleChoice, "SingleChoice")
    };
    if ($324cd378b98fe1c3$var$hasOwn(value, "MultipleChoice")) return {
        MultipleChoice: $324cd378b98fe1c3$var$resetBooleanList(value.MultipleChoice, "MultipleChoice")
    };
    if ($324cd378b98fe1c3$var$hasOwn(value, "Matrix")) {
        if (!Array.isArray(value.Matrix)) throw new Error("Ung\xfcltiger LiaScript-Zustand f\xfcr Matrix.");
        return {
            Matrix: value.Matrix.map($324cd378b98fe1c3$export$a8c52df751fe36f2)
        };
    }
    if ($324cd378b98fe1c3$var$hasOwn(value, "Multi")) {
        if (!Array.isArray(value.Multi)) throw new Error("Ung\xfcltiger LiaScript-Zustand f\xfcr Multi.");
        return {
            Multi: value.Multi.map($324cd378b98fe1c3$export$a8c52df751fe36f2)
        };
    }
    throw new Error("Unbekannter LiaScript-Quiz-Zustand.");
}
function $324cd378b98fe1c3$export$d8ad671f6d85d10d(value) {
    if (!$324cd378b98fe1c3$var$isObject(value) || !$324cd378b98fe1c3$var$isObject(value.state)) throw new Error("Der LiaScript-Quiz-Eintrag ist unvollst\xe4ndig.");
    return {
        ...value,
        solved: 0,
        state: $324cd378b98fe1c3$export$a8c52df751fe36f2(value.state),
        trial: 0,
        hint: 0,
        error_msg: ""
    };
}
function $324cd378b98fe1c3$export$af940a88eb1bec4f(value) {
    if (!Array.isArray(value)) throw new Error("LiaScript hat keinen Quiz-Vektor geliefert.");
    return JSON.parse(JSON.stringify(value));
}
function $324cd378b98fe1c3$export$b87eecf882073016(value) {
    if (Array.isArray(value)) return value.some($324cd378b98fe1c3$export$b87eecf882073016);
    if (!$324cd378b98fe1c3$var$isObject(value)) return false;
    if ($324cd378b98fe1c3$var$hasOwn(value, "Drop")) return true;
    return Object.values(value).some($324cd378b98fe1c3$export$b87eecf882073016);
}
function $324cd378b98fe1c3$export$b825b10b0be7751e(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}
function $324cd378b98fe1c3$export$ce3c89b0eeab4b7a(before, after, quizId, expected) {
    if (before.length !== after.length || !$324cd378b98fe1c3$export$b825b10b0be7751e(after[quizId], expected)) return false;
    return before.every((entry, index)=>index === quizId ? true : $324cd378b98fe1c3$export$b825b10b0be7751e(entry, after[index]));
}


const $3c7ccc4e179fe4df$var$PROBE_QUIZ_ID = 2147483647;
const $3c7ccc4e179fe4df$var$CAPTURE_TIMEOUT_MS = 2500;
let $3c7ccc4e179fe4df$var$capabilityProbe;
function $3c7ccc4e179fe4df$var$isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function $3c7ccc4e179fe4df$var$send(event) {
    if (!window.LIA || typeof window.LIA.send !== "function") throw new Error("Die LiaScript-Ereignisschnittstelle ist noch nicht bereit.");
    window.LIA.send(event);
}
function $3c7ccc4e179fe4df$var$quizEvent(sectionId, topic, quizId, command, parameter) {
    return {
        reply: true,
        track: [
            [
                "quiz",
                sectionId
            ],
            [
                topic,
                quizId
            ]
        ],
        service: "",
        message: {
            cmd: command,
            param: parameter
        }
    };
}
function $3c7ccc4e179fe4df$var$sendProbe(sectionId) {
    $3c7ccc4e179fe4df$var$send($3c7ccc4e179fe4df$var$quizEvent(sectionId, "eval", $3c7ccc4e179fe4df$var$PROBE_QUIZ_ID, "eval", {
        ok: true,
        result: "LIA: stop",
        details: []
    }));
}
function $3c7ccc4e179fe4df$export$1c2dd9ab0f322592(_sectionId) {
    $3c7ccc4e179fe4df$var$capabilityProbe ??= Promise.resolve(window.LIA?.singleQuizResetVersion === 2);
    return $3c7ccc4e179fe4df$var$capabilityProbe;
}
function $3c7ccc4e179fe4df$export$5c430295cfe49786(sectionId) {
    return new Promise((resolve, reject)=>{
        const lia = window.LIA;
        const previousDebug = lia.debug;
        const previousLog = lia.log;
        let timeout;
        let settled = false;
        const cleanup = ()=>{
            if (timeout !== undefined) clearTimeout(timeout);
            if (lia.log === hook) lia.log = previousLog;
            lia.debug = previousDebug;
        };
        const finish = (value)=>{
            if (settled) return;
            settled = true;
            cleanup();
            try {
                resolve((0, $324cd378b98fe1c3$export$af940a88eb1bec4f)(value));
            } catch (error) {
                reject(error);
            }
        };
        const hook = (type, args)=>{
            try {
                if (Array.isArray(args) && args[1] === "db" && $3c7ccc4e179fe4df$var$isObject(args[2])) {
                    const message = args[2];
                    const parameter = $3c7ccc4e179fe4df$var$isObject(message.param) ? message.param : undefined;
                    if (message.cmd === "store" && parameter?.table === "quiz" && parameter.id === sectionId) finish(parameter.data);
                }
            } finally{
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
            timeout = setTimeout(()=>{
                if (!settled) {
                    settled = true;
                    cleanup();
                    reject(new Error("LiaScript hat den aktuellen Quiz-Zustand nicht geliefert."));
                }
            }, $3c7ccc4e179fe4df$var$CAPTURE_TIMEOUT_MS);
            $3c7ccc4e179fe4df$var$sendProbe(sectionId);
        } catch (error) {
            settled = true;
            cleanup();
            reject(error);
        }
    });
}
function $3c7ccc4e179fe4df$export$a2d6b187dffe332e(sectionId, quizId) {
    $3c7ccc4e179fe4df$var$send($3c7ccc4e179fe4df$var$quizEvent(sectionId, "reset", quizId, "reset", null));
}
function $3c7ccc4e179fe4df$export$53bf8cbb2f971fd1(sectionId, vector) {
    $3c7ccc4e179fe4df$var$send($3c7ccc4e179fe4df$var$quizEvent(sectionId, "restore", -1, "restore", vector));
}
function $3c7ccc4e179fe4df$export$922ebc1e3c6e53f() {
    return new Promise((resolve)=>{
        queueMicrotask(()=>{
            requestAnimationFrame(()=>resolve());
        });
    });
}


const $d8d148422a096f50$var$TARGET_SELECTOR = "[onclick],[onkeydown],[ondragover],[ondragleave],[ondrop],[data-onclick],[data-onkeydown],[data-ondragover],[data-ondragleave],[data-ondrop],[data-reset-tile-role='target']";
const $d8d148422a096f50$var$SOURCE_SELECTOR = "[onclick],[onkeydown],[ondragstart],[ondragend],[data-onclick],[data-onkeydown],[data-ondragstart],[data-ondragend],[draggable],[data-reset-tile-role='source']";
const $d8d148422a096f50$var$KACHEL_ROOT_SELECTOR = ".Kachel, .kachelfolge-wrap, [id^='kachelfolge-wrap-'], [data-lia-kachelfolge], [id^='lia-kachelfolge-']";
const $d8d148422a096f50$var$COMPATIBILITY_STYLE_ID = "lia-resetter-kachel-compatibility";
const $d8d148422a096f50$var$TARGET_COMMAND = /cmd\s*:\s*['"](dragtarget|dragenter)['"]/i;
const $d8d148422a096f50$var$SOURCE_COMMAND = /cmd\s*:\s*['"](dragsource|dragstart|dragend)['"]/i;
function $d8d148422a096f50$var$normalize(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}
function $d8d148422a096f50$var$normalizeKey(value) {
    return $d8d148422a096f50$var$normalize(value).toLowerCase();
}
function $d8d148422a096f50$var$hasCommand(element, pattern) {
    return [
        "onclick",
        "onkeydown",
        "ondragover",
        "ondragleave",
        "ondrop",
        "ondragstart",
        "ondragend"
    ].some((name)=>pattern.test(String(element.getAttribute(name) ?? element.getAttribute(`data-${name}`) ?? "")));
}
function $d8d148422a096f50$var$isTileTarget(element) {
    return element instanceof HTMLElement && element.dataset.kfSeqDummy !== "1" && (element.dataset.resetTileRole === "target" || $d8d148422a096f50$var$hasCommand(element, $d8d148422a096f50$var$TARGET_COMMAND));
}
function $d8d148422a096f50$var$isTileSource(element) {
    return element instanceof HTMLElement && !$d8d148422a096f50$var$isTileTarget(element) && (element.dataset.resetTileRole === "source" || element.hasAttribute("draggable") || $d8d148422a096f50$var$hasCommand(element, $d8d148422a096f50$var$SOURCE_COMMAND));
}
function $d8d148422a096f50$export$c670c70a59e1ce24(root) {
    return Array.from(root.querySelectorAll($d8d148422a096f50$var$TARGET_SELECTOR)).filter($d8d148422a096f50$var$isTileTarget);
}
function $d8d148422a096f50$export$6490ed30892e037(root) {
    return Array.from(root.querySelectorAll($d8d148422a096f50$var$SOURCE_SELECTOR)).filter($d8d148422a096f50$var$isTileSource);
}
function $d8d148422a096f50$export$fa474d8821d83819(quiz) {
    return quiz.classList.contains("lia-quiz-drop") || Boolean($d8d148422a096f50$export$e1405b417718e07(quiz));
}
function $d8d148422a096f50$export$e1405b417718e07(quiz) {
    if ($d8d148422a096f50$export$c670c70a59e1ce24(quiz).length > 0) return quiz;
    const semanticRegion = quiz.closest($d8d148422a096f50$var$KACHEL_ROOT_SELECTOR);
    // Current LiaScript renders the targets/source bank beside (not inside)
    // .lia-quiz. Find the smallest common owner for exactly this quiz. Requiring
    // either a semantic region or a Kachelfolge marker avoids treating unrelated
    // native Drop quizzes as Kacheln. The per-quiz owner also supports multiple
    // independent quiz paragraphs inside one .Kachel region.
    const slide = quiz.closest("main.lia-slide__content");
    let owner = quiz.parentElement;
    while(owner && owner !== slide && owner !== document.body){
        const quizzes = Array.from(owner.querySelectorAll(".lia-quiz"));
        const belongsToRegion = semanticRegion !== null && (owner === semanticRegion || semanticRegion.contains(owner));
        const hasKachelfolgeMarker = Boolean(owner.matches("[data-lia-kachelfolge],[data-kf-mode]") || owner.querySelector("[data-lia-kachelfolge],[data-kf-mode]"));
        if (quizzes.length === 1 && quizzes[0] === quiz && (belongsToRegion || hasKachelfolgeMarker) && $d8d148422a096f50$export$c670c70a59e1ce24(owner).length > 0) return owner;
        owner = owner.parentElement;
    }
    return undefined;
}
function $d8d148422a096f50$var$collectKachelRoots(scope) {
    const quizzes = [];
    if (scope instanceof HTMLElement && scope.classList.contains("lia-quiz")) quizzes.push(scope);
    quizzes.push(...Array.from(scope.querySelectorAll(".lia-quiz")));
    const roots = [];
    for (const quiz of quizzes){
        const root = $d8d148422a096f50$export$e1405b417718e07(quiz);
        if (root && !roots.includes(root)) roots.push(root);
    }
    return roots;
}
function $d8d148422a096f50$export$5939335930abf31b(target) {
    const display = target.firstElementChild ?? target;
    const hasPlacedSourceChild = Array.from(target.children).some($d8d148422a096f50$var$isTileSource);
    const plainText = $d8d148422a096f50$var$normalize(display.textContent);
    const imageText = [
        ...display.matches("img[alt]") ? [
            display
        ] : [],
        ...Array.from(display.querySelectorAll("img[alt]"))
    ].map((image)=>$d8d148422a096f50$var$normalize(image.getAttribute("alt"))).filter(Boolean).join(" ");
    const text = plainText || imageText || $d8d148422a096f50$var$normalize(display.getAttribute("aria-label"));
    const rememberedText = $d8d148422a096f50$var$normalize(window.__liaKfAssignedSources?.get(target)?.text);
    const hasPlacedSource = hasPlacedSourceChild || rememberedText !== "" && rememberedText === text;
    const isEmptyPlaceholder = !hasPlacedSource && (text === "\u271B" || text === "+" || text === "?");
    return isEmptyPlaceholder ? "" : text;
}
function $d8d148422a096f50$var$ensureCompatibilityStyles() {
    if (document.getElementById($d8d148422a096f50$var$COMPATIBILITY_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = $d8d148422a096f50$var$COMPATIBILITY_STYLE_ID;
    style.textContent = `
    span[data-lia-kachelfolge-mode="progressive"] ~
      span[role="button"][data-onclick*="dragtarget"],
    span[data-lia-kachelfolge-mode="progressive"] ~
      span[role="button"][data-onkeydown*="dragtarget"],
    span[data-lia-kachelfolge-mode="progressive"] ~
      span[role="button"][data-ondragover*="dragenter"] {
      display: none !important;
    }
    span[data-lia-kachelfolge-mode="progressive"] +
      span[role="button"][data-onclick*="dragtarget"],
    span[data-lia-kachelfolge-mode="progressive"] +
      span[role="button"][data-onkeydown*="dragtarget"],
    span[data-lia-kachelfolge-mode="progressive"] +
      span[role="button"][data-ondragover*="dragenter"],
    span[data-lia-kachelfolge-mode="progressive"] ~
      span[role="button"][data-lia-kachelfolge-visible="true"] {
      display: inline-flex !important;
    }
    [data-lia-resetter-progressive="hidden"] {
      display: none !important;
    }
    [data-lia-resetter-progressive="visible"] {
      display: inline-flex !important;
    }
    [data-kf-mode="seq"] [data-reset-tile-role="target"],
    [data-kf-mode="seq"] [data-kf-seq-dummy="1"] {
      display: none !important;
    }
    [data-kf-mode="seq"] [data-reset-tile-role="target"][data-kf-seq-visible="1"],
    [data-kf-mode="seq"] [data-kf-seq-dummy="1"][data-kf-seq-visible="1"] {
      display: inline-block !important;
    }
  `;
    document.head.append(style);
}
function $d8d148422a096f50$var$updateSequentialVisibility(root) {
    const progressiveMarker = root.matches("[data-lia-kachelfolge-mode='progressive']") ? root : root.closest("[data-lia-kachelfolge-mode='progressive']") ?? root.querySelector("[data-lia-kachelfolge-mode='progressive']");
    if (progressiveMarker) {
        const targets = $d8d148422a096f50$export$c670c70a59e1ce24(root);
        let emptyTargetShown = false;
        for (const target of targets){
            const filled = Array.from(target.children).some($d8d148422a096f50$var$isTileSource);
            const visible = filled || !emptyTargetShown;
            if (!filled && !emptyTargetShown) emptyTargetShown = true;
            if (visible) {
                target.setAttribute("data-lia-kachelfolge-visible", "true");
                target.setAttribute("data-lia-resetter-progressive", "visible");
            } else {
                target.removeAttribute("data-lia-kachelfolge-visible");
                target.setAttribute("data-lia-resetter-progressive", "hidden");
            }
        }
        return;
    }
    const sequentialRoot = root.matches("[data-kf-mode='seq']") ? root : root.closest("[data-kf-mode='seq']") ?? root.querySelector("[data-kf-mode='seq']");
    if (!sequentialRoot) return;
    const targets = $d8d148422a096f50$export$c670c70a59e1ce24(root);
    if (targets.length === 0) return;
    let dummy = sequentialRoot.querySelector("[data-kf-seq-dummy='1']");
    if (!dummy) {
        dummy = document.createElement("span");
        dummy.dataset.kfSeqDummy = "1";
        dummy.className = "lia-target-placeholder lia-resetter__kachel-dummy";
        dummy.textContent = "\u271B";
        dummy.setAttribute("aria-hidden", "true");
        sequentialRoot.append(dummy);
    }
    const filled = targets.filter((target)=>$d8d148422a096f50$export$5939335930abf31b(target) !== "").length;
    const visibleTargets = Math.min(filled + 1, targets.length);
    targets.forEach((target, index)=>{
        if (index < visibleTargets) target.dataset.kfSeqVisible = "1";
        else target.removeAttribute("data-kf-seq-visible");
    });
    if (filled >= targets.length) dummy.dataset.kfSeqVisible = "1";
    else dummy.removeAttribute("data-kf-seq-visible");
}
function $d8d148422a096f50$export$3d5564f3c44147c6(scope = document) {
    for (const root of $d8d148422a096f50$var$collectKachelRoots(scope))$d8d148422a096f50$var$updateSequentialVisibility(root);
}
function $d8d148422a096f50$export$cee751826c5b56ae(quiz) {
    const root = $d8d148422a096f50$export$e1405b417718e07(quiz);
    const targets = root ? $d8d148422a096f50$export$c670c70a59e1ce24(root) : [];
    return targets.length > 0 && targets.every((target)=>$d8d148422a096f50$export$5939335930abf31b(target) === "");
}
function $d8d148422a096f50$var$currentSlideHash() {
    const hash = String(window.location.hash ?? "").trim();
    if (!hash) return "nohash";
    const query = hash.indexOf("?");
    const ampersand = hash.indexOf("&");
    let end = hash.length;
    if (query >= 0) end = Math.min(end, query);
    if (ampersand >= 0) end = Math.min(end, ampersand);
    return $d8d148422a096f50$var$normalizeKey(hash.slice(0, end) || hash);
}
function $d8d148422a096f50$var$domPathToken(node) {
    const parts = [];
    let current = node;
    let guard = 0;
    while(current && current !== document.body && guard < 16){
        const tag = String(current.tagName || "x").toLowerCase();
        let index = 1;
        let sibling = current.previousElementSibling;
        while(sibling){
            if (String(sibling.tagName || "").toLowerCase() === tag) index += 1;
            sibling = sibling.previousElementSibling;
        }
        parts.push(`${tag}:${index}`);
        current = current.parentElement;
        guard += 1;
    }
    return parts.reverse().join(">");
}
function $d8d148422a096f50$var$readParameterId(element, wantedCommand) {
    for (const name of [
        "onclick",
        "onkeydown",
        "ondragover",
        "ondrop",
        "ondragstart",
        "ondragend"
    ]){
        const value = String(element.getAttribute(name) ?? element.getAttribute(`data-${name}`) ?? "");
        if (!value || !wantedCommand.test(value)) continue;
        const match = value.match(/param\s*:\s*\{[^}]*id\s*:\s*(\d+)/i);
        if (match) return Number(match[1]);
    }
    return undefined;
}
function $d8d148422a096f50$var$expectedTexts(root) {
    const uid = String(root.dataset.kfUid ?? "").trim();
    const fromPlugin = uid ? window.__liaKachelfolgeExpected?.[uid] : undefined;
    if (Array.isArray(fromPlugin) && fromPlugin.length > 0) return fromPlugin.map($d8d148422a096f50$var$normalize);
    const targets = $d8d148422a096f50$export$c670c70a59e1ce24(root);
    const sources = $d8d148422a096f50$export$6490ed30892e037(root).filter((source)=>!targets.some((target)=>target === source || target.contains(source)));
    const values = [];
    for (const target of targets){
        const id = $d8d148422a096f50$var$readParameterId(target, $d8d148422a096f50$var$TARGET_COMMAND);
        const source = sources.find((candidate)=>$d8d148422a096f50$var$readParameterId(candidate, $d8d148422a096f50$var$SOURCE_COMMAND) === id);
        if (id === undefined || !source) return [];
        values.push($d8d148422a096f50$var$normalize(source.textContent));
    }
    return values;
}
function $d8d148422a096f50$var$quizKey(node) {
    const quiz = node.closest(".lia-quiz");
    const root = quiz ? $d8d148422a096f50$export$e1405b417718e07(quiz) : node;
    const selected = quiz ?? root;
    if (!selected) return "";
    const id = String(selected.dataset.resetallId ?? "").trim();
    if (id) return `id:${id}`;
    const owner = String(selected.dataset.resetTileOwner ?? "").trim();
    if (owner) return `owner:${owner}`;
    const uid = String(selected.dataset.kfUid ?? "").trim();
    if (uid && !/^inline-\d+$/i.test(uid)) return `kf:${uid}`;
    return "";
}
function $d8d148422a096f50$var$stableSignature(_quiz, root, expectedOverride) {
    const roots = $d8d148422a096f50$var$collectKachelRoots(document.body || document.documentElement);
    const localIndex = roots.indexOf(root);
    const expected = expectedOverride ?? ($d8d148422a096f50$var$expectedTexts(root).map($d8d148422a096f50$var$normalizeKey).filter(Boolean).sort().join("|") || "none");
    return `sig:${$d8d148422a096f50$var$currentSlideHash()}:${localIndex}:${$d8d148422a096f50$var$domPathToken(root) || "nopth"}:${expected}`;
}
function $d8d148422a096f50$var$collectFreezeTokens(quiz, root) {
    const keys = [];
    const uids = [];
    const addKey = (value)=>{
        if (/^(id:|owner:|kf:|sig:)/i.test(value) && !keys.includes(value)) keys.push(value);
    };
    const addUid = (value)=>{
        const uid = String(value || "").trim();
        if (!uid) return;
        if (/^inline-\d+$/i.test(uid)) addKey(`sig:${$d8d148422a096f50$var$currentSlideHash()}:inline:${uid}`);
        else if (!uids.includes(uid)) uids.push(uid);
    };
    addKey($d8d148422a096f50$var$quizKey(quiz));
    addKey($d8d148422a096f50$var$quizKey(root));
    addKey($d8d148422a096f50$var$stableSignature(quiz, root));
    // main computes this signature from real on* attributes. Stock LiaScript
    // sanitizes those handlers to data-on*, so plain .Kachel quizzes are stored
    // with the fallback expected segment "none". Keep that exact alternative
    // alongside the richer local signature; the root path and local index still
    // isolate it to this one quiz.
    addKey($d8d148422a096f50$var$stableSignature(quiz, root, "none"));
    for (const node of [
        quiz,
        root
    ]){
        addUid(String(node.dataset.kfUid ?? ""));
        addUid(String(node.closest("[data-kf-uid]")?.dataset.kfUid ?? ""));
    }
    return {
        keys: keys,
        uids: uids
    };
}
function $d8d148422a096f50$export$5ca2d691d2e7ccf5(quiz) {
    const tileRoot = $d8d148422a096f50$export$e1405b417718e07(quiz);
    const root = tileRoot ?? quiz;
    const { keys: keys, uids: uids } = $d8d148422a096f50$var$collectFreezeTokens(quiz, root);
    return {
        root: root,
        isTile: Boolean(tileRoot),
        keys: keys,
        uids: uids,
        wasFilled: Boolean(tileRoot) && !$d8d148422a096f50$export$cee751826c5b56ae(quiz)
    };
}
function $d8d148422a096f50$var$deleteFreezeTokens(context, quiz) {
    const root = $d8d148422a096f50$export$e1405b417718e07(quiz) ?? context.root;
    const current = $d8d148422a096f50$var$collectFreezeTokens(quiz, root);
    const keys = new Set([
        ...context.keys,
        ...current.keys
    ]);
    const uids = new Set([
        ...context.uids,
        ...current.uids
    ]);
    for (const key of keys){
        window.__liaKfFrozenQuizKeys?.delete(key);
        window.__liaKfFrozenQuizFeedback?.delete(`k:${key}`);
    }
    for (const uid of uids){
        window.__liaKfFrozenQuizUids?.delete(uid);
        window.__liaKfFrozenQuizFeedback?.delete(`u:${uid}`);
    }
}
function $d8d148422a096f50$var$thawDom(context, quiz) {
    const root = $d8d148422a096f50$export$e1405b417718e07(quiz) ?? context.root;
    const targets = $d8d148422a096f50$export$c670c70a59e1ce24(root);
    quiz.classList.remove("solved", "resolved");
    quiz.removeAttribute("data-kf-frozen");
    root.removeAttribute("data-kf-frozen");
    const feedback = quiz.querySelector(".lia-quiz__feedback");
    if (feedback) {
        feedback.textContent = "";
        feedback.hidden = true;
        feedback.classList.remove("text-success", "text-error", "text-disabled");
    }
    for (const target of targets){
        target.removeAttribute("aria-disabled");
        target.removeAttribute("aria-hidden");
        target.setAttribute("tabindex", "0");
        target.style.removeProperty("pointer-events");
        window.__liaKfAssignedSources?.delete(target);
    }
    for (const source of $d8d148422a096f50$export$6490ed30892e037(root)){
        source.removeAttribute("aria-disabled");
        source.removeAttribute("aria-hidden");
        source.setAttribute("aria-grabbed", "false");
        source.setAttribute("draggable", "true");
        source.setAttribute("tabindex", "0");
        source.style.removeProperty("pointer-events");
        source.style.removeProperty("display");
    }
    for (const button of Array.from(quiz.querySelectorAll(".lia-quiz__control button"))){
        button.disabled = false;
        button.removeAttribute("aria-disabled");
        button.removeAttribute("aria-hidden");
        button.removeAttribute("tabindex");
        button.style.removeProperty("pointer-events");
    }
    const modeRoot = root.matches("[data-kf-mode='seq']") ? root : root.closest("[data-kf-mode='seq']") ?? root.querySelector("[data-kf-mode='seq']");
    if (modeRoot) {
        targets.forEach((target, index)=>{
            if (index === 0) target.dataset.kfSeqVisible = "1";
            else target.removeAttribute("data-kf-seq-visible");
        });
        modeRoot.querySelectorAll("[data-kf-seq-dummy='1']").forEach((dummy)=>dummy.removeAttribute("data-kf-seq-visible"));
    }
}
function $d8d148422a096f50$export$947ed6894caa8892(context, quiz, scheduleRetries) {
    $d8d148422a096f50$var$deleteFreezeTokens(context, quiz);
    $d8d148422a096f50$var$thawDom(context, quiz);
    if (!scheduleRetries) return;
    for (const delay of [
        80,
        360,
        920
    ])window.setTimeout(()=>{
        const liveQuiz = quiz.isConnected ? quiz : context.root.matches(".lia-quiz") ? context.root : context.root.querySelector(".lia-quiz");
        if (!liveQuiz?.isConnected || !$d8d148422a096f50$export$cee751826c5b56ae(liveQuiz)) return;
        $d8d148422a096f50$var$deleteFreezeTokens(context, liveQuiz);
        $d8d148422a096f50$var$thawDom(context, liveQuiz);
    }, delay);
}
function $d8d148422a096f50$export$238e346541a06d95(quiz) {
    const root = $d8d148422a096f50$export$e1405b417718e07(quiz);
    if (!root || !window.__liaTileCrossPatched) return false;
    const targets = $d8d148422a096f50$export$c670c70a59e1ce24(root).filter((target)=>$d8d148422a096f50$export$5939335930abf31b(target) !== "");
    if (targets.length === 0) return true;
    const previous = window.__liaKfBlockDblclickClear;
    window.__liaKfBlockDblclickClear = false;
    try {
        for (const target of targets)target.dispatchEvent(new MouseEvent("dblclick", {
            bubbles: true,
            cancelable: true,
            view: window
        }));
    } finally{
        if (previous === undefined) delete window.__liaKfBlockDblclickClear;
        else window.__liaKfBlockDblclickClear = previous;
    }
    return true;
}
function $d8d148422a096f50$export$44be1ab85c8c4e24() {
    $d8d148422a096f50$var$ensureCompatibilityStyles();
    window.__liaResetGetTileQuizTargetsFromRoot = (root)=>$d8d148422a096f50$export$c670c70a59e1ce24(root);
    window.__liaResetCollectTileQuizRoots = (scope)=>$d8d148422a096f50$var$collectKachelRoots(scope);
    window.__liaResetGetTileQuizRootFromNode = (node, _scope)=>{
        const quiz = node.closest(".lia-quiz") ?? (node.matches(".lia-quiz") ? node : null);
        return quiz ? $d8d148422a096f50$export$e1405b417718e07(quiz) ?? null : null;
    };
    for (const root of $d8d148422a096f50$var$collectKachelRoots(document.body || document.documentElement)){
        root.dataset.resetTileRoot = "1";
        $d8d148422a096f50$export$c670c70a59e1ce24(root).forEach((target)=>{
            target.dataset.resetTileRole = "target";
        });
        $d8d148422a096f50$export$6490ed30892e037(root).forEach((source)=>{
            source.dataset.resetTileRole = "source";
        });
        $d8d148422a096f50$var$updateSequentialVisibility(root);
    }
}



function $a6a055ca24dab406$var$isRecord(value) {
    return typeof value === "object" && value !== null || typeof value === "function";
}
function $a6a055ca24dab406$var$recordValues(value) {
    return Object.getOwnPropertyNames(value).map((key)=>{
        try {
            return value[key];
        } catch  {
            return null;
        }
    }).filter($a6a055ca24dab406$var$isRecord);
}
function $a6a055ca24dab406$var$elmListValues(value, maximum = 4096) {
    const values = [];
    const seen = new Set();
    let cursor = value;
    while($a6a055ca24dab406$var$isRecord(cursor) && cursor.$ === 1){
        if (seen.has(cursor) || values.length >= maximum) return null;
        seen.add(cursor);
        values.push(cursor.a);
        cursor = cursor.b;
    }
    return $a6a055ca24dab406$var$isRecord(cursor) && cursor.$ === 0 ? values : null;
}
function $a6a055ca24dab406$var$flattenElmArrayTree(node, output, maximum, depth = 0) {
    if (output.length > maximum || depth > 32) return false;
    if ($a6a055ca24dab406$var$isRecord(node) && (node.$ === 0 || node.$ === 1) && Array.isArray(node.a)) {
        for (const child of node.a){
            if (!$a6a055ca24dab406$var$flattenElmArrayTree(child, output, maximum, depth + 1)) return false;
        }
        return true;
    }
    output.push(node);
    return output.length <= maximum;
}
function $a6a055ca24dab406$var$elmArrayValues(value, maximum = 4096) {
    if (!$a6a055ca24dab406$var$isRecord(value) || !Number.isSafeInteger(value.a) || Number(value.a) < 0 || Number(value.a) > maximum || !Array.isArray(value.c) || !Array.isArray(value.d)) return null;
    const expectedLength = Number(value.a);
    const values = [];
    for (const node of value.c){
        if (!$a6a055ca24dab406$var$flattenElmArrayTree(node, values, maximum)) return null;
    }
    values.push(...value.d);
    return values.length === expectedLength ? values : null;
}
function $a6a055ca24dab406$var$solutionIndexesFromState(value, optionCounts) {
    const states = $a6a055ca24dab406$var$elmArrayValues(value);
    if (!states || states.length !== optionCounts.length) return null;
    const indexes = [];
    for(let target = 0; target < optionCounts.length; target += 1){
        const state = states[target];
        if (!$a6a055ca24dab406$var$isRecord(state)) return null;
        const selected = $a6a055ca24dab406$var$elmListValues(state.c);
        if (selected?.length !== 1) return null;
        const option = Number(selected[0]);
        if (!Number.isSafeInteger(option) || option < 0 || option >= optionCounts[target]) return null;
        indexes.push(option);
    }
    return indexes;
}
function $a6a055ca24dab406$var$isOptionsState(value, optionCounts) {
    const optionsByTarget = $a6a055ca24dab406$var$elmArrayValues(value);
    if (!optionsByTarget || optionsByTarget.length !== optionCounts.length) return false;
    return optionCounts.every((count, target)=>{
        const options = $a6a055ca24dab406$var$elmListValues(optionsByTarget[target]);
        return options?.length === count;
    });
}
function $a6a055ca24dab406$export$4140e68e089bb408(checkButton, optionCounts) {
    const button = checkButton;
    const click = button.elmFs?.click;
    if (!$a6a055ca24dab406$var$isRecord(click) || !optionCounts.length) return null;
    const roots = $a6a055ca24dab406$var$recordValues(click);
    if (!roots.length) roots.push(click);
    const seen = new Set();
    const stack = roots.map((value)=>({
            depth: 0,
            value: value
        }));
    const candidates = new Map();
    let visited = 0;
    while(stack.length && visited < 10000){
        const entry = stack.pop();
        if (!entry || seen.has(entry.value)) continue;
        seen.add(entry.value);
        visited += 1;
        const children = $a6a055ca24dab406$var$recordValues(entry.value);
        for (const child of children){
            const indexes = $a6a055ca24dab406$var$solutionIndexesFromState(child, optionCounts);
            if (!indexes) continue;
            const hasMatchingOptions = children.some((sibling)=>sibling !== child && $a6a055ca24dab406$var$isOptionsState(sibling, optionCounts));
            if (hasMatchingOptions) candidates.set(indexes.join(","), indexes);
        }
        if (entry.depth >= 18) continue;
        for (const child of children)if (!seen.has(child)) stack.push({
            depth: entry.depth + 1,
            value: child
        });
    }
    return candidates.size === 1 ? Array.from(candidates.values())[0] : null;
}



const $d098096167c97898$var$CHECK_SELECTOR = ".lia-quiz__check";
const $d098096167c97898$var$PROTECTED_CONTROL_SELECTOR = ".lia-quiz__resolve, .lia-quiz__hint";
const $d098096167c97898$var$LEGACY_FEEDBACK_SELECTOR = ".lia-resetter__kachel-feedback";
const $d098096167c97898$var$INLINE_FEEDBACK_CLASS = "lia-resetter__kachel-inline-feedback";
const $d098096167c97898$var$COMPATIBILITY_ATTRIBUTE = "data-lia-resetter-kachel-state";
const $d098096167c97898$var$TARGET_ID_PATTERN = /cmd\s*:\s*['"](?:dragtarget|dragenter)['"][\s\S]*?id\s*:\s*(-?\d+)/i;
const $d098096167c97898$var$SOURCE_ADDRESS_PATTERN = /value["']?\s*:\s*\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/i;
const $d098096167c97898$var$TRACK_PATTERN = /track\s*:\s*(\[\s*\[[\s\S]*?\]\s*\])/i;
const $d098096167c97898$var$compatibilityStates = new Map();
const $d098096167c97898$var$expectedAddresses = new Map();
const $d098096167c97898$var$nativeControlReentry = new WeakSet();
const $d098096167c97898$var$pendingControls = new WeakSet();
const $d098096167c97898$var$originalInteraction = new WeakMap();
let $d098096167c97898$var$listenerInstalled = false;
let $d098096167c97898$var$hasResetterForQuiz = (_quiz)=>false;
function $d098096167c97898$var$normalize(value) {
    const api = $d098096167c97898$var$kachelApi()?.content;
    if (typeof api?.normalize === "function") return api.normalize(value);
    return String(value ?? "").replace(/\u00a0/g, " ").normalize("NFC").replace(/\s+/g, " ").trim();
}
function $d098096167c97898$var$kachelApi() {
    return window.LiaKachel;
}
function $d098096167c97898$var$handlerValues(element) {
    return [
        "onclick",
        "onkeydown",
        "ondragover",
        "ondragleave",
        "ondrop",
        "ondragstart",
        "ondragend"
    ].map((name)=>String(element.getAttribute(name) ?? element.getAttribute(`data-${name}`) ?? ""));
}
function $d098096167c97898$var$targetId(element) {
    for (const value of $d098096167c97898$var$handlerValues(element)){
        const match = value.match($d098096167c97898$var$TARGET_ID_PATTERN);
        if (!match) continue;
        const id = Number(match[1]);
        if (Number.isSafeInteger(id) && id >= 0) return id;
    }
    return undefined;
}
function $d098096167c97898$var$sourceAddress(element) {
    for (const value of $d098096167c97898$var$handlerValues(element)){
        const match = value.match($d098096167c97898$var$SOURCE_ADDRESS_PATTERN);
        if (!match) continue;
        const origin = Number(match[1]);
        const option = Number(match[2]);
        if (Number.isSafeInteger(origin) && origin >= 0 && Number.isSafeInteger(option) && option >= 0) return [
            origin,
            option
        ];
    }
    return undefined;
}
function $d098096167c97898$var$parseTrack(element) {
    for (const value of $d098096167c97898$var$handlerValues(element)){
        const serialized = value.match($d098096167c97898$var$TRACK_PATTERN)?.[1];
        if (!serialized) continue;
        try {
            const parsed = JSON.parse(serialized);
            if (Array.isArray(parsed) && parsed.every((entry)=>Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && Number.isSafeInteger(entry[1]))) return parsed;
        } catch  {
        // Try the next native handler.
        }
    }
    return undefined;
}
function $d098096167c97898$var$descriptorForQuiz(quiz) {
    const root = (0, $d8d148422a096f50$export$e1405b417718e07)(quiz);
    if (!root) return undefined;
    const entries = (0, $d8d148422a096f50$export$c670c70a59e1ce24)(root).map((target)=>({
            id: $d098096167c97898$var$targetId(target),
            target: target,
            track: $d098096167c97898$var$parseTrack(target)
        })).filter((entry)=>entry.id !== undefined && entry.track !== undefined).sort((left, right)=>left.id - right.id);
    if (!entries.length || entries.length !== (0, $d8d148422a096f50$export$c670c70a59e1ce24)(root).length) return undefined;
    const serializedTrack = JSON.stringify(entries[0].track);
    if (new Set(entries.map((entry)=>entry.id)).size !== entries.length || entries.some((entry)=>JSON.stringify(entry.track) !== serializedTrack)) return undefined;
    const sectionId = entries[0].track.find(([topic])=>topic === "quiz")?.[1];
    const quizId = entries[0].track.find(([topic])=>topic === "input")?.[1];
    if (sectionId === undefined || quizId === undefined || !Number.isSafeInteger(sectionId) || !Number.isSafeInteger(quizId)) return undefined;
    return {
        key: JSON.stringify(entries[0].track),
        quiz: quiz,
        root: root,
        targets: entries.map((entry)=>entry.target),
        targetIds: entries.map((entry)=>entry.id),
        track: entries[0].track,
        sectionId: sectionId,
        quizId: quizId
    };
}
function $d098096167c97898$var$renderedSource(source) {
    const rendered = $d098096167c97898$var$kachelApi()?.content?.rendered;
    if (typeof rendered === "function") return $d098096167c97898$var$normalize(rendered(source));
    const text = $d098096167c97898$var$normalize(source.textContent);
    if (text) return text;
    const imageText = Array.from(source.querySelectorAll("img[alt]")).map((image)=>$d098096167c97898$var$normalize(image.getAttribute("alt"))).filter(Boolean).join(" ");
    return imageText || $d098096167c97898$var$normalize(source.getAttribute("aria-label"));
}
function $d098096167c97898$var$placedSource(target) {
    return Array.from(target.children).find((child)=>Boolean($d098096167c97898$var$sourceAddress(child)));
}
function $d098096167c97898$var$addressKey(address) {
    return `${address[0]}:${address[1]}`;
}
function $d098096167c97898$var$sourceCatalog(descriptor) {
    const result = new Map();
    for (const source of (0, $d8d148422a096f50$export$6490ed30892e037)(descriptor.root)){
        const address = $d098096167c97898$var$sourceAddress(source);
        if (address && !result.has($d098096167c97898$var$addressKey(address))) result.set($d098096167c97898$var$addressKey(address), source);
    }
    return result;
}
function $d098096167c97898$var$resolveExpectedAddresses(descriptor, checkButton) {
    const cached = $d098096167c97898$var$expectedAddresses.get(descriptor.key);
    if (cached) return cached.map((address)=>[
            ...address
        ]);
    const catalog = $d098096167c97898$var$sourceCatalog(descriptor);
    const optionCounts = descriptor.targets.map(()=>0);
    for (const source of catalog.values()){
        const address = $d098096167c97898$var$sourceAddress(source);
        if (!address || address[0] >= optionCounts.length) continue;
        optionCounts[address[0]] = Math.max(optionCounts[address[0]], address[1] + 1);
    }
    if (optionCounts.some((count)=>count < 1)) return undefined;
    let correctOptions = null;
    const extractor = $d098096167c97898$var$kachelApi()?.content?.correctOptions;
    try {
        if (typeof extractor === "function") correctOptions = extractor(checkButton, optionCounts);
    } catch (error) {
        console.error("Die native Kachell\xf6sung konnte nicht gelesen werden.", error);
    }
    const localOptions = (0, $a6a055ca24dab406$export$4140e68e089bb408)(checkButton, optionCounts);
    if (correctOptions && localOptions && JSON.stringify(correctOptions) !== JSON.stringify(localOptions)) {
        console.error("Die LiaKachel-API und der lokale native L\xf6sungsleser widersprechen sich.");
        return undefined;
    }
    correctOptions ??= localOptions;
    if (!correctOptions || correctOptions.length !== descriptor.targets.length || correctOptions.some((option, origin)=>!Number.isSafeInteger(option) || option < 0 || option >= optionCounts[origin])) return undefined;
    const addresses = correctOptions.map((option, origin)=>[
            origin,
            option
        ]);
    if (addresses.some((address)=>!catalog.has($d098096167c97898$var$addressKey(address)))) return undefined;
    $d098096167c97898$var$expectedAddresses.set(descriptor.key, addresses);
    return addresses.map((address)=>[
            ...address
        ]);
}
function $d098096167c97898$var$isKachelfolge(descriptor) {
    const selector = "[data-lia-kachelfolge],[data-lia-kachelfolge-mode],.kachelfolge-wrap,[data-kf-mode]";
    return Boolean(descriptor.quiz.matches(selector) || descriptor.root.matches(selector) || descriptor.quiz.closest(selector) || descriptor.root.closest(selector) || descriptor.quiz.querySelector(selector) || descriptor.root.querySelector(selector) || descriptor.root.closest("p")?.querySelector(selector));
}
function $d098096167c97898$var$usesLegacyMainKachel() {
    return !$d098096167c97898$var$kachelApi()?.content && window.__liaTileCrossPatched === 1;
}
function $d098096167c97898$var$legacySequenceExpected(descriptor) {
    if (!$d098096167c97898$var$usesLegacyMainKachel()) return undefined;
    const owner = descriptor.root.closest("[data-kf-uid]") ?? descriptor.root.querySelector("[data-kf-uid]") ?? descriptor.quiz.closest("[data-kf-uid]");
    const uid = String(owner?.dataset.kfUid ?? "").trim();
    const expected = uid ? window.__liaKachelfolgeExpected?.[uid] : undefined;
    if (!Array.isArray(expected) || expected.length !== descriptor.targets.length) return undefined;
    return expected.map((value)=>$d098096167c97898$var$normalize(value).toLowerCase());
}
function $d098096167c97898$var$sameAddressMultiset(expected, actual) {
    const fromPlugin = $d098096167c97898$var$kachelApi()?.kachelfolge?.sameAddressMultiset;
    if (typeof fromPlugin === "function") return fromPlugin(expected, actual);
    return expected.length === actual.length && expected.map($d098096167c97898$var$addressKey).sort().every((value, index)=>value === actual.map($d098096167c97898$var$addressKey).sort()[index]);
}
function $d098096167c97898$var$gradeKachel(descriptor, checkButton) {
    const expected = $d098096167c97898$var$resolveExpectedAddresses(descriptor, checkButton);
    if (!expected) return undefined;
    const placed = descriptor.targets.map($d098096167c97898$var$placedSource);
    const targetTexts = descriptor.targets.map((0, $d8d148422a096f50$export$5939335930abf31b));
    if (targetTexts.some((text)=>text === "")) return false;
    if ($d098096167c97898$var$isKachelfolge(descriptor)) {
        const legacyExpected = $d098096167c97898$var$legacySequenceExpected(descriptor);
        if (legacyExpected) {
            const actual = targetTexts.map((text)=>$d098096167c97898$var$normalize(text).toLowerCase()).sort();
            return legacyExpected.sort().every((value, index)=>value === actual[index]);
        }
        if (placed.some((source)=>source === undefined)) return false;
        return $d098096167c97898$var$sameAddressMultiset(expected, placed.map((source)=>$d098096167c97898$var$sourceAddress(source)));
    }
    const catalog = $d098096167c97898$var$sourceCatalog(descriptor);
    return expected.every((address, index)=>{
        const expectedSource = catalog.get($d098096167c97898$var$addressKey(address));
        const actualSource = placed[index];
        const expectedText = expectedSource ? $d098096167c97898$var$renderedSource(expectedSource) : "";
        const actualText = actualSource ? $d098096167c97898$var$renderedSource(actualSource) : $d098096167c97898$var$usesLegacyMainKachel() ? targetTexts[index] : "";
        const comparableExpected = $d098096167c97898$var$usesLegacyMainKachel() ? expectedText.toLowerCase() : expectedText;
        const comparableActual = $d098096167c97898$var$usesLegacyMainKachel() ? actualText.toLowerCase() : actualText;
        return Boolean(expectedSource && (actualSource || $d098096167c97898$var$usesLegacyMainKachel()) && comparableExpected !== "" && comparableExpected === comparableActual);
    });
}
function $d098096167c97898$var$purgeLegacyFeedbackOverlays() {
    document.querySelectorAll($d098096167c97898$var$LEGACY_FEEDBACK_SELECTOR).forEach((feedback)=>feedback.remove());
}
function $d098096167c97898$var$inlineFeedbackForQuiz(quiz) {
    return Array.from(quiz.children).find((child)=>child instanceof HTMLElement && child.classList.contains($d098096167c97898$var$INLINE_FEEDBACK_CLASS));
}
function $d098096167c97898$var$renderInlineFeedback(descriptor, state) {
    let feedback = $d098096167c97898$var$inlineFeedbackForQuiz(descriptor.quiz);
    if (!feedback) {
        const nativeFeedback = Array.from(descriptor.quiz.children).some((child)=>child instanceof HTMLElement && child.classList.contains("lia-quiz__feedback"));
        if (nativeFeedback) return;
        feedback = document.createElement("div");
        feedback.className = `lia-quiz__feedback ${$d098096167c97898$var$INLINE_FEEDBACK_CLASS}`;
        feedback.setAttribute("aria-live", "polite");
        // Appending leaves every Elm-managed child index untouched. The element is
        // removed before Reset sends any native input event.
        descriptor.quiz.append(feedback);
    }
    feedback.classList.remove("text-success", "text-error", "text-disabled");
    feedback.classList.add(state.status === "correct" ? "text-success" : "text-error");
    if (feedback.textContent !== state.text) feedback.textContent = state.text;
}
function $d098096167c97898$var$rememberInteraction(element) {
    if ($d098096167c97898$var$originalInteraction.has(element)) return;
    $d098096167c97898$var$originalInteraction.set(element, {
        ariaDisabled: element.getAttribute("aria-disabled"),
        ariaGrabbed: element.getAttribute("aria-grabbed"),
        draggable: element.getAttribute("draggable"),
        pointerEvents: element.style.pointerEvents,
        tabIndex: element.getAttribute("tabindex")
    });
}
function $d098096167c97898$var$restoreAttribute(element, name, value) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
}
function $d098096167c97898$var$restoreInteraction(element) {
    const original = $d098096167c97898$var$originalInteraction.get(element);
    if (!original) return;
    $d098096167c97898$var$restoreAttribute(element, "aria-disabled", original.ariaDisabled);
    $d098096167c97898$var$restoreAttribute(element, "aria-grabbed", original.ariaGrabbed);
    $d098096167c97898$var$restoreAttribute(element, "draggable", original.draggable);
    $d098096167c97898$var$restoreAttribute(element, "tabindex", original.tabIndex);
    if (original.pointerEvents) element.style.pointerEvents = original.pointerEvents;
    else element.style.removeProperty("pointer-events");
    $d098096167c97898$var$originalInteraction.delete(element);
}
function $d098096167c97898$var$applyCompatibilityState(descriptor, state) {
    descriptor.quiz.setAttribute($d098096167c97898$var$COMPATIBILITY_ATTRIBUTE, state.status);
    $d098096167c97898$var$renderInlineFeedback(descriptor, state);
    const checkButton = descriptor.quiz.querySelector($d098096167c97898$var$CHECK_SELECTOR);
    if (state.status === "correct") {
        descriptor.quiz.classList.remove("open", "resolved");
        descriptor.quiz.classList.add("solved");
        if (checkButton) checkButton.disabled = true;
        for (const element of [
            ...descriptor.targets,
            ...(0, $d8d148422a096f50$export$6490ed30892e037)(descriptor.root)
        ]){
            $d098096167c97898$var$rememberInteraction(element);
            element.setAttribute("aria-disabled", "true");
            element.style.setProperty("pointer-events", "none");
            if (element.matches("[tabindex]")) element.setAttribute("tabindex", "-1");
        }
    } else if (checkButton) checkButton.disabled = false;
}
function $d098096167c97898$var$hideCompatibilityState(descriptor) {
    $d098096167c97898$var$compatibilityStates.delete(descriptor.key);
    $d098096167c97898$var$inlineFeedbackForQuiz(descriptor.quiz)?.remove();
    descriptor.quiz.removeAttribute($d098096167c97898$var$COMPATIBILITY_ATTRIBUTE);
    delete descriptor.quiz.dataset.liaResetterKachelMessage;
    descriptor.quiz.classList.remove("solved", "resolved");
    descriptor.quiz.classList.add("open");
    const checkButton = descriptor.quiz.querySelector($d098096167c97898$var$CHECK_SELECTOR);
    if (checkButton) checkButton.disabled = false;
    for (const element of [
        ...descriptor.targets,
        ...(0, $d8d148422a096f50$export$6490ed30892e037)(descriptor.root)
    ])$d098096167c97898$var$restoreInteraction(element);
    $d098096167c97898$export$c39a876d94d97bea();
}
function $d098096167c97898$var$blockPendingClick(event, button) {
    if (!$d098096167c97898$var$pendingControls.has(button)) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
}
async function $d098096167c97898$var$handleKachelCheck(button, descriptor) {
    $d098096167c97898$var$pendingControls.add(button);
    button.disabled = true;
    try {
        if (await (0, $3c7ccc4e179fe4df$export$1c2dd9ab0f322592)(descriptor.sectionId)) {
            $d098096167c97898$var$nativeControlReentry.add(button);
            button.disabled = false;
            button.click();
            return;
        }
        const correct = $d098096167c97898$var$gradeKachel(descriptor, button);
        if (correct === undefined) {
            const message = "Die Kachell\xf6sung konnte nicht sicher gelesen werden; die Eingabe wurde nicht bewertet.";
            button.disabled = false;
            console.error(message);
            return;
        }
        const state = correct ? {
            status: "correct",
            text: "Herzlichen Gl\xfcckwunsch, das war die richtige Antwort"
        } : {
            status: "wrong",
            text: "Die richtige Antwort wurde noch nicht gegeben"
        };
        $d098096167c97898$var$compatibilityStates.set(descriptor.key, state);
        $d098096167c97898$var$applyCompatibilityState(descriptor, state);
    } catch (error) {
        button.disabled = false;
        console.error("Kachelquiz konnte nicht gepr\xfcft werden:", error);
    } finally{
        $d098096167c97898$var$pendingControls.delete(button);
    }
}
async function $d098096167c97898$var$handleProtectedControl(button, descriptor) {
    $d098096167c97898$var$pendingControls.add(button);
    try {
        if (await (0, $3c7ccc4e179fe4df$export$1c2dd9ab0f322592)(descriptor.sectionId)) {
            $d098096167c97898$var$nativeControlReentry.add(button);
            button.click();
            return;
        }
        const action = button.matches(".lia-quiz__hint") ? "Hinweis" : "Aufl\xf6sen";
        const message = `${action} ist im Kachel-Kompatibilit\xe4tsmodus deaktiviert, damit dieses Quiz weiterhin einzeln zur\xfcckgesetzt werden kann.`;
        console.warn(message);
    } catch (error) {
        console.error("Kachelsteuerung konnte nicht ausgef\xfchrt werden:", error);
    } finally{
        $d098096167c97898$var$pendingControls.delete(button);
    }
}
function $d098096167c97898$var$onDocumentClick(event) {
    const target = event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
    const button = target?.closest(`${$d098096167c97898$var$CHECK_SELECTOR}, ${$d098096167c97898$var$PROTECTED_CONTROL_SELECTOR}`);
    if (!button) return;
    if ($d098096167c97898$var$nativeControlReentry.has(button)) {
        $d098096167c97898$var$nativeControlReentry.delete(button);
        return;
    }
    if ($d098096167c97898$var$blockPendingClick(event, button)) return;
    const quiz = button.closest(".lia-quiz");
    if (!quiz || !$d098096167c97898$var$hasResetterForQuiz(quiz) || !(0, $d8d148422a096f50$export$e1405b417718e07)(quiz)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const descriptor = $d098096167c97898$var$descriptorForQuiz(quiz);
    if (!descriptor) {
        const message = "Das Kachelquiz konnte keinem eindeutigen LiaScript-Track zugeordnet werden.";
        console.error(message);
        return;
    }
    if (button.matches($d098096167c97898$var$PROTECTED_CONTROL_SELECTOR)) $d098096167c97898$var$handleProtectedControl(button, descriptor);
    else $d098096167c97898$var$handleKachelCheck(button, descriptor);
}
function $d098096167c97898$export$8ecdb144bfa50eaf(hasResetter) {
    $d098096167c97898$var$purgeLegacyFeedbackOverlays();
    if (hasResetter) $d098096167c97898$var$hasResetterForQuiz = hasResetter;
    if ($d098096167c97898$var$listenerInstalled) return;
    $d098096167c97898$var$listenerInstalled = true;
    window.addEventListener("click", $d098096167c97898$var$onDocumentClick, true);
}
function $d098096167c97898$export$d99d05dcb51a6f0b(scope = document) {
    $d098096167c97898$var$purgeLegacyFeedbackOverlays();
    const quizzes = [];
    if (scope instanceof HTMLElement && scope.classList.contains("lia-quiz")) quizzes.push(scope);
    quizzes.push(...Array.from(scope.querySelectorAll(".lia-quiz")));
    for (const quiz of quizzes){
        const descriptor = $d098096167c97898$var$descriptorForQuiz(quiz);
        const state = descriptor ? $d098096167c97898$var$compatibilityStates.get(descriptor.key) : undefined;
        if (descriptor && state) $d098096167c97898$var$applyCompatibilityState(descriptor, state);
        else {
            $d098096167c97898$var$inlineFeedbackForQuiz(quiz)?.remove();
            quiz.removeAttribute($d098096167c97898$var$COMPATIBILITY_ATTRIBUTE);
        }
    }
}
function $d098096167c97898$export$41803493d24dde36(quiz) {
    const descriptor = $d098096167c97898$var$descriptorForQuiz(quiz);
    if (descriptor) $d098096167c97898$var$hideCompatibilityState(descriptor);
}
function $d098096167c97898$export$6c92125d26f267bf(quiz, sectionId, quizId) {
    const descriptor = $d098096167c97898$var$descriptorForQuiz(quiz);
    if (!descriptor || descriptor.sectionId !== sectionId || descriptor.quizId !== quizId) return false;
    $d098096167c97898$var$hideCompatibilityState(descriptor);
    for (const id of descriptor.targetIds){
        window.LIA.send({
            reply: true,
            track: descriptor.track.map(([topic, index])=>[
                    topic,
                    index
                ]),
            service: "input",
            message: {
                cmd: "dragtarget",
                param: {
                    id: id,
                    value: null
                }
            }
        });
        window.LIA.send({
            reply: true,
            track: descriptor.track.map(([topic, index])=>[
                    topic,
                    index
                ]),
            service: "input",
            message: {
                cmd: "dragsource",
                param: {
                    id: id,
                    value: []
                }
            }
        });
    }
    return true;
}
function $d098096167c97898$export$8fc4e12fa1c6acd8(quiz) {
    const descriptor = $d098096167c97898$var$descriptorForQuiz(quiz);
    if (!descriptor) return undefined;
    const sources = (0, $d8d148422a096f50$export$6490ed30892e037)(descriptor.root).filter((source)=>!descriptor.targets.some((target)=>target === source || target.contains(source))).map((source)=>({
            address: $d098096167c97898$var$sourceAddress(source),
            ariaDisabled: source.getAttribute("aria-disabled"),
            draggable: source.getAttribute("draggable"),
            hidden: source.getAttribute("aria-hidden"),
            pointerEvents: source.style.pointerEvents,
            text: $d098096167c97898$var$renderedSource(source)
        })).sort((left, right)=>JSON.stringify(left).localeCompare(JSON.stringify(right)));
    return JSON.stringify({
        checkDisabled: Boolean(descriptor.quiz.querySelector($d098096167c97898$var$CHECK_SELECTOR)?.disabled),
        className: Array.from(descriptor.quiz.classList).sort(),
        compatibility: descriptor.quiz.getAttribute($d098096167c97898$var$COMPATIBILITY_ATTRIBUTE),
        inlineFeedback: (()=>{
            const feedback = $d098096167c97898$var$inlineFeedbackForQuiz(descriptor.quiz);
            return feedback ? {
                ariaLive: feedback.getAttribute("aria-live"),
                className: Array.from(feedback.classList).sort(),
                text: feedback.textContent ?? ""
            } : null;
        })(),
        sources: sources,
        targets: descriptor.targets.map((target)=>({
                address: $d098096167c97898$var$placedSource(target) ? $d098096167c97898$var$sourceAddress($d098096167c97898$var$placedSource(target)) : undefined,
                text: (0, $d8d148422a096f50$export$5939335930abf31b)(target)
            }))
    });
}
function $d098096167c97898$export$5fada60267d73e8f(quiz) {
    const descriptor = $d098096167c97898$var$descriptorForQuiz(quiz);
    if (!descriptor || !(0, $d8d148422a096f50$export$cee751826c5b56ae)(quiz)) return false;
    const checkButton = descriptor.quiz.querySelector($d098096167c97898$var$CHECK_SELECTOR);
    const bankSources = (0, $d8d148422a096f50$export$6490ed30892e037)(descriptor.root).filter((source)=>!descriptor.targets.some((target)=>target === source || target.contains(source)));
    return descriptor.quiz.getAttribute($d098096167c97898$var$COMPATIBILITY_ATTRIBUTE) === null && $d098096167c97898$var$inlineFeedbackForQuiz(descriptor.quiz) === undefined && !descriptor.quiz.classList.contains("solved") && !descriptor.quiz.classList.contains("resolved") && !checkButton?.disabled && bankSources.some((source)=>source.getAttribute("draggable") === "true" && source.getAttribute("aria-disabled") !== "true" && source.style.pointerEvents !== "none");
}
function $d098096167c97898$export$c39a876d94d97bea() {
    try {
        $d098096167c97898$var$kachelApi()?.kachelfolge?.refreshProgressive?.(document);
    } catch (error) {
        console.warn("Die progressive Kachelansicht konnte nicht aktualisiert werden.", error);
    }
    (0, $d8d148422a096f50$export$3d5564f3c44147c6)(document);
}



const $40737b7af5fc30de$var$MODULE_KEY = "__ORTHOGRAPHY_EXPORT_V8__";
const $40737b7af5fc30de$var$UI_SELECTOR = ".orthography-ui, [id^='orthography-ui-'], [id^='orthographytext-ui-']";
const $40737b7af5fc30de$var$INPUT_SELECTOR = "input[id^='orthography-input-'], textarea[id^='orthographytext-input-'],input[data-id^='lia-quiz-'], textarea[data-id^='lia-quiz-']";
function $40737b7af5fc30de$var$normalizeString(value) {
    return String(value ?? "");
}
function $40737b7af5fc30de$var$uidFromId(id) {
    for (const prefix of [
        "orthography-ui-",
        "orthographytext-ui-",
        "orthography-check-",
        "orthographytext-check-",
        "orthography-input-",
        "orthographytext-input-",
        "lia-quiz-"
    ]){
        if (id.startsWith(prefix)) return id.slice(prefix.length);
    }
    return "";
}
function $40737b7af5fc30de$var$uidFromElement(element) {
    if (!element) return "";
    const direct = $40737b7af5fc30de$var$normalizeString(element.dataset?.orthoUid).trim();
    if (direct) return direct;
    const dataId = $40737b7af5fc30de$var$normalizeString(element.getAttribute("data-id")).trim();
    return $40737b7af5fc30de$var$uidFromId(element.id || "") || $40737b7af5fc30de$var$uidFromId(dataId);
}
function $40737b7af5fc30de$var$accessibleWindows() {
    const result = [];
    let current = window;
    for(let depth = 0; current && depth < 12; depth += 1){
        if (!result.includes(current)) result.push(current);
        try {
            if (!current.parent || current.parent === current) break;
            current = current.parent;
        } catch  {
            break;
        }
    }
    return result;
}
function $40737b7af5fc30de$var$orthographyApi() {
    for (const view of $40737b7af5fc30de$var$accessibleWindows())try {
        const candidate = view[$40737b7af5fc30de$var$MODULE_KEY];
        if (candidate && typeof candidate.getAllStates === "function" && typeof candidate.setState === "function") return candidate;
    } catch  {
    // A cross-origin parent is intentionally ignored.
    }
    return undefined;
}
function $40737b7af5fc30de$var$allOrthographyUis(scope = document) {
    const result = [];
    if (scope instanceof HTMLElement && scope.matches($40737b7af5fc30de$var$UI_SELECTOR)) result.push(scope);
    result.push(...Array.from(scope.querySelectorAll($40737b7af5fc30de$var$UI_SELECTOR)));
    return result.filter((ui, index)=>result.indexOf(ui) === index);
}
function $40737b7af5fc30de$var$uiUid(ui) {
    const direct = $40737b7af5fc30de$var$uidFromElement(ui);
    if (direct) return direct;
    return $40737b7af5fc30de$var$uidFromElement(ui.querySelector($40737b7af5fc30de$var$INPUT_SELECTOR));
}
function $40737b7af5fc30de$var$uiForQuiz(quiz) {
    const closest = quiz.closest($40737b7af5fc30de$var$UI_SELECTOR);
    if (closest) return closest;
    const uid = $40737b7af5fc30de$var$uidFromElement(quiz) || $40737b7af5fc30de$var$uidFromElement(quiz.querySelector("[data-ortho-uid]"));
    if (!uid) return undefined;
    return $40737b7af5fc30de$var$allOrthographyUis(document).find((ui)=>$40737b7af5fc30de$var$uiUid(ui) === uid);
}
function $40737b7af5fc30de$var$quizForUi(ui, uid) {
    const contained = Array.from(ui.querySelectorAll(".lia-quiz"));
    if (contained.length === 1) return contained[0];
    if (contained.length > 1) return undefined;
    return Array.from(document.querySelectorAll(".lia-quiz")).find((quiz)=>$40737b7af5fc30de$var$uidFromElement(quiz) === uid);
}
function $40737b7af5fc30de$var$descriptorForQuiz(quiz) {
    const ui = $40737b7af5fc30de$var$uiForQuiz(quiz);
    if (!ui) return undefined;
    const inputs = Array.from(ui.querySelectorAll($40737b7af5fc30de$var$INPUT_SELECTOR));
    if (inputs.length !== 1) return undefined;
    const input = inputs[0];
    const uid = $40737b7af5fc30de$var$uiUid(ui) || $40737b7af5fc30de$var$uidFromElement(quiz) || $40737b7af5fc30de$var$uidFromElement(input);
    if (!uid) return undefined;
    const ownedQuiz = $40737b7af5fc30de$var$quizForUi(ui, uid);
    if (ownedQuiz !== quiz) return undefined;
    const wrap = input.closest(".orthography-wrap");
    if (!wrap) return undefined;
    const startNode = ui.querySelector(`#orthography-start-${CSS.escape(uid)}`) ?? ui.querySelector(`#orthographytext-start-${CSS.escape(uid)}`) ?? wrap.querySelector("[id^='orthography-start-'], [id^='orthographytext-start-']");
    const start = startNode ? $40737b7af5fc30de$var$normalizeString(startNode.textContent) : $40737b7af5fc30de$var$normalizeString(input.getAttribute("value") ?? input.defaultValue);
    return {
        uid: uid,
        ui: ui,
        wrap: wrap,
        input: input,
        start: start,
        quiz: quiz
    };
}
function $40737b7af5fc30de$var$descriptorForUid(uid, preferredQuiz) {
    if (preferredQuiz) {
        const preferred = $40737b7af5fc30de$var$descriptorForQuiz(preferredQuiz);
        if (preferred?.uid === uid) return preferred;
    }
    for (const ui of $40737b7af5fc30de$var$allOrthographyUis(document)){
        if ($40737b7af5fc30de$var$uiUid(ui) !== uid) continue;
        const quiz = $40737b7af5fc30de$var$quizForUi(ui, uid);
        if (!quiz) return undefined;
        return $40737b7af5fc30de$var$descriptorForQuiz(quiz);
    }
    return undefined;
}
function $40737b7af5fc30de$var$finiteInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : fallback;
}
function $40737b7af5fc30de$export$a86a13fad92687b(state, start) {
    state.checkToken = $40737b7af5fc30de$var$finiteInteger(state.checkToken) + 1;
    state.resolvePending = false;
    state.solved = false;
    state.tries = 0;
    state.liveValue = start;
}
function $40737b7af5fc30de$var$stateSnapshot(scope, excludedUid) {
    const states = $40737b7af5fc30de$var$orthographyApi()?.getAllStates() ?? {};
    const entries = $40737b7af5fc30de$var$allOrthographyUis(scope).map((ui)=>{
        const uid = $40737b7af5fc30de$var$uiUid(ui);
        if (!uid || uid === excludedUid) return undefined;
        const quiz = $40737b7af5fc30de$var$quizForUi(ui, uid);
        const descriptor = quiz ? $40737b7af5fc30de$var$descriptorForQuiz(quiz) : undefined;
        const state = states[uid];
        if (!descriptor) return undefined;
        return {
            uid: uid,
            value: descriptor.input.value,
            defaultValue: descriptor.input.defaultValue,
            readOnly: descriptor.input.readOnly,
            wrapSolved: descriptor.wrap.dataset.orthoSolved ?? null,
            wrapTries: descriptor.wrap.dataset.orthoTries ?? null,
            state: state ? {
                liveValue: state.liveValue ?? null,
                solved: state.solved ?? null,
                tries: state.tries ?? null,
                checkToken: state.checkToken ?? null,
                resolvePending: state.resolvePending ?? null
            } : null
        };
    }).filter((entry)=>entry !== undefined).sort((left, right)=>left.uid.localeCompare(right.uid));
    return JSON.stringify(entries);
}
function $40737b7af5fc30de$export$ddfd56e8b3ecba99(quiz, scope) {
    const descriptor = $40737b7af5fc30de$var$descriptorForQuiz(quiz);
    if (!descriptor) return undefined;
    const api = $40737b7af5fc30de$var$orthographyApi();
    const state = api?.getAllStates()?.[descriptor.uid];
    if (!api || !state) throw new Error("Der Zustand dieses lia-orthography-Quiz ist noch nicht eindeutig verf\xfcgbar.");
    return {
        uid: descriptor.uid,
        start: descriptor.start,
        scope: scope,
        siblingSignature: $40737b7af5fc30de$var$stateSnapshot(scope, descriptor.uid)
    };
}
function $40737b7af5fc30de$var$setInputValue(input, value) {
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    input.defaultValue = value;
    if (input instanceof HTMLInputElement) input.setAttribute("value", value);
    input.readOnly = false;
    input.dispatchEvent(new Event("input", {
        bubbles: true
    }));
    input.dispatchEvent(new Event("change", {
        bubbles: true
    }));
}
function $40737b7af5fc30de$var$resolveGateIsInitial(quiz, state) {
    const resolve = quiz.querySelector(".lia-quiz__resolve");
    if (!resolve || !state.gate) return true;
    const mode = $40737b7af5fc30de$var$normalizeString(state.gate.mode);
    const attempts = $40737b7af5fc30de$var$finiteInteger(state.gate.n);
    if (mode === "off" || mode === "attempts" && attempts > 0) return resolve.disabled && (resolve.hidden || resolve.style.display === "none" || resolve.getAttribute("aria-hidden") === "true");
    return !resolve.disabled && resolve.getAttribute("aria-hidden") !== "true";
}
function $40737b7af5fc30de$var$isPristine(context, descriptor, state) {
    return state.solved === false && $40737b7af5fc30de$var$finiteInteger(state.tries, -1) === 0 && state.resolvePending === false && $40737b7af5fc30de$var$normalizeString(state.liveValue) === context.start && descriptor.input.value === context.start && descriptor.input.defaultValue === context.start && descriptor.input.readOnly === false && descriptor.wrap.dataset.orthoSolved === "0" && descriptor.wrap.dataset.orthoTries === "0" && !descriptor.quiz.classList.contains("solved") && !descriptor.quiz.classList.contains("resolved") && $40737b7af5fc30de$var$resolveGateIsInitial(descriptor.quiz, state);
}
function $40737b7af5fc30de$var$waitForAnimationFrame() {
    return new Promise((resolve)=>requestAnimationFrame(()=>resolve()));
}
async function $40737b7af5fc30de$export$89706816ca4123c4(context, quiz) {
    const api = $40737b7af5fc30de$var$orthographyApi();
    const state = api?.getAllStates()?.[context.uid];
    if (!api || !state) throw new Error("Der Zustand dieses lia-orthography-Quiz konnte nicht zur\xfcckgesetzt werden.");
    $40737b7af5fc30de$export$a86a13fad92687b(state, context.start);
    api.setState(context.uid, context.start);
    let descriptor = $40737b7af5fc30de$var$descriptorForUid(context.uid, quiz);
    if (!descriptor) throw new Error("Das Eingabefeld dieses lia-orthography-Quiz wurde nicht wiedergefunden.");
    $40737b7af5fc30de$var$setInputValue(descriptor.input, context.start);
    // lia-orthography schedules an additional synchronization after 90 ms.
    await $40737b7af5fc30de$var$waitForAnimationFrame();
    await new Promise((resolve)=>window.setTimeout(resolve, 130));
    await $40737b7af5fc30de$var$waitForAnimationFrame();
    descriptor = $40737b7af5fc30de$var$descriptorForUid(context.uid, quiz);
    const currentState = api.getAllStates()?.[context.uid];
    if (!descriptor || !currentState || !$40737b7af5fc30de$var$isPristine(context, descriptor, currentState)) throw new Error("Der lia-orthography-Zustand wurde nicht vollst\xe4ndig ge\xf6ffnet.");
    const liveScope = descriptor.quiz.closest("main.lia-slide__content");
    if ($40737b7af5fc30de$var$stateSnapshot(liveScope ?? context.scope, context.uid) !== context.siblingSignature) throw new Error("Beim Orthografie-Reset wurde ein anderes Orthografiequiz ver\xe4ndert.");
}


const $432c4e666928c735$var$PUBLIC_KEY = "__LIA_FRACTION_QUIZ__";
const $432c4e666928c735$var$STORE_KEY = "__LIA_FRACTION_QUIZ_V3__";
const $432c4e666928c735$var$WRAP_SELECTOR = "[id^='fq-circle-wrap-'][data-fq-kind='circle'][data-fq-uid],[id^='fq-rect-wrap-'][data-fq-kind='rect'][data-fq-uid]";
function $432c4e666928c735$var$isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function $432c4e666928c735$var$hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}
function $432c4e666928c735$var$accessibleWindows() {
    const result = [];
    let current = window;
    for(let depth = 0; current && depth < 12; depth += 1){
        if (!result.includes(current)) result.push(current);
        try {
            if (!current.parent || current.parent === current) break;
            current = current.parent;
        } catch  {
            break;
        }
    }
    return result;
}
function $432c4e666928c735$var$looksLikeApi(value) {
    return $432c4e666928c735$var$isRecord(value) && typeof value.getAllWidgets === "function";
}
function $432c4e666928c735$var$looksLikeStore(value) {
    if (!$432c4e666928c735$var$isRecord(value) || value.version !== 3) return false;
    return [
        "getWidget",
        "refreshNodes",
        "setCircleParts",
        "setRectDims",
        "syncInputs",
        "syncDomState",
        "render"
    ].every((key)=>typeof value[key] === "function");
}
function $432c4e666928c735$var$looksLikeWidget(value, uid) {
    if (!$432c4e666928c735$var$isRecord(value) || !$432c4e666928c735$var$isRecord(value.meta) || !Array.isArray(value.state)) return false;
    return String(value.meta.uid ?? "") === uid && value.state.every((entry)=>typeof entry === "boolean");
}
function $432c4e666928c735$var$runtimeForUid(uid) {
    for (const view of $432c4e666928c735$var$accessibleWindows())try {
        const globals = view;
        const api = globals[$432c4e666928c735$var$PUBLIC_KEY];
        const store = globals[$432c4e666928c735$var$STORE_KEY];
        if (!$432c4e666928c735$var$looksLikeApi(api) || !$432c4e666928c735$var$looksLikeStore(store)) continue;
        const snapshots = api.getAllWidgets();
        if (!$432c4e666928c735$var$isRecord(snapshots) || !$432c4e666928c735$var$hasOwn(snapshots, uid)) continue;
        // getWidget creates unknown UIDs lazily. It is intentionally called only
        // after the public snapshot proved that this UID already exists.
        const widget = store.getWidget(uid);
        if (!$432c4e666928c735$var$looksLikeWidget(widget, uid)) continue;
        return {
            view: view,
            api: api,
            store: store
        };
    } catch  {
    // A cross-origin parent or an incompatible template instance is ignored.
    }
    return undefined;
}
function $432c4e666928c735$var$expectedId(kind, part, uid) {
    return `fq-${kind}-${part}-${uid}`;
}
function $432c4e666928c735$var$oneElementById(id, parent) {
    const element = document.getElementById(id);
    return element instanceof HTMLElement && parent.contains(element) ? element : undefined;
}
function $432c4e666928c735$var$singleRange(parent) {
    const inputs = Array.from(parent.querySelectorAll("input[type='range']"));
    return inputs.length === 1 ? inputs[0] : undefined;
}
function $432c4e666928c735$var$descriptorForWrap(wrap, preferredQuiz) {
    const uid = (wrap.dataset.fqUid ?? "").trim();
    const kindValue = (wrap.dataset.fqKind ?? "").trim();
    if (!uid || kindValue !== "circle" && kindValue !== "rect") return undefined;
    const kind = kindValue;
    if (wrap.id !== $432c4e666928c735$var$expectedId(kind, "wrap", uid)) return undefined;
    const quizzes = Array.from(wrap.querySelectorAll(".lia-quiz.lia-quiz-generic"));
    if (quizzes.length !== 1 || preferredQuiz && quizzes[0] !== preferredQuiz) return undefined;
    const host = $432c4e666928c735$var$oneElementById($432c4e666928c735$var$expectedId(kind, "host", uid), wrap);
    const mount = $432c4e666928c735$var$oneElementById($432c4e666928c735$var$expectedId(kind, "mount", uid), wrap);
    if (!host || !mount || !host.contains(mount)) return undefined;
    if (kind === "circle") {
        const rangeWrap = $432c4e666928c735$var$oneElementById($432c4e666928c735$var$expectedId(kind, "range", uid), wrap);
        const input = rangeWrap ? $432c4e666928c735$var$singleRange(rangeWrap) : undefined;
        if (!rangeWrap || !input || !host.contains(rangeWrap)) return undefined;
        return {
            uid: uid,
            kind: kind,
            wrap: wrap,
            host: host,
            mount: mount,
            quiz: quizzes[0],
            inputs: [
                input
            ]
        };
    }
    const rowsWrap = $432c4e666928c735$var$oneElementById($432c4e666928c735$var$expectedId(kind, "rows-wrap", uid), wrap);
    const colsWrap = $432c4e666928c735$var$oneElementById($432c4e666928c735$var$expectedId(kind, "cols-wrap", uid), wrap);
    const rows = rowsWrap ? $432c4e666928c735$var$singleRange(rowsWrap) : undefined;
    const cols = colsWrap ? $432c4e666928c735$var$singleRange(colsWrap) : undefined;
    if (!rowsWrap || !colsWrap || !rows || !cols || !host.contains(rowsWrap) || !host.contains(colsWrap)) return undefined;
    return {
        uid: uid,
        kind: kind,
        wrap: wrap,
        host: host,
        mount: mount,
        quiz: quizzes[0],
        inputs: [
            rows,
            cols
        ]
    };
}
function $432c4e666928c735$var$descriptorForQuiz(quiz) {
    const wrap = quiz.closest($432c4e666928c735$var$WRAP_SELECTOR);
    return wrap ? $432c4e666928c735$var$descriptorForWrap(wrap, quiz) : undefined;
}
function $432c4e666928c735$var$descriptorForUid(uid, preferredQuiz) {
    const matches = Array.from(document.querySelectorAll($432c4e666928c735$var$WRAP_SELECTOR)).map((wrap)=>$432c4e666928c735$var$descriptorForWrap(wrap)).filter((descriptor)=>descriptor?.uid === uid);
    if (matches.length !== 1) return undefined;
    const descriptor = matches[0];
    if (preferredQuiz?.isConnected && descriptor.quiz !== preferredQuiz) return undefined;
    return descriptor;
}
function $432c4e666928c735$var$authoredInteger(input, fallbackMin, fallbackMax) {
    const raw = input.getAttribute("value") ?? input.defaultValue;
    if (!/^\d+$/.test(raw.trim())) return undefined;
    const value = Number(raw);
    const parsedMin = input.min.trim() ? Number(input.min) : Number.NaN;
    const parsedMax = input.max.trim() ? Number(input.max) : Number.NaN;
    const min = Number.isFinite(parsedMin) ? parsedMin : fallbackMin;
    const max = Number.isFinite(parsedMax) ? parsedMax : fallbackMax;
    return Number.isSafeInteger(value) && value >= min && value <= max ? value : undefined;
}
function $432c4e666928c735$var$initialForDescriptor(descriptor) {
    if (descriptor.kind === "circle") {
        const parts = $432c4e666928c735$var$authoredInteger(descriptor.inputs[0], 1, 32);
        return parts === undefined ? undefined : {
            kind: "circle",
            parts: parts
        };
    }
    const rows = $432c4e666928c735$var$authoredInteger(descriptor.inputs[0], 1, 20);
    const cols = $432c4e666928c735$var$authoredInteger(descriptor.inputs[1], 1, 20);
    return rows === undefined || cols === undefined ? undefined : {
        kind: "rect",
        rows: rows,
        cols: cols
    };
}
function $432c4e666928c735$var$targetSignature(widget) {
    const meta = widget.meta;
    return JSON.stringify({
        uid: meta.uid ?? null,
        kind: meta.kind ?? null,
        target: meta.target ?? null,
        ready: meta.ready ?? null
    });
}
function $432c4e666928c735$var$statusAttributes(descriptor) {
    return [
        descriptor.wrap,
        descriptor.host,
        descriptor.mount
    ].map((element)=>({
            locked: element.getAttribute("data-fq-locked"),
            solved: element.getAttribute("data-fq-solved"),
            revealed: element.getAttribute("data-fq-revealed")
        }));
}
function $432c4e666928c735$var$inputSnapshot(input) {
    return {
        value: input.value,
        defaultValue: input.defaultValue,
        authoredValue: input.getAttribute("value"),
        disabled: input.disabled
    };
}
function $432c4e666928c735$var$widgetSnapshot(descriptor, runtime) {
    const publicWidget = runtime.api.getAllWidgets()[descriptor.uid];
    const widget = runtime.store.getWidget(descriptor.uid);
    if (!publicWidget || !$432c4e666928c735$var$looksLikeWidget(widget, descriptor.uid)) throw new Error("Ein lia-Mathe-Zustand konnte nicht eindeutig gelesen werden.");
    return {
        uid: descriptor.uid,
        kind: descriptor.kind,
        public: {
            state: publicWidget.state ?? null,
            meta: publicWidget.meta ?? null
        },
        internal: {
            state: widget.state.slice(),
            dims: widget.dims ? {
                rows: widget.dims.rows ?? null,
                cols: widget.dims.cols ?? null
            } : null,
            meta: {
                uid: widget.meta.uid ?? null,
                kind: widget.meta.kind ?? null,
                target: widget.meta.target ?? null,
                locked: widget.meta.locked ?? null,
                solved: widget.meta.solved ?? null,
                revealed: widget.meta.revealed ?? null,
                ready: widget.meta.ready ?? null,
                parts: widget.meta.parts ?? null,
                rows: widget.meta.rows ?? null,
                cols: widget.meta.cols ?? null
            }
        },
        inputs: descriptor.inputs.map($432c4e666928c735$var$inputSnapshot),
        status: $432c4e666928c735$var$statusAttributes(descriptor),
        parts: Array.from(descriptor.mount.querySelectorAll("[data-fq-part]")).map((part)=>({
                index: part.getAttribute("data-fq-part"),
                fill: part.getAttribute("fill")
            })),
        quiz: {
            solved: descriptor.quiz.classList.contains("solved"),
            resolved: descriptor.quiz.classList.contains("resolved")
        }
    };
}
function $432c4e666928c735$var$siblingSnapshot(scope, excludedUid) {
    const entries = [];
    const seen = new Set();
    for (const wrap of Array.from(scope.querySelectorAll($432c4e666928c735$var$WRAP_SELECTOR))){
        const descriptor = $432c4e666928c735$var$descriptorForWrap(wrap);
        if (!descriptor) continue;
        if (seen.has(descriptor.uid)) throw new Error("Eine lia-Mathe-UID ist auf dieser Folie nicht eindeutig.");
        seen.add(descriptor.uid);
        if (descriptor.uid === excludedUid) continue;
        const runtime = $432c4e666928c735$var$runtimeForUid(descriptor.uid);
        if (!runtime) throw new Error("Der Zustand eines benachbarten lia-Mathe-Quiz ist nicht verf\xfcgbar.");
        entries.push({
            uid: descriptor.uid,
            snapshot: $432c4e666928c735$var$widgetSnapshot(descriptor, runtime)
        });
    }
    entries.sort((left, right)=>left.uid.localeCompare(right.uid));
    return JSON.stringify(entries);
}
function $432c4e666928c735$export$620c0b80ec95a246(widget) {
    widget.meta.locked = false;
    widget.meta.solved = false;
    widget.meta.revealed = false;
}
function $432c4e666928c735$export$c38681f72a18b03a(quiz, scope) {
    const descriptor = $432c4e666928c735$var$descriptorForQuiz(quiz);
    if (!descriptor) return undefined;
    if (!scope.contains(descriptor.wrap)) throw new Error("Das lia-Mathe-Quiz liegt nicht eindeutig auf dieser Folie.");
    const uniqueDescriptor = $432c4e666928c735$var$descriptorForUid(descriptor.uid, quiz);
    if (!uniqueDescriptor || uniqueDescriptor.wrap !== descriptor.wrap) throw new Error("Die UID dieses lia-Mathe-Quiz ist im Dokument nicht eindeutig.");
    const initial = $432c4e666928c735$var$initialForDescriptor(descriptor);
    const runtime = $432c4e666928c735$var$runtimeForUid(descriptor.uid);
    if (!initial || !runtime) throw new Error("Der Zustand dieses lia-Mathe-Quiz ist noch nicht eindeutig verf\xfcgbar.");
    const widget = runtime.store.getWidget(descriptor.uid);
    if (!$432c4e666928c735$var$looksLikeWidget(widget, descriptor.uid) || widget.meta.kind !== descriptor.kind || widget.meta.ready !== true) throw new Error("Das lia-Mathe-Quiz ist noch nicht vollst\xe4ndig initialisiert.");
    return {
        uid: descriptor.uid,
        initial: initial,
        scope: scope,
        runtime: runtime,
        targetSignature: $432c4e666928c735$var$targetSignature(widget),
        siblingSignature: $432c4e666928c735$var$siblingSnapshot(scope, descriptor.uid)
    };
}
function $432c4e666928c735$var$setRangeValue(input, value) {
    input.disabled = false;
    const ownerView = input.ownerDocument.defaultView;
    const InputConstructor = ownerView?.HTMLInputElement ?? HTMLInputElement;
    const EventConstructor = ownerView?.Event ?? Event;
    const setter = Object.getOwnPropertyDescriptor(InputConstructor.prototype, "value")?.set;
    if (setter) setter.call(input, String(value));
    else input.value = String(value);
    input.dispatchEvent(new EventConstructor("input", {
        bubbles: true,
        composed: true
    }));
    input.dispatchEvent(new EventConstructor("change", {
        bubbles: true,
        composed: true
    }));
}
function $432c4e666928c735$var$validateRuntime(context, descriptor) {
    const runtime = $432c4e666928c735$var$runtimeForUid(context.uid);
    if (!runtime || runtime.api !== context.runtime.api || runtime.store !== context.runtime.store) throw new Error("Die lia-Mathe-Laufzeit wurde w\xe4hrend des Resets ausgetauscht.");
    const widget = runtime.store.getWidget(context.uid);
    if (!$432c4e666928c735$var$looksLikeWidget(widget, context.uid) || widget.meta.kind !== descriptor.kind || descriptor.kind !== context.initial.kind || $432c4e666928c735$var$targetSignature(widget) !== context.targetSignature) throw new Error("Das Ziel des lia-Mathe-Quiz hat sich w\xe4hrend des Resets ver\xe4ndert.");
    return {
        runtime: runtime,
        widget: widget
    };
}
function $432c4e666928c735$var$applyMatheReset(context, preferredQuiz) {
    let descriptor = $432c4e666928c735$var$descriptorForUid(context.uid, preferredQuiz);
    if (!descriptor) throw new Error("Das lia-Mathe-Quiz wurde nach dem Core-Reset nicht gefunden.");
    const { runtime: runtime, widget: widget } = $432c4e666928c735$var$validateRuntime(context, descriptor);
    $432c4e666928c735$export$620c0b80ec95a246(widget);
    if (context.initial.kind === "circle") runtime.store.setCircleParts(context.uid, context.initial.parts, {
        force: true,
        preserve: false
    });
    else runtime.store.setRectDims(context.uid, context.initial.rows, context.initial.cols, {
        force: true,
        preserve: false
    });
    runtime.store.refreshNodes(context.uid);
    descriptor = $432c4e666928c735$var$descriptorForUid(context.uid, descriptor.quiz);
    if (!descriptor) throw new Error("Die Eingaben des lia-Mathe-Quiz wurden nicht gefunden.");
    descriptor.inputs.forEach((input, index)=>{
        const value = context.initial.kind === "circle" ? context.initial.parts : index === 0 ? context.initial.rows : context.initial.cols;
        $432c4e666928c735$var$setRangeValue(input, value);
    });
    // Range events synchronize LiaScript's own input model. Enforce the same
    // target state once more afterwards because the rect inputs fire separately.
    $432c4e666928c735$export$620c0b80ec95a246(widget);
    if (context.initial.kind === "circle") runtime.store.setCircleParts(context.uid, context.initial.parts, {
        force: true,
        preserve: false
    });
    else runtime.store.setRectDims(context.uid, context.initial.rows, context.initial.cols, {
        force: true,
        preserve: false
    });
    $432c4e666928c735$export$620c0b80ec95a246(widget);
    runtime.store.refreshNodes(context.uid);
    runtime.store.syncInputs(context.uid, true);
    runtime.store.syncDomState(context.uid);
    runtime.store.render(context.uid);
    return $432c4e666928c735$var$descriptorForUid(context.uid, descriptor.quiz) ?? descriptor;
}
function $432c4e666928c735$var$publicStateIsPristine(snapshot, expectedLength) {
    return Boolean(snapshot) && Array.isArray(snapshot?.state) && snapshot.state.length === expectedLength && snapshot.state.every((value)=>value === false) && snapshot.meta?.locked === false && snapshot.meta?.solved === false && snapshot.meta?.revealed === false && snapshot.meta?.ready === true;
}
function $432c4e666928c735$var$targetIsPristine(context, descriptor) {
    let validated;
    try {
        validated = $432c4e666928c735$var$validateRuntime(context, descriptor);
    } catch  {
        return false;
    }
    const { runtime: runtime, widget: widget } = validated;
    const expectedLength = context.initial.kind === "circle" ? context.initial.parts : context.initial.rows * context.initial.cols;
    const metaIsPristine = widget.meta.ready === true && widget.meta.locked === false && widget.meta.solved === false && widget.meta.revealed === false;
    const stateIsPristine = widget.state.length === expectedLength && widget.state.every((value)=>value === false);
    const dimensionsArePristine = context.initial.kind === "circle" ? widget.meta.parts === context.initial.parts && widget.dims === undefined : widget.meta.rows === context.initial.rows && widget.meta.cols === context.initial.cols && widget.dims?.rows === context.initial.rows && widget.dims?.cols === context.initial.cols;
    const inputsArePristine = descriptor.inputs.every((input, index)=>{
        const expected = context.initial.kind === "circle" ? context.initial.parts : index === 0 ? context.initial.rows : context.initial.cols;
        return input.value === String(expected) && input.disabled === false;
    });
    const domStateIsPristine = $432c4e666928c735$var$statusAttributes(descriptor).every((status)=>$432c4e666928c735$var$isRecord(status) && status.locked === "0" && status.solved === "0" && status.revealed === "0");
    const parts = Array.from(descriptor.mount.querySelectorAll("[data-fq-part]"));
    const svgIsPristine = parts.length === expectedLength && parts.every((part)=>part.getAttribute("fill") === "transparent");
    const check = descriptor.quiz.querySelector(".lia-quiz__check");
    const coreDomIsPristine = !descriptor.quiz.classList.contains("solved") && !descriptor.quiz.classList.contains("resolved") && Boolean(check) && check?.disabled === false;
    return metaIsPristine && stateIsPristine && dimensionsArePristine && inputsArePristine && domStateIsPristine && svgIsPristine && coreDomIsPristine && $432c4e666928c735$var$publicStateIsPristine(runtime.api.getAllWidgets()[context.uid], expectedLength);
}
function $432c4e666928c735$var$waitForAnimationFrame() {
    return new Promise((resolve)=>requestAnimationFrame(()=>resolve()));
}
async function $432c4e666928c735$var$waitForMatheSettle() {
    await $432c4e666928c735$var$waitForAnimationFrame();
    await new Promise((resolve)=>window.setTimeout(resolve, 130));
    await $432c4e666928c735$var$waitForAnimationFrame();
}
async function $432c4e666928c735$export$8722bc822261fd2a(context, quiz) {
    // lia-Mathe schedules reveal handling in a zero-delay task. Let a pending
    // callback finish before the target state is deliberately reopened.
    await new Promise((resolve)=>window.setTimeout(resolve, 0));
    let descriptor = $432c4e666928c735$var$applyMatheReset(context, quiz);
    await $432c4e666928c735$var$waitForMatheSettle();
    descriptor = $432c4e666928c735$var$descriptorForUid(context.uid, descriptor.quiz) ?? descriptor;
    if (!$432c4e666928c735$var$targetIsPristine(context, descriptor)) {
        descriptor = $432c4e666928c735$var$applyMatheReset(context, descriptor.quiz);
        await $432c4e666928c735$var$waitForMatheSettle();
        descriptor = $432c4e666928c735$var$descriptorForUid(context.uid, descriptor.quiz) ?? descriptor;
    }
    if (!$432c4e666928c735$var$targetIsPristine(context, descriptor)) throw new Error("Der lia-Mathe-Zustand wurde nicht vollst\xe4ndig und stabil ge\xf6ffnet.");
    const liveScope = descriptor.quiz.closest("main.lia-slide__content") ?? context.scope;
    if ($432c4e666928c735$var$siblingSnapshot(liveScope, context.uid) !== context.siblingSignature) throw new Error("Beim lia-Mathe-Reset wurde ein anderes lia-Mathe-Quiz ver\xe4ndert.");
}


const $e918c11cf6e47267$var$REGISTRY_KEY = "__LIA_TEXTMARKER_REG_V4__";
const $e918c11cf6e47267$var$MARKER_SELECTOR = ".markerquiz";
const $e918c11cf6e47267$var$TARGET_SELECTOR = ".lia-hl-target[data-hl-expected]";
const $e918c11cf6e47267$var$INPUT_SELECTOR = "input, textarea, select";
function $e918c11cf6e47267$var$isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function $e918c11cf6e47267$var$accessibleWindows() {
    const result = [];
    let current = window;
    for(let depth = 0; current && depth < 12; depth += 1){
        if (!result.includes(current)) result.push(current);
        try {
            if (!current.parent || current.parent === current) break;
            current = current.parent;
        } catch  {
            break;
        }
    }
    return result;
}
function $e918c11cf6e47267$var$isMarkerKind(value) {
    return value === "user" || value === "solution" || value === "prefill";
}
function $e918c11cf6e47267$var$looksLikeHighlight(value) {
    return $e918c11cf6e47267$var$isRecord(value) && Number.isSafeInteger(value.id) && Number(value.id) >= 0 && $e918c11cf6e47267$var$isMarkerKind(value.kind) && typeof value.color === "string" && typeof value.scope === "string" && typeof value.slide === "string" && Array.isArray(value.rects) && $e918c11cf6e47267$var$isRecord(value.anchor);
}
function $e918c11cf6e47267$var$looksLikeInstance(value) {
    return $e918c11cf6e47267$var$isRecord(value) && value.__alive === true && $e918c11cf6e47267$var$isRecord(value.state) && Array.isArray(value.HL) && value.HL.every($e918c11cf6e47267$var$looksLikeHighlight) && Number.isSafeInteger(value.nextId) && Number(value.nextId) >= 1;
}
function $e918c11cf6e47267$var$looksLikeRegistry(value) {
    return $e918c11cf6e47267$var$isRecord(value) && $e918c11cf6e47267$var$isRecord(value.instances) && typeof value.setHighlights === "function";
}
function $e918c11cf6e47267$var$markerDocumentId() {
    return (document.baseURI || window.location.href || "") + "::" + (document.title || "");
}
function $e918c11cf6e47267$var$sameMarkerDocument(left, right) {
    if (left === right) return true;
    try {
        const currentUrl = new URL(document.baseURI || window.location.href);
        currentUrl.hash = "";
        const prefix = currentUrl.href;
        const belongsToCurrentUrl = (documentId)=>{
            if (!documentId.startsWith(prefix)) return false;
            const suffix = documentId.slice(prefix.length);
            return suffix.startsWith("#") || suffix.startsWith("::");
        };
        return belongsToCurrentUrl(left) && belongsToCurrentUrl(right);
    } catch  {
        return false;
    }
}
function $e918c11cf6e47267$var$markerRuntime() {
    const documentId = $e918c11cf6e47267$var$markerDocumentId();
    const candidates = [];
    const seen = new Set();
    for (const view of $e918c11cf6e47267$var$accessibleWindows())try {
        const registry = view[$e918c11cf6e47267$var$REGISTRY_KEY];
        if (!$e918c11cf6e47267$var$looksLikeRegistry(registry) || seen.has(registry)) continue;
        seen.add(registry);
        const alive = Object.entries(registry.instances).filter(([, entry])=>$e918c11cf6e47267$var$isRecord(entry) && entry.__alive === true);
        const [registryDocumentId, instance] = alive[0] ?? [];
        if (typeof registryDocumentId !== "string" || !$e918c11cf6e47267$var$looksLikeInstance(instance) || alive.length !== 1 || !$e918c11cf6e47267$var$sameMarkerDocument(registryDocumentId, documentId)) continue;
        candidates.push({
            view: view,
            registry: registry,
            instance: instance,
            documentId: registryDocumentId
        });
    } catch  {
    // Cross-origin parents and incompatible marker versions are ignored.
    }
    return candidates.length === 1 ? candidates[0] : undefined;
}
function $e918c11cf6e47267$var$normalizedText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}
function $e918c11cf6e47267$var$descriptorForMarker(marker, preferredQuiz) {
    const scopeId = (marker.dataset.hlScope ?? "").trim();
    if (!scopeId) return undefined;
    const proxies = Array.from(marker.querySelectorAll(".hlq-proxy"));
    const quizzes = Array.from(marker.querySelectorAll(".lia-quiz.lia-quiz-multi"));
    if (proxies.length !== 1 || quizzes.length !== 1 || preferredQuiz && quizzes[0] !== preferredQuiz) return undefined;
    const proxy = proxies[0];
    const messages = Array.from(proxy.querySelectorAll(".hlq-msg"));
    const liaContainers = Array.from(proxy.querySelectorAll(".hlq-lia"));
    if (messages.length !== 1 || liaContainers.length !== 1) return undefined;
    const quiz = quizzes[0];
    const inputs = Array.from(liaContainers[0].querySelectorAll($e918c11cf6e47267$var$INPUT_SELECTOR));
    const targets = Array.from(marker.querySelectorAll($e918c11cf6e47267$var$TARGET_SELECTOR));
    if (inputs.length !== 1 || targets.length === 0) return undefined;
    const slide = marker.closest("[data-hl-slideid]");
    const slideId = (slide?.dataset.hlSlideid ?? "").trim() || "global";
    return {
        marker: marker,
        proxy: proxy,
        message: messages[0],
        input: inputs[0],
        quiz: quiz,
        scopeId: scopeId,
        slideId: slideId,
        targets: targets
    };
}
function $e918c11cf6e47267$var$descriptorForQuiz(quiz) {
    if (!quiz.classList.contains("lia-quiz-multi")) return undefined;
    const marker = quiz.closest($e918c11cf6e47267$var$MARKER_SELECTOR);
    return marker ? $e918c11cf6e47267$var$descriptorForMarker(marker, quiz) : undefined;
}
function $e918c11cf6e47267$var$descriptorsForIdentity(scopeId, slideId) {
    return Array.from(document.querySelectorAll($e918c11cf6e47267$var$MARKER_SELECTOR)).map((marker)=>$e918c11cf6e47267$var$descriptorForMarker(marker)).filter((descriptor)=>descriptor?.scopeId === scopeId && descriptor.slideId === slideId);
}
function $e918c11cf6e47267$var$descriptorForContext(context, preferredQuiz) {
    const matches = $e918c11cf6e47267$var$descriptorsForIdentity(context.scopeId, context.slideId);
    if (matches.length !== 1) return undefined;
    const descriptor = matches[0];
    if (preferredQuiz?.isConnected && descriptor.quiz !== preferredQuiz) return undefined;
    return descriptor;
}
function $e918c11cf6e47267$var$targetSignature(descriptor) {
    return JSON.stringify(descriptor.targets.map((target)=>({
            expected: target.getAttribute("data-hl-expected"),
            text: $e918c11cf6e47267$var$normalizedText(target.textContent)
        })));
}
function $e918c11cf6e47267$var$isTargetProgress(item, scopeId, slideId) {
    return (item.kind === "user" || item.kind === "solution") && item.scope === scopeId && item.slide === slideId;
}
function $e918c11cf6e47267$export$a8b1c72d2a682196(highlights, scopeId, slideId) {
    return highlights.filter((item)=>!$e918c11cf6e47267$var$isTargetProgress(item, scopeId, slideId));
}
function $e918c11cf6e47267$var$anchorSnapshot(anchor) {
    if (!$e918c11cf6e47267$var$isRecord(anchor)) return null;
    return {
        sp: anchor.sp ?? null,
        so: anchor.so ?? null,
        ep: anchor.ep ?? null,
        eo: anchor.eo ?? null
    };
}
function $e918c11cf6e47267$var$highlightSnapshot(item) {
    return {
        id: item.id,
        kind: item.kind,
        color: item.color,
        anchor: $e918c11cf6e47267$var$anchorSnapshot(item.anchor),
        scope: item.scope,
        slide: item.slide
    };
}
function $e918c11cf6e47267$var$retainedSignature(instance, scopeId, slideId) {
    return JSON.stringify(instance.HL.filter((item)=>!$e918c11cf6e47267$var$isTargetProgress(item, scopeId, slideId)).map($e918c11cf6e47267$var$highlightSnapshot));
}
function $e918c11cf6e47267$var$toolSignature(instance) {
    return JSON.stringify({
        active: instance.state.active ?? null,
        panelOpen: instance.state.panelOpen ?? null,
        tool: instance.state.tool ?? null,
        color: instance.state.color ?? null
    });
}
function $e918c11cf6e47267$var$inputInitial(input) {
    const defaultValue = input instanceof HTMLSelectElement ? "" : input.defaultValue;
    const authoredValue = input.getAttribute("value");
    return {
        value: authoredValue ?? defaultValue,
        defaultValue: defaultValue,
        authoredValue: authoredValue
    };
}
function $e918c11cf6e47267$var$inputSnapshot(input) {
    return {
        value: input.value,
        defaultValue: input instanceof HTMLSelectElement ? null : input.defaultValue,
        authoredValue: input.getAttribute("value"),
        disabled: input.disabled,
        readOnly: input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement ? input.readOnly : null
    };
}
function $e918c11cf6e47267$var$isVisible(element) {
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const view = element.ownerDocument.defaultView;
    const style = view?.getComputedStyle(element);
    if (style?.display === "none" || style?.visibility === "hidden" || style?.visibility === "collapse") return false;
    return element.getClientRects().length > 0;
}
function $e918c11cf6e47267$var$feedbackSnapshot(quiz) {
    return Array.from(quiz.querySelectorAll(".lia-quiz__feedback")).map((feedback)=>({
            text: $e918c11cf6e47267$var$normalizedText(feedback.textContent),
            visible: $e918c11cf6e47267$var$isVisible(feedback),
            ariaHidden: feedback.getAttribute("aria-hidden"),
            hidden: feedback.hidden
        }));
}
function $e918c11cf6e47267$var$markerDescriptors(scope) {
    const result = [];
    for (const marker of Array.from(scope.querySelectorAll($e918c11cf6e47267$var$MARKER_SELECTOR))){
        const descriptor = $e918c11cf6e47267$var$descriptorForMarker(marker);
        if (!descriptor) throw new Error("Ein lia-marker-Quiz auf dieser Folie ist nicht eindeutig initialisiert.");
        result.push(descriptor);
    }
    return result;
}
function $e918c11cf6e47267$var$siblingSignature(scope, targetScopeId, targetSlideId) {
    const seen = new Set();
    const entries = $e918c11cf6e47267$var$markerDescriptors(scope).map((descriptor)=>{
        const key = `${descriptor.slideId}::${descriptor.scopeId}`;
        if (seen.has(key)) throw new Error("Ein lia-marker-Scope ist auf dieser Folie nicht eindeutig.");
        seen.add(key);
        if (descriptor.scopeId === targetScopeId && descriptor.slideId === targetSlideId) return undefined;
        const check = descriptor.quiz.querySelector(".lia-quiz__check");
        return {
            key: key,
            targets: $e918c11cf6e47267$var$targetSignature(descriptor),
            message: descriptor.message.textContent ?? "",
            input: $e918c11cf6e47267$var$inputSnapshot(descriptor.input),
            quiz: {
                solved: descriptor.quiz.classList.contains("solved"),
                resolved: descriptor.quiz.classList.contains("resolved"),
                checkDisabled: check?.disabled ?? null,
                feedback: $e918c11cf6e47267$var$feedbackSnapshot(descriptor.quiz)
            }
        };
    }).filter((entry)=>entry !== undefined).sort((left, right)=>left.key.localeCompare(right.key));
    return JSON.stringify(entries);
}
function $e918c11cf6e47267$export$c631648e521aca14(quiz, scope) {
    const descriptor = $e918c11cf6e47267$var$descriptorForQuiz(quiz);
    if (!descriptor) return undefined;
    if (!scope.contains(descriptor.marker)) throw new Error("Das lia-marker-Quiz liegt nicht eindeutig auf dieser Folie.");
    const unique = $e918c11cf6e47267$var$descriptorsForIdentity(descriptor.scopeId, descriptor.slideId);
    if (unique.length !== 1 || unique[0].quiz !== quiz) throw new Error("Scope und Seite dieses lia-marker-Quiz sind nicht eindeutig.");
    const runtime = $e918c11cf6e47267$var$markerRuntime();
    if (!runtime) throw new Error("Der Zustand dieses lia-marker-Quiz ist noch nicht eindeutig verf\xfcgbar.");
    return {
        scopeId: descriptor.scopeId,
        slideId: descriptor.slideId,
        scope: scope,
        runtime: runtime,
        inputInitial: $e918c11cf6e47267$var$inputInitial(descriptor.input),
        targetSignature: $e918c11cf6e47267$var$targetSignature(descriptor),
        retainedSignature: $e918c11cf6e47267$var$retainedSignature(runtime.instance, descriptor.scopeId, descriptor.slideId),
        siblingSignature: $e918c11cf6e47267$var$siblingSignature(scope, descriptor.scopeId, descriptor.slideId),
        toolSignature: $e918c11cf6e47267$var$toolSignature(runtime.instance),
        nextId: runtime.instance.nextId
    };
}
function $e918c11cf6e47267$var$validateRuntime(context, descriptor) {
    const runtime = $e918c11cf6e47267$var$markerRuntime();
    if (!runtime || runtime.registry !== context.runtime.registry || runtime.instance !== context.runtime.instance || runtime.documentId !== context.runtime.documentId) throw new Error("Die lia-marker-Laufzeit wurde w\xe4hrend des Resets ausgetauscht.");
    if (descriptor.scopeId !== context.scopeId || descriptor.slideId !== context.slideId || $e918c11cf6e47267$var$targetSignature(descriptor) !== context.targetSignature) throw new Error("Das Ziel des lia-marker-Quiz hat sich w\xe4hrend des Resets ver\xe4ndert.");
    return runtime;
}
function $e918c11cf6e47267$var$setInputValue(input, value) {
    const ownerView = input.ownerDocument.defaultView;
    let prototype;
    if (input instanceof HTMLTextAreaElement) {
        prototype = (ownerView?.HTMLTextAreaElement ?? HTMLTextAreaElement).prototype;
        input.readOnly = false;
    } else if (input instanceof HTMLSelectElement) prototype = (ownerView?.HTMLSelectElement ?? HTMLSelectElement).prototype;
    else {
        prototype = (ownerView?.HTMLInputElement ?? HTMLInputElement).prototype;
        input.readOnly = false;
    }
    input.disabled = false;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    const EventConstructor = ownerView?.Event ?? Event;
    input.dispatchEvent(new EventConstructor("input", {
        bubbles: true,
        composed: true
    }));
    input.dispatchEvent(new EventConstructor("change", {
        bubbles: true,
        composed: true
    }));
}
function $e918c11cf6e47267$var$applyMarkerReset(context, preferredQuiz) {
    let descriptor = $e918c11cf6e47267$var$descriptorForContext(context, preferredQuiz);
    if (!descriptor) throw new Error("Das lia-marker-Quiz wurde nach dem Core-Reset nicht gefunden.");
    const runtime = $e918c11cf6e47267$var$validateRuntime(context, descriptor);
    const removed = runtime.instance.HL.filter((item)=>$e918c11cf6e47267$var$isTargetProgress(item, context.scopeId, context.slideId));
    const filtered = $e918c11cf6e47267$export$a8b1c72d2a682196(runtime.instance.HL, context.scopeId, context.slideId);
    runtime.registry.setHighlights.call(runtime.registry, filtered);
    if (runtime.instance.HL !== filtered) throw new Error("Die lia-marker-Registry hat nicht den Zielzustand \xfcbernommen.");
    descriptor = $e918c11cf6e47267$var$descriptorForContext(context, descriptor.quiz);
    if (!descriptor) throw new Error("Das lia-marker-Quiz wurde beim Aktualisieren seiner Markierungen ausgetauscht.");
    descriptor.message.textContent = "";
    $e918c11cf6e47267$var$setInputValue(descriptor.input, context.inputInitial.value);
    return {
        descriptor: descriptor,
        removedIds: removed.map((item)=>String(item.id))
    };
}
function $e918c11cf6e47267$var$removedOverlayIsGone(removedIds) {
    if (removedIds.size === 0) return true;
    const overlay = document.getElementById("lia-hl-overlay");
    if (!overlay) return false;
    return Array.from(overlay.querySelectorAll(".lia-hl-rect[data-id]")).every((rect)=>!removedIds.has(rect.dataset.id ?? ""));
}
function $e918c11cf6e47267$var$inputIsPristine(input, initial) {
    const readOnly = input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement ? input.readOnly : false;
    const defaultValue = input instanceof HTMLSelectElement ? "" : input.defaultValue;
    return input.value === initial.value && defaultValue === initial.defaultValue && input.getAttribute("value") === initial.authoredValue && input.disabled === false && readOnly === false;
}
function $e918c11cf6e47267$var$targetIsPristine(context, descriptor, removedIds) {
    let runtime;
    try {
        runtime = $e918c11cf6e47267$var$validateRuntime(context, descriptor);
    } catch  {
        return false;
    }
    const hasTargetProgress = runtime.instance.HL.some((item)=>$e918c11cf6e47267$var$isTargetProgress(item, context.scopeId, context.slideId));
    const check = descriptor.quiz.querySelector(".lia-quiz__check");
    return !hasTargetProgress && runtime.instance.nextId === context.nextId && $e918c11cf6e47267$var$retainedSignature(runtime.instance, context.scopeId, context.slideId) === context.retainedSignature && $e918c11cf6e47267$var$toolSignature(runtime.instance) === context.toolSignature && descriptor.message.textContent === "" && $e918c11cf6e47267$var$inputIsPristine(descriptor.input, context.inputInitial) && !descriptor.quiz.classList.contains("solved") && !descriptor.quiz.classList.contains("resolved") && Array.from(descriptor.quiz.querySelectorAll(".lia-quiz__feedback")).every((feedback)=>!$e918c11cf6e47267$var$isVisible(feedback)) && Boolean(check) && check?.disabled === false && $e918c11cf6e47267$var$removedOverlayIsGone(removedIds) && $e918c11cf6e47267$var$siblingSignature(descriptor.quiz.closest("main.lia-slide__content") ?? context.scope, context.scopeId, context.slideId) === context.siblingSignature;
}
function $e918c11cf6e47267$var$waitForAnimationFrame() {
    return new Promise((resolve)=>requestAnimationFrame(()=>resolve()));
}
async function $e918c11cf6e47267$var$waitForMarkerSettle() {
    await $e918c11cf6e47267$var$waitForAnimationFrame();
    await new Promise((resolve)=>window.setTimeout(resolve, 420));
    await $e918c11cf6e47267$var$waitForAnimationFrame();
}
async function $e918c11cf6e47267$export$a4f3373b6ba73de3(context, quiz) {
    const removedIds = new Set();
    let result = $e918c11cf6e47267$var$applyMarkerReset(context, quiz);
    result.removedIds.forEach((id)=>removedIds.add(id));
    await $e918c11cf6e47267$var$waitForMarkerSettle();
    let descriptor = $e918c11cf6e47267$var$descriptorForContext(context, result.descriptor.quiz);
    if (!descriptor) throw new Error("Das lia-marker-Quiz wurde w\xe4hrend der Stabilit\xe4tspr\xfcfung ausgetauscht.");
    if (!$e918c11cf6e47267$var$targetIsPristine(context, descriptor, removedIds)) {
        result = $e918c11cf6e47267$var$applyMarkerReset(context, descriptor.quiz);
        result.removedIds.forEach((id)=>removedIds.add(id));
        await $e918c11cf6e47267$var$waitForMarkerSettle();
        descriptor = $e918c11cf6e47267$var$descriptorForContext(context, result.descriptor.quiz);
        if (!descriptor) throw new Error("Das lia-marker-Quiz wurde w\xe4hrend der zweiten Stabilit\xe4tspr\xfcfung ausgetauscht.");
    }
    if (!$e918c11cf6e47267$var$targetIsPristine(context, descriptor, removedIds)) throw new Error("Der lia-marker-Zustand wurde nicht vollst\xe4ndig und stabil ge\xf6ffnet.");
}


const $b12f2aed45a388f4$var$GENERIC_QUIZ_SELECTOR = ".lia-quiz.lia-quiz-generic";
const $b12f2aed45a388f4$var$FOLLOWING = 4;
function $b12f2aed45a388f4$var$isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function $b12f2aed45a388f4$var$hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}
function $b12f2aed45a388f4$var$unquote(value) {
    const text = String(value ?? "").trim();
    if (text.length < 2) return text;
    const first = text[0];
    const last = text[text.length - 1];
    return first === last && (first === "\"" || first === "'" || first === "`") ? text.slice(1, -1) : text;
}
function $b12f2aed45a388f4$var$splitTopLevel(value, separator = ";") {
    const result = [];
    let current = "";
    let quote = "";
    let escaped = false;
    let depth = 0;
    for(let index = 0; index < value.length; index += 1){
        const character = value[index];
        if (escaped) {
            current += character;
            escaped = false;
            continue;
        }
        if (character === "\\") {
            current += character;
            escaped = true;
            continue;
        }
        if (quote) {
            current += character;
            if (character === quote) quote = "";
            continue;
        }
        if (character === "'") {
            let previous = index - 1;
            while(previous >= 0 && /\s/.test(value[previous]))previous -= 1;
            const atValueStart = previous < 0 || ";,([{=:".includes(value[previous]);
            let hasClosingQuote = false;
            let escapedQuote = false;
            for(let next = index + 1; atValueStart && next < value.length; next += 1){
                if (escapedQuote) {
                    escapedQuote = false;
                    continue;
                }
                if (value[next] === "\\") {
                    escapedQuote = true;
                    continue;
                }
                if (value[next] === character) {
                    hasClosingQuote = true;
                    break;
                }
            }
            if (!atValueStart || !hasClosingQuote) {
                current += character;
                continue;
            }
        }
        if (character === "\"" || character === "'" || character === "`") {
            current += character;
            quote = character;
            continue;
        }
        if (character === "(" || character === "[" || character === "{") {
            depth += 1;
            current += character;
            continue;
        }
        if (character === ")" || character === "]" || character === "}") {
            depth = Math.max(0, depth - 1);
            current += character;
            continue;
        }
        if (character === separator && depth === 0) {
            result.push(current.trim());
            current = "";
            continue;
        }
        current += character;
    }
    result.push(current.trim());
    return result;
}
function $b12f2aed45a388f4$var$specParts(spec) {
    return $b12f2aed45a388f4$var$splitTopLevel($b12f2aed45a388f4$var$unquote(String(spec ?? "")), ";").map((part)=>$b12f2aed45a388f4$var$unquote(part).trim());
}
// The two graph subsystems build their registry key from the raw, trimmed
// semicolon tokens. They unquote the expression only for evaluation, not for
// identity. Keep that seemingly unusual distinction byte-for-byte compatible.
function $b12f2aed45a388f4$var$graphSpecParts(spec) {
    return $b12f2aed45a388f4$var$unquote(String(spec ?? "")).split(";").map((part)=>part.trim());
}
function $b12f2aed45a388f4$var$technicalName(value, fallback) {
    const source = $b12f2aed45a388f4$var$unquote(value).trim() || fallback;
    const hidden = source.match(/^(.+?)\s*=\s*0$/);
    return (hidden?.[1] ?? source).trim();
}
function $b12f2aed45a388f4$var$isColorToken(value) {
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
}
function $b12f2aed45a388f4$var$requireIdentity(value, label) {
    const result = value.trim();
    if (!result) throw new Error(`Die ${label} des lia-coordinate-Quiz ist nicht eindeutig.`);
    return result;
}
function $b12f2aed45a388f4$export$dfb174ecaac7c7a1(spec, uid) {
    const parts = $b12f2aed45a388f4$var$specParts(spec);
    const boardId = $b12f2aed45a388f4$var$requireIdentity(parts[0] ?? "", "Board-ID");
    const name = $b12f2aed45a388f4$var$requireIdentity($b12f2aed45a388f4$var$technicalName(parts[1] ?? "", "A"), "Punkt-ID");
    return {
        kind: "create-point",
        uid: $b12f2aed45a388f4$var$requireIdentity(uid, "Quiz-UID"),
        boardId: boardId,
        names: [
            name
        ]
    };
}
function $b12f2aed45a388f4$export$779ae0190dac8197(spec, uid, knownBoardIds = []) {
    const parts = $b12f2aed45a388f4$var$graphSpecParts(spec);
    const renderedBoardId = $b12f2aed45a388f4$var$requireIdentity(parts[0] ?? "", "Board-ID");
    const exactBoardIds = new Set(knownBoardIds.filter((boardId)=>boardId === renderedBoardId));
    const normalizedRenderedBoardId = renderedBoardId.replace(/_/g, "");
    const recoveredBoardIds = new Set(knownBoardIds.filter((boardId)=>boardId.replace(/_/g, "") === normalizedRenderedBoardId));
    if (exactBoardIds.size === 0 && recoveredBoardIds.size > 1) throw new Error("Die durch LiaScript formatierte Board-ID des PointOnGraph-Quiz ist mehrdeutig.");
    const boardId = exactBoardIds.size === 1 ? renderedBoardId : recoveredBoardIds.values().next().value ?? renderedBoardId;
    const name = $b12f2aed45a388f4$var$requireIdentity(parts[1] || "A", "Punkt-ID");
    const colored = $b12f2aed45a388f4$var$isColorToken(parts[2] ?? "");
    const graphName = $b12f2aed45a388f4$var$requireIdentity(parts[colored ? 3 : 2] || "f", "Graph-ID");
    const expression = $b12f2aed45a388f4$var$requireIdentity(parts[colored ? 4 : 3] ?? "", "Funktionsvorschrift");
    return {
        kind: "point-on-graph",
        uid: $b12f2aed45a388f4$var$requireIdentity(uid, "Quiz-UID"),
        boardId: boardId,
        names: [
            name
        ],
        graphKey: `${name}||${graphName}||${expression}`
    };
}
function $b12f2aed45a388f4$export$e2ede2073ea4efeb(spec, uid) {
    const parts = $b12f2aed45a388f4$var$graphSpecParts(spec);
    const boardId = $b12f2aed45a388f4$var$requireIdentity(parts[0] ?? "", "Board-ID");
    const countText = (parts[1] ?? "1").replace(/^n\s*=\s*/i, "");
    const parsedCount = Number.parseInt(countText, 10);
    const count = Number.isSafeInteger(parsedCount) && parsedCount > 0 ? parsedCount : 1;
    const prefix = $b12f2aed45a388f4$var$requireIdentity(parts[3] || "A", "Punktpr\xe4fix-ID");
    const colored = $b12f2aed45a388f4$var$isColorToken(parts[4] ?? "");
    const graphName = $b12f2aed45a388f4$var$requireIdentity(parts[colored ? 5 : 4] || "f", "Graph-ID");
    const expression = $b12f2aed45a388f4$var$requireIdentity(parts[colored ? 6 : 5] ?? "", "Funktionsvorschrift");
    return {
        kind: "points-on-graph",
        uid: $b12f2aed45a388f4$var$requireIdentity(uid, "Quiz-UID"),
        boardId: boardId,
        names: Array.from({
            length: count
        }, (_, index)=>`${prefix}_${index + 1}`),
        graphKey: `${prefix}||${count}||${graphName}||${expression}`
    };
}
function $b12f2aed45a388f4$var$collisionError() {
    return new Error("Ownership-Kollision: Der lia-coordinate-Zustand geh\xf6rt nicht eindeutig nur diesem Quiz.");
}
function $b12f2aed45a388f4$var$assertNoOwnershipCollision(target, siblings) {
    if (new Set(target.names).size !== target.names.length) throw $b12f2aed45a388f4$var$collisionError();
    const names = new Set(target.names);
    for (const sibling of siblings){
        if ($b12f2aed45a388f4$var$samePointTarget(target, sibling)) continue;
        if (sibling.uid === target.uid) throw $b12f2aed45a388f4$var$collisionError();
        if (sibling.boardId !== target.boardId) continue;
        if (sibling.names.some((name)=>names.has(name))) throw $b12f2aed45a388f4$var$collisionError();
        if (target.graphKey && sibling.graphKey && target.graphKey === sibling.graphKey) throw $b12f2aed45a388f4$var$collisionError();
    }
}
function $b12f2aed45a388f4$var$boardBucket(registry, boardId) {
    if (!registry || !$b12f2aed45a388f4$var$hasOwn(registry, boardId)) return undefined;
    const value = registry[boardId];
    if (!$b12f2aed45a388f4$var$isRecord(value)) throw new Error("Der lia-coordinate-Zustand besitzt keine eindeutige Board-Struktur.");
    return value;
}
function $b12f2aed45a388f4$var$assertDeletable(container, key) {
    if (!container || !$b12f2aed45a388f4$var$hasOwn(container, key)) return;
    const descriptor = Object.getOwnPropertyDescriptor(container, key);
    if (descriptor?.configurable === false) throw new Error("Der lia-coordinate-Zielzustand ist nicht sicher l\xf6schbar.");
}
function $b12f2aed45a388f4$var$assertAssignable(container, key) {
    const descriptor = Object.getOwnPropertyDescriptor(container, key);
    if (descriptor && "writable" in descriptor && descriptor.writable === false) throw new Error("Der lia-coordinate-Sperrzustand ist nicht sicher \xe4nderbar.");
    if (!descriptor && !Object.isExtensible(container)) throw new Error("Der lia-coordinate-Sperrzustand ist nicht sicher \xe4nderbar.");
}
function $b12f2aed45a388f4$export$1decaf515933b60c(state, target, siblings) {
    $b12f2aed45a388f4$var$preflightCoordinateRegistryTarget(state, target, siblings);
    const points = $b12f2aed45a388f4$var$boardBucket(state.points, target.boardId);
    const pointStates = $b12f2aed45a388f4$var$boardBucket(state.pointStates, target.boardId);
    const pointGraphs = $b12f2aed45a388f4$var$boardBucket(state.pointGraphs, target.boardId);
    const pointGraphStates = $b12f2aed45a388f4$var$boardBucket(state.pointGraphStates, target.boardId);
    const lockRegistry = target.kind === "point-on-graph" ? state.pointOnGraphLocks : target.kind === "points-on-graph" ? state.pointsOnGraphLocks : undefined;
    for (const name of target.names){
        if (points) delete points[name];
        if (pointStates) delete pointStates[name];
    }
    if (target.graphKey) {
        if (pointGraphs) delete pointGraphs[target.graphKey];
        if (pointGraphStates) delete pointGraphStates[target.graphKey];
    }
    if (lockRegistry) lockRegistry[target.uid] = false;
}
function $b12f2aed45a388f4$var$preflightCoordinateRegistryTarget(state, target, siblings) {
    $b12f2aed45a388f4$var$assertNoOwnershipCollision(target, siblings);
    const points = $b12f2aed45a388f4$var$boardBucket(state.points, target.boardId);
    const pointStates = $b12f2aed45a388f4$var$boardBucket(state.pointStates, target.boardId);
    const pointGraphs = $b12f2aed45a388f4$var$boardBucket(state.pointGraphs, target.boardId);
    const pointGraphStates = $b12f2aed45a388f4$var$boardBucket(state.pointGraphStates, target.boardId);
    for (const name of target.names){
        $b12f2aed45a388f4$var$assertDeletable(points, name);
        $b12f2aed45a388f4$var$assertDeletable(pointStates, name);
    }
    if (target.graphKey) {
        $b12f2aed45a388f4$var$assertDeletable(pointGraphs, target.graphKey);
        $b12f2aed45a388f4$var$assertDeletable(pointGraphStates, target.graphKey);
    }
    const lockRegistry = target.kind === "point-on-graph" ? state.pointOnGraphLocks : target.kind === "points-on-graph" ? state.pointsOnGraphLocks : undefined;
    if (lockRegistry) $b12f2aed45a388f4$var$assertAssignable(lockRegistry, target.uid);
}
function $b12f2aed45a388f4$var$accessibleWindows() {
    const result = [];
    let current = window;
    for(let depth = 0; current && depth < 12; depth += 1){
        if (!result.includes(current)) result.push(current);
        try {
            if (!current.parent || current.parent === current) break;
            current = current.parent;
        } catch  {
            break;
        }
    }
    return result;
}
function $b12f2aed45a388f4$var$availableCoordinateBoardIds(requiredRender) {
    const result = new Set();
    for (const view of $b12f2aed45a388f4$var$accessibleWindows())try {
        const globals = view;
        const boards = globals.__boards;
        if (!$b12f2aed45a388f4$var$isRecord(boards) || typeof globals[requiredRender] !== "function") continue;
        for (const [boardId, board] of Object.entries(boards))if ($b12f2aed45a388f4$var$isRecord(board) && typeof board.removeObject === "function") result.add(boardId);
    } catch  {
    // Cross-origin parents and incompatible template instances are ignored.
    }
    return Array.from(result);
}
function $b12f2aed45a388f4$var$pointOnGraphRuntimeSpec(spec, boardId) {
    const parts = $b12f2aed45a388f4$var$graphSpecParts(spec);
    if (parts.length === 0) return spec;
    parts[0] = boardId;
    return parts.join(";");
}
function $b12f2aed45a388f4$var$runtimeState(globals) {
    const values = {
        points: globals.__points,
        pointStates: globals.__pointStates,
        pointGraphs: globals.__pointGraphs,
        pointGraphStates: globals.__pointGraphStates,
        pointOnGraphLocks: globals.__pointOnGraphLocks,
        pointsOnGraphLocks: globals.__pointsOnGraphLocks
    };
    return Object.values(values).every($b12f2aed45a388f4$var$isRecord) ? values : undefined;
}
function $b12f2aed45a388f4$var$renderFunctionName(kind) {
    if (kind === "create-point") return "renderCreatePointFromSpec";
    if (kind === "point-on-graph") return "renderPointOnGraphFromSpec";
    return "renderPointsOnGraphFromSpec";
}
function $b12f2aed45a388f4$var$coordinateRuntimeForBoard(boardId, requiredRender, ownerDocument) {
    const candidates = [];
    const seenBoards = new Set();
    for (const view of $b12f2aed45a388f4$var$accessibleWindows())try {
        const globals = view;
        const boards = globals.__boards;
        const state = $b12f2aed45a388f4$var$runtimeState(globals);
        if (!$b12f2aed45a388f4$var$isRecord(boards) || !state) continue;
        const board = boards[boardId];
        if (!$b12f2aed45a388f4$var$isRecord(board) || typeof board.removeObject !== "function" || requiredRender !== undefined && typeof globals[requiredRender] !== "function") continue;
        if (seenBoards.has(board)) continue;
        seenBoards.add(board);
        candidates.push({
            view: view,
            globals: globals,
            board: board,
            state: state
        });
    } catch  {
    // Cross-origin parents and incompatible template instances are ignored.
    }
    // A LiaScript course can expose an additional parent runtime (for example
    // through the preview shell) with the same board id. Prefer the board whose
    // actual JSXGraph container belongs to the document of the target quiz. A
    // ShadowRoot is intentional here: `ownerDocument` remains stable even when
    // `scope.contains(containerObj)` is false for JSXGraph web components.
    const documentCandidates = ownerDocument ? candidates.filter((candidate)=>{
        const container = candidate.board.containerObj;
        if (typeof container !== "object" || container === null) return false;
        const node = container;
        return node.ownerDocument === ownerDocument && node.isConnected !== false;
    }) : [];
    const eligible = documentCandidates.length > 0 ? documentCandidates : candidates;
    if (eligible.length !== 1) throw new Error(`Die Laufzeit dieses lia-coordinate-Quiz ist nicht eindeutig verf\xfcgbar (${eligible.length} Kandidaten).`);
    return eligible[0];
}
function $b12f2aed45a388f4$var$coordinateRuntime(target, ownerDocument) {
    return $b12f2aed45a388f4$var$coordinateRuntimeForBoard(target.boardId, $b12f2aed45a388f4$var$renderFunctionName(target.kind), ownerDocument);
}
function $b12f2aed45a388f4$var$genericQuizzes(scope) {
    const quizzes = [];
    if (scope instanceof HTMLElement && scope.matches($b12f2aed45a388f4$var$GENERIC_QUIZ_SELECTOR)) quizzes.push(scope);
    quizzes.push(...Array.from(scope.querySelectorAll($b12f2aed45a388f4$var$GENERIC_QUIZ_SELECTOR)));
    return quizzes.filter((quiz, index)=>quizzes.indexOf(quiz) === index);
}
function $b12f2aed45a388f4$var$elementsWithId(scope, id) {
    const elements = [];
    if (scope instanceof HTMLElement && scope.id === id) elements.push(scope);
    elements.push(...Array.from(scope.querySelectorAll("[id]")).filter((element)=>element.id === id));
    return elements.filter((element, index)=>elements.indexOf(element) === index);
}
function $b12f2aed45a388f4$var$oneElementWithId(scope, id) {
    const elements = $b12f2aed45a388f4$var$elementsWithId(scope, id);
    if (elements.length !== 1) throw new Error(`Das lia-coordinate-Element ${id} ist nicht eindeutig vorhanden.`);
    return elements[0];
}
function $b12f2aed45a388f4$var$ownerWithPrefix(quiz, prefix) {
    const owner = quiz.closest(`[id^='${prefix}']`);
    return owner?.id.startsWith(prefix) ? owner : undefined;
}
function $b12f2aed45a388f4$var$validateDirectOwner(owner, quiz) {
    const owned = $b12f2aed45a388f4$var$genericQuizzes(owner);
    const uid = owner.id.slice(owner.id.indexOf("-") + 1);
    if (owned.length !== 1 || owned[0] !== quiz || !uid) throw new Error("Das lia-coordinate-Quiz ist seinem Makro nicht eindeutig zugeordnet.");
    return uid;
}
function $b12f2aed45a388f4$var$uidAfterPrefix(owner, prefix) {
    return $b12f2aed45a388f4$var$requireIdentity(owner.id.slice(prefix.length), "Quiz-UID");
}
function $b12f2aed45a388f4$var$firstSpecPart(spec) {
    return $b12f2aed45a388f4$var$requireIdentity($b12f2aed45a388f4$var$specParts(spec)[0] ?? "", "Board-ID");
}
function $b12f2aed45a388f4$var$nextQuiz(marker, quizzes) {
    return quizzes.find((quiz)=>Boolean(marker.compareDocumentPosition(quiz) & $b12f2aed45a388f4$var$FOLLOWING));
}
function $b12f2aed45a388f4$var$proposalDescriptor(quiz, scope) {
    // A Proposal marker belongs only to the first native quiz of any kind that
    // follows it. Looking merely for the next Generic quiz could jump over an
    // unrelated Text/Choice quiz and misclassify a later exercise.
    const quizzes = Array.from(scope.querySelectorAll(".lia-quiz"));
    const candidates = [];
    for (const marker of Array.from(scope.querySelectorAll("[id^='polygon-metric-quiz-spec-'],[id^='construction-quiz-spec-']"))){
        if ($b12f2aed45a388f4$var$nextQuiz(marker, quizzes) !== quiz) continue;
        const spec = $b12f2aed45a388f4$var$requireIdentity(marker.dataset.spec ?? marker.textContent ?? "", "Quiz-Spezifikation");
        if (marker.id.startsWith("polygon-metric-quiz-spec-")) {
            const uid = $b12f2aed45a388f4$var$uidAfterPrefix(marker, "polygon-metric-quiz-spec-");
            const metric = (marker.dataset.kind ?? "").trim();
            if (metric !== "perimeter" && metric !== "area") throw new Error("Die Metrik des lia-coordinate-Quiz ist nicht eindeutig.");
            candidates.push({
                kind: metric === "perimeter" ? "perimeter-quiz" : "area-quiz",
                uid: uid,
                spec: spec,
                boardId: $b12f2aed45a388f4$var$firstSpecPart(spec),
                quiz: quiz
            });
        } else candidates.push({
            kind: "construction-quiz",
            uid: $b12f2aed45a388f4$var$uidAfterPrefix(marker, "construction-quiz-spec-"),
            spec: spec,
            boardId: $b12f2aed45a388f4$var$firstSpecPart(spec),
            quiz: quiz
        });
    }
    if (candidates.length > 1) throw new Error("Die Proposal-Spezifikation dieses lia-coordinate-Quiz ist nicht eindeutig.");
    return candidates[0];
}
function $b12f2aed45a388f4$var$descriptorForQuiz(quiz, scope) {
    if (!quiz.matches($b12f2aed45a388f4$var$GENERIC_QUIZ_SELECTOR) || !scope.contains(quiz)) return undefined;
    const createOwner = $b12f2aed45a388f4$var$ownerWithPrefix(quiz, "point-check-");
    if (createOwner) {
        $b12f2aed45a388f4$var$validateDirectOwner(createOwner, quiz);
        const uid = $b12f2aed45a388f4$var$uidAfterPrefix(createOwner, "point-check-");
        const ui = $b12f2aed45a388f4$var$oneElementWithId(scope, `point-ui-${uid}`);
        if (!ui.contains(createOwner)) throw new Error("Das CreatePoint-Quiz ist nicht eindeutig verschachtelt.");
        const spec = $b12f2aed45a388f4$var$requireIdentity(ui.dataset.spec ?? "", "Quiz-Spezifikation");
        return {
            kind: "create-point",
            uid: uid,
            spec: spec,
            quiz: quiz,
            target: $b12f2aed45a388f4$export$dfb174ecaac7c7a1(spec, uid)
        };
    }
    const graphOwner = $b12f2aed45a388f4$var$ownerWithPrefix(quiz, "graph-check-");
    if (graphOwner) {
        $b12f2aed45a388f4$var$validateDirectOwner(graphOwner, quiz);
        const uid = $b12f2aed45a388f4$var$uidAfterPrefix(graphOwner, "graph-check-");
        const ui = $b12f2aed45a388f4$var$oneElementWithId(scope, `graph-ui-${uid}`);
        if (!ui.contains(graphOwner)) throw new Error("Das PointOnGraph-Quiz ist nicht eindeutig verschachtelt.");
        const specNode = $b12f2aed45a388f4$var$oneElementWithId(scope, `graph-spec-${uid}`);
        const renderedSpec = $b12f2aed45a388f4$var$requireIdentity(specNode.dataset.spec ?? specNode.textContent ?? "", "Quiz-Spezifikation");
        const target = $b12f2aed45a388f4$export$779ae0190dac8197(renderedSpec, uid, $b12f2aed45a388f4$var$availableCoordinateBoardIds("renderPointOnGraphFromSpec"));
        const spec = $b12f2aed45a388f4$var$pointOnGraphRuntimeSpec(renderedSpec, target.boardId);
        return {
            kind: "point-on-graph",
            uid: uid,
            spec: spec,
            quiz: quiz,
            target: target
        };
    }
    const multiOwner = $b12f2aed45a388f4$var$ownerWithPrefix(quiz, "multi-graph-check-");
    if (multiOwner) {
        $b12f2aed45a388f4$var$validateDirectOwner(multiOwner, quiz);
        const uid = $b12f2aed45a388f4$var$uidAfterPrefix(multiOwner, "multi-graph-check-");
        const ui = $b12f2aed45a388f4$var$oneElementWithId(scope, `multi-graph-ui-${uid}`);
        if (!ui.contains(multiOwner)) throw new Error("Das PointsOnGraph-Quiz ist nicht eindeutig verschachtelt.");
        const spec = $b12f2aed45a388f4$var$requireIdentity(ui.dataset.spec ?? "", "Quiz-Spezifikation");
        return {
            kind: "points-on-graph",
            uid: uid,
            spec: spec,
            quiz: quiz,
            target: $b12f2aed45a388f4$export$e2ede2073ea4efeb(spec, uid)
        };
    }
    const reconstructionOwner = $b12f2aed45a388f4$var$ownerWithPrefix(quiz, "rek-check-");
    if (reconstructionOwner) {
        $b12f2aed45a388f4$var$validateDirectOwner(reconstructionOwner, quiz);
        const uid = $b12f2aed45a388f4$var$uidAfterPrefix(reconstructionOwner, "rek-check-");
        const specNode = $b12f2aed45a388f4$var$oneElementWithId(scope, `rek-spec-${uid}`);
        const spec = $b12f2aed45a388f4$var$requireIdentity(specNode.dataset.spec ?? specNode.textContent ?? "", "Quiz-Spezifikation");
        return {
            kind: "reconstruction",
            uid: uid,
            spec: spec,
            boardId: $b12f2aed45a388f4$var$firstSpecPart(spec),
            quiz: quiz
        };
    }
    return $b12f2aed45a388f4$var$proposalDescriptor(quiz, scope);
}
function $b12f2aed45a388f4$var$descriptorsInScope(scope) {
    const result = $b12f2aed45a388f4$var$genericQuizzes(scope).map((quiz)=>$b12f2aed45a388f4$var$descriptorForQuiz(quiz, scope)).filter((descriptor)=>descriptor !== undefined);
    const identities = new Set();
    for (const descriptor of result){
        const identity = `${descriptor.kind}\u0000${descriptor.uid}`;
        if (identities.has(identity)) throw new Error("Eine lia-coordinate-Quiz-UID ist auf dieser Folie nicht eindeutig.");
        identities.add(identity);
    }
    return result;
}
function $b12f2aed45a388f4$var$staticPointTargets(scope) {
    return Array.from(scope.querySelectorAll("[id^='point-spec-'][data-spec]")).map((node)=>$b12f2aed45a388f4$export$dfb174ecaac7c7a1($b12f2aed45a388f4$var$requireIdentity(node.dataset.spec ?? "", "Punkt-Spezifikation"), `static:${$b12f2aed45a388f4$var$uidAfterPrefix(node, "point-spec-")}`));
}
function $b12f2aed45a388f4$var$serializable(value) {
    try {
        const result = JSON.stringify(value);
        return result === undefined ? "undefined" : result;
    } catch  {
        throw new Error("Ein benachbarter lia-coordinate-Zustand ist nicht sicher vergleichbar.");
    }
}
const $b12f2aed45a388f4$var$REGRESSION_ANALYSIS_LISTS = [
    "analysisEntries",
    "quadraticAnalysisEntries",
    "cubicAnalysisEntries",
    "quarticAnalysisEntries",
    "sinAnalysisEntries",
    "expAnalysisEntries",
    "logAnalysisEntries",
    "sqrtAnalysisEntries",
    "hyperbolaAnalysisEntries",
    "hyperbola2AnalysisEntries"
];
function $b12f2aed45a388f4$var$reconstructionStateSnapshot(globals, boardId) {
    const scharStore = $b12f2aed45a388f4$var$isRecord(globals.__liaScharStateStore) ? Object.fromEntries(Object.entries(globals.__liaScharStateStore).filter(([key])=>key.endsWith(`::${boardId}`)).sort(([left], [right])=>left.localeCompare(right))) : {};
    const scharEntries = $b12f2aed45a388f4$var$isRecord(globals.__scharEntries) ? Object.entries(globals.__scharEntries).filter(([, value])=>$b12f2aed45a388f4$var$isRecord(value) && value.boardId === boardId).sort(([left], [right])=>left.localeCompare(right)).map(([key, value])=>{
        const entry = value;
        return {
            key: key,
            uid: entry.uid,
            boardId: entry.boardId,
            params: entry.params,
            values: entry.values,
            panelScale: entry.panelScale,
            panelMinimized: entry.panelMinimized,
            termVisible: entry.termVisible
        };
    }) : [];
    const regressionStates = $b12f2aed45a388f4$var$isRecord(globals.__liaRegressionStates) ? Object.entries(globals.__liaRegressionStates).filter(([, value])=>$b12f2aed45a388f4$var$isRecord(value) && value.boardId === boardId).sort(([left], [right])=>left.localeCompare(right)).map(([key, value])=>{
        const state = value;
        return {
            key: key,
            uid: state.uid,
            boardId: state.boardId,
            drawColor: state.drawColor,
            activeTool: state.activeTool,
            regressionMode: state.regressionMode,
            strokes: state.strokes,
            regressionPoints: state.regressionPoints,
            autoCreatedPointsData: state.autoCreatedPointsData,
            analyses: $b12f2aed45a388f4$var$REGRESSION_ANALYSIS_LISTS.map((list)=>({
                    list: list,
                    entries: Array.isArray(state[list]) ? state[list].map((value)=>{
                        if (!$b12f2aed45a388f4$var$isRecord(value)) return value;
                        return {
                            id: value.id,
                            title: value.title,
                            color: value.color,
                            classKey: value.classKey,
                            model: value.model,
                            classProbabilities: value.classProbabilities,
                            linkedModels: value.linkedModels
                        };
                    }) : []
                }))
        };
    }) : [];
    return $b12f2aed45a388f4$var$serializable({
        scharStore: scharStore,
        scharEntries: scharEntries,
        regressionStates: regressionStates
    });
}
function $b12f2aed45a388f4$var$captureSlot(result, container, key, serialize) {
    if (!container) return;
    const existed = $b12f2aed45a388f4$var$hasOwn(container, key);
    const value = container[key];
    result.push({
        container: container,
        key: key,
        existed: existed,
        value: value,
        serialized: serialize && existed ? $b12f2aed45a388f4$var$serializable(value) : undefined
    });
}
function $b12f2aed45a388f4$var$siblingSnapshot(state, siblings) {
    const result = [];
    for (const sibling of siblings){
        const points = $b12f2aed45a388f4$var$boardBucket(state.points, sibling.boardId);
        const pointStates = $b12f2aed45a388f4$var$boardBucket(state.pointStates, sibling.boardId);
        for (const name of sibling.names){
            $b12f2aed45a388f4$var$captureSlot(result, points, name, false);
            $b12f2aed45a388f4$var$captureSlot(result, pointStates, name, true);
        }
        if (sibling.graphKey) {
            $b12f2aed45a388f4$var$captureSlot(result, $b12f2aed45a388f4$var$boardBucket(state.pointGraphs, sibling.boardId), sibling.graphKey, false);
            $b12f2aed45a388f4$var$captureSlot(result, $b12f2aed45a388f4$var$boardBucket(state.pointGraphStates, sibling.boardId), sibling.graphKey, true);
        }
        if (sibling.kind === "point-on-graph") $b12f2aed45a388f4$var$captureSlot(result, state.pointOnGraphLocks, sibling.uid, false);
        else if (sibling.kind === "points-on-graph") $b12f2aed45a388f4$var$captureSlot(result, state.pointsOnGraphLocks, sibling.uid, false);
    }
    return result;
}
function $b12f2aed45a388f4$var$verifySnapshot(snapshot) {
    return snapshot.every((slot)=>{
        const exists = $b12f2aed45a388f4$var$hasOwn(slot.container, slot.key);
        if (exists !== slot.existed) return false;
        if (!exists) return true;
        return slot.serialized === undefined ? slot.container[slot.key] === slot.value : $b12f2aed45a388f4$var$serializable(slot.container[slot.key]) === slot.serialized;
    });
}
function $b12f2aed45a388f4$var$targetRegistryObjects(state, target) {
    const pointBucket = $b12f2aed45a388f4$var$boardBucket(state.points, target.boardId);
    const points = target.names.map((name)=>pointBucket?.[name]).filter((value)=>value !== undefined);
    const graphBucket = $b12f2aed45a388f4$var$boardBucket(state.pointGraphs, target.boardId);
    const entry = target.graphKey ? graphBucket?.[target.graphKey] : undefined;
    if (entry !== undefined && !$b12f2aed45a388f4$var$isRecord(entry)) throw new Error("Der lia-coordinate-L\xf6sungsgraph ist nicht eindeutig.");
    return {
        points: points,
        graphEntry: entry
    };
}
function $b12f2aed45a388f4$var$objectChildren(value) {
    if (!$b12f2aed45a388f4$var$isRecord(value)) return [];
    const children = value.childElements;
    return $b12f2aed45a388f4$var$isRecord(children) ? Object.values(children).filter((child)=>typeof child === "object" && child !== null) : [];
}
function $b12f2aed45a388f4$var$preflightOwnedObjects(runtime, target) {
    const objects = $b12f2aed45a388f4$var$targetRegistryObjects(runtime.state, target);
    for (const value of objects.points){
        if (!$b12f2aed45a388f4$var$isRecord(value)) throw new Error("Der lia-coordinate-Zielpunkt ist nicht eindeutig.");
        if (value.board !== undefined && value.board !== runtime.board) throw new Error("Der lia-coordinate-Zielpunkt geh\xf6rt zu einem anderen Board.");
        const macroKey = String(value.__liaDgsMacroKey ?? "");
        const expectedMacroKey = `macro:point:${target.uid}`;
        if (macroKey && (target.kind !== "create-point" || macroKey !== expectedMacroKey)) throw $b12f2aed45a388f4$var$collisionError();
        const label = $b12f2aed45a388f4$var$isRecord(value.label) ? value.label : undefined;
        const foreignChildren = $b12f2aed45a388f4$var$objectChildren(value).filter((child)=>child !== label);
        if (foreignChildren.length > 0) throw new Error("Der lia-coordinate-Zielpunkt besitzt fremde abh\xe4ngige Konstruktionen.");
    }
    if (objects.graphEntry) {
        const graphObjects = Object.values(objects.graphEntry).filter((value)=>typeof value === "object" && value !== null);
        const ownedGraphObjects = new Set(graphObjects);
        for (const value of graphObjects){
            if ($b12f2aed45a388f4$var$isRecord(value) && value.board !== undefined && value.board !== runtime.board) throw new Error("Der lia-coordinate-L\xf6sungsgraph geh\xf6rt zu einem anderen Board.");
            const foreignChildren = $b12f2aed45a388f4$var$objectChildren(value).filter((child)=>!ownedGraphObjects.has(child));
            if (foreignChildren.length > 0) throw new Error("Der lia-coordinate-L\xf6sungsgraph besitzt fremde abh\xe4ngige Konstruktionen.");
        }
    }
}
function $b12f2aed45a388f4$var$ownedBoardObjects(runtime, target) {
    const result = new Set();
    const objects = $b12f2aed45a388f4$var$targetRegistryObjects(runtime.state, target);
    for (const point of objects.points){
        if (typeof point === "object" && point !== null) result.add(point);
        if ($b12f2aed45a388f4$var$isRecord(point) && typeof point.label === "object" && point.label !== null) result.add(point.label);
    }
    if (objects.graphEntry) {
        for (const value of Object.values(objects.graphEntry))if (typeof value === "object" && value !== null) result.add(value);
    }
    return result;
}
function $b12f2aed45a388f4$var$liveBoardObjects(board) {
    return $b12f2aed45a388f4$var$isRecord(board.objects) ? Object.values(board.objects).filter((value)=>typeof value === "object" && value !== null) : [];
}
function $b12f2aed45a388f4$var$samePointTarget(left, right) {
    return left.kind === right.kind && left.uid === right.uid && left.boardId === right.boardId && left.graphKey === right.graphKey && left.names.length === right.names.length && left.names.every((name, index)=>name === right.names[index]);
}
function $b12f2aed45a388f4$var$sameDescriptor(descriptor, context) {
    if (descriptor.kind !== context.kind || descriptor.uid !== context.uid || descriptor.spec !== context.spec) return false;
    return context.mode === "passive" || "target" in descriptor && $b12f2aed45a388f4$var$samePointTarget(descriptor.target, context.target);
}
function $b12f2aed45a388f4$var$liveDescriptor(context) {
    if (!context.scope.isConnected) throw new Error("Die Folie des lia-coordinate-Quiz ist nicht mehr verbunden.");
    const matches = $b12f2aed45a388f4$var$descriptorsInScope(context.scope).filter((descriptor)=>$b12f2aed45a388f4$var$sameDescriptor(descriptor, context));
    if (matches.length !== 1) throw new Error("Das lia-coordinate-Quiz wurde nach dem Core-Reset nicht eindeutig gefunden.");
    return matches[0];
}
function $b12f2aed45a388f4$var$coreIsOpen(quiz) {
    const check = quiz.querySelector(".lia-quiz__check");
    const disabled = check instanceof HTMLButtonElement || check instanceof HTMLInputElement ? check.disabled : check?.getAttribute("aria-disabled") === "true";
    return Boolean(check) && disabled === false && !quiz.classList.contains("solved") && !quiz.classList.contains("resolved");
}
function $b12f2aed45a388f4$var$currentRuntime(context) {
    const runtime = $b12f2aed45a388f4$var$coordinateRuntime(context.target, context.scope.ownerDocument);
    if (runtime.board !== context.runtime.board || runtime.state.points !== context.runtime.state.points || runtime.state.pointStates !== context.runtime.state.pointStates || runtime.state.pointGraphs !== context.runtime.state.pointGraphs || runtime.state.pointGraphStates !== context.runtime.state.pointGraphStates || runtime.state.pointOnGraphLocks !== context.runtime.state.pointOnGraphLocks || runtime.state.pointsOnGraphLocks !== context.runtime.state.pointsOnGraphLocks) throw new Error("Die lia-coordinate-Laufzeit wurde w\xe4hrend des Resets ausgetauscht.");
    return runtime;
}
function $b12f2aed45a388f4$var$currentPassiveRuntime(context) {
    const runtime = $b12f2aed45a388f4$var$coordinateRuntimeForBoard(context.boardId, undefined, context.scope.ownerDocument);
    if (runtime.board !== context.runtime.board || runtime.state.points !== context.runtime.state.points || runtime.state.pointStates !== context.runtime.state.pointStates || runtime.state.pointGraphs !== context.runtime.state.pointGraphs || runtime.state.pointGraphStates !== context.runtime.state.pointGraphStates || runtime.state.pointOnGraphLocks !== context.runtime.state.pointOnGraphLocks || runtime.state.pointsOnGraphLocks !== context.runtime.state.pointsOnGraphLocks) throw new Error("Die geteilte lia-coordinate-Laufzeit wurde w\xe4hrend des Resets ausgetauscht.");
    return runtime;
}
function $b12f2aed45a388f4$var$removeBoardObject(runtime, value, removed) {
    if (typeof value !== "object" || value === null || removed.has(value)) return;
    removed.add(value);
    runtime.board.removeObject(value);
}
function $b12f2aed45a388f4$var$removeTargetBoardObjects(runtime, target, removed) {
    const objects = $b12f2aed45a388f4$var$targetRegistryObjects(runtime.state, target);
    if (objects.graphEntry) for (const key of [
        "text",
        "anchor",
        "graph"
    ])$b12f2aed45a388f4$var$removeBoardObject(runtime, objects.graphEntry[key], removed);
    for (const point of objects.points)$b12f2aed45a388f4$var$removeBoardObject(runtime, point, removed);
}
function $b12f2aed45a388f4$var$callCoordinateRender(runtime, target, spec) {
    const render = runtime.globals[$b12f2aed45a388f4$var$renderFunctionName(target.kind)];
    if (typeof render !== "function") throw new Error("Die lia-coordinate-Oberfl\xe4che kann nicht aktualisiert werden.");
    const result = Reflect.apply(render, runtime.view, [
        target.uid,
        spec
    ]);
    if (result === false) throw new Error("Die lia-coordinate-Oberfl\xe4che wurde nicht wieder ge\xf6ffnet.");
}
function $b12f2aed45a388f4$var$persistProposalBoard(runtime, boardId) {
    const persist = runtime.globals.__persistDgsBoardState;
    if (typeof persist === "function") Reflect.apply(persist, runtime.view, [
        boardId,
        false
    ]);
}
function $b12f2aed45a388f4$var$applyPointReset(context) {
    const runtime = $b12f2aed45a388f4$var$currentRuntime(context);
    $b12f2aed45a388f4$var$assertNoOwnershipCollision(context.target, context.ownership);
    $b12f2aed45a388f4$var$preflightOwnedObjects(runtime, context.target);
    // Validate every registry write before JSXGraph removes the first object.
    // A malformed/non-configurable registry must fail closed without a partial
    // visual reset.
    $b12f2aed45a388f4$var$preflightCoordinateRegistryTarget(runtime.state, context.target, context.ownership);
    $b12f2aed45a388f4$var$removeTargetBoardObjects(runtime, context.target, context.removedObjects);
    $b12f2aed45a388f4$export$1decaf515933b60c(runtime.state, context.target, context.ownership);
    $b12f2aed45a388f4$var$callCoordinateRender(runtime, context.target, context.spec);
    try {
        runtime.board.update?.();
    } catch  {
        throw new Error("Das lia-coordinate-Board konnte nicht aktualisiert werden.");
    }
    $b12f2aed45a388f4$var$persistProposalBoard(runtime, context.target.boardId);
}
function $b12f2aed45a388f4$var$targetRegistryIsEmpty(state, target) {
    const points = $b12f2aed45a388f4$var$boardBucket(state.points, target.boardId);
    const pointStates = $b12f2aed45a388f4$var$boardBucket(state.pointStates, target.boardId);
    if (target.names.some((name)=>Boolean(points && $b12f2aed45a388f4$var$hasOwn(points, name)) || Boolean(pointStates && $b12f2aed45a388f4$var$hasOwn(pointStates, name)))) return false;
    if (target.graphKey) {
        const graphs = $b12f2aed45a388f4$var$boardBucket(state.pointGraphs, target.boardId);
        const graphStates = $b12f2aed45a388f4$var$boardBucket(state.pointGraphStates, target.boardId);
        if (Boolean(graphs && $b12f2aed45a388f4$var$hasOwn(graphs, target.graphKey)) || Boolean(graphStates && $b12f2aed45a388f4$var$hasOwn(graphStates, target.graphKey))) return false;
    }
    if (target.kind === "point-on-graph") return state.pointOnGraphLocks?.[target.uid] !== true;
    if (target.kind === "points-on-graph") return state.pointsOnGraphLocks?.[target.uid] !== true;
    return true;
}
function $b12f2aed45a388f4$var$proposalMacroSnapshotIsEmpty(runtime, target) {
    if (target.kind !== "create-point") return true;
    const snapshots = runtime.globals.__dgsConstructionStates;
    if (snapshots === undefined) return true;
    if (!$b12f2aed45a388f4$var$isRecord(snapshots)) return false;
    const snapshot = snapshots[target.boardId];
    if (snapshot === undefined) return true;
    if (!$b12f2aed45a388f4$var$isRecord(snapshot) || !Array.isArray(snapshot.records)) return false;
    const macroKey = `macro:point:${target.uid}`;
    return snapshot.records.every((record)=>!$b12f2aed45a388f4$var$isRecord(record) || String(record.macroKey ?? "") !== macroKey && String(record.id ?? "") !== macroKey);
}
function $b12f2aed45a388f4$var$placementButton(descriptor, scope) {
    const prefix = descriptor.kind === "create-point" ? "btn-" : descriptor.kind === "point-on-graph" ? "graph-btn-" : "multi-graph-btn-";
    const candidates = $b12f2aed45a388f4$var$elementsWithId(scope, `${prefix}${descriptor.uid}`);
    return candidates.length === 1 && candidates[0] instanceof HTMLButtonElement ? candidates[0] : undefined;
}
function $b12f2aed45a388f4$var$verifyPointReset(context) {
    const descriptor = $b12f2aed45a388f4$var$liveDescriptor(context);
    if (!("target" in descriptor) || !$b12f2aed45a388f4$var$samePointTarget(descriptor.target, context.target)) throw new Error("Das Ziel des lia-coordinate-Quiz hat sich ver\xe4ndert.");
    const runtime = $b12f2aed45a388f4$var$currentRuntime(context);
    if (!$b12f2aed45a388f4$var$coreIsOpen(descriptor.quiz)) throw new Error("Der lia-coordinate-Core-Zustand wurde nicht ge\xf6ffnet.");
    if (!$b12f2aed45a388f4$var$targetRegistryIsEmpty(runtime.state, context.target)) throw new Error("Der lia-coordinate-Zielzustand wurde nicht vollst\xe4ndig geleert.");
    if (!$b12f2aed45a388f4$var$proposalMacroSnapshotIsEmpty(runtime, context.target)) throw new Error("Der persistierte Proposal-DGS-Zustand des Coordinate-Quiz wurde nicht geleert.");
    const currentObjects = new Set($b12f2aed45a388f4$var$liveBoardObjects(runtime.board));
    if (context.retainedBoardObjects.some((object)=>!currentObjects.has(object)) || context.initiallyOwnedBoardObjects.some((object)=>currentObjects.has(object)) || Array.from(context.removedObjects).some((object)=>currentObjects.has(object))) throw new Error("Beim lia-coordinate-Reset wurde der JSXGraph-Zustand nicht isoliert ver\xe4ndert.");
    if (!$b12f2aed45a388f4$var$verifySnapshot(context.siblingSnapshot)) throw new Error("Beim lia-coordinate-Reset wurde ein anderes Koordinatenquiz ver\xe4ndert.");
    const place = $b12f2aed45a388f4$var$placementButton(descriptor, context.scope);
    if (!place || place.disabled || place.getAttribute("aria-disabled") === "true" || place.style.pointerEvents === "none") throw new Error("Das lia-coordinate-Quiz ist nach dem Reset nicht wieder bedienbar.");
    for (const object of $b12f2aed45a388f4$var$liveBoardObjects(runtime.board)){
        if ($b12f2aed45a388f4$var$isRecord(object) && object.__liaDgsMacroKey === `macro:point:${context.uid}`) throw new Error("Der Proposal-DGS-Zustand des Coordinate-Quiz wurde nicht geleert.");
    }
}
function $b12f2aed45a388f4$var$waitForAnimationFrame() {
    return new Promise((resolve)=>requestAnimationFrame(()=>resolve()));
}
async function $b12f2aed45a388f4$var$waitForCoordinateSettle() {
    await $b12f2aed45a388f4$var$waitForAnimationFrame();
    await new Promise((resolve)=>window.setTimeout(resolve, 180));
    await $b12f2aed45a388f4$var$waitForAnimationFrame();
}
function $b12f2aed45a388f4$export$f3ea75d78bf3c9ee(quiz, scope) {
    const descriptor = $b12f2aed45a388f4$var$descriptorForQuiz(quiz, scope);
    if (!descriptor) return undefined;
    if (!("target" in descriptor)) {
        const runtime = $b12f2aed45a388f4$var$coordinateRuntimeForBoard(descriptor.boardId, undefined, scope.ownerDocument);
        return {
            mode: "passive",
            kind: descriptor.kind,
            uid: descriptor.uid,
            spec: descriptor.spec,
            boardId: descriptor.boardId,
            scope: scope,
            runtime: runtime,
            retainedBoardObjects: $b12f2aed45a388f4$var$liveBoardObjects(runtime.board),
            reconstructionState: descriptor.kind === "reconstruction" ? $b12f2aed45a388f4$var$reconstructionStateSnapshot(runtime.globals, descriptor.boardId) : undefined
        };
    }
    const descriptors = $b12f2aed45a388f4$var$descriptorsInScope(scope);
    const siblings = descriptors.filter((candidate)=>"target" in candidate && candidate.quiz !== quiz).map((candidate)=>candidate.target);
    const staticTargets = $b12f2aed45a388f4$var$staticPointTargets(document);
    const ownership = [
        ...siblings,
        ...staticTargets
    ];
    $b12f2aed45a388f4$var$assertNoOwnershipCollision(descriptor.target, ownership);
    const runtime = $b12f2aed45a388f4$var$coordinateRuntime(descriptor.target, scope.ownerDocument);
    $b12f2aed45a388f4$var$preflightOwnedObjects(runtime, descriptor.target);
    const owned = $b12f2aed45a388f4$var$ownedBoardObjects(runtime, descriptor.target);
    const retainedBoardObjects = $b12f2aed45a388f4$var$liveBoardObjects(runtime.board).filter((object)=>!owned.has(object));
    return {
        mode: "point",
        kind: descriptor.kind,
        uid: descriptor.uid,
        spec: descriptor.spec,
        scope: scope,
        target: descriptor.target,
        siblings: siblings,
        ownership: ownership,
        runtime: runtime,
        siblingSnapshot: $b12f2aed45a388f4$var$siblingSnapshot(runtime.state, siblings),
        retainedBoardObjects: retainedBoardObjects,
        initiallyOwnedBoardObjects: Array.from(owned),
        removedObjects: new Set()
    };
}
async function $b12f2aed45a388f4$export$f53984a5903c9a74(context, quiz) {
    const descriptor = $b12f2aed45a388f4$var$liveDescriptor(context);
    if (quiz.isConnected && descriptor.quiz !== quiz) throw new Error("Das lia-coordinate-Quiz stimmt nicht mit dem Core-Ziel \xfcberein.");
    if (!$b12f2aed45a388f4$var$coreIsOpen(descriptor.quiz)) throw new Error("Der lia-coordinate-Core-Zustand wurde nicht ge\xf6ffnet.");
    if (context.mode === "passive") {
        // These quizzes inspect a deliberately shared DGS/Schar/Regression board.
        // Only LiaScript's own Generic state belongs exclusively to this quiz.
        await $b12f2aed45a388f4$var$waitForCoordinateSettle();
        const settled = $b12f2aed45a388f4$var$liveDescriptor(context);
        if (!$b12f2aed45a388f4$var$coreIsOpen(settled.quiz)) throw new Error("Der passive lia-coordinate-Quizzustand blieb nicht ge\xf6ffnet.");
        const runtime = $b12f2aed45a388f4$var$currentPassiveRuntime(context);
        const currentObjects = new Set($b12f2aed45a388f4$var$liveBoardObjects(runtime.board));
        const reconstructionPreserved = context.kind === "reconstruction" && currentObjects.size === context.retainedBoardObjects.length && context.reconstructionState === $b12f2aed45a388f4$var$reconstructionStateSnapshot(runtime.globals, context.boardId);
        const sharedObjectsPreserved = context.kind !== "reconstruction" && context.retainedBoardObjects.every((object)=>currentObjects.has(object));
        if (!reconstructionPreserved && !sharedObjectsPreserved) throw new Error("Der geteilte lia-coordinate-Boardzustand wurde beim Einzelreset ver\xe4ndert.");
        return;
    }
    $b12f2aed45a388f4$var$applyPointReset(context);
    await $b12f2aed45a388f4$var$waitForCoordinateSettle();
    $b12f2aed45a388f4$var$applyPointReset(context);
    await $b12f2aed45a388f4$var$waitForCoordinateSettle();
    if (context.kind === "create-point") {
        // Proposal may retry a DGS restore after 160 + 360 + 700 ms. Wait past
        // that complete chain, remove a possibly restored macro point once more,
        // then also outwait the render helper's own 120-ms retry.
        await new Promise((resolve)=>window.setTimeout(resolve, 1260));
        $b12f2aed45a388f4$var$applyPointReset(context);
        await $b12f2aed45a388f4$var$waitForCoordinateSettle();
    }
    $b12f2aed45a388f4$var$verifyPointReset(context);
}


const $2398ed6574b0de49$var$INSTALL_KEY = "__liaResetterReconstructionPrecreateInstalled";
const $2398ed6574b0de49$var$WRAP_KEY = "__liaResetterReconstructionPrecreateWrapped";
const $2398ed6574b0de49$var$SETUP_NAMES = [
    "__setupReconstructionQuiz",
    "__setupRekonstruktionQuiz"
];
function $2398ed6574b0de49$export$6d7821f0b1e45314() {
    const globals = window;
    if (globals[$2398ed6574b0de49$var$INSTALL_KEY] === true) return;
    Object.defineProperty(globals, $2398ed6574b0de49$var$INSTALL_KEY, {
        value: true,
        configurable: true
    });
    const ensureBodyAnchor = (uidValue)=>{
        const uid = String(uidValue ?? "").trim();
        if (!uid) return;
        const id = `regression-ui-${uid}`;
        if (document.getElementById(id)) return;
        if (!document.body) throw new Error("Der Reconstruction-Anker kann vor document.body nicht angelegt werden.");
        const anchor = document.createElement("span");
        anchor.id = id;
        anchor.hidden = true;
        anchor.style.display = "none";
        anchor.setAttribute("aria-hidden", "true");
        anchor.dataset.liaResetterExternal = "reconstruction";
        document.body.append(anchor);
    };
    const wrap = (value)=>{
        if (typeof value !== "function") return value;
        const original = value;
        if (original[$2398ed6574b0de49$var$WRAP_KEY] === true) return original;
        const wrapped = function(uid, ...args) {
            ensureBodyAnchor(uid);
            return Reflect.apply(original, this, [
                uid,
                ...args
            ]);
        };
        Object.defineProperty(wrapped, $2398ed6574b0de49$var$WRAP_KEY, {
            value: true
        });
        return wrapped;
    };
    for (const name of $2398ed6574b0de49$var$SETUP_NAMES){
        const current = globals[name];
        if (typeof current === "function") {
            globals[name] = wrap(current);
            continue;
        }
        let assigned = current;
        Object.defineProperty(globals, name, {
            configurable: true,
            enumerable: true,
            get () {
                return assigned;
            },
            set (value) {
                assigned = wrap(value);
            }
        });
    }
}


const $63cdcaca7b8632ba$export$2fb9ada115c45628 = "[data-lia-resetter]";
const $63cdcaca7b8632ba$export$6c5f9d8ad473f251 = "lia-resetter__button";
const $63cdcaca7b8632ba$export$8d8955593cdde8af = "lia-resetter__host";
const $63cdcaca7b8632ba$export$a608f90c61819219 = "lia-resetter__placeholder";
const $63cdcaca7b8632ba$var$SHADOW_STYLE_ATTRIBUTE = "data-lia-resetter-shadow-style";
const $63cdcaca7b8632ba$var$SHADOW_STYLE = `
  :host {
    box-sizing: border-box;
    display: flex;
    justify-content: flex-end;
    width: 100%;
    margin: .35rem 0 .75rem;
  }
  :host([hidden]) { display: none; }
  .${$63cdcaca7b8632ba$export$6c5f9d8ad473f251} {
    appearance: none;
    box-sizing: border-box;
    border: 1px solid currentColor;
    border-radius: .25rem;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    line-height: 1.35;
    padding: .42rem .8rem;
    user-select: none;
    white-space: nowrap;
  }
  .${$63cdcaca7b8632ba$export$6c5f9d8ad473f251}:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  .${$63cdcaca7b8632ba$export$6c5f9d8ad473f251}:disabled { cursor: default; opacity: .55; }
  .${$63cdcaca7b8632ba$export$6c5f9d8ad473f251}[aria-busy="true"] { cursor: wait; opacity: .72; }
  .${$63cdcaca7b8632ba$export$6c5f9d8ad473f251}[data-state="success"] { opacity: .82; }
`;
function $63cdcaca7b8632ba$var$anchorsWithin(root) {
    const anchors = [];
    if (root instanceof HTMLElement && root.matches($63cdcaca7b8632ba$export$2fb9ada115c45628)) anchors.push(root);
    anchors.push(...Array.from(root.querySelectorAll($63cdcaca7b8632ba$export$2fb9ada115c45628)));
    return anchors;
}
function $63cdcaca7b8632ba$var$createButton(resetId) {
    const button = document.createElement("input");
    button.type = "button";
    button.className = `lia-btn lia-btn--outline ${$63cdcaca7b8632ba$export$6c5f9d8ad473f251}`;
    button.dataset.liaResetterAnchor = resetId;
    button.value = "Reset";
    button.setAttribute("aria-label", "Dieses Quiz zur\xfccksetzen");
    button.setAttribute("part", "button");
    return button;
}
function $63cdcaca7b8632ba$var$ensureShadowButton(anchor, resetId) {
    // The light-DOM host is authored by @resetter and therefore known to Elm.
    // Resetter owns only this shadow tree, which is outside Elm's child lists.
    let root = anchor.shadowRoot;
    if (!root) try {
        root = anchor.attachShadow({
            mode: "open"
        });
    } catch  {
        return undefined;
    }
    let style = root.querySelector(`style[${$63cdcaca7b8632ba$var$SHADOW_STYLE_ATTRIBUTE}]`);
    if (!style) {
        style = document.createElement("style");
        style.setAttribute($63cdcaca7b8632ba$var$SHADOW_STYLE_ATTRIBUTE, "");
        root.prepend(style);
    }
    style.textContent = $63cdcaca7b8632ba$var$SHADOW_STYLE;
    const buttons = Array.from(root.querySelectorAll(`input.${$63cdcaca7b8632ba$export$6c5f9d8ad473f251}[type="button"]`));
    const button = buttons.shift() ?? $63cdcaca7b8632ba$var$createButton(resetId);
    for (const duplicate of buttons)duplicate.remove();
    if (!button.isConnected) root.append(button);
    button.dataset.liaResetterAnchor = resetId;
    anchor.dataset.liaResetterId = resetId;
    anchor.classList.add($63cdcaca7b8632ba$export$8d8955593cdde8af);
    anchor.removeAttribute("aria-hidden");
    anchor.removeAttribute("hidden");
    return button;
}
function $63cdcaca7b8632ba$var$deactivateHost(anchor) {
    for (const button of anchor.shadowRoot?.querySelectorAll(`input.${$63cdcaca7b8632ba$export$6c5f9d8ad473f251}[type="button"]`) ?? [])button.remove();
    anchor.classList.remove($63cdcaca7b8632ba$export$8d8955593cdde8af);
    anchor.hidden = true;
    anchor.setAttribute("aria-hidden", "true");
}
class $63cdcaca7b8632ba$export$43b721cd1807b1cc {
    #bindings;
    #buttonToBinding;
    #quizToAnchor;
    constructor(options){
        this.options = options;
        this.#bindings = new Map();
        this.#buttonToBinding = new WeakMap();
        this.#quizToAnchor = new Map();
    }
    scan(root = document) {
        this.cleanupDisconnected();
        for (const anchor of $63cdcaca7b8632ba$var$anchorsWithin(root))this.bind(anchor);
    }
    bind(anchor) {
        this.cleanupDisconnected();
        if (anchor.closest(".lia-quiz__control")) {
            this.release(anchor, true);
            return undefined;
        }
        const quiz = this.options.findQuiz(anchor);
        if (!quiz) {
            this.release(anchor, true);
            return undefined;
        }
        const otherAnchor = this.#quizToAnchor.get(quiz);
        if (otherAnchor && otherAnchor !== anchor && otherAnchor.isConnected) {
            this.release(anchor, true);
            return undefined;
        }
        const resetId = this.options.resetId(anchor, quiz);
        const button = $63cdcaca7b8632ba$var$ensureShadowButton(anchor, resetId);
        if (!button) {
            this.release(anchor, true);
            return undefined;
        }
        const current = this.#bindings.get(anchor);
        if (current && current.quiz === quiz && current.button === button) {
            const binding = {
                ...current,
                resetId: resetId
            };
            this.#bindings.set(anchor, binding);
            this.#buttonToBinding.set(button, binding);
            this.#quizToAnchor.set(quiz, anchor);
            this.options.onBind?.(binding);
            return button;
        }
        if (current) this.releaseBinding(current, current.button !== button);
        const clickListener = (event)=>{
            event.preventDefault();
            event.stopImmediatePropagation();
            this.options.onReset(button);
        };
        button.addEventListener("click", clickListener);
        const binding = {
            anchor: anchor,
            quiz: quiz,
            button: button,
            resetId: resetId,
            clickListener: clickListener
        };
        this.#bindings.set(anchor, binding);
        this.#buttonToBinding.set(button, binding);
        this.#quizToAnchor.set(quiz, anchor);
        this.options.onBind?.(binding);
        return button;
    }
    buttonForAnchor(anchor) {
        return this.#bindings.get(anchor)?.button;
    }
    quizForButton(button) {
        return this.#buttonToBinding.get(button)?.quiz;
    }
    hasQuiz(quiz) {
        const anchor = this.#quizToAnchor.get(quiz);
        return Boolean(anchor?.isConnected && this.#bindings.has(anchor));
    }
    buttonsForResetId(resetId) {
        return Array.from(this.#bindings.values()).filter((binding)=>binding.resetId === resetId).map((binding)=>binding.button);
    }
    cleanupDisconnected() {
        for (const binding of Array.from(this.#bindings.values()))if (!binding.anchor.isConnected || !binding.quiz.isConnected) this.releaseBinding(binding, binding.anchor.isConnected);
    }
    dispose() {
        for (const binding of Array.from(this.#bindings.values()))this.releaseBinding(binding, true);
    }
    release(anchor, removeButton) {
        const binding = this.#bindings.get(anchor);
        if (binding) this.releaseBinding(binding, removeButton);
        else if (removeButton) $63cdcaca7b8632ba$var$deactivateHost(anchor);
    }
    releaseBinding(binding, removeButton) {
        binding.button.removeEventListener("click", binding.clickListener);
        if (removeButton) $63cdcaca7b8632ba$var$deactivateHost(binding.anchor);
        if (this.#bindings.get(binding.anchor) === binding) this.#bindings.delete(binding.anchor);
        this.#buttonToBinding.delete(binding.button);
        if (this.#quizToAnchor.get(binding.quiz) === binding.anchor) this.#quizToAnchor.delete(binding.quiz);
        this.options.onUnbind?.(binding);
    }
}


const $d415641d0cfd8c85$var$VERSION = "1.0.0";
const $d415641d0cfd8c85$var$STYLE_ID = "lia-resetter-styles";
const $d415641d0cfd8c85$var$anchorToQuiz = new WeakMap();
const $d415641d0cfd8c85$var$buttonToQuiz = new WeakMap();
const $d415641d0cfd8c85$var$buttonToLocator = new WeakMap();
const $d415641d0cfd8c85$var$activeResetIds = new Set();
const $d415641d0cfd8c85$var$feedbackGeneration = new Map();
const $d415641d0cfd8c85$var$pendingResetById = new Map();
let $d415641d0cfd8c85$var$anchorCounter = 0;
let $d415641d0cfd8c85$var$observer;
let $d415641d0cfd8c85$var$scanScheduled = false;
let $d415641d0cfd8c85$var$operationQueue = Promise.resolve();
// Defense in depth for courses that call the upstream Reconstruction macro
// directly. The exported README macro is deterministic on its own: it keeps
// data-spec inactive until the external BODY anchor exists. If this bundle is
// evaluated first, the accessor additionally protects other call sites.
(0, $2398ed6574b0de49$export$6d7821f0b1e45314)();
function $d415641d0cfd8c85$var$directChildByClass(parent, className) {
    return Array.from(parent.children).find((child)=>child instanceof HTMLElement && child.classList.contains(className));
}
function $d415641d0cfd8c85$var$quizControl(quiz) {
    return $d415641d0cfd8c85$var$directChildByClass(quiz, "lia-quiz__control");
}
function $d415641d0cfd8c85$var$isNativeQuiz(element) {
    if (!(element instanceof HTMLElement) || !element.classList.contains("lia-quiz")) return false;
    const control = $d415641d0cfd8c85$var$quizControl(element);
    return Boolean(control && Array.from(control.children).some((child)=>child.classList.contains("lia-quiz__resolve")));
}
function $d415641d0cfd8c85$var$nativeQuizzes(scope) {
    return Array.from(scope.querySelectorAll(".lia-quiz")).filter($d415641d0cfd8c85$var$isNativeQuiz);
}
function $d415641d0cfd8c85$var$lastQuizBefore(anchor, scope) {
    const preceding = $d415641d0cfd8c85$var$nativeQuizzes(scope).filter((quiz)=>Boolean(quiz.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING));
    return preceding[preceding.length - 1];
}
function $d415641d0cfd8c85$var$findQuizBefore(anchor) {
    const flexChild = anchor.closest(".flex-child, .dynFlexItem");
    if (flexChild) // A flex item is an isolated authoring block. Never fall back to a quiz
    // from a neighbouring item while LiaScript or lia-DynFlex is rendering.
    return $d415641d0cfd8c85$var$lastQuizBefore(anchor, flexChild);
    const slide = anchor.closest("main.lia-slide__content");
    if (!slide) return $d415641d0cfd8c85$var$lastQuizBefore(anchor, document);
    // Prefer the smallest DOM container shared by quiz and macro anchor. This
    // also covers card/grid helpers that do not use lia-DynFlex class names.
    for(let container = anchor.parentElement; container && container !== slide; container = container.parentElement){
        const localQuiz = $d415641d0cfd8c85$var$lastQuizBefore(anchor, container);
        if (localQuiz) return localQuiz;
    }
    return $d415641d0cfd8c85$var$lastQuizBefore(anchor, slide);
}
function $d415641d0cfd8c85$var$anchorById(anchorId) {
    return Array.from(document.querySelectorAll((0, $63cdcaca7b8632ba$export$2fb9ada115c45628))).find((anchor)=>anchor.dataset.liaResetterId === anchorId);
}
function $d415641d0cfd8c85$var$purgeLegacyLayoutNodes() {
    for (const legacy of document.querySelectorAll(`.${(0, $63cdcaca7b8632ba$export$6c5f9d8ad473f251)}, .${(0, $63cdcaca7b8632ba$export$a608f90c61819219)}`))legacy.remove();
}
function $d415641d0cfd8c85$var$locatorForQuiz(quiz) {
    const scope = quiz.closest("main.lia-slide__content");
    if (!scope) return undefined;
    const quizId = $d415641d0cfd8c85$var$nativeQuizzes(scope).indexOf(quiz);
    if (quizId < 0) return undefined;
    try {
        return {
            scope: scope,
            sectionId: $d415641d0cfd8c85$var$readSectionId(quiz),
            quizId: quizId
        };
    } catch  {
        return undefined;
    }
}
function $d415641d0cfd8c85$var$locateQuiz(locator) {
    const scopes = [
        ...locator.scope.isConnected ? [
            locator.scope
        ] : [],
        ...Array.from(document.querySelectorAll("main.lia-slide__content")).filter((scope)=>scope !== locator.scope)
    ];
    let match;
    for (const scope of scopes){
        const quizzes = $d415641d0cfd8c85$var$nativeQuizzes(scope);
        if (!quizzes.length) continue;
        let sectionId;
        try {
            sectionId = $d415641d0cfd8c85$var$readSectionId(quizzes[0]);
        } catch  {
            return {
                kind: "ambiguous",
                reason: "Die Foliennummer eines gerenderten Quizbereichs ist nicht eindeutig."
            };
        }
        if (sectionId !== locator.sectionId) continue;
        const quiz = quizzes[locator.quizId];
        if (!quiz) return {
            kind: "ambiguous",
            reason: "Das Zielquiz fehlt in der gerenderten Zielsektion."
        };
        if (match && match.quiz !== quiz) return {
            kind: "ambiguous",
            reason: "Das Zielquiz ist mehrfach gerendert."
        };
        match = {
            quiz: quiz,
            scope: scope
        };
    }
    return match ? {
        kind: "mounted",
        ...match
    } : {
        kind: "absent"
    };
}
function $d415641d0cfd8c85$var$quizForLocator(locator) {
    const mount = $d415641d0cfd8c85$var$locateQuiz(locator);
    return mount.kind === "mounted" ? mount.quiz : undefined;
}
function $d415641d0cfd8c85$var$unambiguousMount(locator) {
    const mount = $d415641d0cfd8c85$var$locateQuiz(locator);
    if (mount.kind === "ambiguous") throw new Error(mount.reason);
    return mount;
}
function $d415641d0cfd8c85$var$resetIdForAnchor(anchor, quiz) {
    const currentId = anchor.dataset.liaResetterId;
    if (currentId && ($d415641d0cfd8c85$var$activeResetIds.has(currentId) || $d415641d0cfd8c85$var$pendingResetById.has(currentId))) return currentId;
    const locator = $d415641d0cfd8c85$var$locatorForQuiz(quiz);
    const anchorId = locator ? `section-${locator.sectionId}-quiz-${locator.quizId}` : currentId ?? `pending-${++$d415641d0cfd8c85$var$anchorCounter}`;
    anchor.dataset.liaResetterId = anchorId;
    return anchorId;
}
function $d415641d0cfd8c85$var$onHostBind({ anchor: anchor, quiz: quiz, button: button, resetId: resetId }) {
    $d415641d0cfd8c85$var$anchorToQuiz.set(anchor, quiz);
    $d415641d0cfd8c85$var$buttonToQuiz.set(button, quiz);
    const locator = $d415641d0cfd8c85$var$locatorForQuiz(quiz);
    if (locator) $d415641d0cfd8c85$var$buttonToLocator.set(button, locator);
    if ($d415641d0cfd8c85$var$activeResetIds.has(resetId) || $d415641d0cfd8c85$var$pendingResetById.has(resetId)) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.value = "Reset ...";
    }
}
function $d415641d0cfd8c85$var$onHostUnbind({ anchor: anchor, quiz: quiz, button: button, resetId: resetId }) {
    if ($d415641d0cfd8c85$var$anchorToQuiz.get(anchor) === quiz) $d415641d0cfd8c85$var$anchorToQuiz.delete(anchor);
    if ($d415641d0cfd8c85$var$buttonToQuiz.get(button) === quiz) $d415641d0cfd8c85$var$buttonToQuiz.delete(button);
    if (!$d415641d0cfd8c85$var$activeResetIds.has(resetId) && !$d415641d0cfd8c85$var$pendingResetById.has(resetId)) {
        $d415641d0cfd8c85$var$buttonToLocator.delete(button);
        $d415641d0cfd8c85$var$feedbackGeneration.delete(resetId);
    }
}
const $d415641d0cfd8c85$var$hostController = new (0, $63cdcaca7b8632ba$export$43b721cd1807b1cc)({
    findQuiz: $d415641d0cfd8c85$var$findQuizBefore,
    resetId: $d415641d0cfd8c85$var$resetIdForAnchor,
    onBind: $d415641d0cfd8c85$var$onHostBind,
    onUnbind: $d415641d0cfd8c85$var$onHostUnbind,
    onReset (button) {
        $d415641d0cfd8c85$var$enqueueReset(button).catch(()=>undefined);
    }
});
function $d415641d0cfd8c85$var$bindAnchor(anchor) {
    $d415641d0cfd8c85$var$hostController.bind(anchor);
}
function $d415641d0cfd8c85$var$scan(root = document) {
    (0, $d8d148422a096f50$export$44be1ab85c8c4e24)();
    $d415641d0cfd8c85$var$purgeLegacyLayoutNodes();
    $d415641d0cfd8c85$var$hostController.scan(root);
    (0, $d098096167c97898$export$8ecdb144bfa50eaf)((quiz)=>$d415641d0cfd8c85$var$hostController.hasQuiz(quiz));
    (0, $d098096167c97898$export$d99d05dcb51a6f0b)(root);
}
function $d415641d0cfd8c85$var$scheduleScan() {
    if ($d415641d0cfd8c85$var$scanScheduled) return;
    $d415641d0cfd8c85$var$scanScheduled = true;
    queueMicrotask(()=>{
        $d415641d0cfd8c85$var$scanScheduled = false;
        $d415641d0cfd8c85$var$scan(document);
    });
}
function $d415641d0cfd8c85$var$injectStyles() {
    let style = document.getElementById($d415641d0cfd8c85$var$STYLE_ID);
    if (!style) {
        style = document.createElement("style");
        style.id = $d415641d0cfd8c85$var$STYLE_ID;
        document.head.append(style);
    }
    style.textContent = `
    .lia-resetter__kachel-feedback { display: none !important; }
  `;
}
function $d415641d0cfd8c85$var$readSectionId(quiz) {
    const slide = quiz.closest(".lia-slide");
    const counter = slide?.querySelector(".lia-pagination__current");
    const textNode = counter ? Array.from(counter.childNodes).find((node)=>node.nodeType === Node.TEXT_NODE) : undefined;
    const match = (textNode?.textContent ?? counter?.textContent ?? "").match(/\d+/);
    const oneBased = match ? Number.parseInt(match[0], 10) : Number.NaN;
    if (!Number.isSafeInteger(oneBased) || oneBased < 1) throw new Error("Die aktuelle LiaScript-Foliennummer konnte nicht ermittelt werden.");
    return oneBased - 1;
}
function $d415641d0cfd8c85$var$stateKey(state) {
    if (typeof state !== "object" || state === null || Array.isArray(state)) return undefined;
    return Object.keys(state)[0];
}
function $d415641d0cfd8c85$var$expectedStateKey(quiz) {
    const mappings = [
        [
            "lia-quiz-generic",
            "Generic"
        ],
        [
            "lia-quiz-text",
            "Text"
        ],
        [
            "lia-quiz-select",
            "Select"
        ],
        [
            "lia-quiz-drop",
            "Drop"
        ],
        [
            "lia-quiz-single-choice",
            "SingleChoice"
        ],
        [
            "lia-quiz-multiple-choice",
            "MultipleChoice"
        ],
        [
            "lia-quiz-matrix",
            "Matrix"
        ],
        [
            "lia-quiz-multi",
            "Multi"
        ]
    ];
    return mappings.find(([className])=>quiz.classList.contains(className))?.[1];
}
function $d415641d0cfd8c85$var$validateMapping(quiz, quizzes, vector) {
    if (quizzes.length !== vector.length) throw new Error("Die sichtbaren Quizze lassen sich nicht eindeutig dem LiaScript-Zustand zuordnen.");
    const quizId = quizzes.indexOf(quiz);
    if (quizId < 0 || !vector[quizId]) throw new Error("Das zugeh\xf6rige LiaScript-Quiz wurde nicht gefunden.");
    const expected = $d415641d0cfd8c85$var$expectedStateKey(quiz);
    const actual = $d415641d0cfd8c85$var$stateKey(vector[quizId].state);
    if (!expected || expected !== actual) throw new Error("Quiztyp und LiaScript-Zustand stimmen nicht eindeutig \xfcberein.");
    return quizId;
}
function $d415641d0cfd8c85$var$expectedVector(before, quizId) {
    const vector = JSON.parse(JSON.stringify(before));
    const element = (0, $324cd378b98fe1c3$export$d8ad671f6d85d10d)(vector[quizId]);
    vector[quizId] = element;
    return {
        vector: vector,
        element: element
    };
}
function $d415641d0cfd8c85$var$quizForButton(button) {
    const closest = button.closest(".lia-quiz");
    if (closest?.isConnected) return closest;
    const managed = $d415641d0cfd8c85$var$hostController.quizForButton(button);
    if (managed?.isConnected) return managed;
    const mapped = $d415641d0cfd8c85$var$buttonToQuiz.get(button);
    if (mapped?.isConnected) return mapped;
    const located = $d415641d0cfd8c85$var$buttonToLocator.get(button);
    const locatedQuiz = located ? $d415641d0cfd8c85$var$quizForLocator(located) : undefined;
    if (locatedQuiz) return locatedQuiz;
    const anchorId = button.dataset.liaResetterAnchor;
    const anchor = anchorId ? $d415641d0cfd8c85$var$anchorById(anchorId) : undefined;
    if (!anchor) return undefined;
    $d415641d0cfd8c85$var$bindAnchor(anchor);
    return $d415641d0cfd8c85$var$anchorToQuiz.get(anchor);
}
async function $d415641d0cfd8c85$var$waitForKachelToClear(button, timeoutMs = 1400) {
    const deadline = performance.now() + timeoutMs;
    do {
        const quiz = $d415641d0cfd8c85$var$quizForButton(button);
        if (quiz && (0, $d8d148422a096f50$export$cee751826c5b56ae)(quiz)) return quiz;
        await new Promise((resolve)=>window.setTimeout(resolve, 45));
    }while (performance.now() < deadline);
    return $d415641d0cfd8c85$var$quizForButton(button);
}
async function $d415641d0cfd8c85$var$settleLegacyKachelFreeze(context, button, quiz) {
    if (!context.isTile || !window.__liaTileCrossPatched) return quiz;
    // main restores frozen quizzes after an action (up to 760 ms) and also runs
    // an initial sweep after 1,100 ms. A quick reset can otherwise be frozen
    // again after it already looked successful. Wait past both schedules, then
    // thaw the current Elm node twice so the mutation-driven style repair has
    // also completed before Reset reports success.
    await new Promise((resolve)=>window.setTimeout(resolve, 1220));
    let liveQuiz = $d415641d0cfd8c85$var$quizForButton(button) ?? quiz;
    if ((0, $d8d148422a096f50$export$cee751826c5b56ae)(liveQuiz)) {
        (0, $d8d148422a096f50$export$947ed6894caa8892)(context, liveQuiz, false);
        (0, $d098096167c97898$export$c39a876d94d97bea)();
    }
    await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
    await new Promise((resolve)=>window.setTimeout(resolve, 180));
    liveQuiz = $d415641d0cfd8c85$var$quizForButton(button) ?? liveQuiz;
    if ((0, $d8d148422a096f50$export$cee751826c5b56ae)(liveQuiz)) {
        (0, $d8d148422a096f50$export$947ed6894caa8892)(context, liveQuiz, false);
        (0, $d098096167c97898$export$c39a876d94d97bea)();
    }
    await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
    return $d415641d0cfd8c85$var$quizForButton(button) ?? liveQuiz;
}
async function $d415641d0cfd8c85$var$performReset(button) {
    const quiz = $d415641d0cfd8c85$var$quizForButton(button);
    const scope = quiz?.closest("main.lia-slide__content");
    if (!quiz || !scope || !$d415641d0cfd8c85$var$isNativeQuiz(quiz)) throw new Error("Der Reset-Button ist keinem nativen LiaScript-Quiz zugeordnet.");
    const orthographyContext = (0, $40737b7af5fc30de$export$ddfd56e8b3ecba99)(quiz, scope);
    const matheContext = (0, $432c4e666928c735$export$c38681f72a18b03a)(quiz, scope);
    const markerContext = (0, $e918c11cf6e47267$export$c631648e521aca14)(quiz, scope);
    const coordinateContext = (0, $b12f2aed45a388f4$export$f3ea75d78bf3c9ee)(quiz, scope);
    const sectionId = $d415641d0cfd8c85$var$readSectionId(quiz);
    const quizzes = $d415641d0cfd8c85$var$nativeQuizzes(scope);
    const nativeReset = await (0, $3c7ccc4e179fe4df$export$1c2dd9ab0f322592)(sectionId);
    const freezeContext = (0, $d8d148422a096f50$export$5ca2d691d2e7ccf5)(quiz);
    const before = await (0, $3c7ccc4e179fe4df$export$5c430295cfe49786)(sectionId);
    const quizId = $d415641d0cfd8c85$var$validateMapping(quiz, quizzes, before);
    const locator = {
        scope: scope,
        sectionId: sectionId,
        quizId: quizId
    };
    $d415641d0cfd8c85$var$buttonToLocator.set(button, locator);
    const expected = $d415641d0cfd8c85$var$expectedVector(before, quizId);
    if (nativeReset) {
        (0, $d098096167c97898$export$41803493d24dde36)(quiz);
        (0, $3c7ccc4e179fe4df$export$a2d6b187dffe332e)(sectionId, quizId);
        await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
        await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
        let afterNativeReset = await (0, $3c7ccc4e179fe4df$export$5c430295cfe49786)(sectionId);
        if (!(0, $324cd378b98fe1c3$export$ce3c89b0eeab4b7a)(before, afterNativeReset, quizId, expected.element)) throw new Error("Der native LiaScript-Reset hat keinen isolierten Zielzustand geliefert.");
        let mount = $d415641d0cfd8c85$var$unambiguousMount(locator);
        if (freezeContext.isTile && mount.kind === "absent") {
            (0, $d8d148422a096f50$export$947ed6894caa8892)(freezeContext, quiz, false);
            return;
        }
        let currentQuiz = mount.kind === "mounted" ? mount.quiz : quiz;
        if (freezeContext.isTile) {
            if (!(0, $d8d148422a096f50$export$cee751826c5b56ae)(currentQuiz)) {
                (0, $d8d148422a096f50$export$238e346541a06d95)(currentQuiz);
                await $d415641d0cfd8c85$var$waitForKachelToClear(button);
                afterNativeReset = await (0, $3c7ccc4e179fe4df$export$5c430295cfe49786)(sectionId);
                mount = $d415641d0cfd8c85$var$unambiguousMount(locator);
                if (mount.kind === "absent") {
                    if (!(0, $324cd378b98fe1c3$export$ce3c89b0eeab4b7a)(before, afterNativeReset, quizId, expected.element)) throw new Error("Der native LiaScript-Reset hat keinen isolierten Zielzustand geliefert.");
                    (0, $d8d148422a096f50$export$947ed6894caa8892)(freezeContext, quiz, false);
                    return;
                }
                currentQuiz = mount.quiz;
            }
            if (!(0, $d8d148422a096f50$export$cee751826c5b56ae)(currentQuiz) || !(0, $324cd378b98fe1c3$export$ce3c89b0eeab4b7a)(before, afterNativeReset, quizId, expected.element)) throw new Error("Der Kachelzustand wurde nicht vollst\xe4ndig und isoliert geleert.");
        }
        (0, $d8d148422a096f50$export$947ed6894caa8892)(freezeContext, currentQuiz, Boolean(freezeContext.isTile && window.__liaTileCrossPatched));
        await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
        mount = $d415641d0cfd8c85$var$unambiguousMount(locator);
        if (freezeContext.isTile && mount.kind === "absent") {
            (0, $d8d148422a096f50$export$947ed6894caa8892)(freezeContext, quiz, false);
            return;
        }
        currentQuiz = mount.kind === "mounted" ? mount.quiz : currentQuiz;
        currentQuiz = await $d415641d0cfd8c85$var$settleLegacyKachelFreeze(freezeContext, button, currentQuiz);
        mount = $d415641d0cfd8c85$var$unambiguousMount(locator);
        if (freezeContext.isTile && mount.kind === "absent") {
            (0, $d8d148422a096f50$export$947ed6894caa8892)(freezeContext, quiz, false);
            return;
        }
        currentQuiz = mount.kind === "mounted" ? mount.quiz : currentQuiz;
        if (currentQuiz.hasAttribute("data-kf-frozen") || currentQuiz.classList.contains("solved") || currentQuiz.classList.contains("resolved") || freezeContext.isTile && !(0, $d8d148422a096f50$export$cee751826c5b56ae)(currentQuiz)) throw new Error("Das Quiz lie\xdf sich nach dem Reset nicht freigeben.");
        if (orthographyContext) await (0, $40737b7af5fc30de$export$89706816ca4123c4)(orthographyContext, currentQuiz);
        if (matheContext) await (0, $432c4e666928c735$export$8722bc822261fd2a)(matheContext, currentQuiz);
        if (markerContext) await (0, $e918c11cf6e47267$export$a4f3373b6ba73de3)(markerContext, currentQuiz);
        if (coordinateContext) await (0, $b12f2aed45a388f4$export$f53984a5903c9a74)(coordinateContext, currentQuiz);
        if (orthographyContext || matheContext || markerContext || coordinateContext) {
            const afterExternalReset = await (0, $3c7ccc4e179fe4df$export$5c430295cfe49786)(sectionId);
            if (!(0, $324cd378b98fe1c3$export$ce3c89b0eeab4b7a)(before, afterExternalReset, quizId, expected.element)) throw new Error("Die Synchronisierung des externen Quizzustands hat den LiaScript-Core ver\xe4ndert.");
        }
        return;
    }
    if (freezeContext.isTile) {
        const target = before[quizId];
        if (target.solved !== 0 || target.trial !== 0 || target.hint !== 0 || target.error_msg !== "") throw new Error("Dieses Kachelquiz wurde bereits vom unver\xe4nderten LiaScript-Core bewertet und kann deshalb nicht mehr einzeln ge\xf6ffnet werden. Bitte die Seite neu laden und danach den neuen Kompatibilit\xe4tsmodus verwenden.");
        const siblingDomBefore = quizzes.map((entry, index)=>index === quizId ? undefined : (0, $d098096167c97898$export$8fc4e12fa1c6acd8)(entry));
        if (!(0, $d098096167c97898$export$6c92125d26f267bf)(quiz, sectionId, quizId)) throw new Error("Das Kachelquiz konnte keinem eindeutigen LiaScript-Eingabetrack zugeordnet werden.");
        await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
        await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
        await $d415641d0cfd8c85$var$waitForKachelToClear(button);
        let mount = $d415641d0cfd8c85$var$unambiguousMount(locator);
        let currentQuiz = mount.kind === "mounted" ? mount.quiz : quiz;
        if (mount.kind === "mounted" && !(0, $d8d148422a096f50$export$cee751826c5b56ae)(currentQuiz)) {
            (0, $d8d148422a096f50$export$238e346541a06d95)(currentQuiz);
            await $d415641d0cfd8c85$var$waitForKachelToClear(button);
            mount = $d415641d0cfd8c85$var$unambiguousMount(locator);
            currentQuiz = mount.kind === "mounted" ? mount.quiz : currentQuiz;
        }
        if (mount.kind === "mounted") {
            (0, $d098096167c97898$export$41803493d24dde36)(currentQuiz);
            (0, $d8d148422a096f50$export$947ed6894caa8892)(freezeContext, currentQuiz, Boolean(window.__liaTileCrossPatched));
            (0, $d098096167c97898$export$c39a876d94d97bea)();
            await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
            mount = $d415641d0cfd8c85$var$unambiguousMount(locator);
            if (mount.kind === "mounted") currentQuiz = await $d415641d0cfd8c85$var$settleLegacyKachelFreeze(freezeContext, button, mount.quiz);
        }
        const after = await (0, $3c7ccc4e179fe4df$export$5c430295cfe49786)(sectionId);
        if (!(0, $324cd378b98fe1c3$export$ce3c89b0eeab4b7a)(before, after, quizId, before[quizId])) throw new Error("Beim Kachelreset wurde au\xdferhalb des Zielquiz ein Zustand ver\xe4ndert.");
        if (!(0, $324cd378b98fe1c3$export$b825b10b0be7751e)(after[quizId], before[quizId])) throw new Error("Der Kachelzustand wurde nicht vollst\xe4ndig und isoliert geleert.");
        mount = $d415641d0cfd8c85$var$unambiguousMount(locator);
        if (mount.kind === "absent") {
            (0, $d8d148422a096f50$export$947ed6894caa8892)(freezeContext, quiz, false);
            return;
        }
        currentQuiz = mount.quiz;
        const currentQuizzes = $d415641d0cfd8c85$var$nativeQuizzes(mount.scope);
        const siblingsUnchanged = currentQuizzes.length === quizzes.length && siblingDomBefore.every((signature, index)=>index === quizId || signature === undefined || signature === (0, $d098096167c97898$export$8fc4e12fa1c6acd8)(currentQuizzes[index]));
        if (!siblingsUnchanged || !(0, $d098096167c97898$export$5fada60267d73e8f)(currentQuiz)) throw new Error("Der Kachelzustand wurde nicht vollst\xe4ndig und isoliert geleert.");
        return;
    }
    if ((0, $324cd378b98fe1c3$export$b87eecf882073016)(before)) throw new Error("Dieses Quiz ben\xf6tigt f\xfcr einen sicheren Einzelreset die mitgelieferte LiaScript-Core-Erweiterung.");
    (0, $3c7ccc4e179fe4df$export$53bf8cbb2f971fd1)(sectionId, expected.vector);
    await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
    const afterRestore = await (0, $3c7ccc4e179fe4df$export$5c430295cfe49786)(sectionId);
    if (!(0, $324cd378b98fe1c3$export$ce3c89b0eeab4b7a)(before, afterRestore, quizId, expected.element)) throw new Error("LiaScript hat keinen nachweislich isolierten Reset best\xe4tigt.");
    const currentQuiz = $d415641d0cfd8c85$var$quizForButton(button) ?? quiz;
    (0, $d8d148422a096f50$export$947ed6894caa8892)(freezeContext, currentQuiz, false);
    await (0, $3c7ccc4e179fe4df$export$922ebc1e3c6e53f)();
    const releasedQuiz = $d415641d0cfd8c85$var$quizForButton(button) ?? currentQuiz;
    if (releasedQuiz.hasAttribute("data-kf-frozen") || releasedQuiz.classList.contains("solved") || releasedQuiz.classList.contains("resolved")) throw new Error("Das Quiz lie\xdf sich nach dem Reset nicht freigeben.");
    if (orthographyContext) await (0, $40737b7af5fc30de$export$89706816ca4123c4)(orthographyContext, releasedQuiz);
    if (matheContext) await (0, $432c4e666928c735$export$8722bc822261fd2a)(matheContext, releasedQuiz);
    if (markerContext) await (0, $e918c11cf6e47267$export$a4f3373b6ba73de3)(markerContext, releasedQuiz);
    if (coordinateContext) await (0, $b12f2aed45a388f4$export$f53984a5903c9a74)(coordinateContext, releasedQuiz);
    if (orthographyContext || matheContext || markerContext || coordinateContext) {
        const afterExternalReset = await (0, $3c7ccc4e179fe4df$export$5c430295cfe49786)(sectionId);
        if (!(0, $324cd378b98fe1c3$export$ce3c89b0eeab4b7a)(before, afterExternalReset, quizId, expected.element)) throw new Error("Die Synchronisierung des externen Quizzustands hat den LiaScript-Core ver\xe4ndert.");
    }
}
function $d415641d0cfd8c85$var$setButtonState(button, text, state) {
    for (const current of $d415641d0cfd8c85$var$relatedButtons(button)){
        current.value = text;
        if (state) current.dataset.state = state;
        else delete current.dataset.state;
    }
}
function $d415641d0cfd8c85$var$relatedButtons(button) {
    const anchorId = button.dataset.liaResetterAnchor;
    const buttons = anchorId ? $d415641d0cfd8c85$var$hostController.buttonsForResetId(anchorId) : [];
    if (!buttons.includes(button)) buttons.push(button);
    return buttons;
}
function $d415641d0cfd8c85$var$setButtonBusy(button, busy) {
    for (const current of $d415641d0cfd8c85$var$relatedButtons(button)){
        current.disabled = busy;
        if (busy) current.setAttribute("aria-busy", "true");
        else current.removeAttribute("aria-busy");
    }
}
function $d415641d0cfd8c85$var$setButtonTitle(button, title) {
    for (const current of $d415641d0cfd8c85$var$relatedButtons(button))if (title) current.title = title;
    else current.removeAttribute("title");
}
function $d415641d0cfd8c85$var$mayExpireFeedback(resetId, generation) {
    return $d415641d0cfd8c85$var$feedbackGeneration.get(resetId) === generation && !$d415641d0cfd8c85$var$activeResetIds.has(resetId) && !$d415641d0cfd8c85$var$pendingResetById.has(resetId);
}
async function $d415641d0cfd8c85$var$resetWithFeedback(button) {
    const resetId = button.dataset.liaResetterAnchor ?? `detached-${++$d415641d0cfd8c85$var$anchorCounter}`;
    const generation = ($d415641d0cfd8c85$var$feedbackGeneration.get(resetId) ?? 0) + 1;
    $d415641d0cfd8c85$var$feedbackGeneration.set(resetId, generation);
    $d415641d0cfd8c85$var$activeResetIds.add(resetId);
    $d415641d0cfd8c85$var$setButtonBusy(button, true);
    $d415641d0cfd8c85$var$setButtonTitle(button);
    $d415641d0cfd8c85$var$setButtonState(button, "Reset \u2026");
    try {
        await $d415641d0cfd8c85$var$performReset(button);
        $d415641d0cfd8c85$var$setButtonTitle(button);
        $d415641d0cfd8c85$var$setButtonState(button, "Zur\xfcckgesetzt", "success");
        window.setTimeout(()=>{
            if ($d415641d0cfd8c85$var$mayExpireFeedback(resetId, generation)) {
                $d415641d0cfd8c85$var$setButtonState(button, "Reset");
                $d415641d0cfd8c85$var$feedbackGeneration.delete(resetId);
            }
        }, 900);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        $d415641d0cfd8c85$var$setButtonTitle(button, message);
        $d415641d0cfd8c85$var$setButtonState(button, "Reset fehlgeschlagen", "error");
        console.error("LiaScript-Quiz konnte nicht zur\xfcckgesetzt werden:", error);
        window.setTimeout(()=>{
            if ($d415641d0cfd8c85$var$mayExpireFeedback(resetId, generation)) {
                $d415641d0cfd8c85$var$setButtonState(button, "Reset");
                $d415641d0cfd8c85$var$setButtonTitle(button);
                $d415641d0cfd8c85$var$feedbackGeneration.delete(resetId);
            }
        }, 2500);
        throw error;
    } finally{
        $d415641d0cfd8c85$var$activeResetIds.delete(resetId);
        $d415641d0cfd8c85$var$setButtonBusy(button, false);
    }
}
function $d415641d0cfd8c85$var$enqueueReset(button) {
    const resetId = button.dataset.liaResetterAnchor ?? `detached-${++$d415641d0cfd8c85$var$anchorCounter}`;
    const pending = $d415641d0cfd8c85$var$pendingResetById.get(resetId);
    if (pending) return pending;
    $d415641d0cfd8c85$var$setButtonBusy(button, true);
    $d415641d0cfd8c85$var$setButtonTitle(button);
    $d415641d0cfd8c85$var$setButtonState(button, "Reset \u2026");
    const result = $d415641d0cfd8c85$var$operationQueue.then(()=>$d415641d0cfd8c85$var$resetWithFeedback(button), ()=>$d415641d0cfd8c85$var$resetWithFeedback(button));
    $d415641d0cfd8c85$var$pendingResetById.set(resetId, result);
    const cleanup = ()=>{
        if ($d415641d0cfd8c85$var$pendingResetById.get(resetId) === result) {
            $d415641d0cfd8c85$var$pendingResetById.delete(resetId);
            $d415641d0cfd8c85$var$setButtonBusy(button, false);
            if (!button.isConnected) {
                $d415641d0cfd8c85$var$buttonToQuiz.delete(button);
                $d415641d0cfd8c85$var$buttonToLocator.delete(button);
            }
        }
    };
    result.then(cleanup, cleanup);
    $d415641d0cfd8c85$var$operationQueue = result.catch(()=>undefined);
    return result;
}
function $d415641d0cfd8c85$var$mount(root = document) {
    (0, $d8d148422a096f50$export$44be1ab85c8c4e24)();
    $d415641d0cfd8c85$var$injectStyles();
    $d415641d0cfd8c85$var$scan(root);
    if (!$d415641d0cfd8c85$var$observer) {
        $d415641d0cfd8c85$var$observer = new MutationObserver($d415641d0cfd8c85$var$scheduleScan);
        $d415641d0cfd8c85$var$observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
}
const $d415641d0cfd8c85$var$resetter = Object.freeze({
    ready: true,
    version: $d415641d0cfd8c85$var$VERSION,
    mount: $d415641d0cfd8c85$var$mount,
    reset (trigger) {
        let button = trigger.closest(`.${(0, $63cdcaca7b8632ba$export$6c5f9d8ad473f251)}`);
        if (!button) {
            const anchor = trigger.closest((0, $63cdcaca7b8632ba$export$2fb9ada115c45628));
            if (anchor) {
                $d415641d0cfd8c85$var$bindAnchor(anchor);
                button = $d415641d0cfd8c85$var$hostController.buttonForAnchor(anchor) ?? null;
            }
        }
        return button ? $d415641d0cfd8c85$var$enqueueReset(button) : Promise.reject(new Error("Kein Resetter-Button gefunden."));
    }
});
window.Resetter = $d415641d0cfd8c85$var$resetter;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ()=>$d415641d0cfd8c85$var$mount(), {
    once: true
});
else $d415641d0cfd8c85$var$mount();


