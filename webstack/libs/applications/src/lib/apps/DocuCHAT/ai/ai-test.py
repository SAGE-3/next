from openai import OpenAI
import json

endpoint = "https://docusage-openai-eastus2.openai.azure.com/openai/v1/"
deployment_name = "gpt-5-ben-crawford"
api_key = ""

client = OpenAI(
    base_url=endpoint,
    api_key=api_key
)

# Load your hierarchy template
with open("hierarchy_format.json", "r") as f:
    hierarchy_format = f.read()

# Build the prompt
prompt = f"""
Please search the web for 50 research papers across all scientific topics that were published after the year 2000.
"""
rules = f"""
You are a helpful assistant that can search the web to find and organize research papers into a hierarchy structure. Format them into this JSON hierarchy structure. The hierarchy should have top level topics, like computer science and biology,
and have subtopics within each topic. The top level should always be topics. Each layer below the top should either contain subtopics that the papers are organized into or the papers themselves.:

{hierarchy_format}

Return only valid JSON.
"""

try:
    completion = client.chat.completions.create(
        model=deployment_name,
        messages=[
        {"role": "system", "content": rules},
        {"role": "user", "content": prompt}],
        response_format={"type": "json_object"}  # ensures valid JSON response
    )

    print("✅ Response received. Writing to output.json...")

    # Parse and write JSON to a file
    result_json = completion.choices[0].message.content
    data = json.loads(result_json)

    with open("output.json", "w") as outfile:
        json.dump(data, outfile, indent=2)

    print("💾 Saved to output.json")

except Exception as e:
    print("❌ Error occurred:")
    print(e)