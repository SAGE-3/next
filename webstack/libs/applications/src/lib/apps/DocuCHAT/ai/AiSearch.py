# ============================================================================
# REDUCED PIPELINE: Phase 1, 2.7, 4, 6 → hierarchy.json
# Paper Discovery → AI2 Enhancements → Embeddings → Taxonomy → hierarchy.json
# ============================================================================

import subprocess
import sys
#print("📦 Installing required packages...")
for pkg in ["numpy", "scipy", "scikit-learn", "openai", "requests", "feedparser",
            "sentence-transformers", "pymupdf4llm", "python-dotenv"]:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', '--break-system-packages', pkg])
    except Exception:
        pass

import os
import json
import time
import re
import hashlib
from urllib.parse import quote_plus
from collections import Counter
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Set
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
import requests
import feedparser
from openai import AzureOpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# ============================================================================
# CONFIGURATION (only keys used in Phase 1, 2.7, 4, 6)
# ============================================================================

CONFIG = {
    "TOPIC": None,
    "NUM_SEARCH_QUERIES": 2,
    "ARXIV_PER_QUERY": 4,
    "S2_PER_QUERY": 4,
    "EXPAND_VIA_RECOMMENDATIONS": True,
    "EXPAND_VIA_CITATIONS": True,
    "EXPAND_VIA_REFERENCES": True,
    "TOP_SEEDS": 15,
    "RECS_PER_SEED": 10,
    "USE_AI2_ENHANCEMENTS": True,
    "AI2_ADD_S2_FIELDS": True,
    "AI2_BUILD_CITATION_GRAPH": True,
    "AI2_GET_RECOMMENDATIONS": True,
    "AI2_MAX_PAPERS_FIELDS": 100,
    "AI2_MAX_PAPERS_GRAPH": 50,
    "AI2_MAX_PAPERS_RECS": 20,
    "USE_SPECTER": True,
    "USE_TFIDF_FALLBACK": True,
    "TAXONOMY_LEVELS": 3,
    "MIN_CLUSTER_SIZE": 8,
    "LLM_CLUSTER_NAMES": True,
    "LLM_CLUSTER_SUMMARIES": True,
    "EXTRACT_CLUSTER_KEYWORDS": True,
    "AZURE_ENDPOINT": os.getenv("AZURE_ENDPOINT", ""),
    "AZURE_KEY": os.getenv("AZURE_KEY", ""),
    "AZURE_API_VERSION": os.getenv("AZURE_API_VERSION", "2024-12-01-preview"),
    "AZURE_DEPLOYMENT": os.getenv("AZURE_DEPLOYMENT", "gpt-5-nano"),
    "MIN_TOKENS": 10000,
    "S2_API_KEY": os.getenv("S2_API_KEY", ""),
    "OUTPUT_DIR": None,
}

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class Paper:
    id: str
    title: str
    authors: List[str]
    year: int
    abstract: Optional[str] = None
    url: str = ""
    source: str = ""
    citations: int = 0
    influential_citations: int = 0
    venue: str = ""
    tldr: Optional[str] = None
    pdf_url: Optional[str] = None
    doi: Optional[str] = None
    full_text: str = ""
    embedding: Optional[List[float]] = None
    specter_embedding: Optional[List[float]] = None
    verified: bool = False
    verification_source: str = ""
    key_findings: str = ""
    ai_summary: str = ""
    s2_fields: List[str] = field(default_factory=list)
    mag_fields: List[str] = field(default_factory=list)
    influence_score: float = 0.0
    internal_citations: int = 0
    cluster_id: str = ""
    cluster_path: str = ""
    topic_label: str = ""

@dataclass
class TaxonomyNode:
    id: str
    name: str
    level: int
    parent_id: Optional[str] = None
    paper_ids: List[str] = field(default_factory=list)
    children: List['TaxonomyNode'] = field(default_factory=list)
    summary: str = ""
    keywords: List[str] = field(default_factory=list)
    s2_fields: List[str] = field(default_factory=list)
    avg_citations: float = 0.0
    total_citations: int = 0

@dataclass
class CitationGraph:
    citations: Dict[str, List[str]]
    references: Dict[str, List[str]]
    influential: Dict[str, int]
    internal_citations: Dict[str, int]

# ============================================================================
# UTILITIES
# ============================================================================

def ask_llm(azure_client, prompt: str, max_tokens: int = None) -> str:
    if max_tokens is None:
        max_tokens = CONFIG["MIN_TOKENS"]
    try:
        response = azure_client.chat.completions.create(
            model=CONFIG["AZURE_DEPLOYMENT"],
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=max(max_tokens, CONFIG["MIN_TOKENS"])
        )
        message = response.choices[0].message
        if hasattr(message, 'content') and message.content:
            return message.content.strip() if isinstance(message.content, str) else ""
    except Exception as e:
        print(f"      ⚠️ LLM error: {e}")
    return ""

