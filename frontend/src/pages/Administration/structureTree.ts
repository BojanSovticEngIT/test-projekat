export interface StructureNode {
  id: string;
  parentId?: string;
  name: string;
  code?: string;
  leader?: string;
  active: boolean;
}

export type TreeNode<T extends StructureNode> = T & { children: TreeNode<T>[] };

export const buildTree = <T extends StructureNode>(nodes: T[]): TreeNode<T>[] => {
  const byId = new Map<string, TreeNode<T>>(nodes.map((node) => [node.id, { ...node, children: [] }]));
  const roots: TreeNode<T>[] = [];
  byId.forEach((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
};

// An inactive node stays visible (dimmed) when it still has visible descendants
export const filterInactive = <T extends StructureNode>(nodes: TreeNode<T>[]): TreeNode<T>[] =>
  nodes.flatMap((node) => {
    const children = filterInactive(node.children);
    return node.active || children.length > 0 ? [{ ...node, children }] : [];
  });

// Both values are trimmed and lower-cased; an empty value is ignored and a node has to satisfy all non-empty ones
export interface SearchCriteria {
  text: string;
  leader: string;
}

export const hasCriteria = (criteria: SearchCriteria): boolean => Boolean(criteria.text || criteria.leader);

const nodeMatches = (node: StructureNode, { text, leader }: SearchCriteria): boolean =>
  (!text || node.name.toLowerCase().includes(text) || (node.code ?? '').toLowerCase().includes(text)) &&
  (!leader || (node.leader ?? '').toLowerCase().includes(leader));

// A matching node keeps its whole subtree; a non-matching node is kept only as the path to a match
export const filterBySearch = <T extends StructureNode>(nodes: TreeNode<T>[], criteria: SearchCriteria): TreeNode<T>[] =>
  nodes.flatMap((node) => {
    if (nodeMatches(node, criteria)) return [node];
    const children = filterBySearch(node.children, criteria);
    return children.length > 0 ? [{ ...node, children }] : [];
  });

// Ids of nodes that have a matching descendant: opened automatically so the match is visible
export const collectPathIds = <T extends StructureNode>(
  nodes: TreeNode<T>[],
  criteria: SearchCriteria,
  ids: Set<string>
): boolean => {
  let found = false;
  nodes.forEach((node) => {
    const childFound = collectPathIds(node.children, criteria, ids);
    if (childFound) ids.add(node.id);
    if (childFound || nodeMatches(node, criteria)) found = true;
  });
  return found;
};
