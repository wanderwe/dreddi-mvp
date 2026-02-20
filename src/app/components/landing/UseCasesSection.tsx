import { HowItWorksSection } from "@/app/components/landing/HowItWorksSection";
import type { LandingCopy } from "@/lib/landingCopy";

type UseCasesSectionProps = {
  copy: LandingCopy["howItWorks"];
};

export function UseCasesSection({ copy }: UseCasesSectionProps) {
  return <HowItWorksSection copy={copy} />;
}
