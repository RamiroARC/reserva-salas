import ContractExtraTermsManager from './ContractExtraTermsManager';
import DecorationColorsManager from './DecorationColorsManager';
import PackageIncludesManager from './PackageIncludesManager';

export default function UtilitiesPanel({
  decorationColors,
  onRefreshDecorationColors,
  contractExtraTerms,
  onRefreshContractExtraTerms,
  packageIncludes,
  onRefreshPackageIncludes,
}) {
  return (
    <div className="utilities-layout">
      <PackageIncludesManager items={packageIncludes} onRefresh={onRefreshPackageIncludes} />
      <ContractExtraTermsManager terms={contractExtraTerms} onRefresh={onRefreshContractExtraTerms} />
      <DecorationColorsManager colors={decorationColors} onRefresh={onRefreshDecorationColors} />
    </div>
  );
}
