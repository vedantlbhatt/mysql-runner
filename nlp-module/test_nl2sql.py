import requests

API_URL = "http://localhost:5000/nl2sql"

def main():
    print("Enter your natural language query (type 'exit' to quit):")
    while True:
        nl_query = input("> ").strip()
        if nl_query.lower() == 'exit':
            break
        if not nl_query:
            continue

        response = requests.post(API_URL, json={"query": nl_query})
        if response.status_code == 200:
            data = response.json()
            print("SQL Query generated:")
            print(data.get("sql", "<no sql returned>"))
        else:
            print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    main()
