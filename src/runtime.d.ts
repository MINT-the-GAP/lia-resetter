type LiaTrackPoint = [topic: string, id: number];

interface LiaRuntimeEvent {
  reply: boolean;
  track: LiaTrackPoint[];
  service: string;
  message: {
    cmd: string;
    param: unknown;
  };
}

type LiaLog = (type: string, args: unknown[]) => void;

interface LiaRuntime {
  debug?: boolean;
  log?: LiaLog;
  singleQuizResetVersion?: number;
  send: (event: LiaRuntimeEvent) => void;
}

interface KachelAssignment {
  sourceEl: Element;
  text: string;
  sourceId: number | null;
  ts: number;
  reason: string;
}

interface ResetterApi {
  mount(root?: ParentNode): void;
  reset(trigger: HTMLElement): Promise<void>;
}

interface Window {
  LIA: LiaRuntime;
  __liaTileCrossPatched?: number;
  __liaKfBlockDblclickClear?: boolean;
  __liaKachelfolgeExpected?: Record<string, string[]>;
  __liaKfAssignedSources?: WeakMap<Element, KachelAssignment>;
  __liaKfFrozenQuizKeys?: Set<string>;
  __liaKfFrozenQuizUids?: Set<string>;
  __liaKfFrozenQuizFeedback?: Map<
    string,
    { text: string; className: string; hidden: number }
  >;
  __liaResetGetTileQuizTargetsFromRoot?: (root: Element) => Element[];
  __liaResetCollectTileQuizRoots?: (scope: Element) => Element[];
  __liaResetGetTileQuizRootFromNode?: (
    node: Element,
    scope: Element,
  ) => Element | null;
}
