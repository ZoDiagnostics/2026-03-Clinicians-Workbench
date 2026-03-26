#!/bin/bash
# BUILD_09 Phase 0: Infrastructure Setup
# Run this from the office Mac after git re-clone is complete.
# Prerequisites: gcloud CLI authenticated, access to both projects.
#
# What this does:
#   1. IAM grants — ZoCW SA gets cross-project read access to pipeline
#   2. Composite Firestore index — capsule_id + filename for efficient queries
#   3. CORS — Allow ZoCW origins to load images from pipeline bucket
#   4. (Optional) Verify service account can self-sign (for getSignedUrl)
#
# Usage: bash scripts/phase0-infra-setup.sh

set -euo pipefail

ZOCW_SA="cw-e7c19@appspot.gserviceaccount.com"
PIPELINE_PROJECT="podium-capsule-ingest"
PIPELINE_BUCKET="podium-capsule-raw-images-test"

echo "========================================"
echo "BUILD_09 Phase 0: Infrastructure Setup"
echo "========================================"
echo ""
echo "ZoCW Service Account: ${ZOCW_SA}"
echo "Pipeline Project:     ${PIPELINE_PROJECT}"
echo "Pipeline Bucket:      ${PIPELINE_BUCKET}"
echo ""

# ──────────────────────────────────────────
# Step 1: IAM Grants (cross-project access)
# ──────────────────────────────────────────
echo "── Step 1/4: IAM Grants ──"
echo ""

echo "Granting roles/datastore.user (Firestore read) on ${PIPELINE_PROJECT}..."
gcloud projects add-iam-policy-binding "${PIPELINE_PROJECT}" \
  --member="serviceAccount:${ZOCW_SA}" \
  --role="roles/datastore.user" \
  --quiet

echo ""
echo "Granting roles/storage.objectViewer (GCS read) on ${PIPELINE_PROJECT}..."
gcloud projects add-iam-policy-binding "${PIPELINE_PROJECT}" \
  --member="serviceAccount:${ZOCW_SA}" \
  --role="roles/storage.objectViewer" \
  --quiet

echo ""
echo "✓ IAM grants applied."
echo ""

# ──────────────────────────────────────────
# Step 2: Composite Firestore Index
# ──────────────────────────────────────────
echo "── Step 2/4: Composite Firestore Index ──"
echo ""
echo "Creating composite index: capsule_images (capsule_id ASC, filename ASC)..."
echo "Note: Index creation may take a few minutes. The command returns immediately."
echo ""

gcloud firestore indexes composite create \
  --project="${PIPELINE_PROJECT}" \
  --collection-group=capsule_images \
  --field-config field-path=capsule_id,order=ascending \
  --field-config field-path=filename,order=ascending \
  || echo "⚠  Index may already exist (that's fine)."

echo ""
echo "✓ Composite index creation initiated."
echo ""

# ──────────────────────────────────────────
# Step 3: CORS on Pipeline Bucket
# ──────────────────────────────────────────
echo "── Step 3/4: CORS Configuration ──"
echo ""

# Write CORS config to a temp file
CORS_TEMP=$(mktemp /tmp/cors-XXXXXX.json)
cat > "${CORS_TEMP}" << 'CORS_EOF'
[
  {
    "origin": [
      "https://cw-e7c19.web.app",
      "https://cw-e7c19.firebaseapp.com",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Range", "Accept-Ranges"],
    "maxAgeSeconds": 3600
  }
]
CORS_EOF

echo "Applying CORS to gs://${PIPELINE_BUCKET}..."
gcloud storage buckets update "gs://${PIPELINE_BUCKET}" \
  --project="${PIPELINE_PROJECT}" \
  --cors-file="${CORS_TEMP}"

rm -f "${CORS_TEMP}"

echo ""
echo "✓ CORS applied."
echo ""

# ──────────────────────────────────────────
# Step 4: Verify signBlob permission (optional)
# ──────────────────────────────────────────
echo "── Step 4/4: Verify signBlob Capability ──"
echo ""
echo "getCapsuleFrames uses getSignedUrl which requires IAM signBlob."
echo "Cloud Functions default SA usually has this. Checking..."
echo ""

# Check if the SA has serviceAccountTokenCreator on itself
HAS_TOKEN_CREATOR=$(gcloud projects get-iam-policy cw-e7c19 \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${ZOCW_SA} AND bindings.role:roles/iam.serviceAccountTokenCreator" \
  --format="value(bindings.role)" 2>/dev/null || true)

if [ -n "${HAS_TOKEN_CREATOR}" ]; then
  echo "✓ Service account has iam.serviceAccountTokenCreator — getSignedUrl will work."
else
  echo "⚠  Service account may not have iam.serviceAccountTokenCreator."
  echo "   If getSignedUrl fails at runtime, run:"
  echo ""
  echo "   gcloud projects add-iam-policy-binding cw-e7c19 \\"
  echo "     --member=\"serviceAccount:${ZOCW_SA}\" \\"
  echo "     --role=\"roles/iam.serviceAccountTokenCreator\""
  echo ""
  echo "   (Cloud Functions v1 usually has this already via App Engine default grants.)"
fi

echo ""
echo "========================================"
echo "Phase 0 Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Wait ~2 min for the composite index to build"
echo "  2. Re-seed: npx tsx seed-demo.ts"
echo "  3. Build + deploy: npm run build && cd functions && npm run build && cd .."
echo "  4. Deploy: npx firebase-tools@latest deploy --only functions,hosting"
echo "  5. Run Phase 5 E2E tests (see BUILD_09_IMPLEMENTATION_PLAN.md)"
