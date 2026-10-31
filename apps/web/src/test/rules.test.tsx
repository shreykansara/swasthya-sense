import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WhyFlaggedCard, CaseFlagData } from '../components/WhyFlaggedCard';
import { AdminRulesPage } from '../pages/AdminRulesPage';

describe('WhyFlaggedCard Component', () => {
  const sampleFlag: CaseFlagData = {
    id: 'flag-123',
    patient_id: 'patient-456',
    urgency: 'urgent',
    rule_id: 'RULE-TROP-001',
    rule_version: '1.0',
    reason_code: 'ELEVATED_CARDIAC_MARKER',
    contributions: [
      {
        analyte: 'troponin_i',
        current_value: 0.12,
        threshold: 0.04,
        unit: 'ng/mL',
        divergence_score: 0.08,
        summary: 'troponin_i (0.12 ng/mL) > threshold (0.04 ng/mL)',
      },
    ],
    patient_explanation: 'Your Troponin result was higher than the laboratory standard limit.',
    clinician_summary: 'Troponin I > 0.04 ng/mL requires immediate clinical assessment.',
    status: 'open',
  };

  it('renders flag details, waterfall contribution, and prototype notice', () => {
    render(<WhyFlaggedCard flag={sampleFlag} />);

    // Prototype notice
    expect(screen.getByText(/PROTOTYPE — Synthetic Data — Not a Medical Device/i)).toBeTruthy();

    // Flag reason code and urgency badge
    expect(screen.getByText('ELEVATED_CARDIAC_MARKER')).toBeTruthy();
    expect(screen.getByText('urgent')).toBeTruthy();

    // Why flagged waterfall chart
    expect(screen.getByText(/Why Flagged \(Rule Contribution Waterfall\)/i)).toBeTruthy();
    expect(screen.getByText('troponin_i')).toBeTruthy();
    expect(screen.getByText(/0.12 ng\/mL \(Limit: 0.04 ng\/mL\)/i)).toBeTruthy();

    // Patient & Clinician explanations
    expect(screen.getByText(/Your Troponin result was higher/i)).toBeTruthy();
    expect(screen.getByText(/requires immediate clinical assessment/i)).toBeTruthy();
  });

  it('allows clinician to record an urgency override with reason', () => {
    const onOverrideMock = vi.fn();
    render(<WhyFlaggedCard flag={sampleFlag} isClinician={true} onOverride={onOverrideMock} />);

    // Click Record Clinician Override
    const openOverrideBtn = screen.getByRole('button', { name: /Record Clinician Override/i });
    fireEvent.click(openOverrideBtn);

    // Form elements appear
    expect(screen.getByText(/Record Urgency Tier Override/i)).toBeTruthy();
    const reasonInput = screen.getByPlaceholderText(/Clinical justification/i);
    fireEvent.change(reasonInput, { target: { value: 'Known baseline elevation under active monitoring.' } });

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Save Override/i });
    fireEvent.click(saveBtn);

    expect(onOverrideMock).toHaveBeenCalledTimes(1);
    expect(onOverrideMock).toHaveBeenCalledWith(
      'flag-123',
      'soon',
      'Known baseline elevation under active monitoring.'
    );
  });
});

describe('AdminRulesPage Component', () => {
  it('renders rules catalog and allows admin sign-off', () => {
    render(
      <BrowserRouter>
        <AdminRulesPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Versioned Rule Catalog & Governance/i)).toBeTruthy();
    expect(screen.getByText('RULE-TROP-001')).toBeTruthy();
    expect(screen.getByText('RULE-WT-JUMP-001')).toBeTruthy();

    // RULE-WT-JUMP-001 starts unsigned
    const signOffBtn = screen.getByRole('button', { name: /Sign Off/i });
    expect(signOffBtn).toBeTruthy();

    fireEvent.click(signOffBtn);
    // After clicking sign off, it should reflect signed off state
    expect(screen.getAllByText(/✓ Signed Off/i).length).toBeGreaterThan(1);
  });
});
