// DEMO: a small, hand-maintained list of related technology terms for AI Quick Search.
// This is lexical expansion (a fixed lookup), NOT semantic search: "JVM technologies" becomes an explicit,
// editable "any of Java, Kotlin, Spring Boot" filter that the user can see and change.
// In production this list belongs to the Skill Matrix (Module 01) skill taxonomy, not to Search.

export interface RelatedTerm {
  // Shown to users, e.g. "JVM technologies"
  term: string;
  // Matched on normalised text (lower case, no diacritics)
  pattern: RegExp;
  // Skill ids from the catalogue; matched with "any of"
  skills: string[];
  // Role words ("backend", "frontend") describe the kind of developer. When a more specific technology is also
  // named, the role word is not turned into skills.
  role?: boolean;
}

export const RELATED_TERMS: RelatedTerm[] = [
  {
    term: 'JVM technologies',
    pattern: /\bjvm(?: technolog\w*| languages?| stack| ecosystem| based| platform)?\b/,
    skills: ['java', 'kotlin', 'spring'],
  },
  {
    term: 'JavaScript frameworks',
    pattern: /\b(?:modern )?(?:javascript|js|spa) frameworks?\b/,
    skills: ['react', 'angular', 'vue'],
  },
  {
    term: 'Microsoft stack',
    pattern: /\bmicrosoft (?:stack|technolog\w*|platform)\b/,
    skills: ['dotnet', 'azure'],
  },
  {
    term: 'Cloud technologies',
    pattern: /\bcloud(?! & infrastructure| and infrastructure)(?: technolog\w*| platforms?| providers?| services| computing| experience| skills?)?\b/,
    skills: ['aws', 'azure', 'gcp'],
  },
  {
    term: 'Containers & DevOps',
    pattern: /\bcontaineri[sz]ation(?: technolog\w*)?\b|\bcontainer technolog\w*|\bdevops (?:tools|technolog\w*|skills)\b/,
    skills: ['docker', 'k8s', 'terraform'],
  },
  {
    term: 'Big data / data pipelines',
    pattern: /\bbig data\b|\bdata pipelines?\b|\betl\b/,
    skills: ['python', 'spark'],
  },
  {
    term: 'Test automation',
    pattern: /\btest automation\b|\bautomated testing\b|\bqa automation\b|\be2e testing\b/,
    skills: ['selenium', 'playwright'],
  },
  {
    term: 'Mobile development',
    pattern: /\bmobile(?! team| & web| banking)(?: development| developers?| apps?| applications?| technolog\w*)?\b/,
    skills: ['kotlin', 'flutter'],
  },
  {
    term: 'Backend development',
    pattern: /\bback[- ]?end(?: technolog\w*| languages?| stack| development| experience)?\b/,
    skills: ['java', 'spring', 'dotnet', 'node', 'fastapi'],
    role: true,
  },
  {
    term: 'Frontend development',
    pattern: /\bfront[- ]?end(?! coe)(?: technolog\w*| frameworks?| development| experience)?\b/,
    skills: ['react', 'angular', 'vue'],
    role: true,
  },
];
