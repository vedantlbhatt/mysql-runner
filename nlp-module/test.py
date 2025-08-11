from transformers import pipeline

nl2sql = pipeline("text2text-generation", model="t5-small-finetuned-nl2sql")

result = nl2sql("how many employees are older than 30?", max_length=128)
print(result[0]['generated_text'])