# ============================================================================
# PHASE 1: PAPER DISCOVERY
# ============================================================================

def generate_diverse_queries(topic: str, azure_client, n: int = 10) -> List[str]:
    print(f"   Generating {n} search queries...")
    prompt = f"""Generate {n} HIGHLY DIVERSE academic search queries (2-5 words each) for: "{topic}"
Return ONLY a JSON array: ["query1", "query2", ...]"""
    try:
        response = ask_llm(azure_client, prompt, max_tokens=1000)
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            queries = json.loads(json_match.group(0))
            queries = [q.strip() for q in queries if isinstance(q, str) and len(q.strip()) > 3]
            if topic.lower() not in [q.lower() for q in queries]:
                queries.insert(0, topic)
            if len(queries) >= n:
                return queries[:n]
    except Exception as e:
        print(f"      ⚠️ LLM failed: {e}")
    queries = [topic]
    for angle in ["machine learning", "deep learning", "applications", "survey", "methods"]:
        queries.append(f"{angle} {topic.split()[-1]}")
    return queries[:n]

def search_arxiv(query: str, max_results: int = 30) -> List[Paper]:
    papers = []
    try:
        encoded = quote_plus(query)
        url = f"http://export.arxiv.org/api/query?search_query=all:{encoded}&max_results={max_results}"
        feed = feedparser.parse(url)
        for entry in feed.entries:
            arxiv_id = entry.id.split('/abs/')[-1]
            papers.append(Paper(
                id=arxiv_id,
                title=entry.title.replace('\n', ' '),
                authors=[a.name for a in entry.authors],
                year=int(entry.published[:4]),
                abstract=entry.summary.replace('\n', ' '),
                url=entry.link,
                source='arxiv',
                pdf_url=f"https://arxiv.org/pdf/{arxiv_id}.pdf",
                verified=True,
                verification_source='arxiv'
            ))
    except Exception as e:
        print(f"         ⚠️ ArXiv: {e}")
    return papers

def search_semantic_scholar(query: str, max_results: int = 30, api_key: str = None) -> List[Paper]:
    papers = []
    try:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {'query': query, 'limit': max_results,
                  'fields': 'paperId,title,authors,year,abstract,url,citationCount,influentialCitationCount,venue,tldr,openAccessPdf,externalIds'}
        headers = {'x-api-key': api_key} if api_key else {}
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            for item in resp.json().get('data', []):
                ext = item.get('externalIds', {})
                doi = ext.get('DOI') if ext else None
                papers.append(Paper(
                    id=item.get('paperId', ''),
                    title=item.get('title', ''),
                    authors=[a.get('name', '') for a in item.get('authors', [])],
                    year=item.get('year', 2020),
                    abstract=item.get('abstract'),
                    url=f"https://www.semanticscholar.org/paper/{item.get('paperId')}",
                    source='semantic_scholar',
                    citations=item.get('citationCount', 0),
                    influential_citations=item.get('influentialCitationCount', 0),
                    venue=item.get('venue', ''),
                    tldr=item.get('tldr', {}).get('text') if item.get('tldr') else None,
                    pdf_url=item.get('openAccessPdf', {}).get('url') if item.get('openAccessPdf') else None,
                    doi=doi,
                    verified=True,
                    verification_source='semantic_scholar'
                ))
    except Exception as e:
        print(f"         ⚠️ S2: {e}")
    return papers

