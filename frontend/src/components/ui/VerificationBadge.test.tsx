/**
 * VerificationBadge has two variants with different DOM shapes — the `icon`
 * variant uses an aria-label (no visible text), the `pill` variant has visible
 * "Verified" text. Tests pin both so regressions are caught.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerificationBadge } from './VerificationBadge';

describe('<VerificationBadge />', () => {
    it('renders the pill variant with visible "Verified" text by default', () => {
        render(<VerificationBadge />);
        expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('renders the icon variant with an aria-label (no visible text)', () => {
        render(<VerificationBadge variant="icon" />);
        expect(screen.getByLabelText('Verified doctor')).toBeInTheDocument();
        expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });

    it('supports both md (default) and sm sizes without crashing', () => {
        const { rerender } = render(<VerificationBadge size="md" />);
        expect(screen.getByText('Verified')).toBeInTheDocument();
        rerender(<VerificationBadge size="sm" />);
        expect(screen.getByText('Verified')).toBeInTheDocument();
    });
});
