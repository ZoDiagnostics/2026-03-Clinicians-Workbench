# Build Packet 04: Report Generation, Signing & Delivery

## Objective
Implement AI-assisted report generation with Copilot auto-draft, ICD-10/CPT code suggestion, report editing with section-level controls, signing with state transition, and delivery with practice defaults.

## Files to Have Open in Firebase Studio
- `types/report.ts`, `types/delivery.ts`, `types/enums.ts`
- `screens/Report.tsx`, `screens/SignDeliver.tsx`, `screens/Summary.tsx`
- `components/CopilotAutoDraft.tsx` (new)
- `components/ICDCodeSuggestions.tsx` (new)
- `lib/hooks.ts` (add report hooks)
- `scaffold/firestore.rules` (report rules)

## Requirements Implemented

### ZCW-BRD-0297: Copilot Auto-Draft
Generates complete Clinical Impression and Recommendations with Linked Evidence. Panel shows auto-drafted text with source citations. Clinician accepts, edits, or rejects each section.

### ZCW-BRD-0299: Copilot ICD-10/CPT Code Suggestion
Auto-suggests codes from confirmed findings. Sidebar displays suggested codes with confidence scores. Clinician accepts/modifies codes.

### ZCW-BRD-0298: Sign & Deliver Delivery Defaults
Pre-populated delivery defaults from practice settings (email, print, methods). Configured in Practice Settings (SCR-23).

### ZCW-BRD-0300: Mobile PWA Responsive Layout
Report review and signing optimized for mobile PWA. Touch-friendly buttons, responsive text, mobile PDF rendering.

### ZCW-BRD-0282: Finding Provenance in Reports
Clinical finding provenance metadata (origin, confidence, model version) included in report body per finding.

## Implementation Steps

### Step 1: Report Firestore Schema & Creation

Prompt Gemini:
```
Create Firestore schema for reports with AI-assisted generation.

Collection: `practices/{practiceId}/reports`

Document schema:
{
  reportId: string (auto-generated REPORT-NNNN)
  procedureId: string (reference)
  patientId: string
  practiceId: string
  createdAt: timestamp
  createdBy: userId
  status: 'auto_drafted' | 'in_review' | 'signed' | 'delivered' | 'voided'
  reportType: string (study-type-specific: 'upper_gi_report', 'crohns_report', etc.)

  findings: [{
    findingId: string
    classification: string
    location: string
    size?: { width, height, diameter }
    provenance: { origin, confidence, modelVersion }
    reportable: boolean
    sortOrder: number
  }]

  sections: {
    indication: string (indication for procedure)
    technique: string (study type and methodology)
    findings: {
      content: string
      edited: boolean (clinician modified from auto-draft)
      sourceFindings: string[] (findingIds referenced)
    }
    clinicalImpression: {
      content: string
      aiDrafted?: { content, confidence }
      edited: boolean
      acceptedFromDraft: boolean
      sourceFindings: string[] (findingIds referenced)
    }
    recommendations: {
      content: string
      aiDrafted?: { content, confidence }
      edited: boolean
      acceptedFromDraft: boolean
      surveillanceRecommendations: [{
        type: string (e.g., "High-Chance Polyp")
        interval: string (e.g., "3 years")
        guideline: string (e.g., "USMSTF")
      }]
    }
    supplementalIncidentalFindings: [{
      findingId: string
      classification: string
      recommendation: string
      referralGenerated: boolean
    }]
    referralRecommendations: [{
      specialty: string
      type: string (routine/urgent/emergent)
      note: string
    }]
    education: {
      materials: [{
        materialId: string
        title: string
        deliveryMethod: string
      }]
    }
  }

  codes: {
    icd10: [{
      code: string (e.g., "K11.9")
      description: string
      confidence: number (0-1)
      aiSuggested: boolean
      acceptedByUser: boolean
    }]
    cpt: [{
      code: string (e.g., "43235")
      description: string
      confidence: number
      aiSuggested: boolean
      acceptedByUser: boolean
    }]
  }

  signatureData?: {
    signedBy: userId
    signedAt: timestamp
    signatureValue: string (digital signature)
    timestamp_authority?: string
  }

  deliveryRecords: [{
    method: 'email' | 'print' | 'fax' | 'patient_portal'
    recipientType: 'patient' | 'referring_physician' | 'practice'
    recipient: string (email, fax number, etc.)
    deliveredAt: timestamp
    status: 'pending' | 'sent' | 'failed'
  }]

  pdfUrl?: string (Cloud Storage URL to signed PDF)
  lastModifiedAt: timestamp
  lastModifiedBy: userId
}

Create Cloud Function `generateReport(procedureId)`:
1. Fetch procedure + confirmed findings from Firestore
2. Call Copilot Engine (Vertex AI) to generate:
   - Clinical Impression from findings
   - Recommendations based on findings
   - ICD-10/CPT code suggestions
3. Create report document with status = 'auto_drafted'
4. Return { reportId, clinicalImpression, recommendations, suggestedCodes }

Create hooks in `lib/hooks.ts`:
- `useReport(reportId)`: load report + real-time updates
- `generateReport(procedureId)`: create report via Cloud Function
- `updateReportSection(reportId, section, content)`: update section
- `signReport(reportId)`: transition to 'signed', create signature
- `deliverReport(reportId, methods)`: deliver via email/print
```