def deduplicate_papers(papers: List[Paper]) -> List[Paper]:
    seen = set()
    unique = []
    for p in papers:
        h = hashlib.md5(p.title.lower().strip().encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            unique.append(p)
    return unique

def get_s2_recommendations(paper_id: str, headers: dict, max_retries: int = 2) -> Tuple[bool, List[Paper]]:
    url = f"https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paper_id}"
    params = {'fields': 'paperId,title,authors,year,abstract,citationCount,venue,tldr,openAccessPdf', 'limit': CONFIG['RECS_PER_SEED']}
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                papers = [Paper(id=item.get('paperId',''), title=item.get('title',''), authors=[a.get('name','') for a in item.get('authors',[])], year=item.get('year',2020), abstract=item.get('abstract'), url=f"https://www.semanticscholar.org/paper/{item.get('paperId')}", source='s2_recommendations', citations=item.get('citationCount',0), venue=item.get('venue',''), tldr=item.get('tldr',{}).get('text') if item.get('tldr') else None, pdf_url=item.get('openAccessPdf',{}).get('url') if item.get('openAccessPdf') else None, verified=True, verification_source='s2_graph') for item in data.get('recommendedPapers', [])]
                return True, papers
            if resp.status_code == 429:
                time.sleep(2 ** attempt)
        except Exception:
            pass
    return False, []

def get_s2_citations(paper_id: str, headers: dict, max_retries: int = 2) -> Tuple[bool, List[Paper]]:
    url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}/citations"
    params = {'fields': 'paperId,title,authors,year,citationCount,openAccessPdf', 'limit': 10}
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            if resp.status_code == 200:
                papers = []
                for item in resp.json().get('data', []):
                    c = item.get('citingPaper', {})
                    if c:
                        papers.append(Paper(id=c.get('paperId',''), title=c.get('title',''), authors=[a.get('name','') for a in c.get('authors',[])], year=c.get('year',2020), url=f"https://www.semanticscholar.org/paper/{c.get('paperId')}", source='s2_citations', citations=c.get('citationCount',0), pdf_url=c.get('openAccessPdf',{}).get('url') if c.get('openAccessPdf') else None, verified=True, verification_source='s2_graph'))
                return True, papers
            if resp.status_code == 429:
                time.sleep(2 ** attempt)
        except Exception:
            pass
    return False, []

def get_s2_references(paper_id: str, headers: dict, max_retries: int = 2) -> Tuple[bool, List[Paper]]:
    url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}/references"
    params = {'fields': 'paperId,title,authors,year,citationCount,openAccessPdf', 'limit': 10}
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            if resp.status_code == 200:
                papers = []
                for item in resp.json().get('data', []):
                    c = item.get('citedPaper', {})
                    if c:
                        papers.append(Paper(id=c.get('paperId',''), title=c.get('title',''), authors=[a.get('name','') for a in c.get('authors',[])], year=c.get('year',2020), url=f"https://www.semanticscholar.org/paper/{c.get('paperId')}", source='s2_references', citations=c.get('citationCount',0), pdf_url=c.get('openAccessPdf',{}).get('url') if c.get('openAccessPdf') else None, verified=True, verification_source='s2_graph'))
                return True, papers
            if resp.status_code == 429:
                time.sleep(2 ** attempt)
        except Exception:
            pass
    return False, []

def expand_via_s2_graph(papers: List[Paper], api_key: str = None) -> List[Paper]:
    print(f"   Expanding via Semantic Scholar graph...")
    seeds_with_s2_ids = []
    for paper in papers:
        s2_id = None
        if paper.id and len(paper.id) == 40 and all(c in '0123456789abcdef' for c in paper.id.lower()):
            s2_id = paper.id
        elif paper.url and 'semanticscholar.org/paper/' in paper.url:
            s2_id = paper.url.split('semanticscholar.org/paper/')[-1].split('/')[0].split('?')[0]
        if s2_id and len(s2_id) == 40:
            seeds_with_s2_ids.append((paper, s2_id))
    seeds_with_s2_ids.sort(key=lambda x: x[0].citations or 0, reverse=True)
    top_seeds = seeds_with_s2_ids[:CONFIG['TOP_SEEDS']]
    if not top_seeds:
        print("      ⚠️ No S2 IDs for expansion")
        return []
    new_papers = []
    headers = {'x-api-key': api_key} if api_key else {}
    if CONFIG['EXPAND_VIA_RECOMMENDATIONS']:
        for paper, s2_id in top_seeds:
            ok, recs = get_s2_recommendations(s2_id, headers)
            if ok:
                new_papers.extend(recs)
            time.sleep(0.3)
    if CONFIG['EXPAND_VIA_CITATIONS']:
        for paper, s2_id in top_seeds[:5]:
            ok, recs = get_s2_citations(s2_id, headers)
            if ok:
                new_papers.extend(recs)
            time.sleep(0.5)
    if CONFIG['EXPAND_VIA_REFERENCES']:
        for paper, s2_id in top_seeds[:5]:
            ok, recs = get_s2_references(s2_id, headers)
            if ok:
                new_papers.extend(recs)
            time.sleep(0.5)
    return new_papers

# ============================================================================
# PHASE 2.7: AI2 ENHANCEMENTS
# ============================================================================

