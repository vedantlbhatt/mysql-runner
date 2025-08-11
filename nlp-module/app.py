from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

MODEL_NAME = "llama3.2"  # You can change to mistral, codellama, etc.

@app.route('/')
def home():
    return "Hello from NLP API with Ollama!"

@app.route('/nl2sql', methods=['POST'])
def nl2sql():
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400

    nl_query = data['query'].strip()

    try:
        # Ask Ollama to convert NL to SQL
        prompt = f"Convert the following natural language query to SQL only (no explanations, just valid SQL):\n\n{nl_query}\n\nSQL:"

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            }
        )

        if response.status_code != 200:
            return jsonify({'error': f'Ollama error: {response.text}'}), 500

        sql_query = response.json().get("response", "").strip()

        return jsonify({'sql': sql_query})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(port=5000)
