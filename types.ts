export interface Customer {
  id: string;
  customerName: string;
  serviceType: string;
  paymentId: string;
  contactPhone: string;
  notes: string;
  isPermanent: boolean;
  isVip: boolean;
}

export interface Service {
  id: string;
  name: string;
  cost: number | null;
  serviceCommission: number | null;
  requiredDocs: string;
  link: string;
  notes: string;
  createdAt: string;
}

export interface DynamicTab {
  id: string;
  title: string;
  content: string; // HTML string
}
