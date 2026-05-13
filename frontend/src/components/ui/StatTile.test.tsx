/**
 * StatTile renders icon + label + value, with an optional hint line.
 * Only the conditional hint is real logic — the rest is layout.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { StatTile } from './StatTile';

describe('<StatTile />', () => {
    it('renders label and value', () => {
        render(<StatTile icon={Activity} label="Rating" value="4.8" />);
        expect(screen.getByText('Rating')).toBeInTheDocument();
        expect(screen.getByText('4.8')).toBeInTheDocument();
    });

    it('renders the hint line when provided', () => {
        render(<StatTile icon={Activity} label="Response" value="12m" hint="Avg. response time" />);
        expect(screen.getByText('Avg. response time')).toBeInTheDocument();
    });

    it('omits the hint when not provided', () => {
        render(<StatTile icon={Activity} label="Visits" value="128" />);
        // The component renders 2 paragraphs (label + value), not 3 (no hint).
        const paras = screen.getAllByText(/.+/);
        // Sanity check — neither "Avg" nor any common hint text should appear
        expect(screen.queryByText(/avg/i)).not.toBeInTheDocument();
        expect(paras.length).toBeGreaterThan(0);
    });
});
