export type Mark =
  | { readonly type: "code" }
  | { readonly type: "strong" }
  | { readonly type: "em" }
  | { readonly type: "strike" }
  | { readonly type: "link"; readonly attrs: { readonly href: string } };

export interface AdfNode {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly AdfNode[];
  readonly text?: string;
  readonly marks?: readonly Mark[];
}

export interface AdfDoc {
  readonly type: "doc";
  readonly version: 1;
  readonly content: readonly AdfNode[];
}
