# Build Packet 03: Viewer & Findings Management

## Objective
Implement the endoscopy viewer with AI findings CRUD, finding confirmation/rejection workflow, incidental findings tray with batch actions, pre-review configuration banner, and annotation lifecycle management.

## Files to Have Open in Firebase Studio
- `types/finding.ts`, `types/annotation.ts`, `types/enums.ts`
- `screens/Viewer.tsx`, `screens/Summary.tsx`
- `components/PreReviewBanner.tsx` (new)
- `components/IncidentalFindingsTray.tsx` (new)
- `lib/hooks.ts` (add finding hooks)
- `scaffold/firestore.rules` (finding rules)

## Requirements Implemented

### ZCW-BRD-0244: Pre-Review Confirmation Panel
Integrated as progressive disclosure component within SCR-10 (Viewer). Renders as collapsible configuration banner at top displaying study type, Crohn's mode, sensitivity threshold as editable badges. Auto-collapses after 3 seconds of playback.

### ZCW-BRD-0245: Primary AOI vs Incidental Findings Categorization
System categorizes AI-detected findings into primary (area of interest per indication) and incidental (unrelated but significant). Visual separation in Incidental Findings tray.

### ZCW-BRD-0246: Incidental Findings Tray
Cannot silently skip incidentals. v3.1.0 adds batch actions (confirm-all, dismiss-all) with review gate.

### ZCW-BRD-0282: Clinical Finding Provenance Metadata
Origin (ai_detected/clinician_marked), confidence, model version, modification history. Displayed on hover. Included in report.

### ZCW-BRD-0265–0266: Voice Integration
Voice-to-structured-annotation (dictated findings parsed to fields). Voice commands for navigation. Ambient voice capture mode for continuous observation-to-pin mapping.

### ZCW-BRD-0289: Annotation Lifecycle Management
Annotations persist across session. Editable until report signed. Edit history tracked. Grouping and filtering by finding type. Reportable flag toggle.

### ZCW-BRD-0283: Patient Identity Context Verification
Identity confirmation before critical actions (capsule ingestion, Viewer load, report sign).

## Implementation Steps

### Step 1: Findings Firestore Schema

Prompt Gemini:
```
Create Firestore schema for findings with lifecycle management.

Collection: `practices/{practiceId}/procedures/{procedureId}/findings`

Document schema (one per AI finding or clinician-added finding):
{
  findingId: string (auto-generated)
  procedureId: string
  patientId: string
  practiceId: string
  findingType: 'polyp' | 'ulcer' | 'bleeding' | 'stricture' | 'mass' | 'lesion' | 'other'
  classification: string (AI classification or clinician-specified)
  location: {
    frameNumber: number
    timestamp: number (seconds into video)
    anatomicalRegion: string (e.g., "proximal colon", "duodenum")
  }
  size?: {
    width: number (mm)
    height: number (mm)
    diameter: number (mm)
    method: 'ai_calibrated' | 'clinician_estimated' | 'ruler_measurement'
  }
  confidence: number (0-1, AI confidence score)
  origin: 'ai_detected' | 'clinician_marked'
  modelVersion?: string (version of AI model that detected)
  categoryType: 'primary' | 'incidental' (0245: primary AOI vs incidental)
  reviewStatus: 'pending' | 'confirmed' | 'rejected' | 'modified'
  confirmedBy?: userId
  confirmedAt?: timestamp
  rejectionReason?: string
  modifications?: [{
    modifiedAt: timestamp
    modifiedBy: userId
    field: string (e.g., "classification", "size")
    oldValue: string
    newValue: string
    reason: string
  }]
  provenance: {
    origin: 'ai_detected' | 'clinician_marked'
    originDetails: { modelVersion?, confidence? }
    createdBy: userId (or 'ai_system')
    createdAt: timestamp
    lastModifiedBy?: userId
    lastModifiedAt?: timestamp
  }
  reportable: boolean (flag: include in report)
  educationLinked?: string[] (IDs of linked education materials)
  referralGenerated?: boolean (for incidentals)
  createdAt: timestamp
  updatedAt: timestamp
}

Create hooks in `lib/hooks.ts`:
- `useFindings(procedureId)`: returns all findings with real-time updates
- `usePrimaryFindings(procedureId)`: returns primary findings only
- `useIncidentalFindings(procedureId)`: returns incidental findings only
- `createFinding(procedureId, input)`: creates finding
- `updateFinding(procedureId, findingId, updates)`: updates finding
- `confirmFinding(procedureId, findingId)`: sets reviewStatus = 'confirmed'
- `rejectFinding(procedureId, findingId, reason)`: sets reviewStatus = 'rejected'
- `modifyFinding(procedureId, findingId, field, newValue)`: updates finding with provenance

Language: TypeScript with Firestore SDK.
```

