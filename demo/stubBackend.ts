// A stubbed backend for the demo.
//
// The real package never calls an API, and neither does the demo. Instead the
// host callbacks below are what a server would implement, kept in-memory so the
// demo runs with no token and no network. The console log pane shows exactly
// what a host would receive, which is the point: validating the contract.

export interface SearchResponse {
  dataset: string
  receivedAt: string
  echo: unknown
  results: { id: string; title: string; snippet: string }[]
}

/** Stand-in for the law-name lookup the SelectedLaws block calls. */
export async function searchLaws(query: string): Promise<{ bwbId: string; title: string }[]> {
  await delay(120)
  const all = [
    { bwbId: 'BWBR0005290', title: 'Burgerlijk Wetboek Boek 7' },
    { bwbId: 'BWBR0005537', title: 'Algemene wet bestuursrecht' },
    { bwbId: 'BWBR0001840', title: 'Grondwet' },
    { bwbId: 'BWBR0011823', title: 'Arbeidswetgeving' },
    { bwbId: 'BWBR0004770', title: 'Wetboek van Strafrecht' },
  ]
  const q = (query || '').toLowerCase()
  return all.filter((l) => l.title.toLowerCase().includes(q) || l.bwbId.toLowerCase().includes(q))
}

/** Stand-in for the host's search endpoint. Mirrors what a server returns. */
export async function searchDocuments(payload: unknown): Promise<SearchResponse> {
  await delay(260)
  const dataset =
    payload && typeof payload === 'object' && 'dataset' in payload
      ? String((payload as { dataset: unknown }).dataset)
      : 'unknown'
  return {
    dataset,
    receivedAt: new Date().toISOString(),
    echo: payload,
    results: [
      { id: `${dataset}-001`, title: `Sample ${dataset} decision 1`, snippet: '…factual summary…' },
      { id: `${dataset}-002`, title: `Sample ${dataset} decision 2`, snippet: '…legal reasoning…' },
    ],
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