### Step 2: Copilot Auto-Draft Panel

Prompt Gemini:
```
Create CopilotAutoDraft.tsx component for AI-assisted report generation.

Component displays in right panel of SCR-12 Report screen.

Layout:
1. Header:
   - Title: "Copilot Auto-Draft"
   - Icon: Sparkles (AI indicator)
   - Status: "Generating..." or "Ready" with checkmark
   - Refresh button: regenerate draft

2. Sections shown:
   a. Clinical Impression (auto-drafted)
   b. Recommendations (auto-drafted)
   c. Surveillance Recommendations (if applicable per study type)
   d. Risk Scores (if applicable)

3. For each section:
   - Show auto-drafted content in card
   - Source citations: "[Finding #3: Polyp 8mm, cecum]"
   - Confidence indicator: progress bar (0-1 scale)
   - Action buttons:
     - "Accept" → copy to report section
     - "Edit" → open inline editor
     - "Regenerate" → call Copilot again for this section only
     - "Discard" → mark as not used

4. Accept workflow:
   - Click "Accept" on Clinical Impression
   - Content copied to report.sections.clinicalImpression.content
   - Flag: acceptedFromDraft = true
   - Toast: "Clinical Impression accepted"
   - Section expands in main report area
   - Remove section from auto-draft panel (collapse it)

5. Edit workflow:
   - Click "Edit" → inline markdown editor appears
   - Clinician modifies text
   - Save → update report.sections.clinicalImpression
   - Flag: edited = true, acceptedFromDraft = false (clinician modified from draft)
   - Toast: "Changes saved"

6. Surveillance Recommendations (study-type-specific):
   - For Crohn's: auto-generate Lewis Score follow-up intervals
   - For Colon: auto-generate polyp surveillance intervals per USMSTF guidelines
   - Display as table: Finding | Recommendation | Interval
   - Clinician can modify intervals or dismiss

7. Risk Scores:
   - Display risk models applicable to findings:
     - GI Bleeding Risk (if bleeding suspected)
     - Polyp Burden (if polyps detected)
     - Extended Lewis Score (if Crohn's disease)
   - Show as cards with bar/gauge visualizations

8. Styling:
   - Light panel with AI-themed accent (blue/purple)
   - Card layout with rounded borders
   - Hover effects on action buttons

Props:
- procedureId: string
- findings: Finding[]
- onAccept: (section: string, content: string) => void
- onEdit: (section: string, content: string) => void
- isLoading?: boolean

Firestore operations:
- On accept: call updateReportSection(reportId, section, aiDraftedContent)
- On edit: call updateReportSection(reportId, section, clinicianEditedContent)
- Log: audit entry 'report_section_edited'
```

