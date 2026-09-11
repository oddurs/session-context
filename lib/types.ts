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
