export type QuoteStatus = 'Draft' | 'Sent' | 'Won';

export type FollowUpTone = 'english' | 'hinglish';

export type SupplyType = 'intra' | 'inter';

export interface CatalogItem {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  gstPercent: number;
  keywords: string[];
  hsnSac?: string;
}

export interface SampleInquiry {
  id: string;
  label: string;
  text: string;
}

export interface BusinessProfile {
  id: string;
  presetKey: 'interiors' | 'print' | 'catering';
  presetName: string;
  categoryLabel: string;
  businessName: string;
  gstin: string;
  phone: string;
  address: string;
  items: CatalogItem[];
  sampleInquiries: SampleInquiry[];
}

export interface ExtractedLineItem {
  catalogItemId: string;
  matchedName: string;
  quantity: number;
  dimensionsNote: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface AgentExtractionResult {
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  detectedLanguage: string;
  confidenceScore: number;
  overallSummary: string;
  attachmentTranscript: string;
  lineItems: ExtractedLineItem[];
  missingInfoFlags: string[];
  unmatchedItems: string[];
  whatsappFollowUpEn: string;
  whatsappFollowUpHinglish: string;
}

export interface ComputedQuoteLine {
  id: string;
  catalogItemId: string;
  name: string;
  unit: string;
  unitPrice: number;
  gstPercent: number;
  hsnSac?: string;
  quantity: number;
  dimensionsNote: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
  taxableAmount: number;
  discountAmount: number;
  discountedTaxable: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
}

export interface QuoteTotals {
  grossSubtotal: number;
  discountAmount: number;
  taxableSubtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  rawTotal: number;
  roundOff: number;
  grandTotal: number;
}

export interface BusinessSnapshot {
  businessName: string;
  gstin: string;
  phone: string;
  address: string;
  presetKey: string;
}

export interface SavedQuote {
  id: string;
  quoteNumber: string;
  createdAt: string;
  validUntil: string;
  status: QuoteStatus;
  businessSnapshot: BusinessSnapshot;
  customerName: string;
  customerPhone: string;
  customerLocation: string;
  placeOfSupply: string;
  supplyType: SupplyType;
  detectedLanguage: string;
  inquiryText: string;
  attachmentTranscript: string;
  hasImage: boolean;
  hasAudio: boolean;
  lines: ComputedQuoteLine[];
  discountPercent: number;
  totals: QuoteTotals;
  missingInfoFlags: string[];
  unmatchedItems: string[];
  confidenceScore: number;
  overallSummary: string;
  whatsappFollowUpEn: string;
  whatsappFollowUpHinglish: string;
  activeTone: FollowUpTone;
  processingTimeMs: number;
  manualBaselineMins?: number;
}
