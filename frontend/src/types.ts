export interface Patent {
  applicationNumber: string;
  title: string;
  type: string;
  status: string;
  statusDate: string;
  filingDate: string;
  docketNumber: string;
  confirmationNumber: number | null;
  entityStatus: string;
  customerNumber: number | null;
  groupArtUnit: string;
  examiner: string;
  firstInventorToFile: boolean;
  inventors: string[];
  inventorCount: number;
  cpcClassifications: string[];
  publicationCategory: string;
  publicationNumber?: string;
  publicationDate?: string;
  patentNumber?: string;
  grantDate?: string;
  pctPublicationNumber?: string;
  pctPublicationDate?: string;
  correspondenceAddress?: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface Stats {
  totalPatents: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byYear: Record<string, number>;
  topInventors: { name: string; count: number }[];
  uniqueInventors: number;
}
