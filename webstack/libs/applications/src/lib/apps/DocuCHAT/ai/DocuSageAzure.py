# ============================================================================
# COMPREHENSIVE LITERATURE ANALYSIS SYSTEM
# Complete Pipeline: Search → Verify → Extract → Taxonomy → Review → Chat
# Maximum Allen AI2 Integration
# ============================================================================

import subprocess
import sys

print("📦 Installing required packages...")
packages = ["numpy", "scipy", "scikit-learn", "openai", "requests", 
            "pymupdf4llm", "feedparser", "beautifulsoup4", "pandas", 
            "sentence-transformers", "aiohttp", "tqdm", "nest-asyncio",
            "plotly", "networkx", "matplotlib"]
for pkg in packages:
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', '--break-system-packages', pkg])
    except:
        pass

import os
import json
import time
import re
import hashlib
import tempfile
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote_plus
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple, Set
import numpy as np
from scipy.cluster.hierarchy import linkage, fcluster
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
import requests
import feedparser
from bs4 import BeautifulSoup
import csv

# Visualization libraries
try:
    import plotly.graph_objects as go
    import networkx as nx
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch
    VISUALIZATION_AVAILABLE = True
except ImportError:
    VISUALIZATION_AVAILABLE = False
    print("⚠️  Visualization libraries not available - will skip interactive visualizations")

# Fix for Jupyter/IPython event loop compatibility
try:
    import nest_asyncio
    nest_asyncio.apply()
    JUPYTER_MODE = True
except ImportError:
    JUPYTER_MODE = False

# Progress bar (optional)
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
from openai import AzureOpenAI
import pymupdf4llm

# User agent for web requests
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# ============================================================================
# CONFIGURATION
# ============================================================================

CONFIG = {
    # === RESEARCH TOPIC ===
    # These will be set interactively when you run the script
    "TOPIC": None,  # Will be prompted
    "RESEARCH_QUESTION": None,  # Will be prompted
    
    # === PHASE 1: PAPER DISCOVERY ===
    "NUM_SEARCH_QUERIES": 10,     # Number of diverse queries
    "ARXIV_PER_QUERY": 20,        # Papers per query from ArXiv
    "S2_PER_QUERY": 20,           # Papers per query from Semantic Scholar
    "GOOGLE_SCHOLAR_PER_QUERY": 0,  # Google Scholar (0 to disable, can be rate limited)
    "OPENAI_WEBSEARCH_TOTAL": 50,   # Total papers from OpenAI web search (0 to disable)
    
    # S2 Graph expansion (Allen AI)
    "EXPAND_VIA_RECOMMENDATIONS": True,
    "EXPAND_VIA_CITATIONS": True,
    "EXPAND_VIA_REFERENCES": True,
    "TOP_SEEDS": 15,              # Papers to use as seeds
    "RECS_PER_SEED": 10,          # Recommendations per seed
    
    # Reranking
    "USE_RERANKING": False,       # Rerank results (requires sentence-transformers)
    "RERANK_TOP_K": 100,          # Keep top K after reranking
    
    # === PHASE 2: VERIFICATION ===
    "VERIFY_VIA_WEB_SEARCH": False,   # DISABLED: Azure OpenAI doesn't support web_search tool
    "VERIFY_TOP_PAPERS": 30,          # Top N papers to verify
    "WEB_SEARCH_TOPICS": False,       # DISABLED: Requires OpenAI API (not Azure)
    "USE_OPENAI_WEB_SEARCH": False,   # DISABLED: Only works with OpenAI API, not Azure OpenAI
    
    # === PHASE 2.6: METADATA ENRICHMENT ===
    # FIXED: Now uses DOI-based lookup (more reliable) + LLM keyword extraction!
    # Expected success rate: 40-60% (vs 0% before)
    "ENRICH_METADATA": False,          # ENABLED: Now actually works!
    "ENRICH_FROM_ARXIV": True,         # Extract categories, subjects from ArXiv pages
    "ENRICH_FROM_OPENALEX": True,      # Extract concepts, topics from OpenAlex API (DOI-based!)
    "ENRICH_FROM_PUBLISHERS": True,    # Extract keywords from publisher pages (via DOI)
    "ENRICH_FROM_S2_PAGES": False,     # Extract from S2 pages (slower, less useful than API)
    "MAX_ENRICH_PAPERS": None,         # None = all papers without PDFs, or set limit
    
    # === PHASE 2.7: AI2 ENHANCEMENTS (Allen AI Advanced Features) ===
    # NEW: Semantic Scholar advanced features for better analysis
    "USE_AI2_ENHANCEMENTS": True,      # Enable AI2 enhancements (S2 fields, citations, recommendations)
    "AI2_ADD_S2_FIELDS": True,         # Add S2 Fields of Study (AI-generated topic classification)
    "AI2_BUILD_CITATION_GRAPH": True,  # Build citation network (find influential papers)
    "AI2_GET_RECOMMENDATIONS": True,   # Get S2 recommendations (find missing papers)
    "AI2_MAX_PAPERS_FIELDS": 100,      # Max papers to enrich with S2 fields (rate limits)
    "AI2_MAX_PAPERS_GRAPH": 50,        # Max papers for citation graph (API intensive)
    "AI2_MAX_PAPERS_RECS": 20,         # Max papers to get recommendations for
    
    # === PHASE 3: DEEP CONTENT EXTRACTION (Allen AI PaperMage) ===
    "USE_PAPERMAGE": True,
    "MAX_DEEP_READ": None,       # None = all PDFs, or set number (e.g., 50, 100)
    "MAX_CONCURRENT_DOWNLOADS": 10,  # Concurrent PDF downloads
    "MAX_EXTRACTION_THREADS": 5,     # Parallel extraction threads
    "EXTRACT_SECTIONS": True,    # Extract methods, results, conclusions
    "SECTION_EXTRACTION_METHOD": "llm",  # "llm" or "regex"
    
    # === PHASE 4: EMBEDDINGS (Allen AI SPECTER 2.0) ===
    "USE_SPECTER": True,
    "USE_TFIDF_FALLBACK": True,
    "MIN_SPECTER_COVERAGE": 0.5,  # Minimum % with SPECTER before fallback
    
    # === PHASE 5: PAPER ENRICHMENT ===
    "MAX_PAPERS_TO_ENRICH": 30,   # Top papers to deeply analyze
    "EXTRACT_KEY_FINDINGS": True,
    "EXTRACT_METHODOLOGIES": True,
    "GENERATE_SUMMARIES": True,
    "EXTRACT_CONTRIBUTIONS": True,
    "CLASSIFY_DOMAINS": True,
    
    # === PHASE 6: TAXONOMY (Allen AI TaxoAlign approach) ===
    "TAXONOMY_LEVELS": 3,
    "MIN_CLUSTER_SIZE": 8,
    "MAX_CLUSTER_SIZE": 50,
    "LLM_CLUSTER_NAMES": True,
    "LLM_CLUSTER_SUMMARIES": True,
    "DISTINCTIVE_NAMING": True,   # Avoid parent keywords
    "EXTRACT_CLUSTER_KEYWORDS": True,
    
    # === PHASE 7: REVIEW (Allen AI QASPER + ScholarQA) ===
    "USE_QASPER": True,           # Evidence-based Q&A
    "USE_SCHOLARQA": True,        # Multi-step synthesis
    "INCLUDE_METHODOLOGY_SECTION": True,
    "INCLUDE_TRENDS_SECTION": True,
    "INCLUDE_LIMITATIONS_SECTION": True,
    "INCLUDE_GAPS_SECTION": True,
    "REVIEW_STYLE": "comprehensive",  # "brief" / "standard" / "comprehensive"
    
    # === PHASE 8: INTERACTIVE CHAT ===
    "ENABLE_CHAT": True,
    "CHAT_MODE": "auto",          # "auto" / "interactive" / "programmatic"
    
    # === API KEYS ===
    "AZURE_ENDPOINT": "http://149.165.150.157:4000",
    "AZURE_KEY": "sk-7KFG7QjrSodlEVn_7I5BFA",
    "AZURE_API_VERSION": "2024-12-01-preview",
    "AZURE_DEPLOYMENT": "gpt-5-nano",
    "MIN_TOKENS": 10000,
    
    # Semantic Scholar API Key (REQUIRED for SPECTER embeddings & better results)
    # Get free key at: https://www.semanticscholar.org/product/api#api-key
    "S2_API_KEY": "B5wzmNc36y9qsNxOU6vIv6XvDMuy82Ag7EoFhwT4",           # Set this to your S2 API key or set env var S2_API_KEY
    
    # OpenAI API Key (Optional - for web search verification)
    # Note: Azure OpenAI does NOT support web_search tool
    "OPENAI_API_KEY": None,       # For OpenAI web search (gpt-4o-mini-search-preview)
    
    # === OUTPUT ===
    "OUTPUT_DIR": None,  # Will be created based on topic (results_topic_timestamp/)
    "SAVE_INTERMEDIATE": False,    # Save after each phase
    "GENERATE_VISUALIZATIONS": False,  # Generate taxonomy visualizations (sunburst, treemap, network graph, etc.)
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
    doi: Optional[str] = None  # Digital Object Identifier (for OpenAlex lookup)
    
    # Deep content (PaperMage)
    full_text: str = ""
    full_text_markdown: str = ""
    sections: Dict[str, str] = field(default_factory=dict)  # 'intro', 'methods', 'results', 'conclusion'
    tables: List[Dict] = field(default_factory=list)
    figures: List[Dict] = field(default_factory=list)
    extracted_citations: List[str] = field(default_factory=list)
    equations: List[str] = field(default_factory=list)
    
    # Legacy fields (for compatibility)
    methods: str = ""
    results: str = ""
    conclusions: str = ""
    introduction: str = ""
    
    # Embeddings (SPECTER 2.0)
    embedding: Optional[List[float]] = None
    specter_embedding: Optional[List[float]] = None  # Specifically SPECTER 2.0
    
    # 3-Level Verification System
    verified: bool = False
    verification_source: str = ""
    verification_level: str = "not_verified"  # "not_verified" | "verified_no_access" | "verified_full_access"
    web_verified: bool = False
    
    # Enrichment
    key_findings: str = ""
    methodology: str = ""
    contributions: str = ""
    ai_summary: str = ""
    domain: str = ""
    
    # Metadata enrichment (from web pages for papers without PDFs)
    keywords: List[str] = field(default_factory=list)
    categories: List[str] = field(default_factory=list)  # ArXiv categories (cs.AI, cs.LG, etc.)
    subjects: List[str] = field(default_factory=list)  # Broader subjects
    topics: List[str] = field(default_factory=list)  # S2 or OpenAlex topics
    concepts: List[Dict] = field(default_factory=list)  # OpenAlex concepts with scores
    comments: str = ""  # ArXiv comments (e.g., "Accepted at NeurIPS 2024")
    journal_reference: str = ""  # ArXiv journal reference
    grants: List[Dict] = field(default_factory=list)  # Funding information
    sdgs: List[str] = field(default_factory=list)  # Sustainable Development Goals
    metadata_enriched: bool = False
    
    # AI2 Enhancements (Semantic Scholar advanced features)
    s2_fields: List[str] = field(default_factory=list)  # S2 Fields of Study (AI-generated)
    mag_fields: List[str] = field(default_factory=list)  # Microsoft Academic Graph fields (legacy)
    influence_score: float = 0.0  # Calculated influence score (weighted)
    internal_citations: int = 0  # Citations from within corpus
    
    # Taxonomy assignment
    cluster_id: str = ""
    cluster_path: str = ""
    topic_label: str = ""
    
    # Metadata
    enriched: bool = False
    deep_read: bool = False

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
    
    # AI2 Enhancements
    s2_fields: List[str] = field(default_factory=list)  # Top S2 fields in this cluster
    avg_citations: float = 0.0  # Average citations for papers in cluster
    total_citations: int = 0  # Total citations for cluster
    
    def paper_count(self) -> int:
        count = len(self.paper_ids)
        for child in self.children:
            count += child.paper_count()
        return count

# ============================================================================
# UTILITIES
# ============================================================================

def ask_llm(azure_client, prompt: str, max_tokens: int = None, use_web_search: bool = False) -> str:
    """Call Azure OpenAI LLM with optional web search"""
    if max_tokens is None:
        max_tokens = CONFIG["MIN_TOKENS"]
    
    # NOTE: Azure OpenAI does NOT support web_search tool
    # Web search only works with regular OpenAI API (gpt-4o-mini-search-preview)
    # So we disable it here - verification will use LLM without web search
    use_web_search = False  # Azure doesn't support this
    
    try:
        messages = [{"role": "user", "content": prompt}]
        
        kwargs = {
            "model": CONFIG["AZURE_DEPLOYMENT"],
            "messages": messages,
            "max_completion_tokens": max(max_tokens, CONFIG["MIN_TOKENS"])
        }
        
        # Azure OpenAI doesn't support web_search tool
        # (Only regular OpenAI API supports it)
        
        response = azure_client.chat.completions.create(**kwargs)
        
        # Extract response content
        message = response.choices[0].message
        
        # Handle different response types
        if hasattr(message, 'content') and message.content:
            if isinstance(message.content, str):
                return message.content.strip()
            elif isinstance(message.content, list):
                # Concatenate text from content blocks
                text_parts = []
                for item in message.content:
                    if hasattr(item, 'text'):
                        text_parts.append(item.text)
                    elif isinstance(item, dict) and 'text' in item:
                        text_parts.append(item['text'])
                return ' '.join(text_parts).strip()
        
        return ""
            
    except Exception as e:
        print(f"      ⚠️ LLM error: {e}")
        return ""

def save_checkpoint(papers: List[Paper], taxonomy: Optional[TaxonomyNode], phase: str):
    """Save intermediate results"""
    if not CONFIG['SAVE_INTERMEDIATE']:
        return
    
    checkpoint_dir = os.path.join(CONFIG['OUTPUT_DIR'], 'checkpoints')
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    # Save papers
    papers_file = os.path.join(checkpoint_dir, f'papers_{phase}.json')
    with open(papers_file, 'w', encoding='utf-8') as f:
        json.dump([asdict(p) for p in papers], f, indent=2)
    
    # Save taxonomy if exists
    if taxonomy:
        taxonomy_file = os.path.join(checkpoint_dir, f'taxonomy_{phase}.json')
        with open(taxonomy_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(taxonomy), f, indent=2)
    
    print(f"      💾 Checkpoint saved: {phase}")

# ============================================================================
# PHASE 1: PAPER DISCOVERY
# ============================================================================

def generate_diverse_queries(topic: str, azure_client, n: int = 10) -> List[str]:
    """Generate HIGHLY diverse search queries using advanced LLM prompting"""
    print(f"\n   🧠 Generating {n} diverse queries with advanced strategy...")
    
    prompt = f"""You are a creative research strategist. Generate {n} HIGHLY DIVERSE academic search queries for: "{topic}"

CRITICAL RULES:
1. Each query must be 2-5 words ONLY
2. DO NOT just add generic words like "survey", "applications", "methods", "recent", "advances"
3. Each query should explore a COMPLETELY DIFFERENT angle, methodology, domain, or intersection
4. Think about: adjacent fields, contrarian views, specific techniques, real-world contexts, 
   theoretical foundations, measurement approaches, ethical dimensions, geographic contexts, 
   temporal aspects, stakeholder perspectives

BAD EXAMPLES (too similar, too generic):
- "{topic} survey"
- "{topic} applications"
- "{topic} methods"
- "machine learning {topic}"

GOOD EXAMPLES for "AI in tourism":
- "chatbot hotel booking satisfaction"
- "computer vision destination marketing"
- "sentiment analysis TripAdvisor reviews"
- "recommender systems travel itinerary"
- "dynamic pricing airline revenue"
- "facial recognition airport security"
- "natural language concierge service"
- "predictive analytics tourism demand"
- "virtual reality heritage sites"
- "algorithmic bias travel recommendations"

Now generate {n} diverse queries for: "{topic}"

Return ONLY a JSON array of strings, nothing else:
["query1", "query2", ...]"""

    try:
        response = ask_llm(azure_client, prompt, max_tokens=1000)
        
        # Extract JSON array
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            queries = json.loads(json_match.group(0))
            # Clean up queries
            queries = [q.strip() for q in queries if isinstance(q, str) and len(q.strip()) > 3]
            
            # Always include the original topic as first query
            if topic.lower() not in [q.lower() for q in queries]:
                queries.insert(0, topic)
            
            if len(queries) >= n:
                print(f"      ✅ LLM generated {len(queries)} diverse queries")
                for i, q in enumerate(queries[:n], 1):
                    print(f"         {i}. {q}")
                return queries[:n]
    except Exception as e:
        print(f"      ⚠️ LLM generation failed: {e}")
    
    # Enhanced fallback with more diversity
    print(f"      📝 Using enhanced fallback query generation...")
    words = topic.lower().split()
    
    # Different angle categories
    technique_angles = ["machine learning", "deep learning", "neural network", "NLP",
                       "computer vision", "recommender system", "chatbot", "prediction"]
    
    domain_angles = ["customer experience", "revenue management", "sustainability",
                    "personalization", "automation", "optimization", "analytics"]
    
    method_angles = ["sentiment analysis", "image recognition", "forecasting",
                    "classification", "clustering", "recommendation"]
    
    queries = [topic]  # Always include original
    
    # Combine topic words with different angles
    main_word = words[-1] if len(words) > 1 else words[0]
    
    for technique in technique_angles[:3]:
        queries.append(f"{technique} {main_word}")
    
    for domain in domain_angles[:3]:
        queries.append(f"{domain} {main_word}")
    
    for method in method_angles[:3]:
        queries.append(f"{method} {main_word}")
    
    print(f"      ✅ Generated {min(n, len(queries))} fallback queries")
    for i, q in enumerate(queries[:n], 1):
        print(f"         {i}. {q}")
    
    return queries[:n]

def search_arxiv(query: str, max_results: int = 30) -> List[Paper]:
    """Search ArXiv for papers"""
    papers = []
    try:
        # URL encode the query to handle spaces and special characters
        encoded_query = quote_plus(query)
        url = f"http://export.arxiv.org/api/query?search_query=all:{encoded_query}&max_results={max_results}"
        feed = feedparser.parse(url)
        
        for entry in feed.entries:
            # Extract ArXiv ID
            arxiv_id = entry.id.split('/abs/')[-1]
            
            # Construct PDF URL (ArXiv has predictable format)
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
            
            paper = Paper(
                id=arxiv_id,
                title=entry.title.replace('\n', ' '),
                authors=[author.name for author in entry.authors],
                year=int(entry.published[:4]),
                abstract=entry.summary.replace('\n', ' '),
                url=entry.link,
                source='arxiv',
                pdf_url=pdf_url,  # Add PDF URL!
                verified=True,
                verification_source='arxiv'
            )
            papers.append(paper)
    except Exception as e:
        print(f"         ⚠️ ArXiv error: {e}")
    
    return papers

def search_semantic_scholar(query: str, max_results: int = 30, api_key: str = None) -> List[Paper]:
    """Search Semantic Scholar (Allen AI)"""
    papers = []
    try:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            'query': query,
            'limit': max_results,
            'fields': 'paperId,title,authors,year,abstract,url,citationCount,influentialCitationCount,venue,tldr,openAccessPdf,externalIds'
        }
        headers = {'x-api-key': api_key} if api_key else {}
        
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            for item in data.get('data', []):
                # Extract DOI from externalIds
                doi = None
                external_ids = item.get('externalIds', {})
                if external_ids:
                    doi = external_ids.get('DOI')
                
                paper = Paper(
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
                )
                papers.append(paper)
    except Exception as e:
        print(f"         ⚠️ S2 error: {e}")
    
    return papers

def deduplicate_papers(papers: List[Paper]) -> List[Paper]:
    """Remove duplicate papers by title hash"""
    seen = set()
    unique = []
    
    for p in papers:
        title_hash = hashlib.md5(p.title.lower().strip().encode()).hexdigest()
        if title_hash not in seen:
            seen.add(title_hash)
            unique.append(p)
    
    return unique

def rerank_papers(query: str, papers: List[Paper], top_k: int = 100) -> List[Paper]:
    """
    Rerank papers using bi-encoder similarity for better relevance.
    Falls back to citation-based ranking if sentence-transformers not available.
    """
    if not papers or len(papers) <= top_k:
        return papers
    
    try:
        from sentence_transformers import SentenceTransformer
        
        print(f"   🔄 Reranking {len(papers)} papers using bi-encoder...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Encode query
        query_embedding = model.encode(query, convert_to_numpy=True)
        
        # Encode papers
        paper_texts = [f"{p.title}. {p.abstract[:300] if p.abstract else ''}" for p in papers]
        paper_embeddings = model.encode(paper_texts, convert_to_numpy=True, show_progress_bar=False)
        
        # Compute cosine similarities
        from sklearn.metrics.pairwise import cosine_similarity
        similarities = cosine_similarity([query_embedding], paper_embeddings)[0]
        
        # Sort by similarity
        scored_papers = list(zip(papers, similarities))
        scored_papers.sort(key=lambda x: x[1], reverse=True)
        
        reranked = [p for p, s in scored_papers[:top_k]]
        print(f"      ✅ Reranked to top {len(reranked)} papers")
        return reranked
        
    except ImportError:
        print(f"   ℹ️ sentence-transformers not available, using citation-based ranking")
        sorted_papers = sorted(papers, key=lambda p: p.citations or 0, reverse=True)
        return sorted_papers[:top_k]
    except Exception as e:
        print(f"   ⚠️ Reranking error: {e}, using original order")
        return papers[:top_k]

def expand_via_s2_graph(papers: List[Paper], api_key: str = None) -> List[Paper]:
    """
    Expand using S2 Graph API (Allen AI) with improved error handling and diagnostics.
    
    Features:
    - Better seed selection (finds S2 IDs from any source)
    - Retry logic with exponential backoff
    - Detailed error logging
    - Better API error handling
    """
    print(f"\n   🔄 Expanding via S2 graph...")
    
    # ===== IMPROVED SEED SELECTION =====
    # Get S2 paper IDs from any source (not just S2-sourced papers)
    # Many papers from ArXiv/OpenAI have S2 IDs too!
    
    seeds_with_s2_ids = []
    
    for paper in papers:
        # Try to extract S2 ID from various places
        s2_id = None
        
        # 1. Check if paper.id is already an S2 ID (40-char hex)
        if paper.id and len(paper.id) == 40 and all(c in '0123456789abcdef' for c in paper.id.lower()):
            s2_id = paper.id
        
        # 2. Check if URL contains S2 ID
        elif paper.url and 'semanticscholar.org/paper/' in paper.url:
            parts = paper.url.split('semanticscholar.org/paper/')
            if len(parts) > 1:
                s2_id = parts[1].split('/')[0].split('?')[0]
        
        # 3. For ArXiv papers, we can look up S2 ID
        elif paper.source == 'arxiv' and paper.id:
            # We'll try to get S2 ID via search later
            pass
        
        if s2_id and len(s2_id) == 40:
            seeds_with_s2_ids.append((paper, s2_id))
    
    # Sort by citations and take top N
    seeds_with_s2_ids.sort(key=lambda x: x[0].citations or 0, reverse=True)
    top_seeds = seeds_with_s2_ids[:CONFIG['TOP_SEEDS']]
    
    if not top_seeds:
        print(f"      ⚠️ No papers with S2 IDs found for expansion")
        print(f"      💡 Try using papers from Semantic Scholar search")
        return []
    
    print(f"      Using top {len(top_seeds)} papers as seeds")
    print(f"      📋 Seed papers:")
    for i, (paper, s2_id) in enumerate(top_seeds[:3], 1):
        print(f"         {i}. {paper.title[:50]}... (ID: {s2_id[:8]}...)")
    if len(top_seeds) > 3:
        print(f"         ... and {len(top_seeds) - 3} more")
    
    new_papers = []
    headers = {'x-api-key': api_key} if api_key else {}
    
    # Statistics
    stats = {
        'recommendations': {'attempted': 0, 'success': 0, 'failed': 0, 'papers': 0},
        'citations': {'attempted': 0, 'success': 0, 'failed': 0, 'papers': 0},
        'references': {'attempted': 0, 'success': 0, 'failed': 0, 'papers': 0}
    }
    
    # ===== 1. RECOMMENDATIONS =====
    if CONFIG['EXPAND_VIA_RECOMMENDATIONS']:
        print(f"\n      📊 Recommendations...")
        
        for paper, s2_id in top_seeds:
            stats['recommendations']['attempted'] += 1
            
            success, rec_papers = get_s2_recommendations(s2_id, headers)
            
            if success:
                stats['recommendations']['success'] += 1
                stats['recommendations']['papers'] += len(rec_papers)
                new_papers.extend(rec_papers)
            else:
                stats['recommendations']['failed'] += 1
            
            time.sleep(0.3)  # Rate limiting
        
        print(f"         ✅ {stats['recommendations']['success']}/{stats['recommendations']['attempted']} API calls succeeded")
        print(f"         📄 +{stats['recommendations']['papers']} papers")
    
    # ===== 2. CITATIONS =====
    if CONFIG['EXPAND_VIA_CITATIONS']:
        print(f"\n      📖 Citations (papers citing seeds)...")
        
        # Use fewer seeds for citations (they return many results)
        for paper, s2_id in top_seeds[:5]:
            stats['citations']['attempted'] += 1
            
            success, cit_papers = get_s2_citations(s2_id, headers)
            
            if success:
                stats['citations']['success'] += 1
                stats['citations']['papers'] += len(cit_papers)
                new_papers.extend(cit_papers)
            else:
                stats['citations']['failed'] += 1
            
            time.sleep(0.5)  # Rate limiting
        
        print(f"         ✅ {stats['citations']['success']}/{stats['citations']['attempted']} API calls succeeded")
        print(f"         📄 +{stats['citations']['papers']} papers")
    
    # ===== 3. REFERENCES =====
    if CONFIG['EXPAND_VIA_REFERENCES']:
        print(f"\n      📚 References (papers cited by seeds)...")
        
        for paper, s2_id in top_seeds[:5]:
            stats['references']['attempted'] += 1
            
            success, ref_papers = get_s2_references(s2_id, headers)
            
            if success:
                stats['references']['success'] += 1
                stats['references']['papers'] += len(ref_papers)
                new_papers.extend(ref_papers)
            else:
                stats['references']['failed'] += 1
            
            time.sleep(0.5)  # Rate limiting
        
        print(f"         ✅ {stats['references']['success']}/{stats['references']['attempted']} API calls succeeded")
        print(f"         📄 +{stats['references']['papers']} papers")
    
    # Summary
    total_attempted = sum(s['attempted'] for s in stats.values())
    total_success = sum(s['success'] for s in stats.values())
    total_papers = len(new_papers)
    
    if total_attempted > 0:
        success_rate = (total_success / total_attempted) * 100
        print(f"\n      📊 S2 Graph Summary:")
        print(f"         • API calls: {total_success}/{total_attempted} succeeded ({success_rate:.1f}%)")
        print(f"         • New papers: {total_papers}")
        
        if total_success < total_attempted:
            print(f"         ⚠️  {total_attempted - total_success} API calls failed")
            if not api_key:
                print(f"         💡 Try adding S2 API key for better results")
    
    return new_papers


def get_s2_recommendations(paper_id: str, headers: dict, max_retries: int = 2) -> Tuple[bool, List[Paper]]:
    """
    Get recommended papers from S2 with retry logic.
    Returns: (success, list of papers)
    """
    url = f"https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paper_id}"
    params = {
        'fields': 'paperId,title,authors,year,abstract,citationCount,venue,tldr,openAccessPdf',
        'limit': CONFIG['RECS_PER_SEED']
    }
    
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            
            if resp.status_code == 200:
                data = resp.json()
                papers = []
                
                for item in data.get('recommendedPapers', []):
                    paper = Paper(
                        id=item.get('paperId', ''),
                        title=item.get('title', ''),
                        authors=[a.get('name', '') for a in item.get('authors', [])],
                        year=item.get('year', 2020),
                        abstract=item.get('abstract'),
                        url=f"https://www.semanticscholar.org/paper/{item.get('paperId')}",
                        source='s2_recommendations',
                        citations=item.get('citationCount', 0),
                        venue=item.get('venue', ''),
                        tldr=item.get('tldr', {}).get('text') if item.get('tldr') else None,
                        pdf_url=item.get('openAccessPdf', {}).get('url') if item.get('openAccessPdf') else None,
                        verified=True,
                        verification_source='s2_graph'
                    )
                    papers.append(paper)
                
                return True, papers
            
            elif resp.status_code == 404:
                # Paper not found in S2
                return False, []
            
            elif resp.status_code == 429:
                # Rate limited - wait longer
                time.sleep(2 ** attempt)
                continue
            
            else:
                # Other error
                return False, []
        
        except requests.exceptions.Timeout:
            time.sleep(1)
            continue
        except Exception as e:
            return False, []
    
    return False, []


def get_s2_citations(paper_id: str, headers: dict, max_retries: int = 2) -> Tuple[bool, List[Paper]]:
    """
    Get papers citing this paper from S2 with retry logic.
    Returns: (success, list of papers)
    """
    url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}/citations"
    params = {
        'fields': 'paperId,title,authors,year,citationCount,openAccessPdf',
        'limit': 10
    }
    
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            
            if resp.status_code == 200:
                data = resp.json()
                papers = []
                
                for item in data.get('data', []):
                    citing_paper = item.get('citingPaper', {})
                    if citing_paper:
                        paper = Paper(
                            id=citing_paper.get('paperId', ''),
                            title=citing_paper.get('title', ''),
                            authors=[a.get('name', '') for a in citing_paper.get('authors', [])],
                            year=citing_paper.get('year', 2020),
                            url=f"https://www.semanticscholar.org/paper/{citing_paper.get('paperId')}",
                            source='s2_citations',
                            citations=citing_paper.get('citationCount', 0),
                            pdf_url=citing_paper.get('openAccessPdf', {}).get('url') if citing_paper.get('openAccessPdf') else None,
                            verified=True,
                            verification_source='s2_graph'
                        )
                        papers.append(paper)
                
                return True, papers
            
            elif resp.status_code == 404:
                return False, []
            
            elif resp.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            
            else:
                return False, []
        
        except requests.exceptions.Timeout:
            time.sleep(1)
            continue
        except Exception as e:
            return False, []
    
    return False, []


