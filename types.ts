export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DrawingError {
  id: number;
  description_en: string;
  description_vn: string;
  box_2d: BoundingBox | null; // Normalized 0-1000
  type: 'critical' | 'warning' | 'info';
}

export enum ScanStatus {
  PENDING = 'PENDING',
  SCANNING = 'SCANNING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface DrawingFile {
  id: string;
  name: string;
  fileType: 'image' | 'pdf';
  imageUrl: string; // The specific page image
  originalFile?: File;
  status: ScanStatus;
  errors: DrawingError[];
  pageIndex?: number; // If from PDF
  totalPages?: number; // If from PDF
}

export type Language = 'en' | 'vi';

export const CHECKLIST_RULES = `
A. TITLE BLOCK
- Project Title present
- Drawing Title format correct (e.g. US3_L2_TYPE D-... ROOM CSD FLOOR PLAN)
- Drawing Number format correct
- Revision index & date present
- Status: FOR COORDINATION / SUBMISSION / APPROVAL
- Issued Date matches Check Date
- Consultant/Contractor listed
- Disclaimers/Notes present
- Approval signatures present

B. ANNOTATION / TAGS
- Pipes tagged (DN + system)
- Ducts tagged (Size + system)
- MEP Equipment tagged (e.g., FCU-US3-L2-10)
- Levels (BOP/BOD/BOT/COS/TOS) indicated with mm unit
- No overlapping text
- Consistency across sheets
- "BY ID" for ID dependent equipment

C. SYSTEM NAME
- CHWS/CHWR distinguished
- Domestic Water (DWGF, HWSP, HWRP) distinguished
- Sanitary (SWP, WP, VP, CDP) distinguished
- HVAC components labeled
- Electrical components labeled
- ELV systems labeled

D. LEGEND
- Colour Legend present
- Abbreviations defined and used consistently
- Device symbols explained

E. CONSISTENCY
- Plan vs Section levels match
- Room names consistent
- Equipment shown on both Plan & Section
- Duct/Pipe sizes consistent
- Level references consistent
- Dimensions from FFL/Wall correct
- Ceiling heights (CH) shown on section
- Spelling check
- Numbering logic (1..100)
`;