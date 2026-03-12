import OnboardingScreen from "../components/onBoarding/OnboardingScreen";
import { useAuth } from "../lib/useAuth";

export default function Onboarding() {
  const { isAuthenticated } = useAuth();

  return <OnboardingScreen isAuthenticated={isAuthenticated} />;
}
