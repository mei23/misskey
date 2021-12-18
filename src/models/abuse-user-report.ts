import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import db from '../db/mongodb';
import isObjectId from '../misc/is-objectid';
import { pack as packUser } from './user';
import { packMany as packNoteMany } from './note';

const AbuseUserReport = db.get<IAbuseUserReport>('abuseUserReports');
AbuseUserReport.dropIndex('userId').catch(() => {});
AbuseUserReport.dropIndex('reporterId').catch(() => {});
AbuseUserReport.dropIndex(['userId', 'reporterId'], { unique: true }).catch(() => {});

export default AbuseUserReport;

export interface IAbuseUserReport {
	_id: mongo.ObjectID;
	createdAt: Date;
	userId: mongo.ObjectID;
	reporterId: mongo.ObjectID;
	noteIds?: mongo.ObjectID[];
	comment: string;
}

export const packMany = (
	reports: (string | mongo.ObjectID | IAbuseUserReport)[]
) => {
	return Promise.all(reports.map(x => pack(x)));
};

export const pack = async (
	report: any
) => {
	let _report: any;

	if (isObjectId(report)) {
		_report = await AbuseUserReport.findOne({
			_id: report
		});
	} else if (typeof report === 'string') {
		_report = await AbuseUserReport.findOne({
			_id: new mongo.ObjectID(report)
		});
	} else {
		_report = deepcopy(report);
	}

	// Rename _id to id
	_report.id = _report._id;
	delete _report._id;

	_report.reporter = await packUser(_report.reporterId, null, { detail: true });
	_report.user = await packUser(_report.userId, null, { detail: true });
	_report.notes = _report.noteIds ? await packNoteMany(_report.noteIds, null, { skipHide: true }) : [];

	return _report;
};
