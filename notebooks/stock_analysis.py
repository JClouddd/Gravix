import nbformat as nbf
import json

def generate():
    nb = nbf.v4.new_notebook()

    cells = []

    # 1. Imports
    cells.append(nbf.v4.new_code_cell(
        "import yfinance as yf\n"
        "import pandas as pd\n"
        "import matplotlib.pyplot as plt\n"
        "import json\n"
        "import os"
    ))

    # 2. Parameters cell (tagged)
    param_cell = nbf.v4.new_code_cell(
        "# Parameters\n"
        "ticker = 'AAPL'\n"
        "period = '1y'"
    )
    param_cell.metadata['tags'] = ['parameters']
    cells.append(param_cell)

    # 3. Logic
    code = """
print(f"Fetching data for {ticker} over {period}")
data = yf.download(ticker, period=period)

if data.empty:
    raise ValueError(f"No data found for {ticker}")

# Calculate RSI
delta = data['Close'].diff()
gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
rs = gain / loss
data['RSI'] = 100 - (100 / (1 + rs))

# Calculate MACD
exp1 = data['Close'].ewm(span=12, adjust=False).mean()
exp2 = data['Close'].ewm(span=26, adjust=False).mean()
data['MACD'] = exp1 - exp2
data['Signal'] = data['MACD'].ewm(span=9, adjust=False).mean()

# Latest metrics
latest = data.iloc[-1]
metrics = {
    "ticker": ticker,
    "last_price": float(latest['Close'].iloc[0]) if isinstance(latest['Close'], pd.Series) else float(latest['Close']),
    "rsi": float(latest['RSI'].iloc[0]) if isinstance(latest['RSI'], pd.Series) else float(latest['RSI']),
    "macd": float(latest['MACD'].iloc[0]) if isinstance(latest['MACD'], pd.Series) else float(latest['MACD']),
    "signal": float(latest['Signal'].iloc[0]) if isinstance(latest['Signal'], pd.Series) else float(latest['Signal'])
}

# Plot
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8), gridspec_kw={'height_ratios': [3, 1]})
ax1.plot(data.index, data['Close'], label=f'{ticker} Price')
ax1.set_title(f'{ticker} Stock Price and Volume')
ax1.set_ylabel('Price')
ax1.legend()

if 'Volume' in data.columns:
    ax2.bar(data.index, data['Volume'], color='gray', alpha=0.5, label='Volume')
    ax2.set_ylabel('Volume')
    ax2.set_xlabel('Date')
    ax2.legend()
else:
    ax2.set_visible(False)

plt.tight_layout()
plt.savefig('price_chart.png')
plt.close()

with open('results.json', 'w') as f:
    json.dump(metrics, f)

print(f"Metrics: {metrics}")
"""
    cells.append(nbf.v4.new_code_cell(code))

    nb['cells'] = cells

    with open('stock_analysis.ipynb', 'w') as f:
        nbf.write(nb, f)

if __name__ == "__main__":
    generate()