### Step 2: Pre-Review Configuration Banner

Prompt Gemini:
```
Create PreReviewBanner.tsx as a progressive disclosure component integrated into SCR-10 Viewer.

Component behavior:
1. Renders at top of Viewer when procedure.status = 'ready_for_review'
2. Displays as collapsible banner with editable badges:
   - Study type (read-only): "Upper GI" / "SB-Diagnostic" / "SB-Crohn's" / "Colon"
   - Primary focus: editable dropdown (configurable per practice)
   - Crohn's mode: editable toggle (enable/disable Crohn's-specific tools)
   - Sensitivity threshold: editable slider (1-10, incidental findings sensitivity)

3. Banner styling:
   - Dark theme matching Viewer
   - Icon: gear/cog for settings
   - Layout: horizontal badges with edit pencil icon per badge

4. Edit modes:
   - Click badge → inline editor appears
   - Save → update procedure.preReviewConfig in Firestore
   - Cancel → dismiss editor
   - Toast: "Configuration updated"

5. Auto-collapse behavior:
   - On first load, banner visible
   - After 3 seconds of playback (video playing), banner auto-collapses
   - Manual toggle: click collapse arrow to expand/collapse
   - Expanded/collapsed state persisted in sessionStorage

6. Confirm & Begin Review:
   - Button at bottom of banner
   - Click → banner fully collapses
   - Review begins: enable playback, show findings timeline

7. Firestore write:
   - Call updateProcedure({ preReviewConfig: { sensitivity, primaryFocus, crohnsMode } })
   - Log audit entry: 'pre_review_config_updated'

Props:
- procedureId: string
- onComplete: () => void (callback when Confirm & Begin clicked)
- isCollapsed?: boolean (controlled collapse state)

Component requirements (0244):
- Show study type, Crohn's mode, sensitivity as editable badges
- Auto-collapse after 3 seconds of playback
- Save configuration to Firestore
- Emit completion callback
```

### Step 3: Findings CRUD & Confirmation Workflow

Prompt Gemini:
```
Integrate finding management into Viewer.tsx to support full CRUD lifecycle.

1. AI Findings Loading:
   - On Viewer mount, query procedures/{procId}/findings from Firestore
   - Filter by reviewStatus != 'rejected' (only show active findings)
   - Display on timeline as markers:
     - Red = suspected bleeding (highest priority)
     - Yellow = other significant findings
     - Green = landmarks
   - Show finding thumbnail + metadata on marker hover

2. Finding Confirmation Workflow:
   - Clinician reviews video, encounters AI-marked finding
   - Click finding marker or thumbnail → finding detail panel opens
   - Panel shows:
     a. Finding classification
     b. Frame count and timestamp
     c. Confidence score as progress bar (80% = "High confidence")
     d. AI model version (for transparency)
     e. Measurements (if applicable): width × height (mm)
     f. Location: anatomical region
     g. Provenance on hover: "AI-detected by [Model vX.Y], confidence 92%"
   - Action buttons:
     - "Confirm" → reviewStatus = 'confirmed'
     - "Reject" → confirmation modal: "Reason?" → reviewStatus = 'rejected'
     - "Modify" → inline editor for classification, size, location
     - "Retest" → re-run AI model on this frame (future feature)

3. Clinician-Added Findings:
   - Annotation tool: draw on frame or select region
   - Opens finding creation form:
     - Classification: dropdown (polyp, ulcer, bleeding, etc.)
     - Size (optional): manual entry or AI-calibrated measurement
     - Location: auto-captured from frame
     - Reportable: toggle (default true)
   - On save:
     - Create finding document in procedures/{procId}/findings
     - Set origin = 'clinician_marked', provenance.createdBy = currentUser.uid
     - Toast: "Finding added"

4. Finding Modifications:
   - Click "Modify" on confirmed finding
   - Edit form with pre-populated values
   - Track modifications in provenance.modifications[] array:
     - modifiedAt, modifiedBy, field, oldValue, newValue, reason
   - On save: update Firestore document, log audit entry

5. Batch Finding Confirmations:
   - Incidental Findings tray (see Step 4) shows unreviewed incidentals
   - "Confirm All" button: mass-confirm all incidentals in tray
   - "Dismiss All" button: mass-reject all incidentals with reason modal
   - Gate: before allowing mass actions, show summary:
     - "This will confirm X findings. Proceed?"
   - Firestore writes: batch update all finding documents

6. Reportable Flag:
   - Toggle per finding: "Include in Report"
   - Default true for confirmed findings, false for rejected
   - Only reportable=true findings appear in report
   - Summary count: "3 confirmed findings, 2 to report"

7. Real-time Updates:
   - Use onSnapshot listener on findings subcollection
   - Timeline updates as clinician adds/confirms findings
   - Summary count updates live
```

