export type Row = {
  /** field name */
  k: string;
  /** collected value; `undefined` renders as "unsupported" */
  v: unknown;
  /** optional short annotation */
  n?: string;
};

export type Section = {
  id: string;
  /** category title, assigned from the taxonomy */
  group?: string;
  /** subsection title within the category */
  subgroup?: string;
  title: string;
  note?: string;
  rows: Row[];
};

/**
 * What actually happened when a permission-gated probe ran.
 *
 * These four have to stay apart. A browser that never implemented the API,
 * a browser that asked and was told no, and a call that fell over are three
 * different facts about the reader, and collapsing them into "denied" tells
 * a person they refused something they were never offered.
 */
export type GatedOutcome = "granted" | "denied" | "unsupported" | "error";

export type GatedResult = {
  section: Section;
  outcome: GatedOutcome;
  /** why, when the outcome is not `granted` */
  reason?: string;
};