def get_s2_fields(paper_id: str, api_key: Optional[str] = None) -> Dict:
    try:
        url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}"
        params = {'fields': 's2FieldsOfStudy,fieldsOfStudy'}
        headers = {'x-api-key': api_key} if api_key else {}
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            s2 = data.get('s2FieldsOfStudy', [])
            mag = data.get('fieldsOfStudy', [])
            s2_list = [f['category'] for f in s2] if s2 else []
            all_f = list(set(s2_list + (mag or [])))
            return {'s2_fields': s2_list, 'mag_fields': mag or [], 'all_fields': all_f}
    except Exception:
        pass
    return {'s2_fields': [], 'mag_fields': [], 'all_fields': []}

def add_s2_fields_to_papers(papers: List[Paper], api_key: Optional[str] = None, max_papers: int = 100) -> List[Paper]:
    s2_papers = [p for p in papers if p.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references'] or p.verification_source == 's2']
    if not s2_papers:
        return papers
    for paper in s2_papers[:max_papers]:
        try:
            fields = get_s2_fields(paper.id, api_key)
            if fields['all_fields']:
                paper.s2_fields = fields['s2_fields']
                paper.mag_fields = fields['mag_fields']
        except Exception:
            pass
        time.sleep(0.1)
    return papers

def build_citation_graph(papers: List[Paper], api_key: Optional[str] = None, max_papers: int = 50) -> CitationGraph:
    s2_papers = [p for p in papers if p.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references'] or p.verification_source == 's2']
    graph = CitationGraph(citations={}, references={}, influential={}, internal_citations={})
    paper_ids = {p.id for p in papers}
    for paper in s2_papers[:max_papers]:
        try:
            url = f"https://api.semanticscholar.org/graph/v1/paper/{paper.id}/citations"
            resp = requests.get(url, params={'fields': 'paperId,isInfluential', 'limit': 1000}, headers={'x-api-key': api_key} if api_key else {}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                all_cit = []
                inf_count = 0
                int_count = 0
                for c in data.get('data', []):
                    cid = c.get('citingPaper', {}).get('paperId')
                    if cid:
                        all_cit.append(cid)
                        if c.get('isInfluential'):
                            inf_count += 1
                        if cid in paper_ids:
                            int_count += 1
                graph.citations[paper.id] = all_cit
                graph.influential[paper.id] = inf_count
                graph.internal_citations[paper.id] = int_count
            url = f"https://api.semanticscholar.org/graph/v1/paper/{paper.id}/references"
            resp = requests.get(url, params={'fields': 'paperId', 'limit': 1000}, headers={'x-api-key': api_key} if api_key else {}, timeout=10)
            if resp.status_code == 200:
                graph.references[paper.id] = [r.get('citedPaper', {}).get('paperId') for r in resp.json().get('data', []) if r.get('citedPaper', {}).get('paperId')]
        except Exception:
            pass
        time.sleep(0.3)
    return graph

def rank_papers_by_influence(papers: List[Paper], graph: CitationGraph) -> List[Paper]:
    for paper in papers:
        inf = graph.influential.get(paper.id, 0)
        internal = graph.internal_citations.get(paper.id, 0)
        total = len(graph.citations.get(paper.id, []))
        paper.influence_score = inf * 3.0 + internal * 5.0 + total * 1.0
        paper.internal_citations = internal
    return sorted(papers, key=lambda p: p.influence_score, reverse=True)

def get_ai2_recommendation_ids(paper_id: str, api_key: Optional[str] = None, max_results: int = 10) -> List[Dict]:
    try:
        url = f"https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paper_id}"
        resp = requests.get(url, params={'fields': 'paperId,title,authors,year,abstract,citationCount,url', 'limit': max_results}, headers={'x-api-key': api_key} if api_key else {}, timeout=10)
        if resp.status_code == 200:
            return resp.json().get('recommendedPapers', [])
    except Exception:
        pass
    return []

def find_recommended_papers(papers: List[Paper], api_key: Optional[str] = None, top_n: int = 20) -> Set[str]:
    s2_papers = [p for p in papers if p.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references'] or p.verification_source == 's2']
    if not s2_papers:
        return set()
    recommended_ids = set()
    existing_ids = {p.id for p in papers}
    top_papers = sorted(s2_papers, key=lambda p: p.citations, reverse=True)[:top_n]
    for paper in top_papers:
        for rec in get_ai2_recommendation_ids(paper.id, api_key):
            rid = rec.get('paperId')
            if rid and rid not in existing_ids:
                recommended_ids.add(rid)
        time.sleep(0.3)
    return recommended_ids

def enhance_taxonomy_with_s2(taxonomy: TaxonomyNode, papers: List[Paper]):
    papers_dict = {p.id: p for p in papers}
    def get_all_ids(n):
        ids = list(n.paper_ids)
        for c in n.children:
            ids.extend(get_all_ids(c))
        return ids
    def add_s2(n):
        pids = get_all_ids(n)
        cluster_papers = [papers_dict[pid] for pid in pids if pid in papers_dict]
        if cluster_papers:
            fc = Counter()
            for p in cluster_papers:
                for f in getattr(p, 's2_fields', []) or []:
                    fc[f] += 1
            n.s2_fields = [f for f, _ in fc.most_common(5)]
            n.total_citations = sum(p.citations for p in cluster_papers)
            n.avg_citations = n.total_citations / len(cluster_papers)
        for c in n.children:
            add_s2(c)
    add_s2(taxonomy)

def run_ai2_enhancements(papers: List[Paper], taxonomy: Optional[TaxonomyNode], api_key: Optional[str] = None) -> tuple:
    citation_graph = None
    recommended_ids = set()
    if CONFIG['AI2_ADD_S2_FIELDS']:
        papers = add_s2_fields_to_papers(papers, api_key, max_papers=CONFIG['AI2_MAX_PAPERS_FIELDS'])
    if CONFIG['AI2_BUILD_CITATION_GRAPH']:
        citation_graph = build_citation_graph(papers, api_key, max_papers=CONFIG['AI2_MAX_PAPERS_GRAPH'])
        papers = rank_papers_by_influence(papers, citation_graph)
    if CONFIG['AI2_GET_RECOMMENDATIONS']:
        recommended_ids = find_recommended_papers(papers, api_key, top_n=CONFIG['AI2_MAX_PAPERS_RECS'])
    if taxonomy:
        enhance_taxonomy_with_s2(taxonomy, papers)
    return papers, citation_graph, recommended_ids

# ============================================================================
# PHASE 4: EMBEDDINGS
# ============================================================================

def get_specter_embeddings(papers: List[Paper], api_key: str = None) -> int:
    print(f"   Fetching SPECTER 2.0 embeddings...")
    if not api_key:
        print("      ⚠️ No S2 API key")
        return 0
    id_to_paper = {}
    for p in papers:
        s2_id = None
        if p.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references']:
            s2_id = p.id
        elif p.url and 'semanticscholar.org/paper/' in p.url:
            s2_id = p.url.split('/paper/')[-1].split('?')[0]
        if s2_id:
            id_to_paper[s2_id] = p
    if not id_to_paper:
        print("      ⚠️ No S2 IDs")
        return 0
    successful = 0
    headers = {'x-api-key': api_key}
    ids_list = list(id_to_paper.keys())
    for batch_start in range(0, len(ids_list), 500):
        batch = ids_list[batch_start:batch_start + 500]
        try:
            resp = requests.post("https://api.semanticscholar.org/graph/v1/paper/batch", json={"ids": batch}, params={'fields': 'paperId,embedding.specter_v2'}, headers=headers, timeout=30)
            if resp.status_code == 200:
                results = resp.json() if isinstance(resp.json(), list) else resp.json().get('data', [])
                for r in (results or []):
                    if not r:
                        continue
                    pid = r.get('paperId')
                    emb_data = r.get('embedding')
                    if pid and emb_data and pid in id_to_paper:
                        vec = emb_data.get('vector')
                        if vec and len(vec) == 768:
                            id_to_paper[pid].specter_embedding = vec
                            id_to_paper[pid].embedding = vec
                            successful += 1
            elif resp.status_code == 429:
                time.sleep(5)
        except Exception as e:
            print(f"      ⚠️ Batch error: {e}")
        time.sleep(1)
    return successful

def generate_fallback_embeddings(papers: List[Paper]) -> int:
    print(f"   Generating fallback embeddings...")
    texts, valid = [], []
    for p in papers:
        t = f"{p.title}. {p.abstract or ''}"
        if len(t.strip()) > 20:
            texts.append(t)
            valid.append(p)
    if len(texts) < 5:
        return 0
    try:
        from sentence_transformers import SentenceTransformer
        model = None
        for name in ['sentence-transformers/all-MiniLM-L6-v2', 'sentence-transformers/all-mpnet-base-v2']:
            try:
                model = SentenceTransformer(name)
                break
            except Exception:
                continue
        if model:
            embs = model.encode(texts, show_progress_bar=False)
            for i, p in enumerate(valid):
                e = embs[i]
                p.embedding = e.tolist() if hasattr(e, 'tolist') else list(e)
            return len(valid)
    except ImportError:
        pass
    vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
    X = vectorizer.fit_transform(texts)
    n_comp = min(768, X.shape[1], len(texts))
    svd = TruncatedSVD(n_components=n_comp)
    embs = svd.fit_transform(X)
    for i, p in enumerate(valid):
        p.embedding = embs[i].tolist()
    return len(valid)

# ============================================================================
# PHASE 6: TAXONOMY
# ============================================================================

def extract_keywords(texts: List[str], top_n: int = 10) -> List[str]:
    if not texts:
        return []
    all_text = ' '.join(texts).lower()
    words = re.findall(r'\b[a-z]{4,}\b', all_text)
    wc = Counter(words)
    for sw in ['using', 'based', 'study', 'research', 'paper', 'method', 'approach', 'analysis', 'review', 'results', 'data']:
        wc.pop(sw, None)
    return [w for w, _ in wc.most_common(top_n)]

def get_node_papers(node: TaxonomyNode, papers_dict: Dict) -> List[Paper]:
    def ids(n):
        out = list(n.paper_ids)
        for c in n.children:
            out.extend(ids(c))
        return out
    return [papers_dict[pid] for pid in ids(node) if pid in papers_dict]

def generate_cluster_name(papers: List[Paper], used_names: set, parent_keywords: set, azure_client) -> str:
    if not papers:
        return "Empty Cluster"
    top = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:10]
    texts = [p.title + ' ' + (p.abstract or '')[:100] for p in top[:15]]
    keywords = extract_keywords(texts, 20)
    distinctive = [k for k in keywords if k not in parent_keywords]
    prompt = f"""Generate a concise 3-5 word name for this research cluster.
Sample papers: {chr(10).join('- ' + p.title for p in top[:8])}
Keywords: {', '.join(distinctive[:12])}
Avoid: {', '.join(parent_keywords) if parent_keywords else 'none'}
Return ONLY the cluster name."""
    name = ask_llm(azure_client, prompt, max_tokens=100)
    name = name.strip().strip('"\'.,;:!?')
    if name and 5 <= len(name) <= 80:
        return name
    return ' & '.join([k.title() for k in (distinctive[:3] or keywords[:3])]) or f"Cluster ({len(papers)} papers)"

def generate_cluster_summary(papers: List[Paper], cluster_name: str, azure_client) -> str:
    if not papers:
        return ""
    top = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:10]
    context = '\n'.join(f"- {p.title}: {(p.key_findings or p.ai_summary or (p.abstract or '')[:150])}" for p in top[:8])
    prompt = f"""Write a 2-3 paragraph summary (150-200 words) of the "{cluster_name}" research cluster.
Key papers:\n{context}\nSummary:"""
    summary = ask_llm(azure_client, prompt, max_tokens=CONFIG['MIN_TOKENS'])
    return summary if summary and len(summary) > 50 else f"This cluster has {len(papers)} papers on {cluster_name.lower()}."

def enrich_taxonomy_node(node: TaxonomyNode, papers_dict: Dict, used_names: set, parent_keywords: set, azure_client):
    if node.level == 0:
        node.name = "All Papers"
        node.summary = ""
        node.keywords = []
    else:
        node_papers = get_node_papers(node, papers_dict)
        if len(node_papers) < 1:
            node.name = f"Small Cluster ({len(node_papers)} papers)"
            node.summary = ""
            node.keywords = []
        else:
            if CONFIG['LLM_CLUSTER_NAMES']:
                try:
                    node.name = generate_cluster_name(node_papers, used_names, parent_keywords, azure_client)
                    used_names.add(node.name.lower())
                except Exception:
                    node.name = f"Cluster {node.id.split('.')[-1]}"
            else:
                node.name = f"Cluster {node.id}"
            if CONFIG['EXTRACT_CLUSTER_KEYWORDS']:
                node.keywords = extract_keywords([p.title + ' ' + (p.abstract or '')[:200] for p in node_papers[:20]], 10)
            if CONFIG['LLM_CLUSTER_SUMMARIES']:
                try:
                    node.summary = generate_cluster_summary(node_papers, node.name, azure_client)
                except Exception:
                    node.summary = ""
    for c in node.children:
        enrich_taxonomy_node(c, papers_dict, used_names, set(node.keywords), azure_client)

def count_taxonomy_nodes(node: TaxonomyNode) -> int:
    return 1 + sum(count_taxonomy_nodes(c) for c in node.children)

def recursive_cluster_node(papers: List[Paper], embeddings: np.ndarray, node_id: str, level: int, azure_client) -> TaxonomyNode:
    from sklearn.cluster import KMeans
    node = TaxonomyNode(id=node_id, name="", level=level, paper_ids=[p.id for p in papers])
    if level >= CONFIG['TAXONOMY_LEVELS']:
        return node
    min_split = CONFIG['MIN_CLUSTER_SIZE'] * 2
    if len(papers) < min_split:
        return node
    n_clusters = max(2, min(6, int(np.sqrt(len(papers)))))
    try:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=300)
        labels = kmeans.fit_predict(embeddings)
    except Exception as e:
        print(f"      ⚠️ Clustering failed: {e}")
        return node
    children_data = []
    for idx in range(n_clusters):
        mask = labels == idx
        cluster_papers = [papers[i] for i, m in enumerate(mask) if m]
        if cluster_papers:
            children_data.append({'papers': cluster_papers, 'embeddings': embeddings[mask], 'size': len(cluster_papers)})
    children_data.sort(key=lambda x: x['size'], reverse=True)
    total = len(papers)
    for i, cd in enumerate(children_data):
        cid = f"{node_id}.{i+1}"
        size = cd['size']
        should_recurse = (size / total > 0.6) or (size >= min_split)
        if should_recurse:
            child = recursive_cluster_node(cd['papers'], cd['embeddings'], cid, level + 1, azure_client)
        else:
            child = TaxonomyNode(id=cid, name="", level=level + 1, paper_ids=[p.id for p in cd['papers']])
        node.children.append(child)
    if node.children:
        node.paper_ids = []
    return node

def build_hierarchical_taxonomy(papers: List[Paper], azure_client) -> Optional[TaxonomyNode]:
    print(f"   Building hierarchical taxonomy...")
    papers_with_emb = [p for p in papers if p.embedding]
    if len(papers_with_emb) < CONFIG['MIN_CLUSTER_SIZE']:
        print(f"      ⚠️ Not enough papers with embeddings")
        return None
    valid_papers, valid_embs = [], []
    first = np.array(papers_with_emb[0].embedding)
    dim = first.shape[0]
    for p in papers_with_emb:
        emb = np.array(p.embedding) if isinstance(p.embedding, list) else p.embedding
        if emb is not None and len(emb.shape) == 1 and emb.shape[0] == dim:
            valid_papers.append(p)
            valid_embs.append(emb)
    if len(valid_papers) < CONFIG['MIN_CLUSTER_SIZE']:
        return None
    embeddings = np.vstack(valid_embs)
    root = recursive_cluster_node(valid_papers, embeddings, "root", 0, azure_client)
    papers_dict = {p.id: p for p in papers}
    enrich_taxonomy_node(root, papers_dict, set(), set(), azure_client)
    print(f"   Taxonomy: {count_taxonomy_nodes(root)} nodes, {len(valid_papers)} papers")
    return root

# ============================================================================
# OUTPUT: hierarchy.json
# ============================================================================

def taxonomy_to_hierarchy_dict(node: TaxonomyNode, papers: List[Paper]) -> dict:
    """Convert taxonomy to JSON-serializable hierarchy for hierarchy.json"""
    papers_dict = {p.id: p for p in papers}
    def to_dict(n):
        out = {
            'id': n.id,
            'name': n.name,
            'level': n.level,
            'paper_count': len(n.paper_ids),
            'summary': n.summary or '',
            'keywords': (n.keywords or [])[:10],
            's2_fields': (getattr(n, 's2_fields', None) or [])[:5],
            'children': []
        }
        if n.children:
            out['children'] = [to_dict(c) for c in n.children]
        else:
            out['papers'] = []
            for pid in n.paper_ids:
                if pid in papers_dict:
                    p = papers_dict[pid]
                    out['papers'].append({
                        'id': p.id,
                        'title': p.title,
                        'authors': getattr(p, 'authors', []) or [],
                        'year': p.year,
                        'abstract': (p.abstract or '')[:2000] if getattr(p, 'abstract', None) else '',
                        'venue': getattr(p, 'venue', '') or '',
                        'citations': getattr(p, 'citations', 0) or 0,
                        'influential_citations': getattr(p, 'influential_citations', 0) or 0,
                        'url': p.url,
                        'pdf_url': getattr(p, 'pdf_url', None),
                        'doi': getattr(p, 'doi', None),
                        'tldr': getattr(p, 'tldr', None),
                        'source': getattr(p, 'source', '') or '',
                    })
        return out
    return to_dict(node)

def write_hierarchy_json(taxonomy: TaxonomyNode, papers: List[Paper], output_dir: str) -> str:
    """Write hierarchy.json to output_dir. Returns path to file."""
    path = os.path.join(output_dir, 'hierarchy.json')
    data = taxonomy_to_hierarchy_dict(taxonomy, papers)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"   Written: {os.path.basename(path)}")
    return path

