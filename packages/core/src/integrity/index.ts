export {
  computeExtensionHashes,
  verifyIntegrity,
  createHashRecord,
  sha256,
} from './integrity-verifier.js';

export type { ExtensionHash, IntegrityResult } from './integrity-verifier.js';

export {
  loadHashDatabase,
  saveHashDatabase,
  addHash,
  getHash,
  clearHashCache,
  getDefaultDatabasePath,
  generateBaseline,
} from './hash-database.js';

export type { HashDatabase } from './hash-database.js';
