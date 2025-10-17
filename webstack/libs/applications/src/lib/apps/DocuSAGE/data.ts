export type PaperNode = {
  id: string;
  label: string;
  is_cluster?: boolean;
  is_document?: boolean;
  level: number;
  children?: PaperNode[];
  title?: string;
  authors?: string[];
  year?: string;
  venue?: string;
  file_name?: string;
  keywords?: string[];
  summary?: string;
  research_questions?: string;
  methods?: string;
  findings?: string;
  field?: string;
  generated_label?: string;
};

export type Tree = {
  topic: string;
  size: number;
  children: Tree[];
  summary?: string;
  title?: string;
  authors?: string[];
  year?: string;
  venue?: string;
};

// Function to transform the JSON data into the Tree structure
export function transformToTree(node: PaperNode): Tree {
  return {
    topic: node.label,
    size: node.is_document ? 1 : 0,
    children: node.children ? node.children.map(transformToTree) : [],
    summary: node.summary,
    title: node.title,
    authors: node.authors,
    year: node.year,
    venue: node.venue
  };
}

// Import the JSON data
import * as clusteringResults from './clustering_results.json';

// Transform the JSON data into the Tree structure
export const data: Tree = transformToTree(clusteringResults);
  