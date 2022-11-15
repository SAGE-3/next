import requests

# SAGE3 server
server = 'minim1.evl.uic.edu'
web_server = 'https://' + server

# Auth token
token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0MUBnbWFpbC5jb20iLCJuYW1lIjoidGVzdDEiLCJhZG1pbiI6dHJ1ZSwiaWF0IjoxNjU0NTc2MTM5LCJleHAiOjE2ODYxMzM3MzksImF1ZCI6InNhZ2UzLmFwcCIsImlzcyI6InNhZ2UzYXBwQGdtYWlsLmNvbSJ9.kwQMDtdKXqGG9DZU8e4Mq_pC_GKCH-sMEalRcbIth3BeTsQ7apdZUPvZ4kTmgipJSoIUvyr72Z-2qDi3tKNdJB2OCnm8FMSRFWCt9KK6kxT2X8EiFh5f3T6q1cd1tRy-Nla9cF1zvRn1ALAetJRpVLIsH-XV-l4deWhrGfHNexwFLEJbvHb4E4UQtiB1bQZ5HwutztQvJtVOZ80HJxJccn7bjpVo-OdAjNjQjMLbJEGRgpJRAhyZaEVDojsiaJOrFtCUC65qvkC0gym-0HDd89Lmc2i54yf6h0Feb96OadeKT2TFjH3Jvi7_r7sTdE7N88oIaN_mQZhKKTUrI7EYTQ"

# Download one file
def download_file(url, filename, token):
  head = {'Authorization': 'Bearer {}'.format(token)}
  with requests.get(url, stream=True, headers=head) as r:
    r.raise_for_status()
    with open(filename, 'wb') as f:
      for chunk in r.iter_content(chunk_size=8192):
        f.write(chunk)

# Asset: 2eb444cc-8153-48ba-8504-581c920f2fe7.pdf
# Asset: 001220ae-cf6b-4850-a241-499ac00b6464.pdf
# Asset: edde647e-12ff-42d6-91b4-44c6fa06d27f.pdf
# Asset: d8478b65-ad6c-46ae-b324-ee24b99f96aa.pdf
# Asset: 329e0714-e9b0-40ec-b8d1-8613cf527cf3.pdf
# Asset: 07ec7e72-0757-4af0-a321-97d99b1636b3.pdf

file = "001220ae-cf6b-4850-a241-499ac00b6464.pdf"
url = web_server + "/api/assets/static/" + file

download_file(url, 'test.pdf', token)

print('Done')
