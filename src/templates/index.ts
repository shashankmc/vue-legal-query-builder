import type { GuidedStructure, GuidedTemplate, GuidedTemplateId } from '../components/types'
import { caselawSearch } from './caselawSearch'

/**
 * The guided structures this package ships. A host can list these and let the
 * user pick one instead of authoring a structure of its own.
 */
export const guidedTemplates: GuidedTemplate[] = [
  {
    id: 'caselaw-search',
    name: 'Case law search',
    description:
      'Three routes into case law: find cases comparable to your facts, find the ones courts lean on, or search by provision and keyword.',
    structure: caselawSearch,
  },
]

/** Used when guided mode is asked for without a structure or a template id. */
export const DEFAULT_GUIDED_TEMPLATE_ID: GuidedTemplateId = 'caselaw-search'

export function getGuidedTemplate(id: GuidedTemplateId | string): GuidedTemplate | undefined {
  return guidedTemplates.find((template) => template.id === id)
}

/**
 * Picks the structure a guided form should render: an explicit structure wins,
 * then the named template, and failing both the default template — so guided
 * mode always has something to show.
 */
export function resolveGuidedStructure(
  structure?: GuidedStructure,
  templateId?: GuidedTemplateId | string,
): GuidedStructure {
  if (structure) return structure

  const template = templateId ? getGuidedTemplate(templateId) : undefined
  if (template) return template.structure

  return getGuidedTemplate(DEFAULT_GUIDED_TEMPLATE_ID)!.structure
}

export { caselawSearch }
