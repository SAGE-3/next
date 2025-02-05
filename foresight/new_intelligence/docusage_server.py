from fastapi import FastAPI
from pydantic import BaseModel

from fabric import Connection
import requests
import re
import re
from groq import Groq

client = Groq()

system_prompt = """Split the text provided into a Python list that structures the input text so it can be processed by Python. If the input is a text paragraph, return a Python list where each element contains a string combining consecutive, semantically related sentences. Please make sure you don't just split over sentences -- combine those that are relevant or related to eachother. Also, include headers as part of the first sentence (seperated from the sentence by a colon), rather than giving them their own entry in the list.
For metadata, i.e., if the provided text contains title, authors, keywords, etc., only return a list where each element is a string that groups similar things, e.g., a string of authors, string of affiliations, and string of keywords. Return an empty list if the text provided consists of only references. To avoid any issues, return only a single Python list and no additional text. It's okay to add/remove spaces or remove new lines as needed to normalize the data. Please return the list in a ```python ``` block."""

server_name = 'banane'
conn = Connection(server_name)


app = FastAPI()



def get_chunks(asset_public_url):
    asset_id = asset_public_url.split('/')[-1]
    response = requests.get(asset_public_url)
    with open(f"/tmp/{asset_id}.pdf", 'wb') as f:
        f.write(response.content)

    conn.put(f"/tmp/{asset_id}.pdf", f'/tmp/{asset_id}.pdf')
    print("converting to md")
    # conn.run(f'source /home/mahdi/miniconda3/etc/profile.d/conda.sh && conda activate /home/mahdi/mambaforge/envs/new_env && marker_single /tmp/{asset_id}.pdf /tmp/{asset_id}', shell='/bin/bash -l')
    print("Done converting... transferring data")
    conn.get(f"/tmp/{asset_id}/{asset_id}/{asset_id}.md", f"/tmp/{asset_id}.md")
    text = open(f"/tmp/{asset_id}.md").read()
    sections = re.split(r'^\s*#{1,6}\s+', text, flags=re.MULTILINE)
    sections = [s.strip() for s in sections if s.strip()]
    return sections        

def split_sections(section):
    completion = client.chat.completions.create(
        model="deepseek-r1-distill-llama-70b",
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": section
            }
        ],
        temperature=0.4,
        max_completion_tokens=4096,
        top_p=0.95,
        stream=False,
        stop=None,
    )

    pattern = re.compile(r"```python\n(.*?)```", re.DOTALL)
    match = pattern.search(completion.choices[0].message.content)
    
    if match:
        return eval(match.groups()[0])
    else:
        print("No Python code block found.")
        return None
    
import time
def get_all_sentence(sections):
    i = 0
    sentences = []
    time.sleep(1)
    for section in sections:
        sentences += split_sections(section)
        i+=1
        print(f"Completed {i}", end="\t")        
    return sentences      
    

class Document(BaseModel):
    public_url: str

@app.post("/process-document")
async def process_document(document: Document):
    asset_id = document.public_url.split('/')[-1]
    print(f"Asset id is {document.public_url}")
    sections = get_chunks(document.public_url)
    print(f"Getting sentences for asset id: {asset_id}")
    sentences = get_all_sentence(sections[0:5])
    print(sentences)
    return {"public_url": document.public_url, "sections": len(sections), "sentences": len(sentences)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("docusage_server:app", host="0.0.0.0", port=8000)