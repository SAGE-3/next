import sys
import json
from nltk.corpus import wordnet
# print( sys.argv[1], sys.argv[2])

query = sys.argv[1]
property_list = json.loads(sys.argv[2])

for row in property_list:
  print(row['header'])
  
syn1 = wordnet.synsets('hello')[0]
syn2 = wordnet.synsets('selling')[0]
 
print(syn1, syn2)
sys.stdout.flush()