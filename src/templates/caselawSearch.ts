import { BlockType } from '../components/types'
import type { GuidedStructure } from '../components/types'

/**
 * Three routes into case law, as used by the Case Law Explorer demo: start from
 * the facts of a matter, start from the provisions that govern it, or search it
 * the traditional way with provisions and keywords.
 */
export const caselawSearch: GuidedStructure = {
  goals: [
    {
      title: 'Similarity Search',
      description: 'Find cases comparable to your facts and reasoning',
      icon: 'layers',
      steps: [
        {
          title: 'Facts',
          blocks: [
            {
              type: BlockType.FACTS_INPUT,
              title: 'Describe the facts',
              description: 'Describe the factual situation in natural language',
              placeholder:
                'Example: An employee was dismissed after 10 years of service. The employer claims there was a reorganization, but the employee believes this was a pretext for personal reasons...',
              required: true,
            },
            {
              type: BlockType.REASONING_INPUT,
              title: 'Describe the reasoning',
              description: 'What legal arguments or reasoning are relevant?',
              placeholder:
                'Example: The question is whether the employer has sufficiently demonstrated that there was an actual reorganization necessity...',
              required: true,
            },
          ],
        },
        {
          title: 'Provisions',
          blocks: [
            {
              type: BlockType.SELECTED_LAWS,
              title: 'Legal provisions',
              description: 'Adding legal provisions significantly improves the results',
              placeholder: 'e.g., Art. 7:669 BW, Art. 7:671b BW',
            },
            {
              type: BlockType.DOMAINS_SELECTOR,
              title: 'Or specify domain/topic',
              description: 'Alternatively, indicate the applicable domain or topic',
              placeholder: 'e.g., Employment law, Contract law, Administrative law',
            },
          ],
        },
        {
          title: 'Date Range',
          blocks: [
            {
              type: BlockType.DATE_RANGE,
              title: 'Date range',
              description: 'The range determines which time period will be included in the results',
            },
          ],
        },
        {
          title: 'Instances',
          blocks: [
            {
              type: BlockType.INSTANCES_SELECTOR,
              title: 'Select instances',
              description: 'See only results for the selected instances',
            },
          ],
        },
      ],
    },
    {
      title: 'Authority Search',
      description: 'Find highly cited cases and see which cases courts rely on',
      icon: 'scale',
      fixedParameters: {
        degreesTarget: 1,
      },
      steps: [
        {
          title: 'Provisions',
          blocks: [
            {
              type: BlockType.SELECTED_LAWS,
              title: 'Legal provisions',
              description: 'Adding legal provisions significantly improves the results',
              placeholder: 'e.g., Art. 6:162 BW, Art. 7:658 BW',
              required: true,
            },
            {
              type: BlockType.KEYWORDS_INPUT,
              title: 'Or enter keywords',
              description: 'If no provisions are available, enter keywords instead',
              placeholder: 'e.g., onrechtmatige daad, werkgeversaansprakelijkheid',
              required: true,
            },
          ],
        },
        {
          title: 'Courts',
          blocks: [
            {
              type: BlockType.INSTANCES_SELECTOR,
              title: 'Select courts',
              description: 'Select the courts whose decisions you are interested in',
            },
          ],
        },
      ],
    },
    {
      title: 'Traditional Search',
      description: 'Use legislative provisions or keywords to find cases',
      icon: 'search',
      steps: [
        {
          title: 'Provisions',
          blocks: [
            {
              type: BlockType.SELECTED_LAWS,
              title: 'Legal provisions',
              description:
                'Adding legal provisions significantly improves the results (leave empty if no provisions are available)',
              placeholder: 'e.g. Art. 6:74 BW, Art. 6:265 BW',
            },
          ],
        },
        {
          title: 'Keywords',
          blocks: [
            {
              type: BlockType.KEYWORDS_INPUT,
              title: 'Keywords',
              description: 'Search for specific terms or phrases',
              placeholder: 'e.g. wanprestatie, schadevergoeding, ontbinding',
              required: true,
            },
          ],
        },
        {
          title: 'Date Range',
          blocks: [
            {
              type: BlockType.DATE_RANGE,
              title: 'Date range',
              description: 'The range determines which time period will be included in the results',
            },
          ],
        },
        {
          title: 'Instances',
          blocks: [
            {
              type: BlockType.INSTANCES_SELECTOR,
              title: 'Select Instances',
              description: 'See only results for the selected instances',
            },
          ],
        },
      ],
    },
  ],
}
