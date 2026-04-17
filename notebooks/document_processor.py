import nbformat as nbf

def generate():
    nb = nbf.v4.new_notebook()
    cells = []

    cells.append(nbf.v4.new_code_cell(
        "import pandas as pd\n"
        "import json\n"
        "import re\n"
        "import matplotlib.pyplot as plt\n"
        "import nltk\n"
        "from nltk.sentiment import SentimentIntensityAnalyzer\n"
        "nltk.download('vader_lexicon', quiet=True)"
    ))

    param_cell = nbf.v4.new_code_cell(
        "# Parameters\n"
        "documents_json = '[{\"id\": 1, \"text\": \"This is great!\"}]'"
    )
    param_cell.metadata['tags'] = ['parameters']
    cells.append(param_cell)

    code = """
docs = json.loads(documents_json)
df = pd.DataFrame(docs)

sia = SentimentIntensityAnalyzer()

def get_sentiment(text):
    scores = sia.polarity_scores(str(text))
    compound = scores['compound']
    if compound >= 0.05: return 'positive'
    if compound <= -0.05: return 'negative'
    return 'neutral'

if 'text' in df.columns:
    df['sentiment'] = df['text'].apply(get_sentiment)

    counts = df['sentiment'].value_counts()
    plt.figure(figsize=(8, 6))
    counts.plot(kind='pie', autopct='%1.1f%%')
    plt.title('Sentiment Analysis')
    plt.savefig('sentiment.png')
    plt.close()

    results = {
        "total_documents": len(df),
        "sentiment_counts": counts.to_dict()
    }
else:
    results = {"error": "no text column found"}

with open('results.json', 'w') as f:
    json.dump(results, f)

print("Document processing complete:", results)
"""
    cells.append(nbf.v4.new_code_cell(code))

    nb['cells'] = cells
    with open('document_processor.ipynb', 'w') as f:
        nbf.write(nb, f)

if __name__ == "__main__":
    generate()
