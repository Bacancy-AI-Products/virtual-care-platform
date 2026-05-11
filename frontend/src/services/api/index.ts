export { ApiError } from './client';
export type { AuthUser, AuthResult } from './auth';
export { authApi } from './auth';
export type {
    DoctorSummary,
    DoctorStats,
    Credential,
    AvailabilitySlot,
    DoctorAvailabilityResponse,
    UpdateDoctorProfileInput,
    AvailabilitySlotInput,
    SpecializationOption,
} from './doctors';
export { doctorsApi } from './doctors';
export type {
    DoctorReview,
    ReviewsSummary,
    DoctorReviewsResponse,
    CreateReviewInput,
    MyReview,
    MyReviewsResponse,
} from './reviews';
export { reviewsApi } from './reviews';
export type {
    AppointmentDoctor,
    AppointmentPatient,
    Appointment,
    BookAppointmentInput,
} from './appointments';
export { appointmentsApi } from './appointments';
export type { PatientProfile } from './patients';
export { patientsApi } from './patients';
export type { UserMe } from './users';
export { usersApi } from './users';
export type { VideoRoomResponse, VideoTokenResponse, VideoInfoResponse } from './video';
export { videoApi } from './video';
export type { Message } from './messages';
export { messagesApi } from './messages';
export type { FileRecord } from './files';
export { filesApi } from './files';
export type { PrescriptionItem, Prescription, CreatePrescriptionInput } from './prescriptions';
export { prescriptionsApi } from './prescriptions';
export type { AppNotification } from './notifications';
export { notificationsApi } from './notifications';
