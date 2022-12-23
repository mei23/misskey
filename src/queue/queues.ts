import config from '../config';
import { initialize } from './initialize';
import { DeliverJobData, WebpushDeliverJobData, InboxJobData, DbJobData } from './types';

export const deliverQueue = initialize<DeliverJobData>('deliver', config.deliverJobPerSec || 128);
export const webpushDeliverQueue = initialize<WebpushDeliverJobData>('webpushDeliver', 2);
export const inboxQueue = initialize<InboxJobData>('inbox', config.inboxJobPerSec || 16);
export const dbQueue = initialize<DbJobData>('db');
