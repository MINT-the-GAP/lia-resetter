interface ResetterApi {
  readonly ready: true;
  readonly version: string;
}

interface Window {
  Resetter: ResetterApi;
}
