/**
 * UploadModal — focused on the local interaction logic:
 *   - file selection appends to the list
 *   - removal works
 *   - upload button gating (disabled when empty / while in flight)
 *
 * Network + socket are mocked at the module boundary (they're external).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/api', () => ({
    filesApi: { upload: vi.fn() },
}));

vi.mock('@/services/socket', () => ({
    consultationSocket: { shareFile: vi.fn() },
}));

// Disable motion's animation wrapper — it adds noise to the DOM and is irrelevant here.
vi.mock('motion/react', () => ({
    motion: new Proxy(
        {},
        {
            get:
                () =>
                ({
                    children,
                    ...props
                }: { children?: React.ReactNode } & Record<string, unknown>) => {
                    const { initial, animate, exit, transition, ...rest } = props as Record<
                        string,
                        unknown
                    >;
                    void initial;
                    void animate;
                    void exit;
                    void transition;
                    return <div {...(rest as Record<string, unknown>)}>{children}</div>;
                },
        },
    ),
}));

import { UploadModal } from './UploadModal';
import { filesApi } from '@/services/api';

const onFileSaved = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
    onFileSaved.mockReset();
    onClose.mockReset();
    vi.mocked(filesApi.upload).mockReset();
});

afterEach(() => vi.restoreAllMocks());

const renderModal = () =>
    render(<UploadModal appointmentId="appt-1" onFileSaved={onFileSaved} onClose={onClose} />);

function getFileInput() {
    // The file input is hidden — find by type.
    const el = document.querySelector('input[type="file"]');
    if (!el) throw new Error('file input not found');
    return el as HTMLInputElement;
}

describe('<UploadModal />', () => {
    it('disables the Upload button when no files are selected', () => {
        renderModal();
        const upload = screen.getByRole('button', { name: /upload & share/i });
        expect(upload).toBeDisabled();
    });

    it('appends a selected file to the list and shows its name', async () => {
        const user = userEvent.setup();
        renderModal();

        const file = new File(['hello'], 'report.pdf', { type: 'application/pdf' });
        await user.upload(getFileInput(), file);

        expect(screen.getByText('report.pdf')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upload & share/i })).toBeEnabled();
    });

    it('removes a selected file when its remove button is clicked', async () => {
        const user = userEvent.setup();
        renderModal();

        await user.upload(getFileInput(), new File(['x'], 'a.pdf', { type: 'application/pdf' }));
        expect(screen.getByText('a.pdf')).toBeInTheDocument();

        // The remove button is a sibling of the filename; pick the first non-Cancel/Upload/X-header button.
        // The header X has aria text "Close" implicitly via lucide; the small per-file X is the second X button.
        const buttons = screen.getAllByRole('button');
        // Find the per-file remove (it's the one inside the file row — easiest signal is order: after the close header X)
        // Use the first button that's not Cancel/Upload/header-close: it's at index 1 (0=header X, 1=remove, 2=Cancel, 3=Upload).
        await user.click(buttons[1]);

        expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
    });

    it('calls filesApi.upload + onFileSaved + onClose on successful upload', async () => {
        const user = userEvent.setup();
        vi.mocked(filesApi.upload).mockResolvedValueOnce({
            id: 'f1',
            originalName: 'a.pdf',
            mimeType: 'application/pdf',
            type: 'REPORT',
            sizeBytes: '1',
            createdAt: '2026-01-01T00:00:00.000Z',
            uploadedBy: { id: 'u1', name: 'P', role: 'PATIENT' },
        });

        renderModal();
        await user.upload(getFileInput(), new File(['x'], 'a.pdf', { type: 'application/pdf' }));
        await user.click(screen.getByRole('button', { name: /upload & share/i }));

        expect(filesApi.upload).toHaveBeenCalledWith(expect.any(File), 'appt-1');
        expect(onFileSaved).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });
});