### Step 4: Incidental Findings Tray

Prompt Gemini:
```
Create IncidentalFindingsTray.tsx component for managing incidental (non-primary) findings.

Component displays at bottom of Viewer as collapsible tray.

Layout:
1. Header bar:
   - Title: "Incidental Findings (N)"
   - Icon: medical alert
   - Expand/collapse arrow
   - Color: amber/warning theme

2. When collapsed:
   - Show count badge: "N incidentals"
   - Click to expand

3. When expanded:
   - List unreviewed incidental findings
   - Each finding card shows:
     a. Finding type + classification
     b. Confidence score
     c. Frame timestamp
     d. Status: "Pending Review"
     e. Quick actions: "Confirm" / "Reject" / "Learn More"

4. Batch actions:
   - "Confirm All Incidentals" button
   - "Dismiss All Incidentals" button
   - Gate modal before executing:
     - Confirm All: "Confirm {N} incidental findings. Proceed?"
     - Dismiss All: confirmation + reason dropdown
       (Reasons: "Not relevant", "Requires follow-up", "Clinician aware", "Other")

5. For each confirmed incidental:
   - Check "Generate Referral?" toggle (0254)
   - If enabled: create referral document and show referral card
   - Referral shows: type (urgent/routine), specialty, urgency

6. Finding-Linked Education (0257):
   - Below confirmed findings, show related education materials
   - "Learn More" link → slide-out education panel
   - Example: polyp finding → displays patient education on polyp removal

7. Firestore operations:
   - Confirm: updateFinding({ reviewStatus: 'confirmed', confirmedBy, confirmedAt })
   - Reject: updateFinding({ reviewStatus: 'rejected', rejectionReason })
   - Batch confirm: updateFindings(batch, { reviewStatus: 'confirmed' })
   - Generate referral: call createReferral(findingId, type, urgency) Cloud Function

Props:
- procedureId: string
- incidentalFindings: Finding[]
- onConfirm: (findingId: string) => void
- onReject: (findingId: string, reason: string) => void
- onBatchConfirm: () => void
- onBatchReject: (reason: string) => void
- isVisible?: boolean
- isLocked?: boolean (read-only mode for completed procedures)

Styling: dark theme matching Viewer, amber accent for warnings
```

### Step 5: Annotation Lifecycle Management

Prompt Gemini:
```
Implement annotation lifecycle in Viewer.tsx per ZCW-BRD-0289.

Collection: `practices/{practiceId}/procedures/{procedureId}/annotations`

Document schema:
{
  annotationId: string
  procedureId: string
  frameNumber: number
  timestamp: number (seconds in video)
  type: 'circle' | 'arrow' | 'freeform' | 'measurement' | 'template'
  color: string (hex color)
  coordinates: [{x, y}] (path for freeform, circle center + radius, etc.)
  relatedFindingId?: string (if linked to a finding)
  createdBy: userId
  createdAt: timestamp
  modifiedAt: timestamp
  modifiedBy?: userId
  editHistory: [{
    action: 'created' | 'modified' | 'deleted'
    timestamp: timestamp
    modifiedBy: userId
    changeDetail: string
  }]
  reportable: boolean (include in report export)
}

Annotation UI features:
1. Drawing tools:
   - Shape selector: circle, arrow, freeform (icons in toolbar)
   - Color picker (palette of 8 colors)
   - Undo/Redo: last 10 actions
   - Delete: remove current annotation

2. Annotation persistence:
   - Save to Firestore on every change (with debounce)
   - Load annotations on Viewer mount
   - Render on video overlay

3. Filtering & grouping:
   - Filter by type: show/hide circles, arrows, etc.
   - Group by finding type: show annotations linked to a specific finding
   - Toggle visibility: eye icon per annotation

4. Edit history:
   - Click annotation → side panel shows edit history
   - History list: [timestamp] [user] "modified color to red"
   - Revert option: click to restore previous state

5. Lifecycle rules:
   - Annotations persist across session (Firestore)
   - Editable until procedure.status = 'completed' (then read-only)
   - On report sign, locked: cannot edit
   - Annotations exported with report as SVG overlay

6. Reportable flag:
   - Toggle "Include in Report" per annotation
   - Only reportable=true annotations exported to PDF

Hooks:
- `useAnnotations(procedureId)`: load + real-time updates
- `createAnnotation(procedureId, input)`: create
- `updateAnnotation(procedureId, annotationId, updates)`: modify
- `deleteAnnotation(procedureId, annotationId)`: delete
```

