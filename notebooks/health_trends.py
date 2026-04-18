import nbformat as nbf

def generate():
    nb = nbf.v4.new_notebook()
    cells = []

    cells.append(nbf.v4.new_code_cell(
        "import pandas as pd\n"
        "import matplotlib.pyplot as plt\n"
        "import json\n"
        "import io"
    ))

    param_cell = nbf.v4.new_code_cell(
        "# Parameters\n"
        "data_json = '[{\"date\": \"2024-01-01\", \"weight\": 180, \"steps\": 8000}]'"
    )
    param_cell.metadata['tags'] = ['parameters']
    cells.append(param_cell)

    code = """
records = json.loads(data_json)
df = pd.DataFrame(records)
df['date'] = pd.to_datetime(df['date'])
df.set_index('date', inplace=True)
df.sort_index(inplace=True)

metrics = {}

if 'weight' in df.columns:
    plt.figure(figsize=(10, 5))
    plt.plot(df.index, df['weight'], marker='o', color='blue')
    plt.title('Weight Trend')
    plt.ylabel('Weight')
    plt.savefig('weight_trend.png')
    plt.close()
    metrics['avg_weight'] = float(df['weight'].mean())
    metrics['latest_weight'] = float(df['weight'].iloc[-1])

if 'steps' in df.columns:
    plt.figure(figsize=(10, 5))
    plt.bar(df.index, df['steps'], color='green')
    plt.title('Steps Trend')
    plt.ylabel('Steps')
    plt.savefig('steps_trend.png')
    plt.close()
    metrics['avg_steps'] = float(df['steps'].mean())
    metrics['total_steps'] = float(df['steps'].sum())

with open('results.json', 'w') as f:
    json.dump(metrics, f)

print("Health metrics calculated:", metrics)
"""
    cells.append(nbf.v4.new_code_cell(code))

    nb['cells'] = cells
    with open('health_trends.ipynb', 'w') as f:
        nbf.write(nb, f)

if __name__ == "__main__":
    generate()