### Step 3: ICD-10/CPT Code Suggestion

Prompt Gemini:
```
Create ICDCodeSuggestions.tsx component for AI-suggested diagnosis/procedure codes.

Component displays as sidebar panel in SCR-12 Report (right of main report area).

Layout:
1. Header:
   - Title: "Suggested Codes"
   - Icon: medical symbol
   - Tabs: "ICD-10" / "CPT" / "Both"
   - Search box: filter codes by description

2. ICD-10 suggestions:
   - For each confirmed finding + indication, show suggested codes
   - Each code card shows:
     a. Code (e.g., "K11.9")
     b. Description (e.g., "Unspecified salivary gland disorder")
     c. Confidence score: 0-1 as percentage (92%)
     d. Source finding: which finding prompted this code
     e. Checkbox: "Accept" to add to report

3. CPT suggestions:
   - Show procedure codes (e.g., "43235" = EGD)
   - Study-type-specific:
     - Upper GI: 43235-43244 (various EGD codes)
     - SB-Diagnostic: 91110-91111 (capsule study codes)
     - Crohn's: 91110 + 99213-99215 (evaluation)
     - Colon: 45398-45398 (colonoscopy)
   - Each code shows:
     - Code + description
     - RVU (Relative Value Units) for billing context
     - Checkbox to accept

4. Quick actions:
   - "Accept All Suggested" button (bulk-accept all with confidence > 80%)
   - "Clear All" button (deselect all)
   - "Copy Codes" button (copy to clipboard)

5. Accepted codes UI:
   - Move accepted codes to "Selected Codes" section
   - Show as pills/tags with close button to remove
   - Drag-reorder to prioritize codes

6. Firestore operations:
   - On accept: update report.codes.icd10[] or report.codes.cpt[]
   - Set acceptedByUser = true
   - Log audit entry: 'codes_accepted'
   - Toast: "K11.9 accepted"

7. Styling:
   - Light sidebar, match Copilot Auto-Draft panel
   - Color-code by confidence: green (high), amber (medium), gray (low)
   - Responsive: collapse on mobile

Props:
- procedureId: string
- findings: Finding[]
- indications: string[]
- onAccept: (codes: IcdCode[]) => void
- isLoading?: boolean

Cloud Function `suggestCodesFromFindings(procedureId, findings, indications)`:
1. For each finding, query ICD-10 code database or use Vertex AI mapping
2. For procedure, determine CPT codes per study type
3. Rank by confidence score
4. Return { icd10: [], cpt: [] }
```

### Step 4: Report Section Editing

