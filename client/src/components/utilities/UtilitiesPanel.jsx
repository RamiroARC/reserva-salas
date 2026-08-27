import ContractExtraTermsManager from './ContractExtraTermsManager';
import DecorationColorsManager from './DecorationColorsManager';

export default function UtilitiesPanel({
  decorationColors,
  onRefreshDecorationColors,
  contractExtraTerms,
  onRefreshContractExtraTerms,
}) {
  return (
    <div className="utilities-layout">
      <ContractExtraTermsManager terms={contractExtraTerms} onRefresh={onRefreshContractExtraTerms} />
      <DecorationColorsManager colors={decorationColors} onRefresh={onRefreshDecorationColors} />
    </div>
  );
}
