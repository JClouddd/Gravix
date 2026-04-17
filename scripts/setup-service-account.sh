#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Setup variables
PROJECT_ID=$(gcloud config get-value project)
SA_NAME="gravix-hub-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="${SA_NAME}-key.json"

echo "======================================================"
echo " Setting up Gravix Service Account for GCP"
echo "======================================================"
echo "Project ID: $PROJECT_ID"
echo "Service Account Name: $SA_NAME"
echo "Service Account Email: $SA_EMAIL"
echo "======================================================"
echo ""

# 1. Create the Service Account
echo "Creating service account..."
if gcloud iam service-accounts list --filter="email:${SA_EMAIL}" | grep -q "${SA_EMAIL}"; then
  echo "Service account already exists."
else
  gcloud iam service-accounts create ${SA_NAME} \
      --display-name="Gravix Hub Service Account"
  echo "Service account created."
fi
echo ""

# 2. Assign Roles
echo "Assigning IAM roles..."

ROLES=(
  "roles/aiplatform.user"
  "roles/datastore.user"
  "roles/storage.objectViewer"
  "roles/secretmanager.secretAccessor"
  "roles/cloudscheduler.jobRunner"
  "roles/dialogflow.client"
)

for ROLE in "${ROLES[@]}"; do
  echo "Assigning $ROLE..."
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="${ROLE}" \
      --condition=None > /dev/null
done
echo "Roles assigned successfully."
echo ""

# 3. Generate JSON Key
echo "Generating JSON key..."
if [ -f "$KEY_FILE" ]; then
  echo "Key file $KEY_FILE already exists. Skipping key generation."
else
  gcloud iam service-accounts keys create ${KEY_FILE} \
      --iam-account=${SA_EMAIL}
  echo "Key generated and saved to $KEY_FILE."
fi

echo ""
echo "======================================================"
echo " Setup Complete!"
echo "======================================================"
echo "IMPORTANT: The key file '$KEY_FILE' contains sensitive information."
echo "Keep it secure and DO NOT commit it to version control."
echo ""
echo "Next Steps for Vercel Deployment:"
echo "1. Open $KEY_FILE in a text editor."
echo "2. Copy its entire contents."
echo "3. Go to your Vercel Project > Settings > Environment Variables."
echo "4. Add an environment variable (e.g., GOOGLE_APPLICATION_CREDENTIALS_JSON) and paste the contents as the value."
echo "   (Consult the Vercel documentation or Gravix setup guide for the exact variable name expected by your application logic)."
echo "======================================================"
