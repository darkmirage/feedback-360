export const RELATIONSHIP_LABELS: Record<string, string> = {
  self: 'Self',
  peer: 'Peer',
  direct_report: 'Direct Report',
  manager: 'Manager',
}

export const CYCLE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
  results_published: 'Results Published',
}

export const VALID_TRANSITIONS: Record<string, string> = {
  draft: 'active',
  active: 'closed',
  closed: 'results_published',
}
