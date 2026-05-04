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

const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
    res.json({ message: 'BacancyTeleCare API v1', version: '1.0' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/doctors', doctorsRouter);
apiRouter.use('/patients', patientsRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/messages', messagesRouter);
apiRouter.use('/prescriptions', prescriptionsRouter);
apiRouter.use('/files', filesRouter);
apiRouter.use('/video', videoRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/notifications', notificationsRouter);

export { apiRouter };
