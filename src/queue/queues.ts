import config from '../config';
import { initialize } from './initialize';
import { DeliverJobData, WebpushDeliverJobData, InboxJobData, DbJobData } from './types';

export const deliverQueue = initialize<DeliverJobData>('deliver', config.deliverJobPerSec || -1);
export const webpushDeliverQueue = initialize<WebpushDeliverJobData>('webpushDeliver', -1);
export const inboxQueue = initialize<InboxJobData>('inbox', config.inboxJobPerSec || -1);
export const dbQueue = initialize<DbJobData>('db');
