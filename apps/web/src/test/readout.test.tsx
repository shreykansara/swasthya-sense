import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlainReadoutCard } from '../components/PlainReadoutCard';

describe('PlainReadoutCard Component', () => {
  const speakMock = vi.fn();
  const cancelMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock window.speechSynthesis
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: speakMock,
        cancel: cancelMock,
        pause: vi.fn(),
        resume: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock SpeechSynthesisUtterance as a proper ES6 class constructor
    class MockUtterance {
      text: string;
      lang: string = '';
      rate: number = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).SpeechSynthesisUtterance = MockUtterance;
  });

  it('renders with prototype disclaimer and default English readout', () => {
    render(<PlainReadoutCard />);

    // Prototype disclaimer
    const disclaimers = screen.getAllByText(/Prototype/i);
    expect(disclaimers.length).toBeGreaterThan(0);
    expect(screen.getByText(/Not a medical device/i)).toBeTruthy();

    // Default English test names and values
    expect(screen.getByText('Serum Potassium')).toBeTruthy();
    expect(screen.getByText('Troponin I')).toBeTruthy();
    expect(screen.getByText('Systolic Blood Pressure')).toBeTruthy();

    // English action button
    expect(screen.getByRole('button', { name: /Read readout aloud/i })).toBeTruthy();
  });

  it('toggles language between English and Hindi', () => {
    render(<PlainReadoutCard />);

    // Click Hindi toggle
    const hindiBtn = screen.getByRole('button', { name: /Switch to Hindi/i });
    fireEvent.click(hindiBtn);

    // Should display Hindi header & labels
    expect(screen.getByText('सरल भाषा में रिपोर्ट विवरण')).toBeTruthy();
    expect(screen.getByText(/सुनें \(Audio\)/i)).toBeTruthy();
    expect(screen.getByText(/कक्षा 6 स्तर का विवरण/i)).toBeTruthy();

    // Click English toggle
    const englishBtn = screen.getByRole('button', { name: /Switch to English/i });
    fireEvent.click(englishBtn);
    expect(screen.getByText('Plain Language Readout')).toBeTruthy();
  });

  it('triggers browser SpeechSynthesis when Read Aloud button is clicked', () => {
    render(<PlainReadoutCard />);

    const readAloudBtn = screen.getByRole('button', { name: /Read readout aloud/i });
    fireEvent.click(readAloudBtn);

    expect(cancelMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalledTimes(1);
  });
});
