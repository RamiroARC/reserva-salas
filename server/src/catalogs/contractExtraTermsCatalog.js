import { C, insertDoc } from '../mongo.js';

export const DEFAULT_CONTRACT_EXTRA_TERMS = [
  {
    content:
      'La fiesta se podrá extender luego de vencido este contrato; habrá que abonar S/. 120.00 soles por cada hora de extensión. Asimismo, deberá acudir a las oficinas del APDAY a pagar los conceptos de derecho de autor. De existir daños ocasionados a los servicios (vasos, copas, menajería en general) se tendrá que reconocer los costos. No se admiten devoluciones por adelantos de ningún monto dinerario debido a que el local ya estaría separado.',
    sort_order: 1,
  },
];

export async function seedContractExtraTerms(localId) {
  const count = await C('contract_extra_terms').countDocuments({ local_id: localId });
  if (count > 0) return;

  for (const term of DEFAULT_CONTRACT_EXTRA_TERMS) {
    await insertDoc('contract_extra_terms', {
      local_id: localId,
      content: term.content,
      sort_order: term.sort_order,
      active: 1,
    });
  }
}
