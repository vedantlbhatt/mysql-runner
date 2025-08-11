from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

MODEL_NAME = "llama3.2" 
@app.route('/')
def home():
    return "Hello from NLP API with Ollama!"

@app.route('/nl2sql', methods=['POST'])
def nl2sql():
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400


if __name__ == '__main__':
    app.run(port=5000)
