// Types for Regional Access Management

export type AccessLevel = 'none' | 'read' | 'write' | 'manage';

export interface Region {
  id: string;
  name: string;
  status: 'draft' | 'pilot' | 'active' | 'paused' | 'retired';
  country_code: string;
}

export interface Grant {
  regionId: string;
  accessLevel: Exclude<AccessLevel, 'none'>;
}

export interface Override {
  id: string;
  regionId: string;
  accessLevel: Exclude<AccessLevel, 'none'>;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy?: string;
}

export interface UserRegionAccess {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  regions: Region[];
  grants: Grant[];
  overrides: Override[];
  capabilities: string[];
}

export interface RegionAccessDrawerProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  canEdit?: boolean;
  requireDualApproval?: boolean;
  onRequestApproval?: (diff: any) => Promise<void>;
}

export interface SaveGrantsPayload {
  grants: Grant[];
  removals: string[];
}

export interface CreateOverridePayload {
  regionId: string;
  accessLevel: Exclude<AccessLevel, 'none'>;
  endsAt: string;
  reason: string;
}