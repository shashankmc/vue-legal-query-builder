// Guided structures for the demo, one per block type, so a reviewer can click
// through every block the package ships.

import { BlockType, type GuidedStructure } from '../src'
import type { Block } from '../src'

/** All fifteen block types, each with its own step. */
const allBlocks: Block[] = [
  { type: BlockType.DATASET_SELECTOR, title: 'Dataset', description: 'Pick the corpus to search' },
  { type: BlockType.TEXT_INPUT, title: 'Text input', description: 'A single line', placeholder: 'e.g. C-123/45' },
  { type: BlockType.TEXTAREA_INPUT, title: 'Text area', description: 'A longer free-text field', placeholder: 'Type several lines…' },
  { type: BlockType.KEYWORDS_INPUT, title: 'Keywords', description: 'One or more keywords', placeholder: 'e.g. wrongful dismissal' },
  { type: BlockType.FACTS_INPUT, title: 'Facts', description: 'The factual situation', placeholder: 'Describe what happened…' },
  { type: BlockType.REASONING_INPUT, title: 'Reasoning', description: 'The legal argument', placeholder: 'Describe the reasoning…' },
  { type: BlockType.ECLIS_INPUT, title: 'ECLI(s)', description: 'Case identifiers', placeholder: 'e.g. ECLI:NL:HR:2020:1' },
  { type: BlockType.ARTICLE_FIELD, title: 'Article', description: 'An article reference', placeholder: 'e.g. Art. 7:669 BW' },
  { type: BlockType.SELECTED_LAWS, title: 'Selected laws', description: 'Legislation by name (calls onSearchLaws)' },
  { type: BlockType.DATE_RANGE, title: 'Date range', description: 'A start and end date' },
  { type: BlockType.DOC_TYPE_SELECTOR, title: 'Document type', description: 'Decisions / opinions' },
  { type: BlockType.IMPORTANCE_LEVEL_SELECTOR, title: 'Importance', description: 'Level of importance' },
  { type: BlockType.INSTANCES_SELECTOR, title: 'Instances', description: 'Court instances' },
  { type: BlockType.DOMAINS_SELECTOR, title: 'Domains', description: 'Legal domains / topics' },
  { type: BlockType.NETWORK_DEGREES, title: 'Network degrees', description: 'Citation traversal depth' },
]

/** Every block, one per step, under a single goal. */
export const allBlocksStructure: GuidedStructure = {
  goals: [
    {
      title: 'Every block',
      description: 'One step per block type the package ships',
      icon: 'layers',
      steps: allBlocks.map((block) => ({ title: block.title, blocks: [block] })),
    },
  ],
}

/** A tighter, realistic structure for a normal search. */
export const realisticStructure: GuidedStructure = {
  goals: [
    {
      title: 'Case law search',
      description: 'Facts and reasoning, or provisions and keywords',
      icon: 'search',
      steps: [
        {
          title: 'Facts',
          blocks: [
            {
              type: BlockType.FACTS_INPUT,
              title: 'Describe the facts',
              description: 'The factual situation in natural language',
              placeholder: 'An employee was dismissed after 10 years of service…',
              required: true,
            },
          ],
        },
        {
          title: 'Provisions',
          blocks: [
            { type: BlockType.SELECTED_LAWS, title: 'Legal provisions', description: 'Adding provisions improves the results' },
            { type: BlockType.KEYWORDS_INPUT, title: 'Keywords', description: 'Or search by keyword' },
          ],
        },
        {
          title: 'Scope',
          blocks: [
            { type: BlockType.DATE_RANGE, title: 'Date range', description: 'Which period to include' },
            { type: BlockType.INSTANCES_SELECTOR, title: 'Instances', description: 'Which courts' },
          ],
        },
      ],
    },
  ],
}

/**
 * A BlueLab-shaped structure: a fact pattern and its structured facts, for a
 * provision corpus. Proves a host can describe its own field set with the
 * shipped block types, no fork.
 */
export const bluelabStructure: GuidedStructure = {
  goals: [
    {
      title: 'Find relevant provisions',
      description: 'Search the BlueLab corpus against a case',
      icon: 'documents',
      steps: [
        {
          title: 'Facts',
          blocks: [
            {
              type: BlockType.TEXTAREA_INPUT,
              title: 'Fact pattern',
              description: 'Describe the case',
              placeholder: 'A Norwegian SME isolates an esterase in an area beyond national jurisdiction…',
              required: true,
            },
            {
              type: BlockType.KEYWORDS_INPUT,
              title: 'Structured facts',
              description: 'who, what, where collected',
              placeholder: 'e.g. Halden Enzyme Solutions, esterase, ABNJ',
            },
          ],
        },
        {
          title: 'Scope',
          blocks: [
            { type: BlockType.DATE_RANGE, title: 'In force after', description: 'Corpus version filter' },
            { type: BlockType.DOMAINS_SELECTOR, title: 'Domain', description: 'ABS / marine / plant / IP' },
          ],
        },
      ],
    },
  ],
}
