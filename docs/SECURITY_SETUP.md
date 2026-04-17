# Gravix Security Setup

This document provides step-by-step instructions for securing your Gravix installation. It covers setting up a service account for GCP integrations and restricting your Gemini API key to prevent unauthorized usage.

## 1. Create a GCP Service Account

Gravix requires a Google Cloud Platform Service Account (`gravix-hub-sa`) to access Vertex AI, Firestore, Storage, Secret Manager, Cloud Scheduler, and Dialogflow securely.

### Step-by-Step Instructions

**Prerequisites:** Ensure you have the `gcloud` CLI installed and authenticated with your target GCP project.

1. **Set your Project ID**
   ```bash
   export PROJECT_ID="your-gcp-project-id"
   gcloud config set project $PROJECT_ID
   ```

2. **Create the Service Account**
   ```bash
   gcloud iam service-accounts create gravix-hub-sa \
       --display-name="Gravix Hub Service Account"
   ```

3. **Assign Necessary Roles**
   Assign the following roles to the newly created service account:
   - Vertex AI User (`roles/aiplatform.user`)
   - Firestore User (`roles/datastore.user`)
   - Storage Object Viewer (`roles/storage.objectViewer`)
   - Secret Manager Secret Accessor (`roles/secretmanager.secretAccessor`)
   - Cloud Scheduler Job Runner (`roles/cloudscheduler.jobRunner`)
   - Dialogflow API Client (`roles/dialogflow.client`)

   Use the following command for each role, replacing `[ROLE]` with the role name above:
   ```bash
   export SA_EMAIL="gravix-hub-sa@$PROJECT_ID.iam.gserviceaccount.com"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
       --member="serviceAccount:$SA_EMAIL" \
       --role="[ROLE]"
   ```
   *(Alternatively, use the `scripts/setup-service-account.sh` script to automate this process).*

4. **Generate and Download the Key**
   ```bash
   gcloud iam service-accounts keys create gravix-hub-sa-key.json \
       --iam-account=$SA_EMAIL
   ```
   **Important:** Keep this `gravix-hub-sa-key.json` file secure. Do not commit it to version control.

## 2. Restrict Your Gemini API Key

To prevent unauthorized access and usage of your Gemini API key, it is highly recommended to restrict its usage to specific domains.

### Instructions

You can restrict your API key using the Google Cloud Console or via the provided script.

**Using the `scripts/restrict-api-key.sh` script:**
1. Ensure your `gcloud` CLI is configured.
2. Run the script:
   ```bash
   ./scripts/restrict-api-key.sh "your-api-key-id"
   ```
   *Note: This restricts the key to `gravix-eight.vercel.app/*` and `localhost:3000/*` and limits usage to the `generativelanguage.googleapis.com` API.*

**Manual Configuration (Google Cloud Console):**
1. Navigate to **APIs & Services > Credentials**.
2. Click on your Gemini API key.
3. Under **Application restrictions**, select **HTTP referrers (web sites)**.
4. Add the following website restrictions:
   - `gravix-eight.vercel.app/*`
   - `http://localhost:3000/*`
5. Under **API restrictions**, select **Restrict key**.
6. Select **Generative Language API** (`generativelanguage.googleapis.com`) from the dropdown.
7. Click **Save**.

## 3. Set Up Vercel Environment Variables

Once you have your service account key and restricted API key, configure them in your Vercel deployment.

1. Go to your Gravix project in the Vercel dashboard.
2. Navigate to **Settings > Environment Variables**.
3. Add your standard environment variables (e.g., `GEMINI_API_KEY`).
4. To add the Service Account Key:
   - Open your `gravix-hub-sa-key.json` file.
   - You can either stringify the JSON and store it in a single variable (e.g., `GOOGLE_APPLICATION_CREDENTIALS_JSON`) or store specific fields like `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, and `GCP_PRIVATE_KEY` depending on your application's setup.
   *(Gravix uses default Google auth, so providing the stringified JSON or base64 encoded JSON is common practice for Vercel, typically parsed during initialization).*

## Security Checklist

- [ ] `gravix-hub-sa` service account created.
- [ ] Required IAM roles assigned to `gravix-hub-sa`.
- [ ] Service account JSON key generated and downloaded securely.
- [ ] Gemini API key restricted to `gravix-eight.vercel.app` and `localhost:3000`.
- [ ] Gemini API key restricted to `generativelanguage.googleapis.com` API.
- [ ] Vercel environment variables securely configured.
- [ ] `gravix-hub-sa-key.json` added to `.gitignore` (if present locally).
