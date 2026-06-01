import { Router } from 'express';
import { authRouter } from '../modules/auth';
import { usersRouter } from '../modules/users';
import { doctorsRouter } from '../modules/doctors';
import { patientsRouter } from '../modules/patients';
import { appointmentsRouter } from '../modules/appointments';
import { messagesRouter } from '../modules/messages';
import { prescriptionsRouter } from '../modules/prescriptions';
import { filesRouter } from '../modules/files';
import { videoRouter } from '../modules/video';
import { adminRouter } from '../modules/admin';
import { notificationsRouter } from '../modules/notifications';
import { reviewsRouter } from '../modules/reviews';
import { vitalsRouter } from '../modules/vitals';
import { reportsRouter } from '../modules/reports';
import { symptomChecksRouter } from '../modules/symptom-checks';

const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
    res.json({ message: 'BacancyTeleCare API v1', version: '1.0' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
// Reviews mount at the api root because routes are split across /doctors and /appointments.
// Must come BEFORE /doctors and /appointments so the more specific paths match first.
apiRouter.use('/', reviewsRouter);
apiRouter.use('/doctors', doctorsRouter);
apiRouter.use('/patients', patientsRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/messages', messagesRouter);
apiRouter.use('/prescriptions', prescriptionsRouter);
apiRouter.use('/files', filesRouter);
apiRouter.use('/video', videoRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/vitals', vitalsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/symptom-checks', symptomChecksRouter);

export { apiRouter };
