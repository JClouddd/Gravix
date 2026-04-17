import os
import json
import time
import glob
import shutil
from flask import Flask, request, jsonify
import papermill as pm
from google.cloud import storage

app = Flask(__name__)

BUCKET_NAME = "gravix-knowledge-docs"

def download_notebook(notebook_name, local_path):
    # In a real environment, this would download from GCS
    # For now, we will simulate it by checking if it exists locally first, or fake it
    client = storage.Client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(f"notebooks/{notebook_name}.ipynb")

    # Try downloading, but wrap in try-catch because this runs without credentials during local testing
    try:
        blob.download_to_filename(local_path)
    except Exception as e:
        print(f"Failed to download {notebook_name}.ipynb from GCS: {e}")
        # If it fails, maybe it exists locally for testing
        pass

def upload_outputs(notebook_name, local_output_path, local_pngs):
    client = storage.Client()
    try:
        bucket = client.bucket(BUCKET_NAME)

        # Upload notebook
        blob = bucket.blob(f"outputs/{notebook_name}_output.ipynb")
        blob.upload_from_filename(local_output_path)

        # Upload pngs
        png_urls = []
        for png in local_pngs:
            filename = os.path.basename(png)
            blob = bucket.blob(f"outputs/{notebook_name}_{filename}")
            blob.upload_from_filename(png)
            # In a real app we'd make them public or generate signed URLs
            png_urls.append(f"gs://{BUCKET_NAME}/outputs/{notebook_name}_{filename}")

        return png_urls
    except Exception as e:
        print(f"Failed to upload outputs to GCS: {e}")
        return [f"local_simulated_url/{os.path.basename(png)}" for png in local_pngs]


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

@app.route('/execute', methods=['POST'])
def execute():
    data = request.json
    notebook_name = data.get('notebook')
    parameters = data.get('parameters', {})

    if not notebook_name:
        return jsonify({"error": "notebook name is required"}), 400

    local_input = f"{notebook_name}.ipynb"
    local_output = f"{notebook_name}_output.ipynb"

    start_time = time.time()

    # Download
    download_notebook(notebook_name, local_input)

    # If the file still doesn't exist, try looking in /app/notebooks or ../notebooks for local testing
    if not os.path.exists(local_input):
        possible_paths = [f"../notebooks/{notebook_name}.ipynb", f"/app/notebooks/{notebook_name}.ipynb", f"notebooks/{notebook_name}.ipynb"]
        for p in possible_paths:
            if os.path.exists(p):
                shutil.copy(p, local_input)
                break

    if not os.path.exists(local_input):
        return jsonify({"error": f"Notebook {notebook_name}.ipynb not found."}), 404

    # Execute
    try:
        # Clear out old pngs
        for f in glob.glob("*.png"):
            os.remove(f)

        pm.execute_notebook(
            local_input,
            local_output,
            parameters=parameters
        )

        execution_time = time.time() - start_time

        # Find generated PNGs
        pngs = glob.glob("*.png")

        # Try to parse results JSON if notebook saved one
        results = {}
        if os.path.exists("results.json"):
            with open("results.json", "r") as f:
                try:
                    results = json.load(f)
                except Exception:
                    pass

        # Upload
        chart_urls = upload_outputs(notebook_name, local_output, pngs)

        return jsonify({
            "status": "success",
            "executionTime": execution_time,
            "results": results,
            "chartUrls": chart_urls
        }), 200

    except Exception as e:
        execution_time = time.time() - start_time
        return jsonify({
            "status": "error",
            "executionTime": execution_time,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Run with gunicorn in prod, this is just for dev fallback
    app.run(host='0.0.0.0', port=8080)
