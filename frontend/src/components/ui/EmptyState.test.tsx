/**
 * Demo: component test with RTL. No MSW needed — this component has no network.
 *
 * Lesson encoded in this file: ALWAYS prefer `getByRole`/`getByText` over
 * `getByTestId`. Test what the user sees, not implementation details.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('<EmptyState />', () => {
    it('renders the title and message', () => {
        render(
            <EmptyState
                icon={<svg data-testid="i" />}
                title="No results"
                message="Try a different filter"
            />,
        );

        expect(screen.getByRole('heading', { name: 'No results' })).toBeInTheDocument();
        expect(screen.getByText('Try a different filter')).toBeInTheDocument();
    });

    it('omits the heading when no title is provided', () => {
        render(<EmptyState icon={<svg />} message="Nothing here yet" />);

        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
        expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    });

    it('renders children passed through (e.g. a CTA button)', () => {
        render(
            <EmptyState icon={<svg />} message="No appointments">
                <button>Book one</button>
            </EmptyState>,
        );

        expect(screen.getByRole('button', { name: 'Book one' })).toBeInTheDocument();
    });
});
