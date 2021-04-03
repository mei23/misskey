import { MfmForest } from '../mfm/prelude';
import { preorderF } from '../prelude/tree';
import { unique } from '../prelude/array';

export default function(mfmForest: MfmForest): string[] {
	return unique(preorderF(mfmForest).map(x => x.type));
}