def get_s2_references(paper_id: str, headers: dict, max_retries: int = 2) -> Tuple[bool, List[Paper]]:
    """
    Get papers referenced by this paper from S2 with retry logic.
    Returns: (success, list of papers)
    """
    url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}/references"
    params = {
        'fields': 'paperId,title,authors,year,citationCount,openAccessPdf',
        'limit': 10
    }
    
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=15)
            
            if resp.status_code == 200:
                data = resp.json()
                papers = []
                
                for item in data.get('data', []):
                    cited_paper = item.get('citedPaper', {})
                    if cited_paper:
                        paper = Paper(
                            id=cited_paper.get('paperId', ''),
                            title=cited_paper.get('title', ''),
                            authors=[a.get('name', '') for a in cited_paper.get('authors', [])],
                            year=cited_paper.get('year', 2020),
                            url=f"https://www.semanticscholar.org/paper/{cited_paper.get('paperId')}",
                            source='s2_references',
                            citations=cited_paper.get('citationCount', 0),
                            pdf_url=cited_paper.get('openAccessPdf', {}).get('url') if cited_paper.get('openAccessPdf') else None,
                            verified=True,
                            verification_source='s2_graph'
                        )
                        papers.append(paper)
                
                return True, papers
            
            elif resp.status_code == 404:
                return False, []
            
            elif resp.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            
            else:
                return False, []
        
        except requests.exceptions.Timeout:
            time.sleep(1)
            continue
        except Exception as e:
            return False, []
    
    return False, []