Prompt Gemini:
```
Update SCR-12 Report.tsx to support full report editing with section accept/edit/reject controls.

Main report area layout:
1. Header:
   - Study type (read-only)
   - Patient name (identity verification display)
   - Procedure date
   - Status badge: "Auto-Drafted" / "In Review" / "Ready to Sign"

2. Report sections (flow top to bottom):
   a. Indication
      - Auto-populated from procedure.indications[]
      - Editable: click to edit free-text
      - Save → update report.sections.indication

   b. Technique
      - Auto-populated from study type
      - Read-only (locked)

   c. Findings
      - Auto-populated from confirmed findings
      - Each finding shows:
        - Classification
        - Location + frame number
        - Size (if measured)
        - Provenance: "AI-detected by Model v2.1, confidence 92%"
      - Drag-reorder findings
      - Toggle visibility per finding (on/off checkbox)
      - Only reportable=true findings shown by default

   d. Clinical Impression
      - Initially empty or from auto-draft
      - Markdown editor: rich text + code formatting
      - Suggestions shown above (from Copilot panel)
      - Edit gate: disabled until findings section complete

   e. Recommendations
      - From auto-draft or clinician-entered
      - Surveillance recommendations (per USMSTF/AGA guidelines)
      - Referral recommendations (from incidental findings)
      - Accept/dismiss each recommendation

   f. Supplemental Sections (study-type-specific):
      - Crohn's: Lewis Score panel, GI Map summary
      - Colon: Polyp count, surveillance intervals

   g. Incidental Findings (if applicable)
      - Supplemental section per incidental
      - Recommendation text per incidental
      - Referral indicators

3. Edit mode per section:
   - Click section header → expand edit UI
   - Rich text editor with formatting buttons
   - Save/Cancel buttons
   - Undo/Redo within section
   - Flag: section.edited = true after save

4. Validation gates:
   - Cannot proceed to signing until:
     a. Findings section complete (≥1 finding)
     b. Clinical Impression provided (≥50 characters)
     c. Study type confirmed
   - Show warning banner if gates not met

5. Preview mode:
   - Toggle "PDF Preview" button
   - Show PDF rendering of final report
   - WYSIWYG rendering with header/footer

6. Mobile PWA responsive layout (0300):
   - Single-column layout on < 600px width
   - Copilot/ICD panels stack below main report
   - Touch-friendly buttons (min 44px height)
   - Readable font sizing

Firestore writes:
- updateReportSection(reportId, section, content)
- Set lastModifiedAt, lastModifiedBy
- Create audit log: 'report_edited'
```

### Step 5: Report Signing & Delivery

Prompt Gemini:
```
Implement SCR-13 SignDeliver.tsx with signing and delivery workflow.

1. Report verification:
   - Load report from Firestore
   - Check status (must be 'in_review' or 'auto_drafted')
   - Display full report PDF (simulated or actual via Cloud Function)
   - Show: patient name, study type, date, clinician

2. Identity verification gate (0283):
   - Before signing, confirm patient identity
   - Modal: "You are about to sign report for [Patient Name], DOB [X/X/XXXX]"
   - Button: "Correct patient" (enable sign) / "Wrong patient" (cancel)

3. Signing:
   - Single "Sign Report" button
   - onClick:
     a. Generate digital signature (Firebase Auth + timestamp)
     b. Call signReport(reportId) Cloud Function
     c. Function sets:
        - status = 'signed'
        - signatureData: { signedBy, signedAt, signatureValue, timestamp_authority }
     d. Procedure state transitions: status = 'completed' (via state machine)
     e. Toast: "Report signed successfully"

4. Delivery (0298):
   - After signing, show delivery options
   - Pre-populated from practice defaults (from Practice Settings):
     - Default email recipient (patient or referring physician)
     - Default delivery methods (email, print, patient portal)
   - Methods available:
     a. "Send to Patient Email": recipient pre-populated from patient.email
     b. "Send to Referring Physician": recipient selector modal
     c. "Print": shows print preview + printer selection
     d. "Email to Self": clinician's own email
     e. "Patient Portal": mark for posting to patient portal

5. Delivery execution:
   - Click delivery option
   - For email: show recipient confirmation + delivery status
   - For print: open browser print dialog
   - For portal: show "Posted to patient portal" banner
   - After delivery: create deliveryRecords[] entry in report document
   - Toast per method: "Sent to patient@email.com"

6. Post-delivery education trigger (0290):
   - After signing, offer to send patient education materials
   - Auto-suggest materials by study type + findings
   - "Send Education Materials" button
   - Show materials list with patient contact method
   - Toast: "Patient education materials sent"

7. Mobile PWA responsive:
   - Full-screen PDF on mobile
   - Buttons positioned at bottom (fixed footer)
   - Swipe to navigate multi-page PDF
   - Touch-friendly signing (accept or draw signature on canvas)

Firestore operations:
- signReport(reportId): Cloud Function that:
  1. Verifies caller is authorized to sign (custom claims)
  2. Generates signature with timestamp authority
  3. Updates report.status = 'signed'
  4. Updates procedure.status = 'completed' (via state machine)
  5. Calls PDF export Cloud Function
  6. Creates audit log: 'report_signed'
  7. Returns { success, reportId }

- deliverReport(reportId, methods): Cloud Function that:
  1. For each method, calls appropriate integration:
     - Email: SendGrid Cloud Function
     - Print: Cloud Print integration (future)
     - Portal: Patient portal API (future)
  2. Creates deliveryRecords[] entries
  3. Creates audit log: 'report_delivered'
  4. Sends notifications to recipients
  5. Returns { success, recordIds[] }

- triggerEducationDelivery(procedureId, studyType, findings): Cloud Function that:
  1. Query education library for study type + finding-relevant materials
  2. Send materials to patient via configured delivery method
  3. Create audit log: 'education_delivered'
```

