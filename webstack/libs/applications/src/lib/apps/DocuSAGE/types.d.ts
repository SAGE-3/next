declare module "*.json" {
  const value: {
    id: string;
    label: string;
    is_cluster?: boolean;
    is_document?: boolean;
    level: number;
    children?: any[];
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
  export default value;
} 