# ============================================================================
# PIPELINE ENTRY POINT
# ============================================================================

def run_pipeline(topic: str, output_dir: str = None) -> dict:
    """Run the full paper discovery + taxonomy pipeline for a given topic.

    Args:
        topic: The research topic to search for.
        output_dir: Directory to write hierarchy.json to. If None, creates one
                    automatically based on topic and timestamp.

    Returns:
        The hierarchy dict (JSON-serializable), or None if taxonomy could not be built.
    """
    CONFIG["TOPIC"] = topic
    if output_dir is None:
        output_dir = os.path.join(os.getcwd(), f"results_{topic.replace(' ', '_')}_{int(time.time())}")
    CONFIG["OUTPUT_DIR"] = output_dir
    os.makedirs(CONFIG["OUTPUT_DIR"], exist_ok=True)
    print(f"Output: JSON")

    azure_client = AzureOpenAI(
        api_key=CONFIG["AZURE_KEY"],
        api_version=CONFIG["AZURE_API_VERSION"],
        azure_endpoint=CONFIG["AZURE_ENDPOINT"]
    )

    t_pipeline = time.time()

    # ---- PHASE 1: PAPER DISCOVERY ----
    print(f"Phase 1: Paper Discovery")
    t_phase = time.time()
    queries = generate_diverse_queries(CONFIG['TOPIC'], azure_client, CONFIG['NUM_SEARCH_QUERIES'])
    all_papers = []
    if CONFIG['ARXIV_PER_QUERY'] > 0:
        for q in queries:
            all_papers.extend(search_arxiv(q, CONFIG['ARXIV_PER_QUERY']))
            time.sleep(0.3)
    if CONFIG['S2_PER_QUERY'] > 0:
        for q in queries:
            all_papers.extend(search_semantic_scholar(q, CONFIG['S2_PER_QUERY'], CONFIG['S2_API_KEY']))
            time.sleep(0.5)
    papers = deduplicate_papers(all_papers)
    expanded = expand_via_s2_graph(papers, CONFIG['S2_API_KEY'])
    if expanded:
        all_papers.extend(expanded)
        papers = deduplicate_papers(all_papers)
    print(f"   Found {len(papers)} papers  [Phase 1: {time.time() - t_phase:.1f}s]")

    # ---- PHASE 2.7: AI2 ENHANCEMENTS ----
    print(f"Phase 2: AI2 Enhancements")
    t_phase = time.time()
    if CONFIG.get('USE_AI2_ENHANCEMENTS', True):
        try:
            papers, _, _ = run_ai2_enhancements(papers, None, api_key=CONFIG.get('S2_API_KEY'))
        except Exception as e:
            print(f"   ⚠️ AI2 enhancements failed: {e}")
    print(f"   [Phase 2: {time.time() - t_phase:.1f}s]")

    # ---- PHASE 4: EMBEDDINGS ----
    print(f"Phase 3: Embeddings")
    t_phase = time.time()
    if CONFIG['USE_SPECTER']:
        n_specter = get_specter_embeddings(papers, CONFIG['S2_API_KEY'])
        papers_without = [p for p in papers if not p.embedding]
        if papers_without:
            generate_fallback_embeddings(papers_without)
    else:
        generate_fallback_embeddings(papers)
    n_emb = sum(1 for p in papers if p.embedding)
    print(f"   Embedded {n_emb}/{len(papers)} papers  [Phase 3: {time.time() - t_phase:.1f}s]")

    # ---- PHASE 6: TAXONOMY ----
    print(f"Phase 4: Taxonomy")
    t_phase = time.time()
    taxonomy = build_hierarchical_taxonomy(papers, azure_client)
    if taxonomy and CONFIG.get('USE_AI2_ENHANCEMENTS', True):
        try:
            enhance_taxonomy_with_s2(taxonomy, papers)
        except Exception as e:
            print(f"   ⚠️ Enhance taxonomy S2: {e}")
    print(f"   [Phase 4: {time.time() - t_phase:.1f}s]")

    # ---- OUTPUT: hierarchy.json ----
    if taxonomy:
        write_hierarchy_json(taxonomy, papers, CONFIG['OUTPUT_DIR'])
        hierarchy_data = taxonomy_to_hierarchy_dict(taxonomy, papers)
        print(f"Done!  [Total: {time.time() - t_pipeline:.1f}s]")
        return hierarchy_data
    else:
        print("\n   ⚠️ No taxonomy built; hierarchy.json not written.")
        return None


# ============================================================================
# MAIN
# ============================================================================

def main():
    import sys
    if len(sys.argv) > 1:
        topic = sys.argv[1]
    else:
        topic = input("Enter research topic: ").strip() or "machine learning applications"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    run_pipeline(topic, output_dir)

if __name__ == "__main__":
    main()
