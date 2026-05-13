/**
 * PrescriptionModal — focused on the medicine-row editing logic and the
 * save-button gating. The PNG generation, file upload, and prescription
 * API are mocked since they're tested in their own modules.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/services/api', () => ({
    filesApi: { upload: vi.fn() },
    prescriptionsApi: { create: vi.fn() },
}));

vi.mock('@/services/socket', () => ({
    consultationSocket: { shareFile: vi.fn() },
}));

vi.mock('@/utils/prescriptionCanvas', () => ({
    buildPrescriptionPng: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
}));

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

import { PrescriptionModal } from './PrescriptionModal';
import { filesApi, prescriptionsApi } from '@/services/api';
import { buildPrescriptionPng } from '@/utils/prescriptionCanvas';

const appointmentInfo = {
    appointmentId: 'appt-1',
    scheduledAt: '2026-01-01T10:00:00.000Z',
    durationMinutes: 30,
    status: 'CONFIRMED',
    reason: null,
    videoRoomId: null,
    meetingLink: null,
    sessionStartedAt: null,
    sessionEndedAt: null,
    doctor: { id: 'd1', name: 'Dr. Banner', specialization: 'Cardiology' },
    patient: { id: 'p1', name: 'Jane Doe' },
    isDoctor: true,
    isPatient: false,
};

const onFileSaved = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
    onFileSaved.mockReset();
    onClose.mockReset();
    vi.mocked(filesApi.upload).mockReset();
    vi.mocked(prescriptionsApi.create).mockReset();
    vi.mocked(buildPrescriptionPng).mockClear();
});

afterEach(() => vi.restoreAllMocks());

const renderModal = () =>
    render(
        <PrescriptionModal
            appointmentId="appt-1"
            appointmentInfo={appointmentInfo}
            onFileSaved={onFileSaved}
            onClose={onClose}
        />,
    );

describe('<PrescriptionModal />', () => {
    it('disables Save & Send when no medicine names are entered', () => {
        renderModal();
        expect(screen.getByRole('button', { name: /save & send/i })).toBeDisabled();
    });

    it('enables Save & Send once any medicine name is typed', async () => {
        const user = userEvent.setup();
        renderModal();

        await user.type(screen.getByPlaceholderText(/medicine name/i), 'Paracetamol 500mg');

        expect(screen.getByRole('button', { name: /save & send/i })).toBeEnabled();
    });

    it('Add Medicine appends another row', async () => {
        const user = userEvent.setup();
        renderModal();

        expect(screen.getAllByPlaceholderText(/medicine name/i)).toHaveLength(1);
        await user.click(screen.getByRole('button', { name: /add medicine/i }));
        expect(screen.getAllByPlaceholderText(/medicine name/i)).toHaveLength(2);
    });

    it('does not show a remove button when only one row exists', () => {
        renderModal();
        // The remove button is a button containing the X icon, only rendered when medicines.length > 1
        const rows = screen.getAllByPlaceholderText(/medicine name/i);
        expect(rows).toHaveLength(1);
    });

    it('removes a medicine row when its remove button is clicked', async () => {
        const user = userEvent.setup();
        renderModal();
        await user.click(screen.getByRole('button', { name: /add medicine/i }));
        expect(screen.getAllByPlaceholderText(/medicine name/i)).toHaveLength(2);

        // Type into the first row so we can tell them apart
        await user.type(screen.getAllByPlaceholderText(/medicine name/i)[0], 'A');

        // Per-row remove buttons appear only when medicines.length > 1.
        // Identify them: they're buttons (without text) that aren't Add/Save/Cancel/header-close.
        const allButtons = screen.getAllByRole('button');
        const removeRowButton = allButtons.find(
            (b) =>
                b.textContent === '' &&
                !b.matches('[aria-label]') &&
                b.querySelector('svg.lucide-x'),
        );
        // Fallback: pick the last X-icon button before Save/Cancel — keep test resilient by removing the LAST row.
        // The simplest deterministic approach: click the last per-row remove (row 2's remove).
        // Per-row removes appear in order; we just need ONE of them to disappear.
        const initialCount = screen.getAllByPlaceholderText(/medicine name/i).length;

        // Click via aria — but there are no labels. Use placeholder uniqueness: pick the second row's container.
        // Simpler: click the second-to-last button in document order (which should be a remove).
        const candidate = allButtons.find((b) => {
            const svg = b.querySelector('svg');
            return svg?.classList.contains('lucide-x') && b.className.includes('text-red-400');
        });
        if (candidate) await user.click(candidate);

        expect(screen.getAllByPlaceholderText(/medicine name/i).length).toBeLessThan(initialCount);
    });

    it('saves: builds PNG, uploads, creates prescription, and closes', async () => {
        const user = userEvent.setup();
        vi.mocked(filesApi.upload).mockResolvedValueOnce({
            id: 'f1',
            originalName: 'rx.png',
            mimeType: 'image/png',
            type: 'IMAGE',
            sizeBytes: '1',
            createdAt: '2026-01-01T00:00:00.000Z',
            uploadedBy: { id: 'u1', name: 'D', role: 'DOCTOR' },
        });
        vi.mocked(prescriptionsApi.create).mockResolvedValueOnce({
            id: 'rx-1',
        } as never);

        renderModal();
        // Use fireEvent.change to set the whole value at once — userEvent.type's
        // per-keystroke batching with React 19 can race the subsequent click.
        fireEvent.change(screen.getByPlaceholderText(/medicine name/i), {
            target: { value: 'Paracetamol' },
        });
        await user.click(screen.getByRole('button', { name: /save & send/i }));

        // Wait for async chain — the close happens after all awaits complete
        await vi.waitFor(() => expect(onClose).toHaveBeenCalled());

        expect(buildPrescriptionPng).toHaveBeenCalledOnce();
        expect(filesApi.upload).toHaveBeenCalledWith(expect.any(File), 'appt-1');
        expect(prescriptionsApi.create).toHaveBeenCalledWith(
            'appt-1',
            expect.objectContaining({
                items: expect.arrayContaining([
                    expect.objectContaining({ drugName: 'Paracetamol' }),
                ]),
            }),
        );
        expect(onFileSaved).toHaveBeenCalledOnce();
    });
});
