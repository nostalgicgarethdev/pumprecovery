import json
import torch
# Load the data
with open('./outputs.json', 'r') as f:
    data = json.load(f)
with open('./outputs2.json', 'r') as f:
    data2 = json.load(f)
data.extend(data2)
# Preprocess the data
training_samples = []
for sample in data:
    king_of_the_hill_timestamp = sample['king_of_the_hill_timestamp']
    raydium_pool = sample['raydium_pool']
    label = None
    if king_of_the_hill_timestamp:
        label = 0  # "king_of_the_hill"
    elif raydium_pool:
        label = 1  # "raydium_pool"
    else:
        label = -1
    if label != None:
        input_text = f"Asset details: {sample['name']}, {sample['description']}, Has twitter: {sample['twitter'] is not None}, Has website: {sample['website'] is not None}, Has telegram: {sample['telegram'] is not None}, Image description: {sample['image_description']}"
        encodings = {"messages": [
            {"role": "system", "content": "Tokenization and encoding of input text."},
            {"role": "user", "content": input_text},
            {"role": "assistant", "content": str(label)}
        ]}
        with open('./outputs.jsonl', 'a+') as f:
            f.write(json.dumps(encodings) + '\n')