## Acceptance Criteria

- [ ] Report created with status = 'auto_drafted'
- [ ] Copilot auto-draft generates Clinical Impression and Recommendations
- [ ] Auto-draft content displays in Copilot panel with confidence scores
- [ ] "Accept" button copies auto-draft content to report section
- [ ] "Edit" button allows clinician to modify section
- [ ] Edited sections flagged as edited in Firestore
- [ ] ICD-10 code suggestions display in sidebar
- [ ] CPT code suggestions display with study-type-specific codes
- [ ] Confidence scores shown as percentages
- [ ] Clinician can accept codes → added to report
- [ ] "Accept All" button bulk-accepts high-confidence codes
- [ ] Findings display with provenance metadata (origin, confidence, model version)
- [ ] Clinical Impression and Recommendations required before signing
- [ ] Validation gate prevents signing without findings + impression
- [ ] Report preview shows PDF-like rendering
- [ ] Mobile PWA responsive layout functional on mobile devices
- [ ] Identity verification modal appears before signing
- [ ] Sign button disabled until patient identity confirmed
- [ ] Signature captured with timestamp authority
- [ ] Report status transitions to 'signed' after signing
- [ ] Procedure status transitions to 'completed' after signing
- [ ] Delivery options pre-populated from practice defaults
- [ ] Email delivery: recipient pre-filled from patient contact
- [ ] Print option opens browser print dialog
- [ ] Patient portal delivery available
- [ ] Education materials auto-suggested after signing
- [ ] Education sent triggers learning engine
- [ ] Delivery records created for each delivery method
- [ ] Audit log entries created for all report operations
- [ ] Real-time listeners update report without reload
- [ ] PDF export Cloud Function generates file successfully
- [ ] Firestore security rules prevent unauthorized report access

## Testing Notes

Test auto-draft generation:
1. Create procedure with findings → verify Report screen loads
2. Verify Copilot panel shows auto-drafted Clinical Impression
3. Verify confidence scores displayed
4. Click "Accept" → verify content appears in report section

Test code suggestions:
1. Verify ICD-10 codes suggested based on findings
2. Verify CPT codes match study type
3. Check confidence > 80% marked as "high confidence"
4. Accept code → verify added to report codes array

Test signing:
1. Load report → verify status = 'auto_drafted'
2. Complete all sections → verify "Sign Report" button enabled
3. Attempt to sign without identity confirmation → gate blocks
4. Confirm identity → sign succeeds
5. Verify status = 'signed', procedure status = 'completed'

Test delivery:
1. After signing, verify delivery options show
2. Email recipient pre-filled from patient
3. Click "Send to Patient Email" → verify delivery record created
4. Verify toast confirms delivery

Test mobile PWA:
1. Open on mobile device (< 600px)
2. Verify single-column layout
3. Verify report readable
4. Verify buttons accessible
5. Verify signing workflow works on mobile

---
