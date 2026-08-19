export type MetricTarget = {
  baseline: number;
  target: number;
};

export type Employee = {
  /** VerifiedNumber.empID — stable, used in URLs. */
  empID: string;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean;
  adminAccess: boolean;
  reviewerAccess: boolean;
};

/** Proposal-shared / RFQ-received fulfilment. Company-wide only. */
export type NorthStarMetric = {
  allDeals: number;
  excluded: number;
  rfqReceived: number;
  numerator: number;
  denominator: number;
  percent: number;
};

export type EntryCounts = {
  total: number;
  last7: number;
  previous7: number;
  last30: number;
  previous30: number;
};

export type FillRate = {
  rows: number;
  filledCells: number;
  totalCells: number;
  percent: number;
};

export type VisibilityRate = {
  rows: number;
  visible: number;
  percent: number;
};

export type DuplicationRate = {
  geocoded: number;
  /** Redundant rows: cluster size − 1, summed. Not every row in a cluster. */
  duplicated: number;
  clusters: number;
  percent: number;
  /** Rows at one coordinate but claiming different cities — bad geocoding, not duplicates. */
  suspectRows: number;
  suspectClusters: number;
};

export type FieldFill = {
  column: string;
  filled: number;
  percent: number;
};

export type CompanyMetrics = {
  northStar: NorthStarMetric;
  entries: EntryCounts;
  fill: FillRate;
  visibility: VisibilityRate;
  duplication: DuplicationRate;
  /** Rows whose uploadedBy could not be resolved to an employee. */
  unattributed: number;
};

export type EmployeeMetrics = {
  employee: Employee;
  entries: EntryCounts;
  fill: FillRate;
  visibility: VisibilityRate;
  duplication: DuplicationRate;
};

export type MonthPoint = {
  month: string;
  count: number;
};

export type StageCount = {
  stage: string;
  deals: number;
};

export type RecentUpload = {
  id: number;
  city: string;
  state: string;
  warehouseType: string;
  visibility: boolean;
  createdAt: string;
  filledCells: number;
};