## Acceptance Criteria

- [ ] Findings load from Firestore subcollection on Viewer mount
- [ ] AI-detected findings display on timeline with red/yellow/green colors
- [ ] Primary vs incidental findings separated correctly
- [ ] Finding detail panel shows classification, confidence, size, location
- [ ] Confidence score displayed as progress bar
- [ ] Provenance visible on hover: "AI-detected by [Model], confidence X%"
- [ ] Clinician can confirm finding → reviewStatus = 'confirmed'
- [ ] Clinician can reject finding with reason → reviewStatus = 'rejected'
- [ ] Clinician can modify finding → provenance.modifications tracked
- [ ] Modification history shows all changes with timestamps and users
- [ ] Clinician can add manual finding via annotation tool
- [ ] Manual finding origin = 'clinician_marked'
- [ ] Pre-Review banner displays study type, Crohn's mode, sensitivity
- [ ] Sensitivity threshold editable with slider
- [ ] Banner auto-collapses after 3 seconds of playback
- [ ] Confirm & Begin button collapses banner and starts review
- [ ] Configuration changes saved to Firestore
- [ ] Incidental Findings tray shows unreviewed incidentals
- [ ] Batch "Confirm All" button works with gate modal
- [ ] Batch "Dismiss All" button with reason selector
- [ ] Generate Referral available for confirmed incidentals
- [ ] Finding-Linked Education panel slides out on "Learn More"
- [ ] Annotations persist to Firestore on creation/modification
- [ ] Drawing tools (circle, arrow, freeform) functional
- [ ] Color picker available for annotations
- [ ] Undo/Redo buttons work (last 10 actions)
- [ ] Annotation edit history tracked and viewable
- [ ] Reportable flag toggles per finding and annotation
- [ ] Annotations locked when procedure.status = 'completed'
- [ ] Real-time listeners update findings/annotations without reload
- [ ] Patient identity context verification blocks if not confirmed
- [ ] Audit log entries created for finding operations

## Testing Notes

Test finding confirmation:
1. Load Viewer → verify findings load from Firestore
2. Click finding marker → detail panel shows
3. Click "Confirm" → verify reviewStatus = 'confirmed' in Firestore
4. Verify confirmation timestamp and user ID recorded

Test finding rejection:
1. Click "Reject" → reason modal appears
2. Enter reason → verify reviewStatus = 'rejected' stored
3. Verify rejection timestamp recorded

Test clinician-added finding:
1. Use annotation tool to draw on frame
2. Save finding → verify origin = 'clinician_marked'
3. Verify finding appears in findings list

Test Pre-Review banner:
1. Load procedure with status = 'ready_for_review'
2. Verify banner shows at top with editable badges
3. Edit sensitivity → verify Firestore update
4. Wait 3 seconds → verify banner auto-collapses
5. Click "Confirm & Begin" → banner collapses fully

Test Incidental Findings tray:
1. Filter findings to incidentals only → tray shows
2. Click "Confirm All" → gate modal shows count
3. Confirm → batch update Firestore
4. Verify all incidentals marked confirmed

Test annotations:
1. Draw annotation on frame → verify saves to Firestore
2. Modify annotation → verify edit history recorded
3. Delete annotation → verify removed from Firestore
4. Close and reopen Viewer → verify annotations persist

---