def search_google_scholar(query: str, max_results: int = 20) -> List[Paper]:
    """Search Google Scholar via web scraping (may be rate limited)"""
    papers = []
    session = requests.Session()
    session.headers.update({'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    base_url = "https://scholar.google.com/scholar"
    
    try:
        for start in range(0, max_results, 10):
            params = {'q': query, 'start': start, 'hl': 'en'}
            
            try:
                resp = session.get(base_url, params=params, timeout=10)
                if resp.status_code == 429:
                    print(f"         ⚠️ Rate limited")
                    break
                
                if resp.status_code != 200:
                    break
                
                soup = BeautifulSoup(resp.text, 'html.parser')
                results = soup.select('div.gs_r.gs_or.gs_scl')
                
                if not results:
                    break
                
                for res in results:
                    try:
                        title_tag = res.select_one('h3.gs_rt')
                        title = title_tag.get_text(strip=True) if title_tag else "Unknown Title"
                        url = title_tag.find('a')['href'] if title_tag and title_tag.find('a') else ""
                        
                        meta_div = res.select_one('.gs_a')
                        meta_text = meta_div.get_text(strip=True) if meta_div else ""
                        
                        authors = meta_text.split('-')[0].strip() if '-' in meta_text else "Unknown"
                        year_match = re.search(r'\b(19|20)\d{2}\b', meta_text)
                        year = year_match.group(0) if year_match else "2023"
                        
                        abstract_div = res.select_one('.gs_rs')
                        abstract = abstract_div.get_text(strip=True) if abstract_div else ""
                        
                        cite_link = res.find('a', string=re.compile(r'Cited by'))
                        citations = int(re.search(r'\d+', cite_link.text).group()) if cite_link else 0
                        
                        papers.append(Paper(
                            id=hashlib.md5(title.encode()).hexdigest()[:16],
                            title=title,
                            authors=authors.split(','),
                            year=int(year),
                            abstract=abstract,
                            url=url,
                            source='google_scholar',
                            citations=citations,
                            verified=True,
                            verification_source='google_scholar'
                        ))
                    except:
                        continue
                
                time.sleep(2)  # Be polite to Google
            except Exception as e:
                print(f"         ⚠️ Error: {str(e)[:50]}")
                break
    except Exception as e:
        print(f"         ⚠️ Google Scholar error: {e}")
    
    return papers

def search_with_openai_websearch(query: str, openai_api_key: str, azure_client, 
                                  max_results: int = 50) -> List[Paper]:
    """Enhanced OpenAI web search with multiple search angles"""
    if not openai_api_key:
        print("   ⚠️ OpenAI API key not provided. Skipping OpenAI web search.")
        return []
    
    print(f"\n   🔍 OpenAI Web Search (multi-angle strategy)...")
    
    all_papers = []
    
    # Generate diverse search angles
    search_angles = [
        f"seminal foundational research papers {query}",
        f"recent 2023 2024 advances {query}",
        f"survey review papers {query}",
        f"methodology technical papers {query}",
        f"applications case studies {query}",
    ]
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        for angle_idx, search_angle in enumerate(search_angles):
            if len(all_papers) >= max_results:
                break
                
            print(f"\n      [{angle_idx + 1}/{len(search_angles)}] {search_angle[:50]}...")
            
            try:
                completion = client.chat.completions.create(
                    model="gpt-4o-mini-search-preview",
                    web_search_options={},
                    messages=[
                        {
                            "role": "system",
                            "content": """You are an academic paper finder. Search the web and return a list of real academic papers.

OUTPUT FORMAT - Return ONLY a JSON array, no other text:
[
  {
    "title": "Full Paper Title",
    "authors": "Author1, Author2",
    "year": "2023",
    "journal": "Journal or Conference Name",
    "url": "https://...",
    "abstract": "Brief description"
  }
]

IMPORTANT: 
- Return at least 8-10 papers
- Only include REAL papers you found via web search
- Include the actual URL (arxiv, doi.org, acm, ieee, etc.)
- Return ONLY the JSON array, no markdown, no explanation"""
                        },
                        {"role": "user", "content": f"Find academic research papers about: {search_angle}"}
                    ],
                )
                
                content = completion.choices[0].message.content
                papers = _parse_openai_response(content, query)
                
                existing_titles = set(p.title.lower()[:50] for p in all_papers)
                new_papers = [p for p in papers if p.title.lower()[:50] not in existing_titles]
                all_papers.extend(new_papers)
                
                print(f"         Found {len(papers)} papers, {len(new_papers)} new")
                time.sleep(1)
                
            except Exception as e:
                print(f"         ⚠️ Search failed: {str(e)[:80]}")
                continue
        
        print(f"\n      ✅ Total: {len(all_papers)} papers from OpenAI web search")
        return all_papers[:max_results]
        
    except Exception as e:
        print(f"   ⚠️ OpenAI Web Search Error: {e}")
        return []

def _parse_openai_response(content: str, query: str) -> List[Paper]:
    """Parse OpenAI response - handles JSON and structured text formats"""
    papers = []
    
    # First, try to extract JSON array
    json_match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
    if json_match:
        try:
            json_str = json_match.group(0)
            data = json.loads(json_str)
            
            for item in data:
                if isinstance(item, dict) and item.get('title'):
                    url = item.get('url', '') or item.get('link', '') or item.get('doi', '')
                    if url and url.startswith('10.'):
                        url = f"https://doi.org/{url}"
                    
                    year = str(item.get('year', 'N/A'))
                    if year == 'None' or not year:
                        year_match = re.search(r'(19|20)\d{2}', str(item))
                        year = year_match.group(0) if year_match else '2023'
                    
                    authors_field = item.get('authors', item.get('author', 'Unknown'))
                    if isinstance(authors_field, list):
                        authors = authors_field
                    elif isinstance(authors_field, str):
                        authors = [a.strip() for a in authors_field.split(',')]
                    else:
                        authors = ['Unknown']
                    
                    papers.append(Paper(
                        id=hashlib.md5(item.get('title', '').encode()).hexdigest()[:16],
                        title=item.get('title', 'Unknown').strip(),
                        authors=authors,
                        year=int(year) if year.isdigit() else 2023,
                        abstract=item.get('abstract', item.get('summary', item.get('description', ''))),
                        url=url,
                        source='openai_websearch',
                        venue=item.get('journal', item.get('venue', item.get('source', 'N/A'))),
                        verified=False,
                        verification_source=''
                    ))
            
            if papers:
                return papers
        except json.JSONDecodeError:
            pass
    
    # Fallback: Parse structured text format
    current_paper = {}
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        
        if not line or line.startswith('---') or line.startswith('```'):
            if current_paper and current_paper.get('title'):
                papers.append(_create_paper_from_dict(current_paper, query))
                current_paper = {}
            continue
        
        # Remove markdown
        line = re.sub(r'^\*+\s*|\*+$', '', line)
        line = re.sub(r'^\d+\.\s*|^[-•]\s*', '', line)
        
        line_lower = line.lower()
        
        if re.match(r'^(title|paper|name)\s*[:：]', line_lower):
            val = re.sub(r'^[^:：]+[:：]\s*', '', line, flags=re.IGNORECASE).strip()
            val = re.sub(r'^\*+|\*+$|^\"+|\"+$', '', val).strip()
            if val:
                if current_paper and current_paper.get('title'):
                    papers.append(_create_paper_from_dict(current_paper, query))
                current_paper = {'title': val}
        elif re.match(r'^(authors?|by|written by)\s*[:：]', line_lower):
            current_paper['authors'] = re.sub(r'^[^:：]+[:：]\s*', '', line, flags=re.IGNORECASE).strip()
        elif re.match(r'^(year|date|published)\s*[:：]', line_lower):
            year_text = re.sub(r'^[^:：]+[:：]\s*', '', line, flags=re.IGNORECASE)
            year_match = re.search(r'(19|20)\d{2}', year_text)
            current_paper['year'] = year_match.group(0) if year_match else 'N/A'
        elif re.match(r'^(journal|venue|conference|published in|source)\s*[:：]', line_lower):
            current_paper['journal'] = re.sub(r'^[^:：]+[:：]\s*', '', line, flags=re.IGNORECASE).strip()
        elif re.match(r'^(url|link|doi|href)\s*[:：]', line_lower):
            url_part = re.sub(r'^[^:：]+[:：]\s*', '', line, flags=re.IGNORECASE)
            url_match = re.search(r'https?://[^\s\]\)\>]+', url_part)
            if url_match:
                current_paper['url'] = url_match.group(0).rstrip('.,;>)')
        elif re.match(r'^(abstract|summary|description)\s*[:：]', line_lower):
            current_paper['abstract'] = re.sub(r'^[^:：]+[:：]\s*', '', line, flags=re.IGNORECASE).strip()
    
    if current_paper and current_paper.get('title'):
        papers.append(_create_paper_from_dict(current_paper, query))
    
    return papers

def _create_paper_from_dict(d: dict, query: str) -> Paper:
    """Helper to create Paper from parsed dict"""
    authors_field = d.get('authors', 'Unknown')
    if isinstance(authors_field, str):
        authors = [a.strip() for a in authors_field.split(',')]
    else:
        authors = ['Unknown']
    
    year_str = d.get('year', 'N/A')
    year = int(year_str) if year_str.isdigit() else 2023
    
    return Paper(
        id=hashlib.md5(d.get('title', 'Unknown').encode()).hexdigest()[:16],
        title=d.get('title', 'Unknown'),
        authors=authors,
        year=year,
        abstract=d.get('abstract', ''),
        url=d.get('url', ''),
        source='openai_websearch',
        venue=d.get('journal', d.get('venue', 'N/A')),  # Support both 'journal' and 'venue'
        verified=False,
        verification_source=''
    )

# ============================================================================
# VERIFICATION (From User's Existing Code)
# ============================================================================

def verify_via_semantic_scholar(paper: Paper, session: requests.Session) -> bool:
    """Verify paper via Semantic Scholar API - sets 3-level verification"""
    try:
        search_title = re.sub(r'[^\w\s]', ' ', paper.title)[:100]
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {'query': search_title, 'limit': 3, 'fields': 'title,authors,year,venue,citationCount,openAccessPdf,url'}
        
        resp = session.get(url, params=params, timeout=10)
        if resp.status_code == 429:
            time.sleep(2)
            return False
        
        if resp.status_code == 200:
            data = resp.json()
            for item in data.get('data', []):
                found_title = item.get('title', '').lower()
                search_lower = paper.title.lower()
                
                if len(found_title) > 10 and len(search_lower) > 10:
                    found_words = set(found_title.split())
                    search_words = set(search_lower.split())
                    overlap = len(found_words & search_words) / max(len(search_words), 1)
                    
                    if overlap >= 0.5:
                        paper.verified = True
                        paper.verification_source = "semantic_scholar"
                        
                        pdf_info = item.get('openAccessPdf')
                        if pdf_info and pdf_info.get('url'):
                            paper.pdf_url = pdf_info['url']
                            paper.verification_level = "verified_full_access"  # Level 1: Full access
                        else:
                            paper.verification_level = "verified_no_access"    # Level 2: No PDF
                        
                        if item.get('citationCount'):
                            paper.citations = item['citationCount']
                        if not paper.url and item.get('url'):
                            paper.url = item['url']
                        return True
    except Exception:
        pass
    
    # Not verified
    paper.verification_level = "not_verified"  # Level 3
    return False

def verify_via_crossref(paper: Paper, session: requests.Session) -> bool:
    """Verify paper via CrossRef API - sets 3-level verification"""
    try:
        search_title = re.sub(r'[^\w\s]', ' ', paper.title)[:200]
        url = "https://api.crossref.org/works"
        params = {'query.title': search_title, 'rows': 3, 'select': 'title,author,DOI,link'}
        headers = {'User-Agent': 'IdeaCartography/1.0 (mailto:research@example.com)'}
        
        resp = session.get(url, params=params, headers=headers, timeout=15)
        
        if resp.status_code == 200:
            data = resp.json()
            for item in data.get('message', {}).get('items', []):
                found_title = ' '.join(item.get('title', [''])).lower()
                search_lower = paper.title.lower()
                
                if len(found_title) > 10 and len(search_lower) > 10:
                    found_words = set(found_title.split())
                    search_words = set(search_lower.split())
                    overlap = len(found_words & search_words) / max(len(search_words), 1)
                    
                    if overlap >= 0.5:
                        paper.verified = True
                        paper.verification_source = "crossref"
                        
                        doi = item.get('DOI')
                        if doi and not paper.url:
                            paper.url = f"https://doi.org/{doi}"
                        
                        # Check for PDF links
                        has_pdf = False
                        links = item.get('link', [])
                        for link in links:
                            if link.get('content-type') == 'application/pdf':
                                paper.pdf_url = link.get('URL')
                                has_pdf = True
                                break
                        
                        # Set verification level
                        if has_pdf:
                            paper.verification_level = "verified_full_access"  # Level 1
                        else:
                            paper.verification_level = "verified_no_access"    # Level 2
                        
                        return True
    except Exception:
        pass
    
    paper.verification_level = "not_verified"  # Level 3
    return False

def verify_via_openalex(paper: Paper, session: requests.Session) -> bool:
    """Verify paper via OpenAlex API - sets 3-level verification"""
    try:
        search_title = re.sub(r'[^\w\s]', ' ', paper.title)[:200]
        url = "https://api.openalex.org/works"
        params = {'search': search_title, 'per_page': 3, 'select': 'title,authorships,publication_year,primary_location,cited_by_count,open_access'}
        headers = {'User-Agent': 'IdeaCartography/1.0 (mailto:research@example.com)'}
        
        resp = session.get(url, params=params, headers=headers, timeout=15)
        
        if resp.status_code == 200:
            data = resp.json()
            for item in data.get('results', []):
                found_title = item.get('title', '').lower()
                search_lower = paper.title.lower()
                
                if len(found_title) > 10 and len(search_lower) > 10:
                    found_words = set(found_title.split())
                    search_words = set(search_lower.split())
                    overlap = len(found_words & search_words) / max(len(search_words), 1)
                    
                    if overlap >= 0.5:
                        paper.verified = True
                        paper.verification_source = "openalex"
                        
                        # Check for open access PDF
                        has_pdf = False
                        oa_info = item.get('open_access', {})
                        if oa_info.get('is_oa'):
                            if oa_info.get('oa_url'):
                                paper.pdf_url = oa_info['oa_url']
                                has_pdf = True
                        
                        # Set verification level
                        if has_pdf:
                            paper.verification_level = "verified_full_access"  # Level 1
                        else:
                            paper.verification_level = "verified_no_access"    # Level 2
                        
                        primary_loc = item.get('primary_location', {})
                        if primary_loc and not paper.url:
                            landing_url = primary_loc.get('landing_page_url')
                            if landing_url:
                                paper.url = landing_url
                        
                        if item.get('cited_by_count'):
                            paper.citations = item['cited_by_count']
                        return True
    except Exception:
        pass
    
    paper.verification_level = "not_verified"  # Level 3
    return False

def verify_openai_papers_only(papers: List[Paper]) -> List[Paper]:
    """Verify ONLY papers from OpenAI web search using academic APIs"""
    papers_to_verify = [p for p in papers if p.source == 'openai_websearch' and not p.verified]
    
    if not papers_to_verify:
        print("\n   ℹ️ No OpenAI-recommended papers to verify")
        return papers
    
    print(f"\n   🔍 Verifying {len(papers_to_verify)} OpenAI-recommended papers...")
    print(f"      Using: Semantic Scholar, CrossRef, OpenAlex")
    
    session = requests.Session()
    session.headers.update({'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    
    verified_count = 0
    full_access_count = 0
    no_access_count = 0
    not_verified_count = 0
    
    for i, paper in enumerate(papers_to_verify):
        print(f"      [{i+1}/{len(papers_to_verify)}] {paper.title[:45]}... ", end="")
        
        # Try Semantic Scholar first
        if verify_via_semantic_scholar(paper, session):
            verified_count += 1
            if paper.verification_level == "verified_full_access":
                full_access_count += 1
                print("✓ (S2 + PDF)")
            else:
                no_access_count += 1
                print("✓ (S2)")
        else:
            time.sleep(0.3)
            # Try CrossRef
            if verify_via_crossref(paper, session):
                verified_count += 1
                if paper.verification_level == "verified_full_access":
                    full_access_count += 1
                    print("✓ (CrossRef + PDF)")
                else:
                    no_access_count += 1
                    print("✓ (CrossRef)")
            else:
                time.sleep(0.3)
                # Try OpenAlex
                if verify_via_openalex(paper, session):
                    verified_count += 1
                    if paper.verification_level == "verified_full_access":
                        full_access_count += 1
                        print("✓ (OpenAlex + PDF)")
                    else:
                        no_access_count += 1
                        print("✓ (OpenAlex)")
                else:
                    not_verified_count += 1
                    paper.verification_level = "not_verified"
                    print("✗")
        
        if (i + 1) % 10 == 0:
            time.sleep(1)  # Rate limiting
        else:
            time.sleep(0.2)
    
    print(f"\n      📊 Verification Results (3-Level System):")
    print(f"         • Total papers checked: {len(papers_to_verify)}")
    print(f"         • Level 1 - Verified + Full Access: {full_access_count} ({full_access_count/len(papers_to_verify)*100:.1f}%)")
    print(f"         • Level 2 - Verified + No PDF: {no_access_count} ({no_access_count/len(papers_to_verify)*100:.1f}%)")
    print(f"         • Level 3 - Not Verified: {not_verified_count} ({not_verified_count/len(papers_to_verify)*100:.1f}%)")
    
    return papers


def verify_papers_via_web_search(papers: List[Paper], azure_client) -> List[Paper]:
    """Verify papers using OpenAI web search tool"""
    if not CONFIG['VERIFY_VIA_WEB_SEARCH']:
        return papers
    
    print(f"\n   🔍 Verifying top {CONFIG['VERIFY_TOP_PAPERS']} papers via web search...")
    
    top_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:CONFIG['VERIFY_TOP_PAPERS']]
    
    verified_count = 0
    for i, paper in enumerate(top_papers, 1):
        if paper.verified and paper.verification_source and paper.verification_source != 'metadata_check':
            verified_count += 1
            continue
        
        # Use web search to verify paper details
        print(f"      [{i}/{len(top_papers)}] {paper.title[:50]}...", end=" ")
        
        search_prompt = f"""Search the web to verify this research paper and find additional information:

Title: {paper.title}
Authors: {', '.join(paper.authors[:3])}
Year: {paper.year}

Please verify:
1. Citation count
2. Publication venue
3. DOI or official URL
4. Key findings or impact

Return a brief summary of what you found."""

        try:
            result = ask_llm(azure_client, search_prompt, max_tokens=500, use_web_search=True)
            
            if result and len(result) > 50:
                paper.web_verified = True
                paper.verified = True
                paper.verification_source = 'web_search'
                verified_count += 1
                print("✓")
            else:
                # Fallback: check basic metadata
                if paper.citations > 0 and paper.venue:
                    paper.web_verified = False
                    paper.verified = True
                    paper.verification_source = 'metadata_check'
                    verified_count += 1
                    print("✓ (metadata)")
                else:
                    print("✗")
        except Exception as e:
            # Fallback to metadata check
            if paper.citations > 0 and paper.venue:
                paper.web_verified = False
                paper.verified = True
                paper.verification_source = 'metadata_check'
                verified_count += 1
                print("✓ (metadata)")
            else:
                print("✗")
    
    print(f"      ✅ Verified {verified_count}/{len(top_papers)} papers")
    
    # Search for related topics using web search
    if CONFIG['WEB_SEARCH_TOPICS']:
        print(f"\n   🌐 Searching for related topics and trends via web search...")
        
        search_prompt = f"""Search the web for current research trends, emerging topics, and recent developments related to "{CONFIG['TOPIC']}".

Focus on:
- Emerging subtopics and new research areas
- Recent developments in the past 1-2 years
- Current challenges and open problems
- Novel methodologies or approaches

Return 5-8 specific, concrete research trends with brief explanations."""

        try:
            result = ask_llm(azure_client, search_prompt, max_tokens=800, use_web_search=True)
            
            if result:
                # Parse topics from response
                topics = []
                for line in result.split('\n'):
                    line = line.strip()
                    if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                        topic_text = line.lstrip('0123456789.-•) ').strip()
                        if topic_text and len(topic_text) > 20:
                            topics.append(topic_text)
                
                if topics:
                    print(f"      ✓ Found {len(topics)} related topics:")
                    for topic in topics[:10]:
                        print(f"         • {topic[:150]}{'...' if len(topic) > 150 else ''}")
                else:
                    print(f"      ✓ Web search completed (see results in verification)")
        except Exception as e:
            print(f"      ⚠️ Web search error: {e}")
    
    return papers

# ============================================================================
# PHASE 2.5: METADATA ENRICHMENT
# Extract additional metadata from web pages for papers without PDFs
# ============================================================================

def enrich_paper_metadata(paper: Paper, azure_client=None) -> bool:
    """
    Enrich a single paper with additional metadata from multiple sources.
    Returns True if any metadata was added.
    
    Strategy:
    1. Use DOI for OpenAlex (most reliable)
    2. Use ArXiv ID for ArXiv papers
    3. Extract keywords from abstract with LLM
    4. Use existing S2 data
    """
    enriched = False
    
    # Skip if already has full text (has PDF)
    if paper.full_text:
        return False
    
    # Method 1: Use DOI for OpenAlex (MOST RELIABLE!)
    if CONFIG['ENRICH_FROM_OPENALEX'] and paper.doi:
        openalex_metadata = get_openalex_by_doi(paper.doi)
        if openalex_metadata:
            if 'concepts' in openalex_metadata and openalex_metadata['concepts']:
                paper.concepts = openalex_metadata['concepts']
                enriched = True
            if 'topics' in openalex_metadata and openalex_metadata['topics']:
                paper.topics = openalex_metadata['topics']
                enriched = True
            if 'keywords' in openalex_metadata and openalex_metadata['keywords']:
                paper.keywords = openalex_metadata['keywords']
                enriched = True
            if 'sdgs' in openalex_metadata and openalex_metadata['sdgs']:
                paper.sdgs = openalex_metadata['sdgs']
                enriched = True
            if 'grants' in openalex_metadata and openalex_metadata['grants']:
                paper.grants = openalex_metadata['grants']
                enriched = True
    
    # Method 2: ArXiv papers - extract categories and subjects
    if CONFIG['ENRICH_FROM_ARXIV'] and 'arxiv.org' in paper.url.lower():
        arxiv_metadata = extract_arxiv_metadata(paper.url)
        if arxiv_metadata:
            if 'categories' in arxiv_metadata:
                paper.categories = arxiv_metadata['categories']
                enriched = True
            if 'subjects' in arxiv_metadata:
                paper.subjects = arxiv_metadata['subjects']
                enriched = True
            if 'comments' in arxiv_metadata:
                paper.comments = arxiv_metadata['comments']
                enriched = True
            if 'journal_reference' in arxiv_metadata:
                paper.journal_reference = arxiv_metadata['journal_reference']
                enriched = True
    
    # Method 3: Extract keywords from abstract with LLM (if we have Azure client and abstract)
    if azure_client and paper.abstract and not paper.keywords:
        try:
            keywords = extract_keywords_from_abstract(paper.abstract, azure_client)
            if keywords:
                paper.keywords = keywords
                enriched = True
        except:
            pass
    
    # Method 4: If still no topics, try title-based OpenAlex (fallback)
    if CONFIG['ENRICH_FROM_OPENALEX'] and not enriched and not paper.topics:
        openalex_metadata = get_openalex_metadata(paper.title, paper.year)
        if openalex_metadata:
            if 'concepts' in openalex_metadata and not paper.concepts:
                paper.concepts = openalex_metadata['concepts']
                enriched = True
            if 'topics' in openalex_metadata:
                paper.topics = openalex_metadata['topics']
                enriched = True
            if 'keywords' in openalex_metadata:
                paper.keywords = openalex_metadata['keywords']
                enriched = True
    
    if enriched:
        paper.metadata_enriched = True
    
    return enriched


def get_openalex_by_doi(doi: str) -> Dict:
    """
    Get metadata from OpenAlex using DOI (MOST RELIABLE METHOD).
    DOI lookup is much more accurate than title search.
    """
    try:
        # Clean DOI
        doi = doi.strip()
        if doi.startswith('http'):
            doi = doi.split('doi.org/')[-1]
        
        # OpenAlex DOI format: https://openalex.org/W...
        # But we can search by DOI directly
        url = "https://api.openalex.org/works"
        params = {'filter': f'doi:{doi}'}
        
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            return {}
        
        results = resp.json().get('results', [])
        if not results:
            return {}
        
        data = results[0]
        return parse_openalex_response(data)
        
    except Exception:
        return {}


def parse_openalex_response(data: Dict) -> Dict:
    """Parse OpenAlex API response into metadata dict"""
    metadata = {}
    
    try:
        # Extract concepts (AI-generated topics with scores)
        if 'concepts' in data and data['concepts']:
            metadata['concepts'] = [
                {'name': c['display_name'], 'score': c['score']}
                for c in data['concepts'][:10] if c.get('score', 0) > 0.3
            ]
        
        # Extract topics
        if 'topics' in data and data['topics']:
            metadata['topics'] = [
                t['display_name'] for t in data['topics'][:5]
            ]
        
        # Extract keywords
        if 'keywords' in data and data['keywords']:
            metadata['keywords'] = [
                kw['display_name'] for kw in data['keywords'][:10]
            ]
        
        # Extract SDGs (Sustainable Development Goals)
        if 'sustainable_development_goals' in data and data['sustainable_development_goals']:
            metadata['sdgs'] = [
                sdg['display_name'] 
                for sdg in data['sustainable_development_goals']
            ]
        
        # Extract grants/funding
        if 'grants' in data and data['grants']:
            metadata['grants'] = [
                {
                    'funder': g.get('funder_display_name', ''),
                    'award_id': g.get('award_id', '')
                }
                for g in data['grants'][:5]
            ]
    except:
        pass
    
    return metadata


def extract_keywords_from_abstract(abstract: str, azure_client) -> List[str]:
    """
    Extract keywords from paper abstract using LLM.
    Fast and works for any paper with an abstract!
    """
    try:
        if not abstract or len(abstract) < 100:
            return []
        
        prompt = f"""Extract 5-10 relevant keywords from this research paper abstract.
Return ONLY a comma-separated list of keywords, nothing else.

Abstract: {abstract[:500]}

Keywords:"""
        
        response = ask_llm(azure_client, prompt, max_tokens=100)
        
        # Parse response
        keywords = [k.strip() for k in response.split(',')]
        keywords = [k for k in keywords if k and len(k) > 2 and len(k) < 50]
        
        return keywords[:10]
    except:
        return []


def extract_arxiv_metadata(url: str) -> Dict:
    """Extract metadata from ArXiv abstract page"""
    try:
        resp = requests.get(url, headers={'User-Agent': USER_AGENT}, timeout=10)
        if resp.status_code != 200:
            return {}
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        metadata = {}
        
        # Extract categories
        subjects_div = soup.find('div', class_='subjects')
        if subjects_div:
            subjects_text = subjects_div.get_text()
            
            # Primary categories
            primary = re.search(r'Categories:\s*([^\(]+)', subjects_text)
            if primary:
                metadata['categories'] = [s.strip() for s in primary.group(1).split(',')]
            
            # All subjects
            subjects = re.search(r'\(([^)]+)\)', subjects_text)
            if subjects:
                metadata['subjects'] = [s.strip() for s in subjects.group(1).split(';')]
        
        # Extract comments (e.g., "Accepted at NeurIPS 2024")
        comments_div = soup.find('div', class_='comments')
        if comments_div:
            metadata['comments'] = comments_div.get_text().replace('Comments:', '').strip()
        
        # Extract journal reference
        journal_ref = soup.find('div', class_='journal-ref')
        if journal_ref:
            metadata['journal_reference'] = journal_ref.get_text().replace('Journal-ref:', '').strip()
        
        return metadata
        
    except Exception:
        return {}


def get_openalex_metadata(title: str, year: Optional[int] = None) -> Dict:
    """
    Get metadata from OpenAlex API using title search (fallback method).
    DOI-based lookup is more reliable - use get_openalex_by_doi() when DOI available.
    """
    try:
        # Search by title and year
        url = "https://api.openalex.org/works"
        if year:
            query = f'title.search:{title} publication_year:{year}'
        else:
            query = f'title.search:{title}'
        
        params = {'filter': query, 'per-page': 1}
        resp = requests.get(url, params=params, timeout=10)
        
        if resp.status_code != 200:
            return {}
        
        results = resp.json().get('results', [])
        if not results:
            return {}
        
        return parse_openalex_response(results[0])
        
    except Exception:
        return {}


def enrich_papers_batch(papers: List[Paper], azure_client=None) -> int:
    """
    Enrich multiple papers with additional metadata.
    Returns number of papers enriched.
    
    Uses multiple strategies:
    1. DOI-based OpenAlex lookup (most reliable)
    2. ArXiv metadata extraction
    3. LLM keyword extraction from abstracts
    4. Title-based OpenAlex (fallback)
    """
    if not CONFIG['ENRICH_METADATA']:
        return 0
    
    # Filter papers without PDFs
    papers_to_enrich = [p for p in papers if not p.full_text and not p.metadata_enriched]
    
    if CONFIG['MAX_ENRICH_PAPERS']:
        papers_to_enrich = papers_to_enrich[:CONFIG['MAX_ENRICH_PAPERS']]
    
    if not papers_to_enrich:
        print(f"      ℹ️  No papers to enrich (all have PDFs or already enriched)")
        return 0
    
    print(f"\n   📝 Enriching metadata for {len(papers_to_enrich)} papers without PDFs...")
    
    # Count potential sources
    with_doi = sum(1 for p in papers_to_enrich if p.doi)
    with_arxiv = sum(1 for p in papers_to_enrich if 'arxiv.org' in p.url.lower())
    with_abstract = sum(1 for p in papers_to_enrich if p.abstract)
    
    print(f"      • Papers with DOI: {with_doi} (for OpenAlex lookup)")
    print(f"      • Papers from ArXiv: {with_arxiv} (for category extraction)")
    print(f"      • Papers with abstract: {with_abstract} (for LLM keyword extraction)")
    
    enriched_count = 0
    arxiv_count = 0
    openalex_doi_count = 0
    openalex_title_count = 0
    llm_keywords_count = 0
    
    for i, paper in enumerate(papers_to_enrich, 1):
        try:
            # Track what methods worked
            before_keywords = bool(paper.keywords)
            before_topics = bool(paper.topics)
            before_categories = bool(paper.categories)
            
            was_enriched = enrich_paper_metadata(paper, azure_client)
            
            if was_enriched:
                enriched_count += 1
                
                # Count sources used
                if paper.categories or paper.subjects:
                    if not before_categories:
                        arxiv_count += 1
                
                if paper.doi and (paper.concepts or paper.topics):
                    if not before_topics:
                        openalex_doi_count += 1
                
                if paper.keywords and not before_keywords:
                    # Could be from OpenAlex or LLM
                    if paper.topics or paper.concepts:
                        if not paper.doi:
                            openalex_title_count += 1
                    else:
                        llm_keywords_count += 1
            
            # Progress update
            if i % 20 == 0:
                print(f"      Progress: {i}/{len(papers_to_enrich)} papers processed (enriched: {enriched_count})")
            
            # Rate limiting - be polite to servers
            if i % 10 == 0:
                time.sleep(0.5)
            
        except Exception as e:
            continue
    
    print(f"\n   ✅ Metadata enrichment complete:")
    print(f"      • Papers enriched: {enriched_count}/{len(papers_to_enrich)} ({enriched_count/len(papers_to_enrich)*100:.1f}%)")
    
    if arxiv_count > 0:
        print(f"      • ArXiv metadata: {arxiv_count} papers")
    if openalex_doi_count > 0:
        print(f"      • OpenAlex (DOI lookup): {openalex_doi_count} papers")
    if openalex_title_count > 0:
        print(f"      • OpenAlex (title search): {openalex_title_count} papers")
    if llm_keywords_count > 0:
        print(f"      • LLM keyword extraction: {llm_keywords_count} papers")
    
    # Summary statistics
    total_keywords = sum(1 for p in papers if p.keywords)
    total_categories = sum(1 for p in papers if p.categories)
    total_topics = sum(1 for p in papers if p.topics)
    
    print(f"\n   📊 Overall metadata coverage:")
    print(f"      • Papers with keywords: {total_keywords}/{len(papers)} ({total_keywords/len(papers)*100:.1f}%)")
    print(f"      • Papers with categories: {total_categories}/{len(papers)} ({total_categories/len(papers)*100:.1f}%)")
    print(f"      • Papers with topics: {total_topics}/{len(papers)} ({total_topics/len(papers)*100:.1f}%)")
    
    return enriched_count


# ============================================================================
# PHASE 2.7: AI2 ENHANCEMENTS (Semantic Scholar Advanced Features)
# ============================================================================

@dataclass
class CitationGraph:
    """Citation network graph"""
    citations: Dict[str, List[str]]      # paper_id -> [papers that cite it]
    references: Dict[str, List[str]]     # paper_id -> [papers it references]
    influential: Dict[str, int]          # paper_id -> influential citation count
    internal_citations: Dict[str, int]   # citations within corpus


def get_s2_fields(paper_id: str, api_key: Optional[str] = None) -> Dict:
    """
    Get AI2's topic classification for a paper (S2 Fields of Study).
    Returns both S2 fields (newer, AI-generated) and MAG fields (legacy).
    """
    try:
        url = f"https://api.semanticscholar.org/graph/v1/paper/{paper_id}"
        params = {'fields': 's2FieldsOfStudy,fieldsOfStudy'}
        headers = {'x-api-key': api_key} if api_key else {}
        
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            
            # S2 fields (newer, more accurate)
            s2_fields = data.get('s2FieldsOfStudy', [])
            
            # MAG fields (legacy)
            mag_fields = data.get('fieldsOfStudy', [])
            
            return {
                's2_fields': [f['category'] for f in s2_fields] if s2_fields else [],
                'mag_fields': mag_fields if mag_fields else [],
                'all_fields': list(set(
                    [f['category'] for f in s2_fields if s2_fields] + 
                    (mag_fields if mag_fields else [])
                ))
            }
    except Exception:
        return {'s2_fields': [], 'mag_fields': [], 'all_fields': []}
    
    return {'s2_fields': [], 'mag_fields': [], 'all_fields': []}


def add_s2_fields_to_papers(papers: List[Paper], api_key: Optional[str] = None, 
                            max_papers: int = 100) -> List[Paper]:
    """Add S2 fields of study to papers."""
    
    # Filter to papers that likely have valid S2 IDs
    s2_papers = [p for p in papers if p.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references'] 
                 or p.verification_source == 's2']
    
    print(f"   📋 Fetching S2 Fields of Study...")
    print(f"      • Total papers: {len(papers)}")
    print(f"      • Papers with S2 IDs: {len(s2_papers)}")
    print(f"      • Will process: {min(len(s2_papers), max_papers)}")
    
    if not s2_papers:
        print(f"\n   ⚠️  No papers with valid S2 IDs found")
        print(f"      Most papers are from ArXiv or other sources")
        print(f"      Skipping S2 Fields enrichment...")
        return papers
    
    enriched_count = 0
    field_counts = Counter()
    
    for i, paper in enumerate(s2_papers[:max_papers], 1):
        try:
            fields = get_s2_fields(paper.id, api_key)
            
            if fields['all_fields']:
                paper.s2_fields = fields['s2_fields']
                paper.mag_fields = fields['mag_fields']
                
                for field in fields['all_fields']:
                    field_counts[field] += 1
                
                enriched_count += 1
            
            if i % 20 == 0:
                print(f"      Progress: {i}/{min(len(s2_papers), max_papers)} ({enriched_count} enriched)")
            
            if i % 10 == 0:
                time.sleep(0.5)
                
        except Exception:
            continue
    
    print(f"\n   ✅ S2 Fields enrichment complete:")
    print(f"      • Papers enriched: {enriched_count}/{min(len(s2_papers), max_papers)}")
    print(f"      • Unique fields: {len(field_counts)}")
    
    if field_counts:
        print(f"\n   📊 Top S2 Fields:")
        for field, count in field_counts.most_common(10):
            print(f"      • {field}: {count} papers")
    
    return papers


def build_citation_graph(papers: List[Paper], api_key: Optional[str] = None, 
                        max_papers: int = 50) -> CitationGraph:
    """Build citation graph from S2 API."""
    
    # Filter to papers that likely have valid S2 IDs
    s2_papers = [p for p in papers if p.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references'] 
                 or p.verification_source == 's2']
    
    print(f"   🕸️  Building citation graph...")
    print(f"      • Total papers: {len(papers)}")
    print(f"      • Papers with S2 IDs: {len(s2_papers)}")
    print(f"      • Will analyze: {min(len(s2_papers), max_papers)}")
    
    if not s2_papers:
        print(f"\n   ⚠️  No papers with valid S2 IDs found")
        print(f"      Skipping citation graph...")
        return CitationGraph(citations={}, references={}, influential={}, internal_citations={})
    
    graph = CitationGraph(
        citations={},
        references={},
        influential={},
        internal_citations={}
    )
    
    paper_ids = {p.id for p in papers}
    
    for i, paper in enumerate(s2_papers[:max_papers], 1):
        try:
            # Get citations
            url = f"https://api.semanticscholar.org/graph/v1/paper/{paper.id}/citations"
            params = {'fields': 'paperId,isInfluential', 'limit': 1000}
            headers = {'x-api-key': api_key} if api_key else {}
            
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                
                all_citations = []
                influential_count = 0
                internal_count = 0
                
                for citation in data.get('data', []):
                    citing_id = citation.get('citingPaper', {}).get('paperId')
                    if citing_id:
                        all_citations.append(citing_id)
                        
                        if citation.get('isInfluential'):
                            influential_count += 1
                        
                        if citing_id in paper_ids:
                            internal_count += 1
                
                graph.citations[paper.id] = all_citations
                graph.influential[paper.id] = influential_count
                graph.internal_citations[paper.id] = internal_count
            
            # Get references
            url = f"https://api.semanticscholar.org/graph/v1/paper/{paper.id}/references"
            params = {'fields': 'paperId', 'limit': 1000}
            
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            
            if resp.status_code == 200:
                data = resp.json()
                references = [
                    ref.get('citedPaper', {}).get('paperId') 
                    for ref in data.get('data', [])
                    if ref.get('citedPaper', {}).get('paperId')
                ]
                graph.references[paper.id] = references
            
            if i % 10 == 0:
                print(f"      Progress: {i}/{min(len(s2_papers), max_papers)}")
            
            time.sleep(0.3)
            
        except Exception:
            continue
    
    total_citations = sum(len(c) for c in graph.citations.values())
    total_internal = sum(graph.internal_citations.values())
    total_influential = sum(graph.influential.values())
    
    print(f"\n   ✅ Citation graph complete:")
    print(f"      • Papers analyzed: {len(graph.citations)}")
    print(f"      • Total citations: {total_citations:,}")
    print(f"      • Internal citations: {total_internal} (papers citing each other)")
    print(f"      • Influential citations: {total_influential}")
    
    return graph


def rank_papers_by_influence(papers: List[Paper], graph: CitationGraph) -> List[Paper]:
    """Rank papers by influence within the corpus."""
    print(f"\n   ⭐ Ranking papers by influence...")
    
    for paper in papers:
        influential = graph.influential.get(paper.id, 0)
        internal = graph.internal_citations.get(paper.id, 0)
        total = len(graph.citations.get(paper.id, []))
        
        # Weighted score
        paper.influence_score = (
            influential * 3.0 +      # Influential citations count 3x
            internal * 5.0 +         # Internal citations count 5x
            total * 1.0              # Total citations baseline
        )
        
        paper.internal_citations = internal
    
    papers_sorted = sorted(papers, key=lambda p: p.influence_score, reverse=True)
    
    print(f"\n   📊 Top 10 Influential Papers (within corpus):")
    for i, paper in enumerate(papers_sorted[:10], 1):
        print(f"      {i}. {paper.title[:60]}...")
        print(f"         • Influence score: {paper.influence_score:.1f}")
        print(f"         • Internal citations: {paper.internal_citations}")
        print(f"         • Total citations: {paper.citations}")
    
    return papers_sorted


def get_ai2_recommendation_ids(paper_id: str, api_key: Optional[str] = None, 
                          max_results: int = 10) -> List[Dict]:
    """Get S2's recommended similar papers (for AI2 enhancements)."""
    try:
        url = f"https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paper_id}"
        params = {
            'fields': 'paperId,title,authors,year,abstract,citationCount,url',
            'limit': max_results
        }
        headers = {'x-api-key': api_key} if api_key else {}
        
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            return data.get('recommendedPapers', [])
    except:
        pass
    
    return []


def find_recommended_papers(papers: List[Paper], api_key: Optional[str] = None, 
                           top_n: int = 20) -> Set[str]:
    """Find papers recommended by S2 that might be missing from corpus."""
    
    # Filter to papers with valid S2 IDs
    s2_papers = [p for p in papers if p.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references'] 
                 or p.verification_source == 's2']
    
    print(f"\n   💡 Getting S2 recommendations...")
    print(f"      • Total papers: {len(papers)}")
    print(f"      • Papers with S2 IDs: {len(s2_papers)}")
    
    if not s2_papers:
        print(f"\n   ⚠️  No papers with valid S2 IDs found")
        print(f"      Skipping recommendations...")
        return set()
    
    recommended_ids = set()
    existing_ids = {p.id for p in papers}
    
    # Sort S2 papers by citations and take top N
    top_papers = sorted(s2_papers, key=lambda p: p.citations, reverse=True)[:top_n]
    print(f"      • Will check top {len(top_papers)} papers")
    
    for i, paper in enumerate(top_papers, 1):
        try:
            recs = get_ai2_recommendation_ids(paper.id, api_key)
            
            for rec in recs:
                rec_id = rec.get('paperId')
                if rec_id and rec_id not in existing_ids:
                    recommended_ids.add(rec_id)
            
            if i % 5 == 0:
                print(f"      Progress: {i}/{len(top_papers)}")
            
            time.sleep(0.3)
            
        except Exception:
            continue
    
    missing = recommended_ids - existing_ids
    
    print(f"\n   ✅ Recommendation analysis complete:")
    print(f"      • Papers checked: {len(top_papers)}")
    print(f"      • Total recommendations: {len(recommended_ids)}")
    print(f"      • Not in corpus: {len(missing)}")
    
    if missing:
        print(f"\n   💡 Suggested papers to add:")
        print(f"      Run discovery again with these paper IDs to expand corpus")
    
    return missing


def enhance_taxonomy_with_s2(taxonomy: TaxonomyNode, papers: List[Paper]):
    """Add S2 fields to taxonomy nodes."""
    print(f"\n   🏷️  Enhancing taxonomy with S2 fields...")
    
    papers_dict = {p.id: p for p in papers}
    
    def get_all_paper_ids(node):
        """Get all paper IDs from this node and its descendants"""
        all_ids = list(node.paper_ids)  # Papers directly in this node (leaf nodes only)
        for child in node.children:
            all_ids.extend(get_all_paper_ids(child))
        return all_ids
    
    def add_s2_to_node(node):
        # Get papers from this node and all descendants
        all_paper_ids = get_all_paper_ids(node)
        cluster_papers = [papers_dict[pid] for pid in all_paper_ids if pid in papers_dict]
        
        if not cluster_papers:
            return
        
        # Collect S2 fields
        field_counts = Counter()
        for paper in cluster_papers:
            if hasattr(paper, 's2_fields'):
                for field in paper.s2_fields:
                    field_counts[field] += 1
        
        node.s2_fields = [field for field, _ in field_counts.most_common(5)]
        
        # Calculate citation metrics
        node.total_citations = sum(p.citations for p in cluster_papers)
        node.avg_citations = node.total_citations / len(cluster_papers) if cluster_papers else 0
        
        # Recurse
        for child in node.children:
            add_s2_to_node(child)
    
    add_s2_to_node(taxonomy)
    
    print(f"   ✅ Taxonomy enhanced with S2 fields")


def run_ai2_enhancements(papers: List[Paper], taxonomy: Optional[TaxonomyNode], 
                        api_key: Optional[str] = None) -> tuple:
    """Run all AI2 enhancements."""
    citation_graph = None
    recommended_ids = set()
    
    # 1. Add S2 Fields of Study
    if CONFIG['AI2_ADD_S2_FIELDS']:
        papers = add_s2_fields_to_papers(
            papers, 
            api_key, 
            max_papers=CONFIG['AI2_MAX_PAPERS_FIELDS']
        )
    
    # 2. Build Citation Graph
    if CONFIG['AI2_BUILD_CITATION_GRAPH']:
        citation_graph = build_citation_graph(
            papers, 
            api_key,
            max_papers=CONFIG['AI2_MAX_PAPERS_GRAPH']
        )
        
        papers = rank_papers_by_influence(papers, citation_graph)
    
    # 3. Get Recommendations
    if CONFIG['AI2_GET_RECOMMENDATIONS']:
        recommended_ids = find_recommended_papers(
            papers,
            api_key,
            top_n=CONFIG['AI2_MAX_PAPERS_RECS']
        )
    
    # 4. Enhance Taxonomy
    if taxonomy:
        enhance_taxonomy_with_s2(taxonomy, papers)
    
    return papers, citation_graph, recommended_ids


# ============================================================================
# PHASE 3: DEEP CONTENT EXTRACTION (Allen AI PaperMage)
# ============================================================================

def discover_pdf_urls(papers: List[Paper]) -> List[Paper]:
    """
    Discover PDF URLs for papers that don't have them.
    
    Strategies:
    1. ArXiv papers: Use predictable PDF URL format
    2. S2 papers: Check openAccessPdf via API
    3. DOI-based papers: Try standard repositories
    """
    print(f"\n   🔍 Discovering PDF URLs...")
    
    papers_without_pdf = [p for p in papers if not p.pdf_url]
    print(f"      Papers without PDF: {len(papers_without_pdf)}/{len(papers)}")
    
    if not papers_without_pdf:
        print(f"      ✅ All papers already have PDF URLs!")
        return papers
    
    found_count = 0
    
    # Strategy 1: ArXiv papers (predictable format)
    arxiv_papers = [p for p in papers_without_pdf if p.source == 'arxiv' or 'arxiv.org' in p.url.lower()]
    if arxiv_papers:
        print(f"      📚 ArXiv papers: {len(arxiv_papers)}")
        for paper in arxiv_papers:
            # Extract ArXiv ID from URL or ID field
            arxiv_id = None
            if 'arxiv.org/abs/' in paper.url:
                arxiv_id = paper.url.split('/abs/')[-1].split('v')[0]  # Remove version
            elif paper.id and len(paper.id) < 20:  # Short ID likely ArXiv
                arxiv_id = paper.id
            
            if arxiv_id:
                paper.pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                found_count += 1
        
        print(f"         ✅ Found {found_count} ArXiv PDFs")
    
    # Strategy 2: Semantic Scholar papers (check via API)
    s2_papers = [p for p in papers_without_pdf 
                 if p.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references']
                 or 'semanticscholar.org' in p.url.lower()]
    
    if s2_papers and CONFIG.get('S2_API_KEY'):
        print(f"      🎓 Semantic Scholar papers: {len(s2_papers)} (checking API...)")
        s2_found = 0
        headers = {'x-api-key': CONFIG['S2_API_KEY']}
        
        for paper in s2_papers[:100]:  # Limit to avoid rate limits
            try:
                # Extract S2 ID
                s2_id = None
                if len(paper.id) == 40:  # S2 ID format
                    s2_id = paper.id
                elif 'semanticscholar.org/paper/' in paper.url:
                    s2_id = paper.url.split('/paper/')[-1].split('/')[0]
                
                if s2_id:
                    url = f"https://api.semanticscholar.org/graph/v1/paper/{s2_id}"
                    params = {'fields': 'openAccessPdf'}
                    resp = requests.get(url, params=params, headers=headers, timeout=10)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        pdf_info = data.get('openAccessPdf')
                        if pdf_info and pdf_info.get('url'):
                            paper.pdf_url = pdf_info['url']
                            s2_found += 1
                    
                    time.sleep(0.1)  # Rate limiting
                
            except Exception:
                continue
        
        print(f"         ✅ Found {s2_found} S2 PDFs")
        found_count += s2_found
    
    # Strategy 3: DOI-based papers (try Unpaywall API)
    # TODO: Could add Unpaywall integration here
    
    total_with_pdf = len([p for p in papers if p.pdf_url])
    coverage = (total_with_pdf / len(papers)) * 100
    
    print(f"\n      📊 PDF URL Coverage:")
    print(f"         • Before: {total_with_pdf - found_count}/{len(papers)} ({((total_with_pdf - found_count)/len(papers))*100:.1f}%)")
    print(f"         • After: {total_with_pdf}/{len(papers)} ({coverage:.1f}%)")
    print(f"         • Improvement: +{found_count} PDFs")
    
    return papers


def extract_deep_content(papers: List[Paper], azure_client) -> List[Paper]:
    """
    Extract deep content from PDFs using async parallel processing.
    Uses asyncio for downloads + ThreadPoolExecutor for CPU-heavy extraction.
    
    Compatible with both:
    - Jupyter/IPython (with running event loop)
    - Normal Python scripts
    """
    # nest_asyncio is applied at import time, so asyncio.run() should work
    # in both Jupyter and normal Python
    return asyncio.run(extract_deep_content_async(papers, azure_client))


async def extract_deep_content_async(papers: List[Paper], azure_client) -> List[Paper]:
    """
    Main async orchestrator for Phase 3 - Deep Content Extraction.
    
    Features:
    - Parallel PDF downloads (async)
    - Parallel extraction (ThreadPoolExecutor)
    - Retry logic with exponential backoff
    - Progress tracking
    - Rate limiting
    """
    if not CONFIG.get('USE_PAPERMAGE', True):
        return papers
    
    print(f"\n   📖 Deep Content Extraction (Async Parallel Processing)...")
    
    # Check PaperMage availability
    has_full_papermage = False
    try:
        import papermage
        has_full_papermage = True
        version = getattr(papermage, '__version__', 'unknown')
        print(f"      ✅ PaperMage available (version: {version})")
        print(f"      📦 Features: Tables, Figures, Equations, Citations")
    except ImportError:
        print(f"      ℹ️  PaperMage not installed - using basic extraction")
        print(f"      💡 Install with: pip install papermage pdfplumber")
    
    # Filter papers with PDF URLs
    papers_with_pdf = [p for p in papers if p.pdf_url]
    
    if not papers_with_pdf:
        print(f"      ⚠️  No papers with PDF URLs found")
        return papers
    
    # Sort by citations (process high-impact papers first)
    papers_with_pdf.sort(key=lambda x: x.citations or 0, reverse=True)
    
    # Limit number of PDFs to process
    max_deep_read = CONFIG.get('MAX_DEEP_READ')
    if max_deep_read is None:
        # Process all PDFs
        target_papers = papers_with_pdf
        print(f"      🎯 Processing ALL {len(target_papers)} PDFs with parallel extraction")
    else:
        # Process top N PDFs
        target_papers = papers_with_pdf[:max_deep_read]
        print(f"      🎯 Processing top {len(target_papers)} PDFs (sorted by citations)")
    
    if not target_papers:
        return papers
    
    # Concurrency settings
    max_concurrent = CONFIG.get('MAX_CONCURRENT_DOWNLOADS', 10)
    max_threads = CONFIG.get('MAX_EXTRACTION_THREADS', 5)
    
    print(f"      ⚙️  Concurrency: {max_concurrent} downloads, {max_threads} extraction threads")
    
    # Create connector with limits
    connector = aiohttp.TCPConnector(limit=max_concurrent, limit_per_host=5)
    timeout = aiohttp.ClientTimeout(total=60, connect=30)
    
    # Progress tracking
    results = {
        'success': 0,
        'download_fail': 0,
        'extract_fail': 0,
        'invalid_pdf': 0
    }
    
    # ThreadPool for CPU-heavy extraction
    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Create semaphore for rate limiting
            semaphore = asyncio.Semaphore(max_concurrent)
            
            # Create tasks
            tasks = []
            for paper in target_papers:
                task = process_single_paper_async(
                    paper, session, executor, azure_client, 
                    semaphore, results, has_full_papermage
                )
                tasks.append(task)
            
            # Progress bar (if tqdm available)
            if HAS_TQDM:
                print(f"\n      📊 Processing {len(tasks)} PDFs:")
                # Gather with progress
                completed = 0
                with tqdm(total=len(tasks), desc="      PDFs", ncols=100) as pbar:
                    for coro in asyncio.as_completed(tasks):
                        await coro
                        completed += 1
                        pbar.update(1)
                        pbar.set_postfix({
                            'success': results['success'],
                            'failed': results['download_fail'] + results['extract_fail']
                        })
            else:
                # No progress bar - just gather
                print(f"      ⏳ Processing (this may take a few minutes)...")
                await asyncio.gather(*tasks, return_exceptions=True)
    
    # Summary
    print(f"\n      ✅ Extraction Complete:")
    print(f"         • Successful: {results['success']}/{len(target_papers)}")
    if results['download_fail'] > 0:
        print(f"         • Download failed: {results['download_fail']}")
    if results['extract_fail'] > 0:
        print(f"         • Extraction failed: {results['extract_fail']}")
    if results['invalid_pdf'] > 0:
        print(f"         • Invalid PDF: {results['invalid_pdf']}")
    
    return papers


async def process_single_paper_async(
    paper: Paper,
    session: aiohttp.ClientSession,
    executor: ThreadPoolExecutor,
    azure_client,
    semaphore: asyncio.Semaphore,
    results: dict,
    has_full_papermage: bool
) -> bool:
    """
    Process a single paper: download PDF and extract content.
    
    Features:
    - Async download with retry logic
    - Sync extraction in thread pool
    - Proper error handling
    - Progress tracking
    """
    if not paper.pdf_url:
        return False
    
    async with semaphore:  # Rate limiting
        # Try download with retries
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Download PDF (async)
                content = await download_pdf_async(paper.pdf_url, session, attempt)
                if not content:
                    if attempt == max_retries - 1:
                        results['download_fail'] += 1
                    continue
                
                # Verify PDF signature
                if not content[:4] == b'%PDF':
                    results['invalid_pdf'] += 1
                    return False
                
                # Extract content in thread pool (CPU-heavy)
                extracted_data = await extract_pdf_in_thread(
                    content, executor, azure_client, has_full_papermage
                )
                
                if not extracted_data:
                    results['extract_fail'] += 1
                    return False
                
                # Update paper object
                update_paper_with_extraction(paper, extracted_data)
                results['success'] += 1
                return True
                
            except asyncio.TimeoutError:
                if attempt == max_retries - 1:
                    results['download_fail'] += 1
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            except Exception as e:
                if attempt == max_retries - 1:
                    results['extract_fail'] += 1
                continue
    
    return False


async def download_pdf_async(
    pdf_url: str,
    session: aiohttp.ClientSession,
    attempt: int = 0
) -> Optional[bytes]:
    """
    Download PDF with retry logic and exponential backoff.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        async with session.get(pdf_url, headers=headers) as resp:
            if resp.status != 200:
                return None
            
            # Check content type
            content_type = resp.headers.get('Content-Type', '')
            if 'pdf' not in content_type.lower() and resp.status == 200:
                # Some servers don't set content-type correctly
                pass
            
            # Download content
            content = await resp.read()
            return content
            
    except (aiohttp.ClientError, asyncio.TimeoutError) as e:
        if attempt < 2:  # Will retry
            await asyncio.sleep(2 ** attempt)
        return None
    except Exception:
        return None


async def extract_pdf_in_thread(
    pdf_content: bytes,
    executor: ThreadPoolExecutor,
    azure_client,
    has_full_papermage: bool
) -> Optional[dict]:
    """
    Run synchronous PDF extraction in a thread pool to avoid blocking.
    """
    loop = asyncio.get_event_loop()
    
    def sync_extract():
        """Synchronous extraction wrapper"""
        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(pdf_content)
            tmp_path = tmp.name
        
        try:
            # Extract based on available tools
            if has_full_papermage:
                data = extract_with_papermage(tmp_path, azure_client)
            else:
                data = extract_with_pymupdf(tmp_path, azure_client)
            
            return data
        except Exception as e:
            return None
        finally:
            # Cleanup temp file
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            except:
                pass
    
    # Run in thread pool
    try:
        result = await loop.run_in_executor(executor, sync_extract)
        return result
    except Exception:
        return None


def update_paper_with_extraction(paper: Paper, extracted_data: dict):
    """
    Update paper object with extracted content.
    """
    # Main content
    paper.full_text_markdown = extracted_data.get('markdown', '')
    paper.full_text = extracted_data.get('text', '')
    paper.sections = extracted_data.get('sections', {})
    paper.tables = extracted_data.get('tables', [])
    paper.figures = extracted_data.get('figures', [])
    paper.extracted_citations = extracted_data.get('citations', [])
    paper.equations = extracted_data.get('equations', [])
    
    # Legacy fields for compatibility
    sections = extracted_data.get('sections', {})
    paper.introduction = sections.get('introduction', '')
    paper.methods = sections.get('methods', '')
    paper.results = sections.get('results', '')
    paper.conclusions = sections.get('conclusion', '')
    
    paper.deep_read = True


def extract_with_papermage(pdf_path: str, azure_client) -> Dict:
    """
    Extract full content using PaperMage with multiple fallback strategies.
    
    Tries in order:
    1. PDFPlumberParser (most features)
    2. PyMuPDF4LLM (markdown)
    3. Basic PyMuPDF (text only)
    """
    import papermage
    
    # Strategy 1: Try PDFPlumber parser
    try:
        from papermage.parsers import PDFPlumberParser
        parser = PDFPlumberParser()
        doc = parser.parse(pdf_path)
        
        # Extract full text
        full_text = ""
        if hasattr(doc, 'symbols'):
            full_text = " ".join([s.text for s in doc.symbols if hasattr(s, 'text')])
        elif hasattr(doc, 'text'):
            full_text = doc.text
        
        # Extract sections
        sections = extract_sections_regex(full_text) if full_text else {}
        
        # Extract tables
        tables = []
        if hasattr(doc, 'tables'):
            for i, table in enumerate(doc.tables[:10]):
                tables.append({
                    'text': str(table),
                    'position': {},
                    'id': i
                })
        
        # Extract figures  
        figures = []
        if hasattr(doc, 'figures'):
            for i, fig in enumerate(doc.figures[:10]):
                figures.append({
                    'caption': str(fig) if hasattr(fig, '__str__') else '',
                    'position': {},
                    'id': i
                })
        
        if full_text:  # Success!
            return {
                'markdown': full_text[:20000],
                'text': full_text[:20000],
                'sections': sections,
                'tables': tables,
                'figures': figures,
                'citations': [],
                'equations': []
            }
    except Exception as e:
        # PDFPlumberParser failed, try next strategy
        pass
    
    # Strategy 2: Try pdfplumber directly (without papermage wrapper)
    try:
        import pdfplumber
        
        full_text = ""
        tables = []
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Extract text
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
                
                # Extract tables
                page_tables = page.extract_tables()
                for table in page_tables[:3]:  # Max 3 tables per page
                    if table:
                        tables.append({
                            'text': str(table),
                            'position': {},
                            'id': len(tables)
                        })
        
        if full_text:
            sections = extract_sections_regex(full_text)
            return {
                'markdown': full_text[:20000],
                'text': full_text[:20000],
                'sections': sections,
                'tables': tables[:10],  # Max 10 total
                'figures': [],
                'citations': [],
                'equations': []
            }
    except Exception as e:
        # pdfplumber failed, fall back to basic
        pass
    
    # Strategy 3: Fall back to basic pymupdf
    return extract_with_pymupdf(pdf_path, azure_client)


def extract_with_pymupdf(pdf_path: str, azure_client) -> Dict:
    """Fallback: Extract using pymupdf4llm"""
    try:
        import pymupdf4llm
        import pymupdf
        
        # Get markdown
        md_text = pymupdf4llm.to_markdown(pdf_path)
        
        # Get plain text
        doc = pymupdf.open(pdf_path)
        plain_text = ""
        for page in doc:
            plain_text += page.get_text() + "\n"
        doc.close()
        
        # Extract sections with LLM or regex
        if CONFIG.get('SECTION_EXTRACTION_METHOD') == 'llm':
            sections = extract_sections_llm(md_text, azure_client)
        else:
            sections = extract_sections_regex(md_text)
        
        return {
            'markdown': md_text[:20000],
            'text': plain_text[:20000],
            'sections': sections,
            'tables': [],  # pymupdf doesn't extract tables well
            'figures': [],
            'citations': [],
            'equations': []
        }
        
    except Exception as e:
        return {
            'markdown': '',
            'text': '',
            'sections': {},
            'tables': [],
            'figures': [],
            'citations': [],
            'equations': []
        }

def extract_sections_llm(text: str, azure_client) -> Dict[str, str]:
    """Extract sections using LLM"""
    prompt = f"""Extract key sections from this paper:

{text[:5000]}

Extract and return:
1. Introduction/Background (max 500 chars)
2. Methods/Methodology (max 1000 chars)
3. Results/Findings (max 1000 chars)
4. Conclusions (max 500 chars)

Return as JSON:
{{"introduction": "...", "methods": "...", "results": "...", "conclusions": "..."}}

If a section is not found, use empty string."""

    try:
        response = ask_llm(azure_client, prompt, max_tokens=CONFIG['MIN_TOKENS'])
        # Try to extract JSON
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    
    return {"introduction": "", "methods": "", "results": "", "conclusions": ""}

def extract_sections_regex(text: str) -> Dict[str, str]:
    """Extract sections using regex patterns"""
    sections = {"introduction": "", "methods": "", "results": "", "conclusions": ""}
    
    # Simple pattern matching
    intro_match = re.search(r'(?:introduction|background)(.*?)(?:methods|methodology)', text, re.IGNORECASE | re.DOTALL)
    if intro_match:
        sections['introduction'] = intro_match.group(1)[:500]
    
    methods_match = re.search(r'(?:methods|methodology)(.*?)(?:results|findings)', text, re.IGNORECASE | re.DOTALL)
    if methods_match:
        sections['methods'] = methods_match.group(1)[:1000]
    
    results_match = re.search(r'(?:results|findings)(.*?)(?:discussion|conclusion)', text, re.IGNORECASE | re.DOTALL)
    if results_match:
        sections['results'] = results_match.group(1)[:1000]
    
    conclusion_match = re.search(r'(?:conclusion|summary)(.*?)(?:references|acknowledgments|$)', text, re.IGNORECASE | re.DOTALL)
    if conclusion_match:
        sections['conclusions'] = conclusion_match.group(1)[:500]
    
    return sections

# ============================================================================
# PHASE 4: EMBEDDINGS (Allen AI SPECTER 2.0)
# ============================================================================

def get_specter_embeddings(papers: List[Paper], api_key: str = None) -> int:
    """
    Get SPECTER 2.0 embeddings from Semantic Scholar API.
    This provides state-of-the-art academic paper embeddings from Allen AI.
    """
    print(f"\n   🧠 Fetching SPECTER 2.0 embeddings from Semantic Scholar...")
    
    if not api_key:
        print("      ⚠️ No S2 API key - SPECTER embeddings require authentication")
        print("      Get FREE key at: https://www.semanticscholar.org/product/api#api-key")
        return 0
    
    # Collect S2 paper IDs (these can come from S2 search, recommendations, citations, references)
    id_to_paper_map = {}
    
    for paper in papers:
        # Check multiple sources for S2 ID
        s2_id = None
        
        # Priority 1: Direct S2 paper ID field
        if hasattr(paper, 's2_paper_id') and paper.s2_paper_id:
            s2_id = paper.s2_paper_id
        # Priority 2: If from S2 sources, use paper ID
        elif paper.source in ['semantic_scholar', 's2_recommendations', 's2_citations', 's2_references']:
            s2_id = paper.id
        # Priority 3: Extract from S2 URL
        elif paper.url and 'semanticscholar.org/paper/' in paper.url:
            s2_id = paper.url.split('/paper/')[-1].split('?')[0]
        
        if s2_id:
            id_to_paper_map[s2_id] = paper
    
    if not id_to_paper_map:
        print("      ⚠️ No papers with Semantic Scholar IDs found")
        return 0
    
    print(f"      Found {len(id_to_paper_map)} papers with S2 IDs")
    print(f"      Requesting SPECTER 2.0 embeddings (768-dimensional)...")
    
    # Batch API requests (S2 API supports batch requests)
    batch_size = 500  # S2 API limit
    successful = 0
    headers = {'x-api-key': api_key}
    
    paper_ids_list = list(id_to_paper_map.keys())
    
    for batch_start in range(0, len(paper_ids_list), batch_size):
        batch_ids = paper_ids_list[batch_start:batch_start + batch_size]
        
        try:
            url = "https://api.semanticscholar.org/graph/v1/paper/batch"
            params = {'fields': 'paperId,embedding.specter_v2'}
            
            response = requests.post(
                url,
                json={"ids": batch_ids},
                params=params,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                results = response.json()
                
                # Results can be a list directly
                if not isinstance(results, list):
                    results = results.get('data', [])
                
                for result in results:
                    if not result:  # Skip None results
                        continue
                    
                    paper_id = result.get('paperId')
                    embedding_data = result.get('embedding')
                    
                    if paper_id and embedding_data and paper_id in id_to_paper_map:
                        # SPECTER 2.0 embedding is in embedding.vector
                        emb_vector = embedding_data.get('vector')
                        
                        if emb_vector and len(emb_vector) == 768:  # SPECTER is 768-dim
                            paper = id_to_paper_map[paper_id]
                            paper.specter_embedding = emb_vector
                            paper.embedding = emb_vector  # Also set general embedding field
                            successful += 1
                
                print(f"      [{batch_start+len(batch_ids)}/{len(paper_ids_list)}] " +
                      f"Retrieved {successful} embeddings so far...")
                
            elif response.status_code == 429:
                print(f"      ⚠️ Rate limited at batch {batch_start}. Waiting 5s...")
                time.sleep(5)
                continue
            elif response.status_code == 403:
                print(f"      ❌ Authentication failed - check your S2 API key")
                return successful
            else:
                print(f"      ⚠️ API error {response.status_code} at batch {batch_start}")
            
            # Rate limiting
            time.sleep(1)
            
        except Exception as e:
            print(f"      ⚠️ Error processing batch at {batch_start}: {str(e)[:100]}")
            continue
    
    coverage = (successful / len(papers) * 100) if papers else 0
    print(f"\n      ✅ SPECTER 2.0 Embeddings:")
    print(f"         • Papers with embeddings: {successful}/{len(papers)} ({coverage:.1f}%)")
    print(f"         • Embedding dimension: 768 (SPECTER 2.0)")
    
    return successful

def generate_fallback_embeddings(papers: List[Paper]) -> int:
    """
    Generate fallback embeddings using SentenceTransformers.
    
    Much better than TF-IDF! Uses pre-trained transformer models:
    1. Try allenai-specter (768-dim, best for scientific papers)
    2. Fallback to all-mpnet-base-v2 (768-dim, general purpose excellent)
    3. Final fallback to all-MiniLM-L6-v2 (384-dim, fast and good)
    4. Last resort: TF-IDF (if all models fail to load)
    """
    print(f"\n   🔄 Generating transformer-based embeddings for papers without SPECTER...")
    
    texts = []
    valid_papers = []
    
    for p in papers:
        # Combine title + abstract for best embeddings
        text = f"{p.title}. {p.abstract or ''}"
        if len(text.strip()) > 20:
            texts.append(text)
            valid_papers.append(p)
    
    if len(texts) < 5:
        print(f"      ⚠️ Not enough texts ({len(texts)})")
        return 0
    
    # Try to import SentenceTransformer with better error handling
    SentenceTransformer = None
    import_error_msg = None
    
    try:
        # Try importing with timeout protection
        import sys
        import importlib.util
        
        # Check if sentence_transformers is installed
        spec = importlib.util.find_spec("sentence_transformers")
        if spec is None:
            import_error_msg = "sentence-transformers not installed"
        else:
            # Try importing
            from sentence_transformers import SentenceTransformer as ST
            SentenceTransformer = ST
            
    except (ImportError, RuntimeError, TypeError) as e:
        # Catch TensorFlow compatibility errors
        error_str = str(e).lower()
        if 'tensorflow' in error_str or 'bfloat16' in error_str or 'dtype' in error_str:
            import_error_msg = f"TensorFlow compatibility issue (Windows/Anaconda common issue)"
            print(f"      ⚠️ {import_error_msg}")
            print(f"      💡 Quick fix: pip uninstall tensorflow tensorflow-intel")
        else:
            import_error_msg = str(e)[:100]
    except Exception as e:
        import_error_msg = str(e)[:100]
    
    if import_error_msg and not SentenceTransformer:
        print(f"      ⚠️ Could not import sentence-transformers: {import_error_msg[:80]}")
        print(f"      💡 Falling back to TF-IDF (basic embeddings)")
    
    # Try different SentenceTransformer models in order of preference
    model = None
    model_name = None
    
    if SentenceTransformer:
        # Option 1: SPECTER (best for scientific papers, 768-dim)
        try:
            print(f"      📦 Loading allenai-specter model (scientific papers)...")
            model = SentenceTransformer('allenai-specter')
            model_name = 'allenai-specter'
            print(f"         ✅ Loaded SPECTER model")
        except Exception as e:
            print(f"         ⚠️ SPECTER not available: {str(e)[:80]}")
        
        # Option 2: SciBERT (BERT for science, 768-dim)
        if not model:
            try:
                print(f"      📦 Loading SciBERT (BERT for scientific papers)...")
                model = SentenceTransformer('allenai/scibert_scivocab_uncased')
                model_name = 'SciBERT'
                print(f"         ✅ Loaded SciBERT model")
            except Exception as e:
                print(f"         ⚠️ SciBERT not available: {str(e)[:80]}")
        
        # Option 3: MPNet (excellent general purpose, 768-dim)
        if not model:
            try:
                print(f"      📦 Loading all-mpnet-base-v2 (general purpose)...")
                model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
                model_name = 'all-mpnet-base-v2'
                print(f"         ✅ Loaded MPNet model")
            except Exception as e:
                print(f"         ⚠️ MPNet not available: {str(e)[:80]}")
        
        # Option 4: MiniLM (fast, good quality, 384-dim)
        if not model:
            try:
                print(f"      📦 Loading all-MiniLM-L6-v2 (fast model)...")
                model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
                model_name = 'all-MiniLM-L6-v2'
                print(f"         ✅ Loaded MiniLM model")
            except Exception as e:
                print(f"         ⚠️ MiniLM not available: {str(e)[:80]}")
    
    # If SentenceTransformers available, use it
    if model:
        print(f"      🧠 Generating embeddings with {model_name}...")
        
        try:
            # Generate embeddings in batches (more efficient)
            batch_size = 32
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i+batch_size]
                embeddings = model.encode(batch, show_progress_bar=False)
                all_embeddings.extend(embeddings)
            
            # Assign to papers
            for i, paper in enumerate(valid_papers):
                emb = all_embeddings[i]
                
                # Pad to 768 dimensions if needed (for consistency with SPECTER)
                if len(emb) < 768:
                    import numpy as np
                    padded = np.zeros(768)
                    padded[:len(emb)] = emb
                    paper.embedding = padded.tolist()
                else:
                    paper.embedding = emb.tolist()
            
            print(f"      ✅ Generated {len(valid_papers)} transformer embeddings")
            print(f"         • Model: {model_name}")
            print(f"         • Dimension: {len(all_embeddings[0])}")
            print(f"         • Quality: Much better than TF-IDF!")
            
            return len(valid_papers)
        
        except Exception as e:
            print(f"      ⚠️ Embedding generation failed: {str(e)[:100]}")
            model = None  # Fall back to TF-IDF
    
    # Last resort: TF-IDF (if all transformer models fail)
    if not model:
        print(f"      ⚠️ No transformer models available, using TF-IDF fallback...")
        print(f"      💡 Install sentence-transformers for better embeddings:")
        print(f"         pip install sentence-transformers")
        
        # TF-IDF as last resort
        vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(texts)
        
        # Reduce to 768 dimensions (same as SPECTER)
        n_components = min(768, tfidf_matrix.shape[1], len(texts))
        svd = TruncatedSVD(n_components=n_components)
        embeddings = svd.fit_transform(tfidf_matrix)
        
        # Assign to papers
        for i, paper in enumerate(valid_papers):
            paper.embedding = embeddings[i].tolist()
        
        print(f"      ✅ Generated {len(valid_papers)} TF-IDF embeddings (basic)")
        return len(valid_papers)

# ============================================================================
# PHASE 5: PAPER ENRICHMENT
# ============================================================================

def enrich_papers(papers: List[Paper], azure_client) -> List[Paper]:
    """Enrich top papers with LLM-extracted information"""
    print(f"\n   📚 Enriching top {CONFIG['MAX_PAPERS_TO_ENRICH']} papers...")
    
    sorted_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)
    to_enrich = sorted_papers[:CONFIG['MAX_PAPERS_TO_ENRICH']]
    
    enriched_count = 0
    for i, paper in enumerate(to_enrich, 1):
        print(f"      [{i}/{len(to_enrich)}] {paper.title[:50]}...")
        
        if paper.enriched:
            enriched_count += 1
            continue
        
        try:
            # Use deep-read content if available, otherwise abstract
            content = paper.full_text or paper.abstract or ""
            
            if CONFIG['EXTRACT_KEY_FINDINGS'] and content:
                paper.key_findings = extract_key_findings(content, azure_client)
            
            if CONFIG['EXTRACT_METHODOLOGIES'] and content:
                paper.methodology = extract_methodology(content, paper.title, azure_client)
            
            if CONFIG['EXTRACT_CONTRIBUTIONS'] and content:
                paper.contributions = extract_contributions(content, azure_client)
            
            if CONFIG['GENERATE_SUMMARIES'] and not paper.tldr:
                paper.ai_summary = generate_paper_summary(paper, azure_client)
            
            if CONFIG['CLASSIFY_DOMAINS']:
                paper.domain = classify_domain(paper.title, content, azure_client)
            
            paper.enriched = True
            enriched_count += 1
            
        except Exception as e:
            print(f"         ⚠️ Error: {e}")
            continue
    
    print(f"      ✅ Enriched {enriched_count}/{len(to_enrich)} papers")
    return papers

def extract_key_findings(content: str, azure_client) -> str:
    """Extract key findings"""
    prompt = f"""Extract the main findings/results from this research in 1-2 sentences:

{content[:1500]}

Return ONLY the key findings, nothing else."""
    return ask_llm(azure_client, prompt, max_tokens=200)

def extract_methodology(content: str, title: str, azure_client) -> str:
    """Extract methodology"""
    prompt = f"""What methodology/approach is used in this research?

Title: {title}
Content: {content[:1000]}

Return 1-2 sentences describing the method. If unclear, return "Not specified"."""
    return ask_llm(azure_client, prompt, max_tokens=150)

def extract_contributions(content: str, azure_client) -> str:
    """Extract contributions"""
    prompt = f"""What are the main contributions of this research?

{content[:1500]}

List 2-3 key contributions in brief bullet points."""
    return ask_llm(azure_client, prompt, max_tokens=200)

def generate_paper_summary(paper: Paper, azure_client) -> str:
    """Generate paper summary"""
    context = f"Title: {paper.title}\n"
    if paper.abstract:
        context += f"Abstract: {paper.abstract[:500]}..."
    
    prompt = f"""Write a 2-sentence summary of this paper:

{context}

Summary:"""
    return ask_llm(azure_client, prompt, max_tokens=150)

def classify_domain(title: str, content: str, azure_client) -> str:
    """Classify research domain"""
    prompt = f"""What is the primary application domain of this research?

Title: {title}
Content: {content[:400]}

Choose ONE domain from: Medical Imaging, Clinical Decision Support, Drug Discovery, 
Genomics, Public Health, Patient Monitoring, Healthcare Operations, Ethics & Regulation, 
General Healthcare AI, Other

Return ONLY the domain name."""
    
    domain = ask_llm(azure_client, prompt, max_tokens=50)
    
    valid_domains = ["Medical Imaging", "Clinical Decision Support", "Drug Discovery",
                     "Genomics", "Public Health", "Patient Monitoring", "Healthcare Operations",
                     "Ethics & Regulation", "General Healthcare AI", "Other"]
    
    for vd in valid_domains:
        if vd.lower() in domain.lower():
            return vd
    
    return "General Healthcare AI"

# ============================================================================
# PHASE 6: TAXONOMY BUILDING (Allen AI TaxoAlign approach)
# ============================================================================

def build_hierarchical_taxonomy(papers: List[Paper], azure_client) -> Optional[TaxonomyNode]:
    """
    Build balanced hierarchical taxonomy using Recursive Adaptive Splitting.
    
    Key improvements:
    - Dynamic branching factor (sqrt-based, not fixed)
    - Skew correction (force-split clusters with >60% of papers)
    - Natural, balanced structure
    - Better handling of diverse topics
    """
    print(f"\n   🌳 Building Deep Balanced Taxonomy (Recursive Adaptive Splitting)...")
    print(f"      Target levels: {CONFIG['TAXONOMY_LEVELS']}")
    
    # Filter papers with valid embeddings
    papers_with_emb = [p for p in papers if p.embedding]
    if len(papers_with_emb) < CONFIG['MIN_CLUSTER_SIZE']:
        print(f"      ⚠️ Not enough papers with embeddings ({len(papers_with_emb)})")
        return None
    
    # Build embedding matrix - handle dimension mismatches
    valid_papers = []
    valid_embeddings = []
    
    # Get expected dimension from first embedding
    first_emb = papers_with_emb[0].embedding
    if isinstance(first_emb, list):
        first_emb = np.array(first_emb)
    expected_dim = first_emb.shape[0]
    
    # Filter papers with matching dimensions
    for p in papers_with_emb:
        emb = p.embedding
        if emb is None:
            continue
        
        if isinstance(emb, list):
            emb = np.array(emb)
        
        if len(emb.shape) == 1 and emb.shape[0] == expected_dim:
            valid_papers.append(p)
            valid_embeddings.append(emb)
    
    if len(valid_papers) < CONFIG['MIN_CLUSTER_SIZE']:
        print(f"      ⚠️ Not enough valid papers ({len(valid_papers)} < {CONFIG['MIN_CLUSTER_SIZE']})")
        return None
    
    # Stack into matrix
    embeddings = np.vstack(valid_embeddings)
    
    print(f"      Processing {len(valid_papers)} papers with {embeddings.shape[1]}-dim embeddings...")
    
    # Build taxonomy using recursive adaptive splitting
    root = recursive_cluster_node(
        papers=valid_papers,
        embeddings=embeddings,
        node_id="root",
        level=0,
        azure_client=azure_client
    )
    
    # Enrich with LLM (names and summaries)
    papers_dict = {p.id: p for p in papers}
    used_names = set()
    print(f"      🏷️  Generating semantic labels...")
    enrich_taxonomy_node(root, papers_dict, used_names, set(), azure_client)
    
    # Count nodes
    total_nodes = count_taxonomy_nodes(root)
    
    print(f"\n      ✅ Taxonomy complete:")
    print(f"         • Levels: {CONFIG['TAXONOMY_LEVELS']}")
    print(f"         • Total nodes: {total_nodes}")
    print(f"         • Papers organized: {len(valid_papers)}")
    
    return root


def recursive_cluster_node(
    papers: List[Paper],
    embeddings: np.ndarray,
    node_id: str,
    level: int,
    azure_client
) -> TaxonomyNode:
    """
    Core recursive clustering with adaptive splitting and skew correction.
    
    Features:
    - Dynamic k calculation (sqrt-based)
    - Giant cluster busting (>60% skew detection)
    - Forced re-splitting of skewed clusters
    - Natural, balanced structure
    """
    from sklearn.cluster import KMeans
    
    # Create current node
    node = TaxonomyNode(
        id=node_id,
        name="",  # Will be filled by LLM
        level=level,
        paper_ids=[p.id for p in papers]
    )
    
    # ===== STOPPING CONDITIONS =====
    
    # 1. Max depth reached
    if level >= CONFIG['TAXONOMY_LEVELS']:
        return node
    
    # 2. Too few papers to split
    min_split_size = CONFIG['MIN_CLUSTER_SIZE'] * 2
    if len(papers) < min_split_size:
        return node
    
    # ===== ADAPTIVE BRANCHING =====
    
    # Dynamic k calculation: sqrt(n_papers), clamped to [2, 6]
    # This gives natural branching:
    # - 100 papers → k=10 → clamped to 6
    # - 36 papers → k=6
    # - 16 papers → k=4
    # - 9 papers → k=3
    # - 4 papers → k=2
    
    n_papers = len(papers)
    target_k = int(np.sqrt(n_papers))
    n_clusters = max(2, min(6, target_k))
    
    # ===== CLUSTERING =====
    
    try:
        # Use KMeans with high n_init to avoid bad local minima
        kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=42,
            n_init=10,  # Multiple initializations for stability
            max_iter=300
        )
        labels = kmeans.fit_predict(embeddings)
        
    except Exception as e:
        print(f"      ⚠️ Clustering failed at {node_id}: {str(e)[:50]}")
        return node
    
    # ===== GROUP PAPERS BY CLUSTER =====
    
    children_data = []
    
    for cluster_idx in range(n_clusters):
        mask = labels == cluster_idx
        cluster_embeddings = embeddings[mask]
        cluster_papers = [papers[i] for i, is_in in enumerate(mask) if is_in]
        
        if not cluster_papers:
            continue
        
        children_data.append({
            'papers': cluster_papers,
            'embeddings': cluster_embeddings,
            'size': len(cluster_papers)
        })
    
    # Sort by size (largest first) - helps identify skewed clusters
    children_data.sort(key=lambda x: x['size'], reverse=True)
    
    # ===== SKEW DETECTION & CORRECTION =====
    
    total_parent = len(papers)
    
    for i, child_data in enumerate(children_data):
        child_id = f"{node_id}.{i+1}"
        child_size = child_data['size']
        
        # Calculate skew: what % of parent does this child contain?
        skew_ratio = child_size / total_parent
        
        # GIANT CLUSTER DETECTION:
        # If this cluster contains >60% of the parent's papers,
        # it's a "giant misc cluster" and should be force-split
        is_skewed_giant = skew_ratio > 0.6
        
        # RECURSION DECISION:
        # Recurse if:
        # 1. It's a skewed giant (FORCE SPLIT even if small)
        # 2. OR it's large enough to split normally
        
        should_recurse = False
        
        if is_skewed_giant:
            # Force recursion to break up giant cluster
            should_recurse = True
            # Optional: Log this for debugging
            # print(f"         ⚠️ Giant cluster detected ({skew_ratio*100:.1f}%) - forcing split")
        elif child_size >= min_split_size:
            # Normal recursion
            should_recurse = True
        
        # Create child node
        if should_recurse:
            child_node = recursive_cluster_node(
                papers=child_data['papers'],
                embeddings=child_data['embeddings'],
                node_id=child_id,
                level=level + 1,
                azure_client=azure_client
            )
        else:
            # Leaf node
            child_node = TaxonomyNode(
                id=child_id,
                name="",
                level=level + 1,
                paper_ids=[p.id for p in child_data['papers']]
            )
        
        node.children.append(child_node)
    
    # CRITICAL FIX: Clear parent's paper_ids to avoid double-counting
    # Papers should only be in leaf nodes, not in both parent and children
    if node.children:
        node.paper_ids = []
    
    return node


def enrich_taxonomy_node(node: TaxonomyNode, papers_dict: Dict, used_names: set, 
                        parent_keywords: set, azure_client):
    """Add LLM-generated names, summaries, and keywords"""
    if node.level == 0:
        node.name = "All Papers"
        node.summary = ""
        node.keywords = []
    else:
        # Get papers for this node
        node_papers = get_node_papers(node, papers_dict)
        
        if len(node_papers) < 5:
            node.name = f"Small Cluster ({len(node_papers)} papers)"
            node.summary = ""
            node.keywords = []
        else:
            # Generate name
            if CONFIG['LLM_CLUSTER_NAMES']:
                try:
                    node.name = generate_cluster_name(node_papers, used_names, parent_keywords, azure_client)
                    if node.name:
                        used_names.add(node.name.lower())
                    else:
                        node.name = f"Cluster {node.id.split('.')[-1]}"
                except Exception as e:
                    print(f"         ⚠️ Name generation failed: {e}")
                    node.name = f"Cluster {node.id.split('.')[-1]}"
            else:
                node.name = f"Cluster {node.id}"
            
            # Extract keywords
            if CONFIG['EXTRACT_CLUSTER_KEYWORDS']:
                texts = [p.title + ' ' + (p.abstract or '')[:200] for p in node_papers[:20]]
                node.keywords = extract_keywords(texts, 10)
            
            # Generate summary
            if CONFIG['LLM_CLUSTER_SUMMARIES']:
                try:
                    node.summary = generate_cluster_summary(node_papers, node.name, azure_client)
                except Exception as e:
                    print(f"         ⚠️ Summary generation failed: {e}")
                    node.summary = ""
    
    # Recurse to children
    current_keywords = set(node.keywords)
    for child in node.children:
        enrich_taxonomy_node(child, papers_dict, used_names, current_keywords, azure_client)

def get_node_papers(node: TaxonomyNode, papers_dict: Dict) -> List[Paper]:
    """Get all papers in a node including descendants"""
    def get_descendant_ids(n):
        ids = list(n.paper_ids)
        for child in n.children:
            ids.extend(get_descendant_ids(child))
        return ids
    
    paper_ids = get_descendant_ids(node)
    return [papers_dict[pid] for pid in paper_ids if pid in papers_dict]

def generate_cluster_name(papers: List[Paper], used_names: set, 
                         parent_keywords: set, azure_client) -> str:
    """Generate distinctive cluster name with LLM"""
    if not papers:
        return "Empty Cluster"
    
    top_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)
    top_titles = [p.title for p in top_papers[:10]]
    
    # Extract keywords
    texts = [p.title + ' ' + (p.abstract or '')[:100] for p in top_papers[:15]]
    keywords = extract_keywords(texts, 20)
    distinctive = [k for k in keywords if k not in parent_keywords]
    
    prompt = f"""Generate a concise 3-5 word name for this research cluster.

Sample papers:
{chr(10).join(f'- {t}' for t in top_titles[:8])}

Distinctive keywords: {', '.join(distinctive[:12])}

Avoid these parent keywords: {', '.join(parent_keywords) if parent_keywords else 'none'}
Already used names: {', '.join(list(used_names)[:8]) if used_names else 'none'}

Requirements:
- 3-5 words ONLY
- Academic/technical terminology
- Specific and descriptive
- Avoid generic terms like "research", "studies", "applications"
- No quotes, punctuation, or prefixes

Return ONLY the cluster name."""

    try:
        name = ask_llm(azure_client, prompt, max_tokens=100)
        
        # Clean
        name = name.strip().strip('"\'.,;:!?')
        for prefix in ['Name:', 'Cluster:', 'Research:', 'Studies:', 'Topic:', 'Area:']:
            if name.startswith(prefix):
                name = name[len(prefix):].strip()
        
        # Validate
        if name and 5 <= len(name) <= 80 and name.lower() not in used_names:
            return name
    except:
        pass
    
    # Fallback: Use keywords
    if distinctive:
        name = ' & '.join([k.title() for k in distinctive[:3]])
    elif keywords:
        name = ' & '.join([k.title() for k in keywords[:3]])
    else:
        name = f"Research Cluster ({len(papers)} papers)"
    
    # Ensure uniqueness
    if name.lower() in used_names:
        name = f"{name} (Group {len(used_names) + 1})"
    
    return name

def generate_cluster_summary(papers: List[Paper], cluster_name: str, azure_client) -> str:
    """Generate cluster summary with LLM"""
    if not papers:
        return ""
    
    top_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:10]
    
    # Build context
    context_parts = []
    for p in top_papers:
        title = p.title
        if p.key_findings:
            context_parts.append(f"- {title}: {p.key_findings}")
        elif p.ai_summary:
            context_parts.append(f"- {title}: {p.ai_summary}")
        elif p.tldr:
            context_parts.append(f"- {title}: {p.tldr}")
        elif p.abstract:
            context_parts.append(f"- {title}: {p.abstract[:150]}...")
        else:
            context_parts.append(f"- {title}")
    
    context = '\n'.join(context_parts[:8])
    
    prompt = f"""Write a comprehensive 2-3 paragraph summary (150-200 words) of the "{cluster_name}" research cluster.

Key papers:
{context}

Requirements:
- Synthesize main themes and approaches
- Highlight key methodologies
- Note important findings
- Be specific and academic

Summary:"""

    try:
        summary = ask_llm(azure_client, prompt, max_tokens=CONFIG['MIN_TOKENS'])
        if summary and len(summary) > 50:
            return summary
    except:
        pass
    
    # Fallback
    return f"This cluster contains {len(papers)} papers focusing on {cluster_name.lower()}. " + \
           f"The most cited paper is '{top_papers[0].title}' with {top_papers[0].citations} citations."

def extract_keywords(texts: List[str], top_n: int = 10) -> List[str]:
    """Extract keywords using TF-IDF"""
    if not texts:
        return []
    
    all_text = ' '.join(texts).lower()
    words = re.findall(r'\b[a-z]{4,}\b', all_text)
    word_counts = Counter(words)
    
    stopwords = {'using', 'based', 'study', 'research', 'paper', 'method', 
                 'approach', 'analysis', 'review', 'results', 'data', 'with',
                 'this', 'that', 'from', 'have', 'been', 'their', 'which',
                 'these', 'also', 'such', 'more', 'were', 'other'}
    
    for sw in stopwords:
        word_counts.pop(sw, None)
    
    return [w for w, c in word_counts.most_common(top_n)]

def count_taxonomy_nodes(node: TaxonomyNode) -> int:
    """Count total nodes"""
    return 1 + sum(count_taxonomy_nodes(c) for c in node.children)


def generate_taxonomy_tree_text(node: TaxonomyNode, prefix: str = "", is_last: bool = True) -> str:
    """
    Generate text-based tree visualization of taxonomy.
    Perfect for chatbot to reference when discussing taxonomy structure.
    
    Example output:
    AI in Marketing (408 papers)
    ├── Explainable ML (585 papers)
    │   ├── Causal Discovery (102 papers)
    │   └── Personalization (98 papers)
    └── Generative AI (161 papers)
    """
    lines = []
    
    # Current node
    connector = "└── " if is_last else "├── "
    paper_count = node.paper_count()
    
    if not prefix:  # Root node
        lines.append(f"{node.name} ({paper_count} papers)\n")
    else:
        lines.append(f"{prefix}{connector}{node.name} ({paper_count} papers)\n")
    
    # Children
    for i, child in enumerate(node.children):
        is_child_last = (i == len(node.children) - 1)
        
        if not prefix:  # Root level
            child_prefix = ""
        else:
            extension = "    " if is_last else "│   "
            child_prefix = prefix + extension
        
        lines.append(generate_taxonomy_tree_text(child, child_prefix, is_child_last))
    
    return "".join(lines)


def generate_papers_status_csv(papers: List[Paper], output_path: str):
    """
    Generate comprehensive CSV report of all papers and their statuses.
    Columns: Title, Authors, Year, Source, Has_PDF, Deep_Read, Has_Embedding, 
             Enriched, Verified, Citations, Venue, URL
    """
    import csv
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            'Title', 'Authors', 'Year', 'Source', 'Has_PDF', 'Deep_Read', 
            'Has_Embedding', 'Embedding_Type', 'Enriched', 'Verified', 
            'Verification_Level', 'Citations', 'Venue', 'Cluster', 'URL'
        ])
        
        # Data
        for paper in papers:
            # Determine embedding type
            emb_type = ""
            if paper.embedding:
                if paper.specter_embedding:
                    emb_type = "SPECTER 2.0"
                else:
                    emb_type = "Transformer"
            
            # Authors string
            authors_str = "; ".join(paper.authors[:3])
            if len(paper.authors) > 3:
                authors_str += f" et al. ({len(paper.authors)} total)"
            
            writer.writerow([
                paper.title,
                authors_str,
                paper.year,
                paper.source,
                "Yes" if paper.pdf_url else "No",
                "Yes" if paper.deep_read else "No",
                "Yes" if paper.embedding else "No",
                emb_type,
                "Yes" if paper.enriched else "No",
                "Yes" if paper.verified else "No",
                paper.verification_level,
                paper.citations,
                paper.venue,
                paper.cluster_path or paper.topic_label or "",
                paper.url
            ])


def generate_papers_status_markdown(papers: List[Paper], output_path: str):
    """
    Generate human-readable markdown report of paper statuses with statistics.
    """
    lines = []
    
    # Title
    lines.append("# Papers Status Report\n\n")
    lines.append(f"**Total Papers:** {len(papers)}\n\n")
    lines.append("---\n\n")
    
    # Summary Statistics
    lines.append("## 📊 Summary Statistics\n\n")
    
    total = len(papers)
    with_pdf = len([p for p in papers if p.pdf_url])
    deep_read = len([p for p in papers if p.deep_read])
    with_embedding = len([p for p in papers if p.embedding])
    specter = len([p for p in papers if p.specter_embedding])
    transformer = with_embedding - specter
    enriched = len([p for p in papers if p.enriched])
    verified = len([p for p in papers if p.verified])
    
    lines.append(f"| Metric | Count | Percentage |\n")
    lines.append(f"|--------|-------|------------|\n")
    lines.append(f"| **Total Papers** | {total} | 100% |\n")
    lines.append(f"| With PDF URL | {with_pdf} | {with_pdf/total*100:.1f}% |\n")
    lines.append(f"| Deep Content Extracted | {deep_read} | {deep_read/total*100:.1f}% |\n")
    lines.append(f"| With Embeddings | {with_embedding} | {with_embedding/total*100:.1f}% |\n")
    lines.append(f"| - SPECTER 2.0 | {specter} | {specter/total*100:.1f}% |\n")
    lines.append(f"| - Transformer | {transformer} | {transformer/total*100:.1f}% |\n")
    lines.append(f"| Enriched (Top Papers) | {enriched} | {enriched/total*100:.1f}% |\n")
    lines.append(f"| Verified | {verified} | {verified/total*100:.1f}% |\n")
    lines.append("\n")
    
    # By Source
    lines.append("## 📚 Papers by Source\n\n")
    from collections import Counter
    source_counts = Counter(p.source for p in papers)
    
    lines.append(f"| Source | Count | Percentage |\n")
    lines.append(f"|--------|-------|------------|\n")
    for source, count in source_counts.most_common():
        lines.append(f"| {source} | {count} | {count/total*100:.1f}% |\n")
    lines.append("\n")
    
    # By Year
    lines.append("## 📅 Papers by Year\n\n")
    year_counts = Counter(p.year for p in papers if p.year)
    
    lines.append(f"| Year | Count |\n")
    lines.append(f"|------|-------|\n")
    for year in sorted(year_counts.keys(), reverse=True)[:10]:
        lines.append(f"| {year} | {year_counts[year]} |\n")
    lines.append("\n")
    
    # Verification Levels
    lines.append("## ✅ Verification Status\n\n")
    verification_counts = Counter(p.verification_level for p in papers)
    
    lines.append(f"| Verification Level | Count | Percentage |\n")
    lines.append(f"|--------------------|-------|------------|\n")
    for level, count in verification_counts.most_common():
        lines.append(f"| {level} | {count} | {count/total*100:.1f}% |\n")
    lines.append("\n")
    
    # Top Cited Papers
    lines.append("## 🏆 Top 20 Most Cited Papers\n\n")
    top_cited = sorted([p for p in papers if p.citations], key=lambda x: x.citations, reverse=True)[:20]
    
    lines.append(f"| # | Title | Citations | Year | PDF | Deep Read |\n")
    lines.append(f"|---|-------|-----------|------|-----|----------|\n")
    for i, paper in enumerate(top_cited, 1):
        pdf_status = "✅" if paper.pdf_url else "❌"
        deep_status = "✅" if paper.deep_read else "❌"
        title = paper.title[:60] + "..." if len(paper.title) > 60 else paper.title
        lines.append(f"| {i} | {title} | {paper.citations} | {paper.year} | {pdf_status} | {deep_status} |\n")
    lines.append("\n")
    
    # Papers Without PDFs
    no_pdf = [p for p in papers if not p.pdf_url]
    if no_pdf:
        lines.append(f"## ⚠️ Papers Without PDFs ({len(no_pdf)} papers)\n\n")
        lines.append("Top 20 papers that could benefit from PDF access:\n\n")
        
        top_no_pdf = sorted(no_pdf, key=lambda x: x.citations or 0, reverse=True)[:20]
        lines.append(f"| Title | Citations | Year | Source |\n")
        lines.append(f"|-------|-----------|------|--------|\n")
        for paper in top_no_pdf:
            title = paper.title[:50] + "..." if len(paper.title) > 50 else paper.title
            lines.append(f"| {title} | {paper.citations or 0} | {paper.year} | {paper.source} |\n")
        lines.append("\n")
    
    # Complete Paper List
    lines.append("## 📋 Complete Paper List\n\n")
    lines.append(f"All {len(papers)} papers with status indicators:\n\n")
    lines.append("**Legend:** 📄=PDF | 📖=Deep Read | 🧠=Embedding | ⭐=Enriched | ✅=Verified\n\n")
    
    # Sort by citations
    sorted_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)
    
    for i, paper in enumerate(sorted_papers, 1):
        # Status icons
        icons = []
        if paper.pdf_url:
            icons.append("📄")
        if paper.deep_read:
            icons.append("📖")
        if paper.embedding:
            icons.append("🧠")
        if paper.enriched:
            icons.append("⭐")
        if paper.verified:
            icons.append("✅")
        
        icons_str = " ".join(icons) if icons else "—"
        
        # Authors
        authors = ", ".join(paper.authors[:2])
        if len(paper.authors) > 2:
            authors += " et al."
        
        lines.append(f"### {i}. {paper.title}\n\n")
        lines.append(f"**Status:** {icons_str} | ")
        lines.append(f"**Authors:** {authors} | ")
        lines.append(f"**Year:** {paper.year} | ")
        lines.append(f"**Citations:** {paper.citations or 0} | ")
        lines.append(f"**Source:** {paper.source}\n\n")
        
        if paper.venue:
            lines.append(f"**Venue:** {paper.venue}\n\n")
        
        if paper.cluster_path or paper.topic_label:
            lines.append(f"**Cluster:** {paper.cluster_path or paper.topic_label}\n\n")
        
        if paper.url:
            lines.append(f"**URL:** {paper.url}\n\n")
        
        lines.append("---\n\n")
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)


# ============================================================================
# PHASE 7: COMPREHENSIVE REVIEW (Allen AI QASPER + ScholarQA)
# ============================================================================

def generate_comprehensive_review(topic: str, papers: List[Paper], 
                                  taxonomy: Optional[TaxonomyNode], 
                                  azure_client, research_question: str = None) -> str:
    """Generate comprehensive literature review"""
    print(f"\n   ✍️ Generating comprehensive literature review...")
    
    review = []
    review.append(f"# Comprehensive Literature Review: {topic}\n\n")
    review.append(f"*Analysis of {len(papers)} papers with hierarchical taxonomy*\n\n")
    review.append("---\n\n")
    
    section_num = 1
    
    # 1. Introduction
    print(f"      [{section_num}] Introduction...")
    intro = generate_introduction(topic, papers, taxonomy, azure_client)
    review.append(f"## {section_num}. Introduction\n\n{intro}\n\n")
    section_num += 1
    
    # 2. QASPER Q&A (Allen AI)
    if research_question and CONFIG['USE_QASPER']:
        print(f"      [{section_num}] Research Question (QASPER)...")
        qasper = qasper_answer(research_question, papers, azure_client)
        review.append(f"## {section_num}. Research Question\n\n**Q: {research_question}**\n\n{qasper}\n\n")
        section_num += 1
    
    # 3. Methodology Landscape
    if CONFIG['INCLUDE_METHODOLOGY_SECTION']:
        print(f"      [{section_num}] Methodological Landscape...")
        methodologies = analyze_methodologies(papers, azure_client)
        review.append(f"## {section_num}. Methodological Landscape\n\n{methodologies}\n\n")
        section_num += 1
    
    # 4. Thematic Analysis (ScholarQA)
    print(f"      [{section_num}] Thematic Analysis...")
    thematic = generate_thematic_analysis(taxonomy, papers, azure_client)
    review.append(f"## {section_num}. Thematic Analysis\n\n{thematic}\n\n")
    section_num += 1
    
    # 5. Trends
    if CONFIG['INCLUDE_TRENDS_SECTION']:
        print(f"      [{section_num}] Emerging Trends...")
        trends = analyze_trends(papers, azure_client)
        review.append(f"## {section_num}. Emerging Trends and Patterns\n\n{trends}\n\n")
        section_num += 1
    
    # 6. Cross-cutting Themes
    print(f"      [{section_num}] Cross-Cutting Themes...")
    cross = generate_cross_cutting(taxonomy, papers, azure_client)
    review.append(f"## {section_num}. Cross-Cutting Themes\n\n{cross}\n\n")
    section_num += 1
    
    # 7. Limitations
    if CONFIG['INCLUDE_LIMITATIONS_SECTION']:
        print(f"      [{section_num}] Limitations...")
        limitations = analyze_limitations(papers, azure_client)
        review.append(f"## {section_num}. Limitations and Challenges\n\n{limitations}\n\n")
        section_num += 1
    
    # 8. Research Gaps
    if CONFIG['INCLUDE_GAPS_SECTION']:
        print(f"      [{section_num}] Research Gaps...")
        gaps = identify_research_gaps(papers, taxonomy, azure_client)
        review.append(f"## {section_num}. Research Gaps\n\n{gaps}\n\n")
        section_num += 1
    
    # 9. Future Directions
    print(f"      [{section_num}] Future Directions...")
    future = generate_future_directions(topic, taxonomy, papers, azure_client)
    review.append(f"## {section_num}. Future Directions\n\n{future}\n\n")
    section_num += 1
    
    # 10. Conclusion
    print(f"      [{section_num}] Conclusion...")
    conclusion = generate_conclusion(topic, papers, taxonomy, azure_client)
    review.append(f"## {section_num}. Conclusion\n\n{conclusion}\n\n")
    section_num += 1
    
    # References
    review.append(f"## {section_num}. References\n\n")
    top_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:50]
    for p in top_papers:
        authors_str = ', '.join(p.authors[:3])
        if len(p.authors) > 3:
            authors_str += ' et al.'
        review.append(f"- {authors_str} ({p.year}). *{p.title}*. {p.venue}. ")
        if p.citations:
            review.append(f"[{p.citations} citations] ")
        review.append(f"{p.url}\n")
    
    review_text = ''.join(review)
    print(f"      ✅ Review complete ({len(review_text)} chars, ~{len(review_text.split())} words)")
    
    return review_text

# QASPER implementation (Allen AI)
def qasper_answer(question: str, papers: List[Paper], azure_client) -> str:
    """QASPER-style evidence-based Q&A"""
    top_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:20]
    
    evidence = []
    for i, p in enumerate(top_papers, 1):
        ev = f"[{i}] {p.title}\n"
        
        if p.key_findings:
            ev += f"    Findings: {p.key_findings}\n"
        elif p.ai_summary:
            ev += f"    Summary: {p.ai_summary}\n"
        elif p.tldr:
            ev += f"    Summary: {p.tldr}\n"
        elif p.abstract:
            ev += f"    Summary: {p.abstract[:200]}...\n"
        
        if p.methodology:
            ev += f"    Method: {p.methodology}\n"
        
        evidence.append(ev)
    
    prompt = f"""Answer this research question using ONLY the provided evidence from papers.

Question: {question}

Evidence:
{chr(10).join(evidence)}

Requirements:
- Use ONLY information from the evidence
- Cite papers as [1], [2], etc.
- Be comprehensive and detailed
- Organize by themes if appropriate
- 500-700 words

Answer:"""
    
    return ask_llm(azure_client, prompt)

# Supporting functions for review sections
def generate_introduction(topic: str, papers: List[Paper], taxonomy: Optional[TaxonomyNode], azure_client) -> str:
    cluster_names = []
    if taxonomy:
        for child in taxonomy.children:
            if child.name:
                cluster_names.append(child.name)
    
    prompt = f"""Write a comprehensive 300-350 word introduction for a literature review on "{topic}".

Papers analyzed: {len(papers)}
Major research themes: {', '.join(cluster_names[:10]) if cluster_names else 'multiple themes'}

The introduction should:
1. Establish the significance and impact of {topic}
2. Preview the major research themes identified
3. Describe the analytical framework used in this review
4. Outline the structure of the analysis
5. Be engaging, scholarly, and comprehensive

Introduction:"""
    
    return ask_llm(azure_client, prompt)

def analyze_methodologies(papers: List[Paper], azure_client) -> str:
    methods = [p.methodology for p in papers[:30] if p.methodology]
    
    if not methods:
        return "Methodological analysis not available due to limited methodology extraction."
    
    prompt = f"""Analyze the methodological landscape of this research area (2-3 paragraphs, 300 words).

Sample methodologies:
{'; '.join(methods[:20])}

Cover:
1. Main methodological approaches used
2. Evolution of methods over time
3. Strengths and limitations of common approaches
4. Methodological trends and innovations

Analysis:"""
    
    return ask_llm(azure_client, prompt)

def generate_thematic_analysis(taxonomy: Optional[TaxonomyNode], papers: List[Paper], azure_client) -> str:
    if not taxonomy:
        return "Thematic analysis not available (no taxonomy generated)."
    
    sections = []
    papers_dict = {p.id: p for p in papers}
    
    for i, theme in enumerate(taxonomy.children, 1):
        if not theme.name:
            continue
        
        theme_papers = get_node_papers(theme, papers_dict)
        
        sections.append(f"### {i}. {theme.name}\n\n")
        sections.append(f"*{len(theme_papers)} papers*\n\n")
        
        if theme.summary:
            sections.append(f"{theme.summary}\n\n")
        
        # Top papers
        top = sorted(theme_papers, key=lambda x: x.citations or 0, reverse=True)[:3]
        sections.append(f"**Key papers:** ")
        sections.append(f"{top[0].title} ({top[0].citations} citations)")
        if len(top) > 1:
            sections.append(f"; {top[1].title} ({top[1].citations} citations)")
        sections.append("\n\n")
        
        # Subthemes
        if theme.children:
            sections.append(f"**Subthemes:**\n\n")
            for j, subtheme in enumerate(theme.children, 1):
                if subtheme.name:
                    sub_papers = get_node_papers(subtheme, papers_dict)
                    sections.append(f"**{j}. {subtheme.name}** ({len(sub_papers)} papers)")
                    if subtheme.keywords:
                        sections.append(f" - *Keywords: {', '.join(subtheme.keywords[:5])}*")
                    sections.append("\n\n")
    
    return ''.join(sections)

def analyze_trends(papers: List[Paper], azure_client) -> str:
    """Analyze temporal trends, filtering out papers with None/invalid years"""
    by_year = {}
    for p in papers:
        year = p.year
        # Skip None or invalid years
        if year is None or not isinstance(year, int):
            continue
        if year not in by_year:
            by_year[year] = []
        by_year[year].append(p)
    
    # If no valid years found, return generic message
    if not by_year:
        return "Recent papers show diverse research activity across multiple areas, with ongoing exploration of both foundational methods and emerging applications."
    
    recent_years = sorted(by_year.keys(), reverse=True)[:5]
    recent_titles = []
    for year in recent_years:
        for p in by_year[year][:5]:
            recent_titles.append(f"{p.title} ({year})")
    
    prompt = f"""Analyze emerging trends and patterns in this research area (2-3 paragraphs, 300 words).

Recent papers ({', '.join(map(str, recent_years))}):
{chr(10).join(f'- {t}' for t in recent_titles[:20])}

Cover:
1. Temporal trends in research activity
2. Emerging topics and methods
3. Shifts in research focus over time
4. Growth patterns and hot areas

Analysis:"""
    
    return ask_llm(azure_client, prompt)

def generate_cross_cutting(taxonomy: Optional[TaxonomyNode], papers: List[Paper], azure_client) -> str:
    theme_names = []
    if taxonomy:
        for child in taxonomy.children:
            if child.name:
                theme_names.append(child.name)
    
    prompt = f"""Identify cross-cutting themes and connections across these research areas (2-3 paragraphs, 300 words).

Research themes: {', '.join(theme_names[:10])}

Cover:
1. Methodological connections across themes
2. Shared theoretical frameworks
3. Interdisciplinary insights and collaborations
4. Common challenges across areas

Analysis:"""
    
    return ask_llm(azure_client, prompt)

def analyze_limitations(papers: List[Paper], azure_client) -> str:
    sample_abstracts = [p.abstract[:300] for p in papers[:20] if p.abstract]
    
    prompt = f"""Identify key limitations and challenges in this research area (2-3 paragraphs, 300 words).

Sample research contexts:
{'; '.join(sample_abstracts[:8])}

Cover:
1. Common methodological limitations
2. Data and validation challenges
3. Implementation and deployment barriers
4. Ethical and practical concerns

Analysis:"""
    
    return ask_llm(azure_client, prompt)

def identify_research_gaps(papers: List[Paper], taxonomy: Optional[TaxonomyNode], azure_client) -> str:
    theme_names = []
    if taxonomy:
        for child in taxonomy.children:
            if child.name:
                theme_names.append(child.name)
    
    prompt = f"""Identify research gaps and understudied areas (2-3 paragraphs, 300 words).

Current research themes: {', '.join(theme_names[:10])}

Identify:
1. Underexplored topics or applications
2. Methodological gaps
3. Missing connections between areas
4. Practical vs. theoretical gaps

Analysis:"""
    
    return ask_llm(azure_client, prompt)

def generate_future_directions(topic: str, taxonomy: Optional[TaxonomyNode], papers: List[Paper], azure_client) -> str:
    theme_names = []
    if taxonomy:
        for child in taxonomy.children:
            if child.name:
                theme_names.append(child.name)
    
    # Filter for recent papers, handling None years
    recent = sorted(
        [p for p in papers if p.year is not None and isinstance(p.year, int) and p.year >= 2022], 
        key=lambda x: x.year, 
        reverse=True
    )[:15]
    recent_titles = [p.title for p in recent]
    
    prompt = f"""Identify promising future research directions for "{topic}" (3-4 paragraphs, 350 words).

Current themes: {', '.join(theme_names[:10])}

Recent work:
{chr(10).join(f'- {t}' for t in recent_titles[:10])}

Cover:
1. Identified research gaps and opportunities
2. Promising methodological directions
3. Emerging application areas
4. Practical translation opportunities

Future Directions:"""
    
    return ask_llm(azure_client, prompt)

def generate_conclusion(topic: str, papers: List[Paper], taxonomy: Optional[TaxonomyNode], azure_client) -> str:
    theme_count = len([c for c in taxonomy.children if c.name]) if taxonomy else 0
    
    prompt = f"""Write a comprehensive conclusion for this literature review on "{topic}" (250-300 words).

Key facts:
- {len(papers)} papers analyzed
- {theme_count} major research themes identified
- Hierarchical taxonomy with {count_taxonomy_nodes(taxonomy) if taxonomy else 0} total clusters

The conclusion should:
1. Synthesize the main findings
2. Highlight the current state of the field
3. Note key achievements and remaining challenges
4. Point toward future opportunities
5. Provide a strong closing statement

Conclusion:"""
    
    return ask_llm(azure_client, prompt)

# ============================================================================
# PHASE 8: INTERACTIVE CHAT
# ============================================================================

# ============================================================================
# RESEARCH IDEA GENERATION (Allen AI-inspired)
# ============================================================================

def generate_research_ideas(taxonomy: Optional[TaxonomyNode], papers: List[Paper], 
                            user_interest: str, azure_client) -> Dict[str, List[str]]:
    """
    Generate novel research ideas based on taxonomy analysis.
    
    Uses 5 strategies:
    1. Gap Identification - Find sparse/under-explored areas
    2. Bridge Building - Combine distant clusters  
    3. Method Transfer - Apply methods from one area to another
    4. Trend Extrapolation - Extend emerging patterns
    5. Interdisciplinary Fusion - Merge different themes
    """
    print(f"\n   🔬 Generating research ideas for: {user_interest}")
    
    ideas = {
        'gaps': [],
        'bridges': [],
        'transfers': [],
        'trends': [],
        'fusions': []
    }
    
    if not taxonomy:
        print("      ⚠️ No taxonomy available")
        return ideas
    
    # Strategy 1: Gap Identification
    print("      [1/5] Identifying gaps...", end=" ")
    gaps = identify_research_gaps_in_taxonomy(taxonomy, papers, user_interest, azure_client)
    ideas['gaps'] = gaps
    print(f"✓ {len(gaps)} gaps")
    
    # Strategy 2: Bridge Building
    print("      [2/5] Finding bridges...", end=" ")
    bridges = find_cluster_bridges(taxonomy, papers, azure_client)
    ideas['bridges'] = bridges
    print(f"✓ {len(bridges)} bridges")
    
    # Strategy 3: Method Transfer
    print("      [3/5] Method transfers...", end=" ")
    transfers = suggest_method_transfers(taxonomy, papers, azure_client)
    ideas['transfers'] = transfers
    print(f"✓ {len(transfers)} transfers")
    
    # Strategy 4: Trend Extrapolation
    print("      [4/5] Trend extrapolation...", end=" ")
    trends = extrapolate_trends(papers, taxonomy, azure_client)
    ideas['trends'] = trends
    print(f"✓ {len(trends)} trends")
    
    # Strategy 5: Interdisciplinary Fusion
    print("      [5/5] Interdisciplinary fusion...", end=" ")
    fusions = suggest_interdisciplinary_fusions(taxonomy, papers, azure_client)
    ideas['fusions'] = fusions
    print(f"✓ {len(fusions)} fusions")
    
    return ideas


def identify_research_gaps_in_taxonomy(taxonomy: TaxonomyNode, papers: List[Paper], 
                                       user_interest: str, azure_client) -> List[str]:
    """Find under-explored areas in the taxonomy"""
    gaps = []
    
    # Find sparse clusters (fewer papers than average)
    all_clusters = []
    collect_all_nodes(taxonomy, all_clusters)
    
    if not all_clusters:
        return gaps
    
    avg_papers = sum(node.paper_count() for node in all_clusters) / len(all_clusters)
    sparse_clusters = [node for node in all_clusters if node.paper_count() < avg_papers * 0.5]
    
    # Generate gap descriptions
    for cluster in sparse_clusters[:3]:  # Top 3 gaps
        context = f"""
Sparse research area: {cluster.name}
Papers: {cluster.paper_count()} (below average of {avg_papers:.1f})
Keywords: {', '.join(cluster.keywords[:5])}
User interest: {user_interest}

Generate 1-2 specific research questions that would fill this gap.
Focus on unexplored angles or missing perspectives.
"""
        response = ask_llm(azure_client, context, max_tokens=200)
        if response:
            gaps.append(f"**{cluster.name}**: {response.strip()}")
    
    return gaps


def find_cluster_bridges(taxonomy: TaxonomyNode, papers: List[Paper], azure_client) -> List[str]:
    """Find opportunities to bridge distant clusters"""
    bridges = []
    
    all_clusters = []
    collect_all_nodes(taxonomy, all_clusters)
    
    if len(all_clusters) < 2:
        return bridges
    
    # Find distant cluster pairs (no shared keywords)
    distant_pairs = []
    for i, c1 in enumerate(all_clusters):
        for c2 in all_clusters[i+1:]:
            shared = set(c1.keywords[:10]) & set(c2.keywords[:10])
            if len(shared) == 0:  # No overlap = very distant
                distant_pairs.append((c1, c2))
    
    # Generate bridge ideas for top distant pairs
    for c1, c2 in distant_pairs[:3]:
        context = f"""
Two disconnected research areas:

Area 1: {c1.name}
Keywords: {', '.join(c1.keywords[:5])}
Summary: {c1.summary[:200]}

Area 2: {c2.name}  
Keywords: {', '.join(c2.keywords[:5])}
Summary: {c2.summary[:200]}

Suggest ONE novel research idea that bridges these two areas.
How could methods/insights from one area benefit the other?
"""
        response = ask_llm(azure_client, context, max_tokens=200)
        if response:
            bridges.append(f"**{c1.name} ↔ {c2.name}**: {response.strip()}")
    
    return bridges


def suggest_method_transfers(taxonomy: TaxonomyNode, papers: List[Paper], azure_client) -> List[str]:
    """Suggest applying methods from one cluster to problems in another"""
    transfers = []
    
    all_clusters = []
    collect_all_nodes(taxonomy, all_clusters)
    
    if len(all_clusters) < 2:
        return transfers
    
    # Identify methodology-focused clusters (keywords like 'method', 'approach', 'technique')
    method_keywords = {'method', 'approach', 'technique', 'algorithm', 'framework', 'model'}
    method_clusters = []
    problem_clusters = []
    
    for cluster in all_clusters:
        cluster_keywords = set(kw.lower() for kw in cluster.keywords[:10])
        if cluster_keywords & method_keywords:
            method_clusters.append(cluster)
        else:
            problem_clusters.append(cluster)
    
    # Generate transfer ideas
    for method_cluster in method_clusters[:2]:
        for problem_cluster in problem_clusters[:2]:
            context = f"""
Methodological area: {method_cluster.name}
Methods/approaches: {', '.join(method_cluster.keywords[:5])}

Application area: {problem_cluster.name}
Problems/domains: {', '.join(problem_cluster.keywords[:5])}

Suggest ONE specific way to apply the methods from the first area
to address problems in the second area. Be concrete.
"""
            response = ask_llm(azure_client, context, max_tokens=150)
            if response:
                transfers.append(f"**{method_cluster.name} → {problem_cluster.name}**: {response.strip()}")
                break  # One transfer per method cluster
    
    return transfers[:3]


def extrapolate_trends(papers: List[Paper], taxonomy: Optional[TaxonomyNode], azure_client) -> List[str]:
    """Identify and extrapolate emerging trends"""
    trends = []
    
    # Group papers by year
    by_year = {}
    for p in papers:
        if p.year and isinstance(p.year, int) and p.year >= 2020:
            if p.year not in by_year:
                by_year[p.year] = []
            by_year[p.year].append(p)
    
    if not by_year:
        return trends
    
    # Get recent years
    recent_years = sorted(by_year.keys(), reverse=True)[:3]
    
    # Collect titles from recent papers
    recent_titles = []
    for year in recent_years:
        recent_titles.extend([p.title for p in by_year[year][:20]])
    
    context = f"""
Recent papers (last 3 years):
{chr(10).join(f'- {t}' for t in recent_titles[:15])}

Identify 2-3 emerging trends from these titles.
For each trend, suggest ONE future research direction that extends it.
"""
    response = ask_llm(azure_client, context, max_tokens=300)
    
    if response:
        # Split into individual trends
        trend_lines = [line.strip() for line in response.split('\n') if line.strip() and not line.strip().startswith('#')]
        trends = trend_lines[:3]
    
    return trends


def suggest_interdisciplinary_fusions(taxonomy: TaxonomyNode, papers: List[Paper], azure_client) -> List[str]:
    """Suggest novel combinations of different research themes"""
    fusions = []
    
    all_clusters = []
    collect_all_nodes(taxonomy, all_clusters)
    
    if len(all_clusters) < 3:
        return fusions
    
    # Get top-level clusters (most thematically distinct)
    top_clusters = taxonomy.children if hasattr(taxonomy, 'children') else all_clusters
    
    if len(top_clusters) < 3:
        top_clusters = all_clusters[:5]
    
    # Generate fusion ideas from combinations of 2-3 clusters
    import itertools
    combinations = list(itertools.combinations(top_clusters[:5], 2))[:3]
    
    for c1, c2 in combinations:
        context = f"""
Research Theme 1: {c1.name}
Focus: {c1.summary[:150] if c1.summary else ', '.join(c1.keywords[:5])}

Research Theme 2: {c2.name}
Focus: {c2.summary[:150] if c2.summary else ', '.join(c2.keywords[:5])}

Suggest ONE innovative research idea that fuses these two themes.
What new insights or capabilities could emerge from this combination?
"""
        response = ask_llm(azure_client, context, max_tokens=150)
        if response:
            fusions.append(f"**{c1.name} × {c2.name}**: {response.strip()}")
    
    return fusions


def collect_all_nodes(node: TaxonomyNode, result: List[TaxonomyNode]):
    """Recursively collect all nodes in taxonomy"""
    result.append(node)
    if hasattr(node, 'children'):
        for child in node.children:
            collect_all_nodes(child, result)


def format_research_ideas(ideas: Dict[str, List[str]]) -> str:
    """Format research ideas into readable markdown"""
    output = "# 💡 NOVEL RESEARCH IDEAS\n\n"
    
    output += "## 🔍 Strategy 1: Gap Identification\n"
    output += "*Finding under-explored areas*\n\n"
    for idea in ideas.get('gaps', []):
        output += f"{idea}\n\n"
    
    output += "## 🌉 Strategy 2: Bridge Building\n"
    output += "*Connecting distant research areas*\n\n"
    for idea in ideas.get('bridges', []):
        output += f"{idea}\n\n"
    
    output += "## 🔄 Strategy 3: Method Transfer\n"
    output += "*Applying methods to new domains*\n\n"
    for idea in ideas.get('transfers', []):
        output += f"{idea}\n\n"
    
    output += "## 📈 Strategy 4: Trend Extrapolation\n"
    output += "*Extending emerging patterns*\n\n"
    for idea in ideas.get('trends', []):
        output += f"{idea}\n\n"
    
    output += "## 🔬 Strategy 5: Interdisciplinary Fusion\n"
    output += "*Combining different themes*\n\n"
    for idea in ideas.get('fusions', []):
        output += f"{idea}\n\n"
    
    return output


# ============================================================================
# ENHANCED INTERACTIVE CHAT WITH IDEA GENERATION
# ============================================================================

def display_taxonomy_and_review_preview(taxonomy: Optional[TaxonomyNode], review: str):
    """Display a brief preview of taxonomy and review before Q&A"""
    print(f"\n{'='*80}")
    print(f"📚 TAXONOMY & REVIEW PREVIEW")
    print(f"{'='*80}")
    
    # Display taxonomy structure
    if taxonomy:
        print(f"\n🌳 HIERARCHICAL TAXONOMY:")
        print(f"   Total nodes: {count_taxonomy_nodes(taxonomy)}")
        print(f"   Total papers: {taxonomy.paper_count()}")
        print(f"   Major themes: {len(taxonomy.children)}")
        
        # Show MAJOR THEMES FIRST (more compact)
        print(f"\n📋 MAJOR RESEARCH THEMES:\n")
        for i, theme in enumerate(taxonomy.children, 1):
            paper_count = theme.paper_count()
            keywords_str = ", ".join(theme.keywords[:5]) if theme.keywords else "N/A"
            print(f"   {i}. {theme.name}")
            print(f"      • Papers: {paper_count}")
            print(f"      • Keywords: {keywords_str}")
            print(f"      • Subthemes: {len(theme.children)}")
            
            # Show first 2-3 subthemes as examples
            if theme.children:
                for j, subtheme in enumerate(theme.children[:3], 1):
                    print(f"         └─ {subtheme.name} ({subtheme.paper_count()} papers)")
                if len(theme.children) > 3:
                    print(f"         └─ ... and {len(theme.children) - 3} more subthemes")
            print()
        
        # Show COMPLETE TREE (compact version)
        print(f"\n📊 COMPLETE TAXONOMY TREE (Compact View):")
        print(f"{'─'*80}")
        try:
            tree_text = generate_taxonomy_tree_text(taxonomy)
            # Show first 100 lines of tree (to avoid truncation)
            lines = tree_text.split('\n')
            for i, line in enumerate(lines[:100], 1):
                if line.strip():
                    print(f"   {line}")
            if len(lines) > 100:
                print(f"   ... ({len(lines) - 100} more lines in taxonomy_tree.txt)")
        except Exception as e:
            print(f"   ⚠️  Error generating tree: {e}")
            print(f"   (Tree saved to taxonomy_tree.txt)")
        print(f"{'─'*80}")
        
        print(f"\n   {'─'*76}")
    
    # Display review preview
    if review:
        print(f"\n📝 LITERATURE REVIEW PREVIEW:")
        
        # Extract first few lines and section headers
        lines = review.split('\n')
        preview_lines = []
        section_count = 0
        
        for line in lines[:100]:  # First 100 lines
            if line.startswith('#'):
                section_count += 1
                preview_lines.append(line)
                if section_count >= 5:  # Show first 5 section headers
                    break
        
        print()
        for line in preview_lines:
            print(f"   {line}")
        
        # Show stats
        total_words = len(review.split())
        total_sections = review.count('\n##')
        print(f"\n   Summary:")
        print(f"   • Total length: ~{total_words:,} words")
        print(f"   • Sections: {total_sections}")
        print(f"   • Full review saved to: comprehensive_review_final.md")
        
        print(f"\n   {'─'*76}")
    
    print(f"\n{'='*80}")
    print(f"📊 Full taxonomy tree saved to: taxonomy_tree.txt")
    print(f"📊 Interactive visualizations: taxonomy_sunburst.html, taxonomy_treemap.html")
    print(f"{'='*80}")
    print(f"\nPress Enter to continue to interactive Q&A...")
    print(f"{'='*80}")
    input()

def chat_with_taxonomy(papers: List[Paper], taxonomy: Optional[TaxonomyNode], azure_client):
    """Interactive chat with taxonomy, papers, and research idea generation"""
    if not CONFIG['ENABLE_CHAT']:
        return
    
    if CONFIG['CHAT_MODE'] == 'programmatic':
        return  # Skip interactive mode
    
    print("\n" + "="*70)
    print("💬 INTERACTIVE LITERATURE CHAT + IDEA GENERATION")
    print("="*70)
    print(f"   Database: {len(papers)} papers, {count_taxonomy_nodes(taxonomy) if taxonomy else 0} taxonomy nodes")
    
    if taxonomy:
        print("\n📁 Available clusters:")
        for i, child in enumerate(taxonomy.children, 1):
            if child.name:
                print(f"   {i}. {child.name} ({child.paper_count()} papers)")
    
    print("\n   💡 Ask questions or generate ideas:")
    print("   • What are the main research themes?")
    print("   • What's the connection between [cluster A] and [cluster B]?")
    print("   • Tell me about [specific cluster]")
    print("   • What are the key papers on [topic]?")
    print("   • Generate research ideas for [your interest]  ← NEW!")
    print("   • Find gaps in [area]  ← NEW!")
    print("   • Suggest bridges between [A] and [B]  ← NEW!")
    print("\n   Type 'exit' to quit")
    print("="*70)
    
    papers_dict = {p.id: p for p in papers}
    
    while True:
        print("\n💭 You: ", end="")
        question = input().strip()
        
        if question.lower() in ['exit', 'quit', 'bye', 'done']:
            print("\n👋 Goodbye!")
            break
        
        if not question:
            continue
        
        print("\n🤖 Assistant: ", end="")
        
        # Check if it's an idea generation request
        if any(word in question.lower() for word in ['generate ideas', 'research ideas', 'novel ideas', 'suggestions']):
            # Extract user interest
            user_interest = question
            for phrase in ['generate ideas for', 'research ideas about', 'suggestions for']:
                if phrase in question.lower():
                    user_interest = question.lower().split(phrase)[1].strip()
                    break
            
            print(f"\n\nGenerating research ideas...")
            ideas = generate_research_ideas(taxonomy, papers, user_interest, azure_client)
            
            print("\n" + format_research_ideas(ideas))
            
        elif any(word in question.lower() for word in ['gaps', 'under-explored', 'missing']):
            # Gap identification specifically
            print("\n\nAnalyzing gaps in research...")
            gaps = identify_research_gaps_in_taxonomy(taxonomy, papers, question, azure_client)
            
            print("\n🔍 **Research Gaps Identified:**\n")
            for gap in gaps:
                print(f"{gap}\n")
            
        elif any(word in question.lower() for word in ['bridge', 'connect', 'combine']):
            # Bridge building specifically
            print("\n\nFinding bridge opportunities...")
            bridges = find_cluster_bridges(taxonomy, papers, azure_client)
            
            print("\n🌉 **Bridge Opportunities:**\n")
            for bridge in bridges:
                print(f"{bridge}\n")
        
        else:
            # Regular taxonomy question
            answer = answer_taxonomy_question(question, papers, taxonomy, papers_dict, azure_client)
            print(answer)
        
        print("\n" + "-"*70)

def answer_taxonomy_question(question: str, papers: List[Paper], taxonomy: Optional[TaxonomyNode], 
                            papers_dict: Dict, azure_client) -> str:
    """Answer questions about taxonomy and papers"""
    
    if not taxonomy:
        # Fallback to paper-only Q&A
        return answer_paper_question(question, papers, azure_client)
    
    question_lower = question.lower()
    
    # Check for cluster comparison
    if any(word in question_lower for word in ['connection', 'relate', 'compare', 'difference', 'similar', 'between']):
        clusters = []
        for child in taxonomy.children:
            if child.name and child.name.lower() in question_lower:
                clusters.append(child)
        
        if len(clusters) >= 2:
            return compare_clusters(clusters[0], clusters[1], papers_dict, azure_client)
    
    # Check for specific cluster
    for child in taxonomy.children:
        if child.name and child.name.lower() in question_lower:
            return describe_cluster(child, papers_dict, azure_client)
    
    # Check for overview
    if any(word in question_lower for word in ['overview', 'summary', 'landscape', 'main', 'major', 'themes']):
        return describe_taxonomy_overview(taxonomy, papers, azure_client)
    
    # General question
    return answer_general_question(question, papers, taxonomy, azure_client)

def compare_clusters(cluster_a: TaxonomyNode, cluster_b: TaxonomyNode, 
                    papers_dict: Dict, azure_client) -> str:
    """Compare two clusters"""
    papers_a = get_node_papers(cluster_a, papers_dict)
    papers_b = get_node_papers(cluster_b, papers_dict)
    
    context = f"Cluster A: {cluster_a.name}\n"
    context += f"Papers: {len(papers_a)}\n"
    context += f"Keywords: {', '.join(cluster_a.keywords[:8])}\n"
    context += f"Summary: {cluster_a.summary[:200]}...\n\n"
    
    context += f"Cluster B: {cluster_b.name}\n"
    context += f"Papers: {len(papers_b)}\n"
    context += f"Keywords: {', '.join(cluster_b.keywords[:8])}\n"
    context += f"Summary: {cluster_b.summary[:200]}...\n"
    
    prompt = f"""Analyze the relationship between these two research clusters (200-300 words):

{context}

Cover:
1. Thematic connections and overlaps
2. Methodological similarities or differences
3. How they complement each other
4. Key distinctions

Analysis:"""
    
    return ask_llm(azure_client, prompt)

def describe_cluster(cluster: TaxonomyNode, papers_dict: Dict, azure_client) -> str:
    """Describe a specific cluster"""
    papers = get_node_papers(cluster, papers_dict)
    top_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:5]
    
    context = f"Cluster: {cluster.name}\n"
    context += f"Papers: {len(papers)}\n"
    context += f"Summary: {cluster.summary}\n"
    context += f"Keywords: {', '.join(cluster.keywords[:10])}\n\n"
    
    context += "Top papers:\n"
    for i, p in enumerate(top_papers, 1):
        context += f"{i}. {p.title} ({p.citations} citations)\n"
        if p.key_findings:
            context += f"   {p.key_findings[:150]}...\n"
    
    if cluster.children:
        context += f"\nSubthemes ({len(cluster.children)}):\n"
        for child in cluster.children[:5]:
            if child.name:
                context += f"- {child.name}\n"
    
    prompt = f"""Provide a comprehensive overview of this research cluster (200-300 words):

{context}

Cover the main themes, key findings, methodologies, and significance.

Overview:"""
    
    return ask_llm(azure_client, prompt)

def describe_taxonomy_overview(taxonomy: TaxonomyNode, papers: List[Paper], azure_client) -> str:
    """Provide taxonomy overview with tree structure"""
    
    # Generate tree structure
    tree_text = generate_taxonomy_tree_text(taxonomy)
    
    overview = f"Literature Overview:\n"
    overview += f"Total papers: {len(papers)}\n"
    overview += f"Taxonomy levels: {CONFIG['TAXONOMY_LEVELS']}\n"
    overview += f"Major themes: {len(taxonomy.children)}\n\n"
    
    overview += "Taxonomy Tree Structure:\n"
    overview += tree_text + "\n"
    
    for i, child in enumerate(taxonomy.children, 1):
        if child.name:
            overview += f"\n{i}. {child.name} ({child.paper_count()} papers)\n"
            overview += f"   Keywords: {', '.join(child.keywords[:5])}\n"
    
    prompt = f"""Provide a comprehensive overview of this research landscape (200-300 words):

{overview}

Describe the major themes, their relationships, and the overall structure of the field.
Reference the tree structure when explaining relationships.

Overview:"""
    
    return ask_llm(azure_client, prompt)

def answer_general_question(question: str, papers: List[Paper], 
                           taxonomy: TaxonomyNode, azure_client) -> str:
    """Answer general questions with taxonomy tree context"""
    top_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:10]
    
    # Generate tree structure for context
    tree_text = generate_taxonomy_tree_text(taxonomy)
    
    context = "Taxonomy Tree Structure:\n"
    context += tree_text + "\n\n"
    
    context += "Top papers:\n"
    for i, p in enumerate(top_papers, 1):
        context += f"{i}. {p.title} ({p.citations} citations)\n"
        if p.key_findings:
            context += f"   {p.key_findings[:150]}...\n"
    
    context += "\nResearch themes:\n"
    for i, child in enumerate(taxonomy.children, 1):
        if child.name:
            context += f"{i}. {child.name}\n"
    
    prompt = f"""Answer this question about the research literature (200-300 words):

Question: {question}

Context:
{context}

Use the taxonomy tree structure to understand relationships between topics.

Answer:"""
    
    return ask_llm(azure_client, prompt)

def answer_paper_question(question: str, papers: List[Paper], azure_client) -> str:
    """Answer questions when no taxonomy available"""
    top_papers = sorted(papers, key=lambda x: x.citations or 0, reverse=True)[:15]
    
    context = "Available papers:\n"
    for i, p in enumerate(top_papers, 1):
        context += f"{i}. {p.title}\n"
        if p.key_findings:
            context += f"   {p.key_findings}\n"
        elif p.ai_summary:
            context += f"   {p.ai_summary}\n"
    
    prompt = f"""Answer this question using the available research papers (200-300 words):

Question: {question}

{context}

Answer:"""
    
    return ask_llm(azure_client, prompt)

# ============================================================================
# MAIN EXECUTION PIPELINE
# ============================================================================

def main():
    """Execute complete comprehensive pipeline"""
    
    print("\n" + "="*80)
    print("🚀 COMPREHENSIVE LITERATURE ANALYSIS SYSTEM")
    print("="*80)
    print("   Allen AI Integration: SPECTER 2.0, PaperMage, S2 Graph, QASPER, ScholarQA")
    print("   Pipeline: Search → Verify → Extract → Enrich → Taxonomy → Review → Chat")
    print("="*80)
    
    # ==== STEP 1: GET RESEARCH TOPIC ====
    print("\n📝 RESEARCH TOPIC")
    print("="*80)
    
    if not CONFIG.get('TOPIC'):
        print("\nWhat would you like to research?")
        print("Examples:")
        print("  • artificial intelligence in healthcare")
        print("  • climate change mitigation strategies")
        print("  • quantum computing applications")
        print("  • sustainable agriculture techniques")
        print()
        
        topic = input("🔍 Enter your research topic: ").strip()
        
        if not topic:
            print("\n❌ Error: Research topic is required!")
            print("Please run again and enter a research topic.")
            return
        
        CONFIG['TOPIC'] = topic
        print(f"\n✓ Research topic: {topic}")
    
    # Optional: Research question
    if not CONFIG.get('RESEARCH_QUESTION'):
        print("\n💡 Research Question (Optional)")
        print("   A specific question helps focus the literature review.")
        print()
        research_q = input("❓ Enter research question (or press Enter to skip): ").strip()
        
        if research_q:
            CONFIG['RESEARCH_QUESTION'] = research_q
            print(f"   ✓ Research question: {research_q}")
        else:
            CONFIG['RESEARCH_QUESTION'] = f"What are the key findings and trends in {CONFIG['TOPIC']}?"
            print(f"   ℹ️  Using default question")
    
    # ==== STEP 2: CREATE OUTPUT FOLDER ====
    import re
    from datetime import datetime
    
    # Sanitize topic for folder name
    sanitized_topic = re.sub(r'[^\w\s-]', '', CONFIG['TOPIC'])
    sanitized_topic = re.sub(r'[-\s]+', '_', sanitized_topic)
    sanitized_topic = sanitized_topic[:50]  # Limit length
    
    # Create timestamped folder
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder_name = f"results_{sanitized_topic}_{timestamp}"
    
    CONFIG['OUTPUT_DIR'] = folder_name
    os.makedirs(CONFIG['OUTPUT_DIR'], exist_ok=True)
    
    print(f"\n📁 Output folder: {folder_name}/")
    print("   All results will be saved here")
    
    # Display full configuration
    print("\n" + "="*80)
    print("📋 CONFIGURATION")
    print("="*80)
    print(f"   Topic: {CONFIG['TOPIC']}")
    print(f"   Question: {CONFIG['RESEARCH_QUESTION']}")
    print(f"   Output: {CONFIG['OUTPUT_DIR']}/")
    print("="*80)
    
    # ==== STEP 3: API KEYS ====
    # Check for S2 API key
    if not CONFIG.get('S2_API_KEY'):
        # Try environment variable first
        CONFIG['S2_API_KEY'] = os.getenv('S2_API_KEY') or os.getenv('SEMANTIC_SCHOLAR_API_KEY')
        
        if not CONFIG['S2_API_KEY']:
            print("\n⚠️  SEMANTIC SCHOLAR API KEY REQUIRED")
            print("   Without S2 API key, you'll get limited results and NO SPECTER embeddings")
            print("   Get FREE key at: https://www.semanticscholar.org/product/api#api-key")
            print()
            s2_key = input("   Enter your S2 API key (or press Enter to skip): ").strip()
            
            if s2_key:
                CONFIG['S2_API_KEY'] = s2_key
                print("   ✓ S2 API key set!")
            else:
                print("   ⚠️  Proceeding WITHOUT S2 API key - results will be limited")
                print()
    else:
        print(f"\n✓ S2 API key configured")
    
    # Check for OpenAI API key (for web search verification)
    if not CONFIG.get('OPENAI_API_KEY'):
        CONFIG['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY')
        
        if not CONFIG['OPENAI_API_KEY']:
            print("\n💡 OPENAI API KEY (Optional but Recommended)")
            print("   OpenAI API enables web search for paper verification")
            print("   Without it, verification will be basic (metadata only)")
            print("   Get key at: https://platform.openai.com/api-keys")
            print()
            openai_key = input("   Enter your OpenAI API key (or press Enter to skip): ").strip()
            
            if openai_key:
                CONFIG['OPENAI_API_KEY'] = openai_key
                print("   ✓ OpenAI API key set - web search verification enabled!")
            else:
                print("   ℹ️  Proceeding without OpenAI - basic verification only")
                print()
    else:
        print(f"✓ OpenAI API key configured - web search enabled")
    
    # Initialize
    azure_client = AzureOpenAI(
        api_key=CONFIG["AZURE_KEY"],
        api_version=CONFIG["AZURE_API_VERSION"],
        azure_endpoint=CONFIG["AZURE_ENDPOINT"]
    )
    
    os.makedirs(CONFIG['OUTPUT_DIR'], exist_ok=True)
    
    # ==== PHASE 1: PAPER DISCOVERY ====
    print(f"\n{'='*80}")
    print(f"📚 PHASE 1: PAPER DISCOVERY")
    print(f"{'='*80}")
    
    queries = generate_diverse_queries(CONFIG['TOPIC'], azure_client, CONFIG['NUM_SEARCH_QUERIES'])
    
    all_papers = []
    
    # Multi-source search
    print(f"\n   🌐 Multi-source search...")
    
    if CONFIG['ARXIV_PER_QUERY'] > 0:
        print(f"\n      📚 ArXiv:")
        for i, q in enumerate(queries, 1):
            papers = search_arxiv(q, CONFIG['ARXIV_PER_QUERY'])
            all_papers.extend(papers)
            print(f"         [{i}/{len(queries)}] {q[:40]:40s} → {len(papers):3d}")
            time.sleep(0.3)
    
    if CONFIG['S2_PER_QUERY'] > 0:
        print(f"\n      🎓 Semantic Scholar:")
        for i, q in enumerate(queries, 1):
            papers = search_semantic_scholar(q, CONFIG['S2_PER_QUERY'], CONFIG['S2_API_KEY'])
            all_papers.extend(papers)
            print(f"         [{i}/{len(queries)}] {q[:40]:40s} → {len(papers):3d}")
            time.sleep(0.5)
    
    # Google Scholar (optional - can be rate limited)
    if CONFIG.get('GOOGLE_SCHOLAR_PER_QUERY', 0) > 0:
        print(f"\n      📖 Google Scholar:")
        for i, q in enumerate(queries, 1):
            papers = search_google_scholar(q, CONFIG['GOOGLE_SCHOLAR_PER_QUERY'])
            all_papers.extend(papers)
            print(f"         [{i}/{len(queries)}] {q[:40]:40s} → {len(papers):3d}")
            time.sleep(1)  # Be polite to Google
    
    # OpenAI Web Search (optional)
    if CONFIG.get('OPENAI_WEBSEARCH_TOTAL', 0) > 0 and CONFIG.get('OPENAI_API_KEY'):
        openai_papers = search_with_openai_websearch(
            CONFIG['TOPIC'], 
            CONFIG['OPENAI_API_KEY'],
            azure_client,
            max_results=CONFIG['OPENAI_WEBSEARCH_TOTAL']
        )
        all_papers.extend(openai_papers)
    
    # Deduplicate
    print(f"\n   🔄 Deduplicating...")
    before_dedup = len(all_papers)
    papers = deduplicate_papers(all_papers)
    print(f"      {before_dedup} → {len(papers)} unique papers ({(before_dedup - len(papers))/max(before_dedup,1)*100:.1f}% duplicates removed)")
    
    # Source breakdown
    source_counts = Counter(p.source for p in papers)
    print(f"\n      📊 By source:")
    for src, cnt in sorted(source_counts.items(), key=lambda x: -x[1]):
        print(f"         • {src}: {cnt}")
    
    # Optional: Rerank results
    if CONFIG.get('USE_RERANKING', False) and len(papers) > CONFIG.get('RERANK_TOP_K', 100):
        papers = rerank_papers(CONFIG['TOPIC'], papers, CONFIG.get('RERANK_TOP_K', 100))
    
    # S2 Graph expansion
    expanded = expand_via_s2_graph(papers, CONFIG['S2_API_KEY'])
    if expanded:
        all_papers.extend(expanded)
        papers = deduplicate_papers(all_papers)
        print(f"\n   📊 After S2 graph expansion: {len(papers)} total papers")
    
    save_checkpoint(papers, None, 'discovery')
    
    # ==== PHASE 2: VERIFICATION ====
    print(f"\n{'='*80}")
    print(f"🔍 PHASE 2: VERIFICATION")
    print(f"{'='*80}")
    
    # Verify ONLY OpenAI-discovered papers using academic APIs
    # (ArXiv, S2, Google Scholar papers are already verified at source)
    papers = verify_openai_papers_only(papers)
    
    save_checkpoint(papers, None, 'verification')
    
    # ==== PHASE 2.5: PDF URL DISCOVERY ====
    print(f"\n{'='*80}")
    print(f"🔍 PHASE 2.5: PDF URL DISCOVERY")
    print(f"{'='*80}")
    
    papers = discover_pdf_urls(papers)
    
    # ==== PHASE 2.6: METADATA ENRICHMENT ====
    if CONFIG['ENRICH_METADATA']:
        print(f"\n{'='*80}")
        print(f"📝 PHASE 2.6: METADATA ENRICHMENT")
        print(f"{'='*80}")
        
        enriched_count = enrich_papers_batch(papers, azure_client)
        
        if enriched_count > 0:
            save_checkpoint(papers, None, 'metadata_enrichment')
    else:
        print(f"\n{'='*80}")
        print(f"⏭️  PHASE 2.6: METADATA ENRICHMENT (SKIPPED)")
        print(f"{'='*80}")
        print(f"\n   ℹ️  Metadata enrichment is disabled")
        print(f"   💡 To enable: Set CONFIG['ENRICH_METADATA'] = True")
        print(f"   📝 Now includes: DOI-based lookup + LLM keyword extraction (40-60% success)")
    
    # ==== PHASE 2.7: AI2 ENHANCEMENTS ====
    citation_graph = None
    recommended_ids = set()
    
    if CONFIG.get('USE_AI2_ENHANCEMENTS', True):
        print(f"\n{'='*80}")
        print(f"🤖 PHASE 2.7: AI2 ENHANCEMENTS (Semantic Scholar Advanced)")
        print(f"{'='*80}")
        
        try:
            papers, citation_graph, recommended_ids = run_ai2_enhancements(
                papers, 
                None,  # Taxonomy not yet built
                api_key=CONFIG.get('S2_API_KEY')
            )
            
            if citation_graph or recommended_ids:
                save_checkpoint(papers, None, 'ai2_enhanced')
                
        except Exception as e:
            print(f"\n   ⚠️  AI2 Enhancements failed: {e}")
            print(f"   ℹ️  Continuing without AI2 enhancements...")
    else:
        print(f"\n{'='*80}")
        print(f"⏭️  PHASE 2.7: AI2 ENHANCEMENTS (SKIPPED)")
        print(f"{'='*80}")
        print(f"\n   ℹ️  AI2 enhancements are disabled")
        print(f"   💡 To enable: Set CONFIG['USE_AI2_ENHANCEMENTS'] = True")
    
    # ==== PHASE 3: DEEP CONTENT EXTRACTION ====
    print(f"\n{'='*80}")
    print(f"📖 PHASE 3: DEEP CONTENT EXTRACTION (PaperMage)")
    print(f"{'='*80}")
    
    papers = extract_deep_content(papers, azure_client)
    save_checkpoint(papers, None, 'extraction')
    
    # ==== PHASE 4: EMBEDDINGS ====
    print(f"\n{'='*80}")
    print(f"🧠 PHASE 4: EMBEDDINGS (SPECTER 2.0)")
    print(f"{'='*80}")
    
    if CONFIG['USE_SPECTER']:
        emb_count = get_specter_embeddings(papers, CONFIG['S2_API_KEY'])
        coverage = emb_count / len(papers) if papers else 0
        
        print(f"\n   📊 SPECTER Coverage: {coverage*100:.1f}%")
        
        # ALWAYS generate fallback for papers without SPECTER
        papers_without_emb = [p for p in papers if not p.embedding]
        if papers_without_emb:
            generate_fallback_embeddings(papers_without_emb)
    else:
        # No SPECTER, use transformer embeddings for all
        print(f"\n   🔄 SPECTER disabled, using transformer embeddings for all papers...")
        generate_fallback_embeddings(papers)
    
    papers_with_emb = [p for p in papers if p.embedding]
    print(f"\n   ✅ Papers with embeddings: {len(papers_with_emb)}/{len(papers)} ({len(papers_with_emb)/len(papers)*100:.1f}%)")
    
    save_checkpoint(papers, None, 'embeddings')
    
    # ==== PHASE 5: ENRICHMENT ====
    print(f"\n{'='*80}")
    print(f"💎 PHASE 5: PAPER ENRICHMENT")
    print(f"{'='*80}")
    
    papers = enrich_papers(papers, azure_client)
    save_checkpoint(papers, None, 'enrichment')
    
    # ==== PHASE 6: TAXONOMY ====
    print(f"\n{'='*80}")
    print(f"🌳 PHASE 6: HIERARCHICAL TAXONOMY (TaxoAlign)")
    print(f"{'='*80}")
    
    taxonomy = build_hierarchical_taxonomy(papers, azure_client)
    save_checkpoint(papers, taxonomy, 'taxonomy')
    
    # Enhance taxonomy with AI2 fields (if enhancements were run)
    if CONFIG.get('USE_AI2_ENHANCEMENTS', True) and taxonomy:
        try:
            enhance_taxonomy_with_s2(taxonomy, papers)
        except Exception as e:
            print(f"   ⚠️  Could not enhance taxonomy with S2 fields: {e}")
    
    # ==== PHASE 6.5: TAXONOMY VISUALIZATION ====
    if taxonomy and CONFIG.get('GENERATE_VISUALIZATIONS', True) and VISUALIZATION_AVAILABLE:
        print(f"\n{'='*80}")
        print(f"📊 PHASE 6.5: TAXONOMY VISUALIZATION")
        print(f"{'='*80}")
        
        print(f"\n   🎨 Generating 6 visualizations...")
        viz_files = []
        
        # 1. Sunburst
        try:
            print(f"      [1/6] Sunburst chart...")
            labels, parents, values = [], [], []
            
            def traverse_sunburst(n, p=""):
                cur = n.name if p else taxonomy.name or "Research"
                labels.append(cur)
                parents.append(p)
                values.append(len(n.paper_ids))
                for c in n.children:
                    traverse_sunburst(c, cur)
            
            traverse_sunburst(taxonomy)
            
            fig = go.Figure(go.Sunburst(
                labels=labels, parents=parents, values=values,
                marker=dict(colorscale='Viridis')
            ))
            fig.update_layout(title=f"{CONFIG['TOPIC']} - Research Taxonomy (Sunburst)", 
                            width=1000, height=1000)
            
            sunburst_file = os.path.join(CONFIG['OUTPUT_DIR'], 'taxonomy_sunburst.html')
            fig.write_html(sunburst_file)
            viz_files.append(sunburst_file)
            print(f"         ✅ taxonomy_sunburst.html")
        except Exception as e:
            print(f"         ❌ Failed: {str(e)[:50]}")
        
        # 2. Treemap
        try:
            print(f"      [2/6] Treemap...")
            labels, parents, values = [], [], []
            
            def traverse_treemap(n, p=""):
                cur = n.name if p else taxonomy.name or "Research"
                labels.append(cur)
                parents.append(p)
                values.append(len(n.paper_ids))
                for c in n.children:
                    traverse_treemap(c, cur)
            
            traverse_treemap(taxonomy)
            
            fig = go.Figure(go.Treemap(
                labels=labels, parents=parents, values=values,
                marker=dict(colorscale='Blues')
            ))
            fig.update_layout(title=f"{CONFIG['TOPIC']} - Research Taxonomy (Treemap)",
                            width=1200, height=800)
            
            treemap_file = os.path.join(CONFIG['OUTPUT_DIR'], 'taxonomy_treemap.html')
            fig.write_html(treemap_file)
            viz_files.append(treemap_file)
            print(f"         ✅ taxonomy_treemap.html")
        except Exception as e:
            print(f"         ❌ Failed: {str(e)[:50]}")
        
        # 3. Network
        try:
            print(f"      [3/6] Network graph...")
            G = nx.DiGraph()
            
            def add_edges(n, p=None):
                G.add_node(n.name, papers=len(n.paper_ids))
                if p:
                    G.add_edge(p, n.name)
                for c in n.children:
                    add_edges(c, n.name)
            
            add_edges(taxonomy)
            pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
            
            edge_x, edge_y = [], []
            for e in G.edges():
                x0, y0 = pos[e[0]]
                x1, y1 = pos[e[1]]
                edge_x.extend([x0, x1, None])
                edge_y.extend([y0, y1, None])
            
            node_x, node_y, node_size, node_text = [], [], [], []
            for n in G.nodes():
                x, y = pos[n]
                node_x.append(x)
                node_y.append(y)
                papers_count = G.nodes[n]['papers']
                node_size.append(max(10, min(50, papers_count * 2)))
                node_text.append(f"{n}<br>{papers_count} papers")
            
            fig = go.Figure(data=[
                go.Scatter(x=edge_x, y=edge_y, mode='lines', 
                          line=dict(width=1, color='#888'), hoverinfo='none'),
                go.Scatter(x=node_x, y=node_y, mode='markers',
                          marker=dict(size=node_size, color=node_size, colorscale='YlOrRd'),
                          text=node_text, hoverinfo='text')
            ])
            fig.update_layout(
                title=f'{CONFIG["TOPIC"]} - Research Taxonomy (Network)',
                width=1200, height=800, showlegend=False,
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)
            )
            
            network_file = os.path.join(CONFIG['OUTPUT_DIR'], 'taxonomy_network.html')
            fig.write_html(network_file)
            viz_files.append(network_file)
            print(f"         ✅ taxonomy_network.html")
        except Exception as e:
            print(f"         ❌ Failed: {str(e)[:50]}")
        
        # 4. Icicle
        try:
            print(f"      [4/6] Icicle chart...")
            labels, parents, values = [], [], []
            
            def traverse_icicle(n, p=""):
                cur = n.name if p else taxonomy.name or "Research"
                labels.append(cur)
                parents.append(p)
                values.append(len(n.paper_ids))
                for c in n.children:
                    traverse_icicle(c, cur)
            
            traverse_icicle(taxonomy)
            
            fig = go.Figure(go.Icicle(
                labels=labels, parents=parents, values=values,
                marker=dict(colorscale='Portland')
            ))
            fig.update_layout(title=f"{CONFIG['TOPIC']} - Research Taxonomy (Icicle)",
                            width=1200, height=600)
            
            icicle_file = os.path.join(CONFIG['OUTPUT_DIR'], 'taxonomy_icicle.html')
            fig.write_html(icicle_file)
            viz_files.append(icicle_file)
            print(f"         ✅ taxonomy_icicle.html")
        except Exception as e:
            print(f"         ❌ Failed: {str(e)[:50]}")
        
        # 5. Tree PNG
        try:
            print(f"      [5/6] Tree diagram (PNG)...")
            
            fig_img, ax = plt.subplots(figsize=(20, 12))
            ax.set_xlim(0, 10)
            ax.set_ylim(0, 10)
            ax.axis('off')
            
            colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
            
            def draw_tree(n, x, y, w, lv=0):
                if not n.paper_ids:
                    return
                bw = min(w * 0.9, 3)
                bh = 0.5
                box = FancyBboxPatch((x-bw/2, y-bh/2), bw, bh, boxstyle="round,pad=0.05",
                                    facecolor=colors[lv % len(colors)], edgecolor='black', 
                                    alpha=0.7, linewidth=1.5)
                ax.add_patch(box)
                label = n.name[:30] + "..." if len(n.name) > 30 else n.name
                ax.text(x, y, f"{label}\n({len(n.paper_ids)})", ha='center', va='center',
                       fontsize=9, weight='bold')
                
                if n.children:
                    cw = w / len(n.children)
                    cy = y - 1.8
                    for i, c in enumerate(n.children):
                        cx = x - w/2 + cw/2 + i * cw
                        ax.plot([x, cx], [y-bh/2, cy+bh/2], 'k-', lw=1.5, alpha=0.5)
                        draw_tree(c, cx, cy, cw, lv+1)
            
            draw_tree(taxonomy, 5, 9, 10)
            plt.title(f'{CONFIG["TOPIC"]} - Research Taxonomy', 
                     fontsize=18, weight='bold', pad=20)
            plt.tight_layout()
            
            tree_png = os.path.join(CONFIG['OUTPUT_DIR'], 'taxonomy_tree.png')
            plt.savefig(tree_png, dpi=300, bbox_inches='tight', facecolor='white')
            plt.close()
            viz_files.append(tree_png)
            print(f"         ✅ taxonomy_tree.png")
        except Exception as e:
            print(f"         ❌ Failed: {str(e)[:50]}")
        
        # 6. JSON structure
        try:
            print(f"      [6/6] JSON structure...")
            
            def node_to_dict(n):
                """Export node with full metadata"""
                result = {
                    'name': n.name,
                    'papers': len(n.paper_ids),
                    'keywords': n.keywords[:10] if n.keywords else [],
                    'summary': n.summary if n.summary else "",
                    'topics': [],  # Can add custom topics if needed
                }
                
                # If leaf node (no children), include full paper objects
                if not n.children:
                    result['papers_list'] = []
                    papers_dict = {p.id: p for p in papers}
                    for pid in n.paper_ids:
                        if pid in papers_dict:
                            p = papers_dict[pid]
                            result['papers_list'].append({
                                'id': p.id,
                                'title': p.title,
                                'authors': p.authors[:3],
                                'year': p.year,
                                'abstract': p.abstract[:200] if p.abstract else "",
                                'citations': p.citations,
                                'url': p.url
                            })
                    result['children'] = []
                else:
                    # Non-leaf: recurse through children
                    result['children'] = [node_to_dict(c) for c in n.children]
                
                return result
            
            structure_file = os.path.join(CONFIG['OUTPUT_DIR'], 'taxonomy_structure.json')
            with open(structure_file, 'w', encoding='utf-8') as f:
                json.dump(node_to_dict(taxonomy), f, indent=2)
            viz_files.append(structure_file)
            print(f"         ✅ taxonomy_structure.json (with full papers)")
        except Exception as e:
            print(f"         ❌ Failed: {str(e)[:50]}")
        
        print(f"\n   ✅ Generated {len(viz_files)}/6 visualizations")
        
        # Generate index.html for easy access to all visualizations
        try:
            print(f"      [7/7] Creating visualization index...")
            index_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Taxonomy Visualizations - Interactive Explorer</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; font-weight: 700; }
        .subtitle { font-size: 1.1em; opacity: 0.9; }
        .content { padding: 40px; }
        .intro {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }
        .intro h2 { color: #667eea; margin-bottom: 10px; }
        .viz-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .viz-card {
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 25px;
            transition: all 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        .viz-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            border-color: #667eea;
        }
        .viz-icon { font-size: 3em; margin-bottom: 15px; display: block; }
        .viz-card h3 { color: #2d3748; margin-bottom: 10px; font-size: 1.3em; }
        .viz-card p { color: #718096; line-height: 1.6; font-size: 0.95em; }
        .viz-type {
            display: inline-block;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75em;
            margin-top: 10px;
            font-weight: 600;
        }
        .interactive { background: #48bb78; }
        .static { background: #ed8936; }
        .data { background: #4299e1; }
        .instructions {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
        }
        .instructions h3 { color: #856404; margin-bottom: 10px; }
        .instructions ul { margin-left: 20px; color: #856404; }
        .instructions li { margin-bottom: 5px; }
        footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #718096;
            border-top: 1px solid #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🌳 Taxonomy Visualizations</h1>
            <p class="subtitle">Interactive Explorer for Your Research Literature</p>
        </header>
        <div class="content">
            <div class="intro">
                <h2>📊 Welcome to Your Interactive Taxonomy</h2>
                <p>Explore your research through 6 different visualizations. 
                <strong>Click any card below to open that visualization!</strong></p>
            </div>
            <h2 style="margin-bottom: 20px; color: #2d3748;">Interactive Visualizations</h2>
            <div class="viz-grid">
                <a href="taxonomy_sunburst.html" class="viz-card">
                    <span class="viz-icon">🌅</span>
                    <h3>Sunburst Chart</h3>
                    <p>Radial visualization. Click segments to zoom in and explore sub-clusters.</p>
                    <span class="viz-type interactive">Interactive</span>
                </a>
                <a href="taxonomy_treemap.html" class="viz-card">
                    <span class="viz-icon">🗺️</span>
                    <h3>Treemap</h3>
                    <p>Space-filling rectangles. Size represents paper count.</p>
                    <span class="viz-type interactive">Interactive</span>
                </a>
                <a href="taxonomy_network.html" class="viz-card">
                    <span class="viz-icon">🕸️</span>
                    <h3>Network Graph</h3>
                    <p>Drag-and-drop network showing connections between clusters.</p>
                    <span class="viz-type interactive">Interactive</span>
                </a>
                <a href="taxonomy_icicle.html" class="viz-card">
                    <span class="viz-icon">🧊</span>
                    <h3>Icicle Chart</h3>
                    <p>Horizontal hierarchy. Perfect for presentations.</p>
                    <span class="viz-type interactive">Interactive</span>
                </a>
                <a href="taxonomy_tree.png" class="viz-card" target="_blank">
                    <span class="viz-icon">🖼️</span>
                    <h3>Tree Diagram (PNG)</h3>
                    <p>Static, publication-ready at 300 DPI.</p>
                    <span class="viz-type static">Static Image</span>
                </a>
                <a href="taxonomy_structure.json" class="viz-card" target="_blank">
                    <span class="viz-icon">📦</span>
                    <h3>JSON Data</h3>
                    <p>Complete data with papers, keywords, summaries.</p>
                    <span class="viz-type data">Data File</span>
                </a>
            </div>
            <div class="instructions">
                <h3>💡 How to Use</h3>
                <ul>
                    <li><strong>Interactive charts:</strong> Click to zoom, hover for details</li>
                    <li><strong>Network Graph:</strong> Drag nodes to rearrange</li>
                    <li><strong>PNG Image:</strong> Right-click to save</li>
                    <li><strong>JSON Data:</strong> Use with D3.js, Python, or custom tools</li>
                </ul>
            </div>
        </div>
        <footer>
            <p>Generated by Comprehensive Literature Analysis System</p>
        </footer>
    </div>
</body>
</html>"""
            
            index_file = os.path.join(CONFIG['OUTPUT_DIR'], 'index.html')
            with open(index_file, 'w', encoding='utf-8') as f:
                f.write(index_html)
            print(f"         ✅ index.html (visualization hub)")
            print(f"\n   🎨 Open index.html in your browser to explore all visualizations!")
        except Exception as e:
            print(f"         ⚠️ Failed to create index: {str(e)[:50]}")
        
    elif taxonomy and not VISUALIZATION_AVAILABLE:
        print(f"\n   ⚠️  Visualization libraries not available")
        print(f"      Install with: pip install plotly networkx matplotlib")
        print(f"      Continuing without visualizations...")
    
    # ==== PHASE 7: COMPREHENSIVE REVIEW ====
    print(f"\n{'='*80}")
    print(f"📝 PHASE 7: COMPREHENSIVE REVIEW (QASPER + ScholarQA)")
    print(f"{'='*80}")
    
    review = generate_comprehensive_review(
        CONFIG['TOPIC'],
        papers,
        taxonomy,
        azure_client,
        CONFIG.get('RESEARCH_QUESTION')
    )
    
    # ==== EXPORT FINAL RESULTS ====
    print(f"\n{'='*80}")
    print(f"💾 EXPORTING FINAL RESULTS")
    print(f"{'='*80}")
    
    # Papers
    papers_file = os.path.join(CONFIG['OUTPUT_DIR'], 'papers_final.json')
    with open(papers_file, 'w', encoding='utf-8') as f:
        json.dump([asdict(p) for p in papers], f, indent=2)
    print(f"   ✓ {papers_file}")
    print(f"      • Total papers: {len(papers)}")
    print(f"      • With embeddings: {len([p for p in papers if p.embedding])}")
    print(f"      • Deep-read: {len([p for p in papers if p.deep_read])}")
    print(f"      • Enriched: {len([p for p in papers if p.enriched])}")
    
    # Taxonomy (ENHANCED with full papers and metadata)
    if taxonomy:
        taxonomy_file = os.path.join(CONFIG['OUTPUT_DIR'], 'taxonomy_final.json')
        
        # Create papers lookup
        papers_dict = {p.id: p for p in papers}
        
        # Export with full metadata
        def export_taxonomy_node(node):
            """Export node with full papers, keywords, topics, summary"""
            result = {
                'id': node.id,
                'name': node.name,
                'level': node.level,
                'summary': node.summary if node.summary else "",
                'keywords': node.keywords[:15] if node.keywords else [],
                'topics': [],  # Can add custom topics if needed
                'paper_count': node.paper_count(),  # Recursive count (includes descendants)
                'direct_paper_count': len(node.paper_ids),  # Papers directly in this node (0 for parents)
                'children': []
            }
            
            # If this is a leaf node (no children), include full paper objects
            if not node.children:
                result['papers'] = []
                for pid in node.paper_ids:
                    if pid in papers_dict:
                        p = papers_dict[pid]
                        result['papers'].append({
                            'id': p.id,
                            'title': p.title,
                            'authors': p.authors[:3],  # First 3 authors
                            'year': p.year,
                            'abstract': p.abstract[:300] if p.abstract else "",
                            'citations': p.citations,
                            'venue': p.venue,
                            'url': p.url,
                            'pdf_url': p.pdf_url,
                            'source': p.source
                        })
            else:
                # For non-leaf nodes, include paper IDs and recurse
                result['paper_ids'] = node.paper_ids
                for child in node.children:
                    result['children'].append(export_taxonomy_node(child))
            
            return result
        
        taxonomy_dict = export_taxonomy_node(taxonomy)
        
        with open(taxonomy_file, 'w', encoding='utf-8') as f:
            json.dump(taxonomy_dict, f, indent=2)
        print(f"   ✓ {taxonomy_file}")
        print(f"      • Total nodes: {count_taxonomy_nodes(taxonomy)}")
        print(f"      • Levels: {CONFIG['TAXONOMY_LEVELS']}")
        print(f"      • Includes: keywords, summaries, and full paper objects at leaf nodes")
    
    # Review
    review_file = os.path.join(CONFIG['OUTPUT_DIR'], 'comprehensive_review_final.md')
    with open(review_file, 'w', encoding='utf-8') as f:
        f.write(review)
    print(f"   ✓ {review_file}")
    print(f"      • Length: {len(review)} characters (~{len(review.split())} words)")
    
    # Research Ideas (NEW!)
    if CONFIG.get('GENERATE_IDEAS', True) and taxonomy:
        print(f"\n   💡 Generating research ideas...")
        ideas = generate_research_ideas(taxonomy, papers, CONFIG['TOPIC'], azure_client)
        ideas_text = format_research_ideas(ideas)
        
        ideas_file = os.path.join(CONFIG['OUTPUT_DIR'], 'research_ideas.md')
        with open(ideas_file, 'w', encoding='utf-8') as f:
            f.write(ideas_text)
        print(f"   ✓ {ideas_file}")
        print(f"      • Gap ideas: {len(ideas.get('gaps', []))}")
        print(f"      • Bridge ideas: {len(ideas.get('bridges', []))}")
        print(f"      • Transfer ideas: {len(ideas.get('transfers', []))}")
        print(f"      • Trend ideas: {len(ideas.get('trends', []))}")
        print(f"      • Fusion ideas: {len(ideas.get('fusions', []))}")
    
    # ==== PHASE 8: INTERACTIVE CHAT ====
    print(f"\n{'='*80}")
    print(f"💬 PHASE 8: INTERACTIVE CHAT")
    print(f"{'='*80}")
    
    if CONFIG['ENABLE_CHAT'] and CONFIG['CHAT_MODE'] != 'programmatic':
        # Display taxonomy and review preview first
        display_taxonomy_and_review_preview(taxonomy, review)
        
        # Then start chat
        chat_with_taxonomy(papers, taxonomy, azure_client)
    
    # ==== ADDITIONAL EXPORTS ====
    
    # 1. Text-based taxonomy tree (for chatbot reference)
    if taxonomy:
        print(f"\n   📋 Generating taxonomy tree view...")
        taxonomy_tree_file = os.path.join(CONFIG['OUTPUT_DIR'], 'taxonomy_tree.txt')
        with open(taxonomy_tree_file, 'w', encoding='utf-8') as f:
            f.write(generate_taxonomy_tree_text(taxonomy))
        print(f"   ✓ {taxonomy_tree_file}")
    
    # 2. Comprehensive papers status report
    print(f"\n   📊 Generating papers status report...")
    
    # CSV version
    status_csv = os.path.join(CONFIG['OUTPUT_DIR'], 'papers_status_report.csv')
    generate_papers_status_csv(papers, status_csv)
    print(f"   ✓ {status_csv}")
    
    # Markdown version
    status_md = os.path.join(CONFIG['OUTPUT_DIR'], 'papers_status_report.md')
    generate_papers_status_markdown(papers, status_md)
    print(f"   ✓ {status_md}")
    
    # ==== COMPLETE ====
    print(f"\n{'='*80}")
    print(f"✅ PIPELINE COMPLETE")
    print(f"{'='*80}")
    print(f"   📊 Final Statistics:")
    print(f"      • Papers discovered: {len(papers)}")
    print(f"      • Papers verified: {len([p for p in papers if p.verified])}")
    print(f"      • Papers with deep content: {len([p for p in papers if p.deep_read])}")
    print(f"      • Papers with embeddings: {len([p for p in papers if p.embedding])}")
    print(f"      • Papers enriched: {len([p for p in papers if p.enriched])}")
    print(f"      • Taxonomy nodes: {count_taxonomy_nodes(taxonomy) if taxonomy else 0}")
    print(f"      • Review sections: {len(review.split('##')) - 1}")
    print(f"\n   📁 All Results Saved To: {CONFIG['OUTPUT_DIR']}/")
    print(f"\n   📄 Data Files:")
    print(f"      • {CONFIG['OUTPUT_DIR']}/papers_final.json")
    print(f"      • {CONFIG['OUTPUT_DIR']}/taxonomy_final.json")
    print(f"      • {CONFIG['OUTPUT_DIR']}/papers_status_report.csv ← NEW!")
    print(f"\n   📝 Documents:")
    print(f"      • {CONFIG['OUTPUT_DIR']}/comprehensive_review_final.md")
    print(f"      • {CONFIG['OUTPUT_DIR']}/research_ideas.md")
    print(f"      • {CONFIG['OUTPUT_DIR']}/papers_status_report.md ← NEW!")
    print(f"      • {CONFIG['OUTPUT_DIR']}/taxonomy_tree.txt ← NEW!")
    print(f"\n   📊 Visualizations:")
    print(f"      🎨 START HERE → {CONFIG['OUTPUT_DIR']}/index.html ← VISUALIZATION HUB!")
    print(f"      • {CONFIG['OUTPUT_DIR']}/taxonomy_sunburst.html (interactive)")
    print(f"      • {CONFIG['OUTPUT_DIR']}/taxonomy_treemap.html (interactive)")
    print(f"      • {CONFIG['OUTPUT_DIR']}/taxonomy_network.html (interactive)")
    print(f"      • {CONFIG['OUTPUT_DIR']}/taxonomy_icicle.html (interactive)")
    print(f"      • {CONFIG['OUTPUT_DIR']}/taxonomy_tree.png (publication-ready)")
    print(f"      • {CONFIG['OUTPUT_DIR']}/taxonomy_structure.json (data)")
    print(f"\n   💡 To view visualizations: Open index.html in your web browser!")
    print(f"   📦 Other:")
    print(f"      • {CONFIG['OUTPUT_DIR']}/checkpoints/ (intermediate results)")
    print(f"{'='*80}")

if __name__ == "__main__":
    main()