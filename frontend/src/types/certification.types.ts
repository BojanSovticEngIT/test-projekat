export interface Certification {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export interface EmployeeCertification {
  id: string;
  employeeId: string;
  certificationId: string;
  obtainedAt: string;
  expiresAt?: string;
  certificationName: string;
}

// Mirrors CertificateResponse / CertificateSkill / PagedCertificates in docs/api/openapi.yaml.
export interface CertificationSkill {
  id: string;
  name: string;
}

export interface MyCertification {
  id: string;
  name: string;
  completionDate: string;
  expirationDate: string | null;
  documentFileName: string | null;
  documentSize: number | null;
  link: string | null;
  skills: CertificationSkill[];
  createdAt: string;
  updatedAt: string;
}

export interface MyCertificationFilters {
  page?: number;
  size?: number;
}

export interface MyCertificationRequest {
  name: string;
  completionDate: string;
  expirationDate?: string;
  skillIds: string[];
  link?: string;
  file?: File;
}
