#!/bin/bash

# Check if both container name and network type are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <container-name> <network-type>"
    echo "Example: $0 my-container FIBER"
    exit 1
fi

CONTAINER_NAME=$1
NETWORK_TYPE=$2
PROJECT_ID="agile-module"
REGION="europe-west2"
REPOSITORY="backend-repo"

# Build the Docker image locally
docker build -t ${CONTAINER_NAME} . --platform linux/amd64

# Tag the image for Artifact Registry
docker tag ${CONTAINER_NAME} ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${CONTAINER_NAME}

# Push the Docker image to Artifact Registry
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${CONTAINER_NAME}

echo "Docker image built locally and pushed to Artifact Registry."

# Deploy to Cloud Run with NETWORK_TYPE environment variable
# gcloud run deploy ${CONTAINER_NAME} \
#     --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${CONTAINER_NAME} \
#     --platform managed \
#     --region ${REGION} \
#     --project ${PROJECT_ID} \
#     --allow-unauthenticated \
#     --port 8080 \
#     --set-env-vars "NETWORK_TYPE=${NETWORK_TYPE}"

# echo "Deployment to Cloud Run completed."