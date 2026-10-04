import type {Content} from '../types';

/** A build-time receipt binds the separate owner approval to the immutable source pack. */
export interface ProductionContentApproval {
  schemaVersion:1;
  approved:true;
  contentSha256:string;
  contentVersion:string;
}

function record(value:unknown):value is Record<string,unknown> {
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}

/**
 * The build validates the authored bytes before embedding this source identity and receipt.
 * Do not derive permission from editorial flags in the original learning content.
 */
export function matchesProductionContentApproval(content:Content,receipt:unknown,sourceLock:unknown):receipt is ProductionContentApproval {
  if(!record(receipt)||!record(sourceLock))return false;
  if(receipt.schemaVersion!==1||receipt.approved!==true||sourceLock.schema!==1)return false;
  const hash=sourceLock.sha256,version=sourceLock.contentVersion;
  if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash)||
    typeof version!=='string'||!version.trim()||version.trim()!==version)return false;
  return receipt.contentSha256===hash&&receipt.contentVersion===version&&content?.manifest?.version===version;
}
