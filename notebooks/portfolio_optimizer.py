import nbformat as nbf

def generate():
    nb = nbf.v4.new_notebook()
    cells = []

    cells.append(nbf.v4.new_code_cell(
        "import yfinance as yf\n"
        "import numpy as np\n"
        "import pandas as pd\n"
        "import scipy.optimize as sco\n"
        "import matplotlib.pyplot as plt\n"
        "import json"
    ))

    param_cell = nbf.v4.new_code_cell(
        "# Parameters\n"
        "tickers = 'AAPL,GOOGL,MSFT,AMZN'\n"
        "risk_tolerance = 0.5"
    )
    param_cell.metadata['tags'] = ['parameters']
    cells.append(param_cell)

    code = """
ticker_list = tickers.split(',')
print(f"Fetching data for {ticker_list}")

data = yf.download(ticker_list, period='1y')['Close']
returns = data.pct_change().dropna()

mean_returns = returns.mean() * 252
cov_matrix = returns.cov() * 252

num_portfolios = 1000
results = np.zeros((3, num_portfolios))
for i in range(num_portfolios):
    weights = np.random.random(len(ticker_list))
    weights /= np.sum(weights)

    portfolio_return = np.sum(mean_returns * weights)
    portfolio_std_dev = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))

    results[0,i] = portfolio_return
    results[1,i] = portfolio_std_dev
    results[2,i] = results[0,i] / results[1,i] # Sharpe Ratio

# Optimal weights (max sharpe)
def calc_neg_sharpe(weights, mean_returns, cov_matrix, risk_free_rate=0):
    p_ret = np.sum(mean_returns * weights)
    p_std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
    return -(p_ret - risk_free_rate) / p_std

constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
bounds = tuple((0, 1) for _ in range(len(ticker_list)))
init_guess = len(ticker_list) * [1. / len(ticker_list)]

opt_results = sco.minimize(calc_neg_sharpe, init_guess, args=(mean_returns, cov_matrix), method='SLSQP', bounds=bounds, constraints=constraints)

optimal_weights = opt_results.x
allocation = {ticker_list[i]: float(optimal_weights[i]) for i in range(len(ticker_list))}

plt.figure(figsize=(10, 6))
plt.scatter(results[1,:], results[0,:], c=results[2,:], cmap='YlGnBu', marker='o')
plt.title('Efficient Frontier')
plt.xlabel('Volatility')
plt.ylabel('Return')
plt.colorbar(label='Sharpe Ratio')
plt.savefig('efficient_frontier.png')
plt.close()

results_json = {
    "allocation": allocation,
    "expected_return": float(np.sum(mean_returns * optimal_weights)),
    "expected_volatility": float(np.sqrt(np.dot(optimal_weights.T, np.dot(cov_matrix, optimal_weights))))
}

with open('results.json', 'w') as f:
    json.dump(results_json, f)

print(f"Optimal Allocation: {allocation}")
"""
    cells.append(nbf.v4.new_code_cell(code))

    nb['cells'] = cells
    with open('portfolio_optimizer.ipynb', 'w') as f:
        nbf.write(nb, f)

if __name__ == "__main__":
    generate()
