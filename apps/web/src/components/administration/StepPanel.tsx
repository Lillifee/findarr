import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

interface StepPanelProps {
  step: 1 | 2;
  message: string;
}

export function StepPanel({ step, message, children }: PropsWithChildren<StepPanelProps>) {
  const { t } = useTranslation();
  const label = step === 1 ? t('integrationCard.step1') : t('integrationCard.step2');
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">{label}</p>
        <p className="text-sm text-zinc-300">{message}</p>
      </div>
      {children}
    </section>
  );
}
