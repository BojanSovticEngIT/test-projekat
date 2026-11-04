export interface CertificationFormValues {
  name: string;
  completionDate: string;
  expirationDate: string;
  skillIds: string[];
  link: string;
  file: File | null;
}

export type CertificationFormErrors = Partial<Record<'name' | 'completionDate' | 'expirationDate' | 'file' | 'link' | 'source', string>>;

export const PDF_ERROR = 'Only PDF files are allowed.';
export const LINK_ERROR = 'Enter a valid http or https link.';
export const SOURCE_REQUIRED_ERROR = 'Add a certificate PDF, a link, or both.';
const MAX_LINK_LENGTH = 2048;

export const isPdfFile = (file: File): boolean =>
  file.name.toLowerCase().endsWith('.pdf') && (file.type === '' || file.type === 'application/pdf');

export const isHttpLink = (value: string): boolean => {
  if (value.length > MAX_LINK_LENGTH) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '';
  } catch {
    return false;
  }
};

/** `hasStoredPdf` is true when editing a certificate that already has a PDF on the server. */
export const validateCertification = (values: CertificationFormValues, hasStoredPdf: boolean): CertificationFormErrors => {
  const errors: CertificationFormErrors = {};
  const link = values.link.trim();
  if (!values.name.trim()) errors.name = 'Enter the certification name.';
  if (!values.completionDate) errors.completionDate = 'Enter the completion date.';
  if (values.expirationDate && values.completionDate && values.expirationDate < values.completionDate) {
    errors.expirationDate = 'Expiration date cannot be before the completion date.';
  }
  if (values.file && !isPdfFile(values.file)) errors.file = PDF_ERROR;
  if (link && !isHttpLink(link)) errors.link = LINK_ERROR;
  if (!values.file && !hasStoredPdf && !link) {
    errors.source = SOURCE_REQUIRED_ERROR;
  }
  return errors;
};
