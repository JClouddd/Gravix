import nbformat as nbf

def generate():
    nb = nbf.v4.new_notebook()
    cells = []

    cells.append(nbf.v4.new_code_cell(
        "import pandas as pd\n"
        "import urllib.request\n"
        "import json\n"
        "import matplotlib.pyplot as plt"
    ))

    param_cell = nbf.v4.new_code_cell(
        "# Parameters\n"
        "source_url = 'https://raw.githubusercontent.com/jbrownlee/Datasets/master/daily-min-temperatures.csv'\n"
        "output_format = 'json'"
    )
    param_cell.metadata['tags'] = ['parameters']
    cells.append(param_cell)

    code = """
try:
    print(f"Fetching data from {source_url}")
    if source_url.endswith('.csv'):
        df = pd.read_csv(source_url)
    elif source_url.endswith('.json'):
        df = pd.read_json(source_url)
    else:
        # Generic fallback
        req = urllib.request.urlopen(source_url)
        data = json.loads(req.read())
        df = pd.DataFrame(data)

    print(f"Loaded dataset with {len(df)} rows and {len(df.columns)} columns.")

    # Basic cleaning
    df = df.dropna()

    # Simple profiling
    profile = {
        "rows": len(df),
        "columns": list(df.columns),
        "dtypes": {k: str(v) for k, v in df.dtypes.items()}
    }

    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 0:
        plt.figure(figsize=(10, 6))
        df[numeric_cols[0]].hist(bins=20)
        plt.title(f"Distribution of {numeric_cols[0]}")
        plt.savefig('distribution.png')
        plt.close()

        profile['numeric_summary'] = df[numeric_cols].describe().to_dict()

    with open('results.json', 'w') as f:
        json.dump(profile, f)

    print("ETL Profile:", profile)

except Exception as e:
    with open('results.json', 'w') as f:
        json.dump({"error": str(e)}, f)
    print("ETL Error:", str(e))
"""
    cells.append(nbf.v4.new_code_cell(code))

    nb['cells'] = cells
    with open('data_pipeline.ipynb', 'w') as f:
        nbf.write(nb, f)

if __name__ == "__main__":
    generate()
