/**
 * RatingStars (display) + RatingStarsInput (interactive). Pure UI logic;
 * no MSW, no fetch, no async — high signal for a small surface.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RatingStars, RatingStarsInput } from './RatingStars';

describe('<RatingStars />', () => {
    it('renders an accessible label with one decimal place', () => {
        render(<RatingStars value={4.3} />);
        expect(screen.getByLabelText('Rated 4.3 out of 5')).toBeInTheDocument();
    });

    it('clamps values above 5', () => {
        render(<RatingStars value={9} />);
        expect(screen.getByLabelText('Rated 5.0 out of 5')).toBeInTheDocument();
    });

    it('clamps negative values to 0', () => {
        render(<RatingStars value={-1} />);
        expect(screen.getByLabelText('Rated 0.0 out of 5')).toBeInTheDocument();
    });

    it('shows the numeric value when `showValue` is set', () => {
        render(<RatingStars value={4.5} showValue />);
        expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('hides the numeric value by default', () => {
        render(<RatingStars value={4.5} />);
        expect(screen.queryByText('4.5')).not.toBeInTheDocument();
    });

    it('renders a count with thousands separators when provided', () => {
        render(<RatingStars value={4.5} count={1234} />);
        expect(screen.getByText('(1,234)')).toBeInTheDocument();
    });

    it('omits the count chip when not provided', () => {
        const { container } = render(<RatingStars value={4} />);
        expect(container.textContent).not.toMatch(/\(/);
    });
});

describe('<RatingStarsInput />', () => {
    it('renders 5 radio buttons in a radiogroup', () => {
        const onChange = vi.fn();
        render(<RatingStarsInput value={0} onChange={onChange} />);

        const group = screen.getByRole('radiogroup', { name: /rate from 1 to 5/i });
        expect(group).toBeInTheDocument();
        expect(screen.getAllByRole('radio')).toHaveLength(5);
    });

    it('marks the selected star with aria-checked', () => {
        const onChange = vi.fn();
        render(<RatingStarsInput value={3} onChange={onChange} />);

        const radios = screen.getAllByRole('radio');
        expect(radios[2]).toHaveAttribute('aria-checked', 'true');
        expect(radios[0]).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onChange with the clicked star value (1–5)', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<RatingStarsInput value={0} onChange={onChange} />);

        const radios = screen.getAllByRole('radio');
        await user.click(radios[3]); // 4th star
        expect(onChange).toHaveBeenCalledWith(4);
    });

    it('does not call onChange when disabled', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<RatingStarsInput value={0} onChange={onChange} disabled />);

        await user.click(screen.getAllByRole('radio')[2]);
        expect(onChange).not.toHaveBeenCalled();
    });
});
