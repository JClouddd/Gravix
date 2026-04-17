#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <API_KEY_ID>"
  echo "You can find your API Key ID using: gcloud services api-keys list"
  exit 1
fi

API_KEY_ID=$1
PROJECT_ID=$(gcloud config get-value project)

echo "======================================================"
echo " Restricting Gemini API Key"
echo "======================================================"
echo "Project ID: $PROJECT_ID"
echo "API Key ID: $API_KEY_ID"
echo "======================================================"
echo ""

echo "Updating API key restrictions..."

gcloud services api-keys update "$API_KEY_ID" \
    --allowed-referrers="https://gravix-eight.vercel.app/*,http://localhost:3000/*" \
    --api-targets="generativelanguage.googleapis.com"

echo ""
echo "======================================================"
echo " Restriction Complete!"
echo "======================================================"
echo "Your API key is now restricted to:"
echo " - Referrers: gravix-eight.vercel.app/* and localhost:3000/*"
echo " - API: generativelanguage.googleapis.com"
echo "======================================================"
