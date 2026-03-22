export type RepairStatus = 'Received' | 'Working' | 'Fixed';

export interface Shop {
  id: string;
  name: string;
  ownerEmail: string;
  ownerUid: string;
  createdAt: string;
}

export interface Repair {
  id: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  issueDescription: string;
  estimatedCost: number;
  advancePaid: boolean;
  status: RepairStatus;
  shopId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  shopId: string;
  lastRepairDate: string;
}

export interface AppState {
  user: any | null;
  shop: Shop | null;
  repairs: Repair[];
  customers: Customer[];
  loading: boolean;
  theme: 'light' | 'dark';
}
