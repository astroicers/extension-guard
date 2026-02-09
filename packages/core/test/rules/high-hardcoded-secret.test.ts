import { describe, it, expect } from 'vitest';
import { highHardcodedSecret } from '../../src/rules/built-in/high-hardcoded-secret.js';
import type { ExtensionManifest } from '../../src/types/index.js';

describe('EG-HIGH-006: Hardcoded Secrets', () => {
  const mockManifest: ExtensionManifest = {
    name: 'test-extension',
    publisher: 'test-publisher',
    version: '1.0.0',
  };

  describe('API Keys', () => {
    it('should detect API key assignments with apiKey variable', () => {
      const files = new Map([
        ['src/config.js', `const apiKey = 'sk-1234567890abcdefghij';`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('api-key');
    });

    it('should detect API key with underscore naming', () => {
      const files = new Map([
        ['src/config.ts', `const api_key = "abcdefghij1234567890";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('api-key');
    });

    it('should detect API key in object notation', () => {
      const files = new Map([
        ['src/config.js', `const config = { apiKey: "secret12345678901234" };`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('api-key');
    });
  });

  describe('AWS Credentials', () => {
    it('should detect AWS Access Key ID', () => {
      const files = new Map([
        ['src/aws.js', `const accessKeyId = "AKIAIOSFODNN7EXAMPLE";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('aws-access-key');
    });

    it('should detect AWS Secret Access Key', () => {
      const files = new Map([
        ['src/aws.js', `aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('aws-secret-key');
    });
  });

  describe('GitHub Tokens', () => {
    it('should detect GitHub personal access token (ghp_)', () => {
      const files = new Map([
        ['src/github.js', `const token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('github-token');
    });

    it('should detect GitHub OAuth token (gho_)', () => {
      const files = new Map([
        ['src/github.js', `const oauthToken = "gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('github-token');
    });

    it('should detect GitHub server-to-server token (ghs_)', () => {
      const files = new Map([
        ['src/github.js', `const serverToken = "ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('github-token');
    });
  });

  describe('Generic Secrets', () => {
    it('should detect password assignment', () => {
      const files = new Map([
        ['src/db.js', `const password = "mysecretpassword123";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('generic-secret');
    });

    it('should detect secret assignment', () => {
      const files = new Map([
        ['src/auth.js', `const secret = "supersecretvalue123";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('generic-secret');
    });

    it('should detect token assignment', () => {
      const files = new Map([
        ['src/auth.js', `const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abc";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('generic-secret');
    });

    it('should detect passwd assignment', () => {
      const files = new Map([
        ['src/config.js', `db_passwd = "databasepass123";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('generic-secret');
    });
  });

  describe('Private Keys', () => {
    it('should detect RSA private key', () => {
      const files = new Map([
        ['src/keys.js', `const key = \`-----BEGIN RSA PRIVATE KEY-----
MIICXgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeLsbMB...
-----END RSA PRIVATE KEY-----\`;`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('private-key');
    });

    it('should detect EC private key', () => {
      const files = new Map([
        ['src/keys.js', `const ecKey = "-----BEGIN EC PRIVATE KEY-----";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('private-key');
    });

    it('should detect OpenSSH private key', () => {
      const files = new Map([
        ['src/keys.js', `const sshKey = "-----BEGIN OPENSSH PRIVATE KEY-----";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('private-key');
    });
  });

  describe('Bearer Tokens', () => {
    it('should detect Bearer token in authorization header', () => {
      const files = new Map([
        ['src/api.js', `headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" }`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('bearer-token');
    });
  });

  describe('Slack Tokens', () => {
    it('should detect Slack bot token pattern', () => {
      // Note: Using concatenation to avoid GitHub secret scanning false positives
      const prefix = 'xoxb';
      const token = `${prefix}-111111111111-2222222222222-abcdefghijABCDEFGHIJ`;
      const files = new Map([
        ['src/slack.js', `const slackToken = "${token}";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('slack-token');
    });

    it('should detect Slack user token pattern', () => {
      // Note: Using concatenation to avoid GitHub secret scanning false positives
      const prefix = 'xoxp';
      const token = `${prefix}-111111111111-2222222222222-abcdefghijABCDEFGHIJ`;
      const files = new Map([
        ['src/slack.js', `const userToken = "${token}";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThan(0);
      expect(evidences[0]?.matchedPattern).toBe('slack-token');
    });
  });

  describe('False Positive Prevention', () => {
    it('should not flag placeholder values', () => {
      const files = new Map([
        ['src/config.js', `
          const apiKey = "your-api-key-here";
          const password = "<password>";
          const secret = "REPLACE_ME";
          const token = "xxx-xxx-xxx";
        `],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences).toHaveLength(0);
    });

    it('should not flag environment variable references', () => {
      const files = new Map([
        ['src/config.js', `
          const apiKey = process.env.API_KEY;
          const password = process.env["PASSWORD"];
        `],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences).toHaveLength(0);
    });

    it('should not flag short values that are unlikely to be secrets', () => {
      const files = new Map([
        ['src/config.js', `const password = "test";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences).toHaveLength(0);
    });

    it('should not flag test/example files', () => {
      const files = new Map([
        ['test/config.test.js', `const apiKey = "sk-test1234567890abcdef";`],
        ['__tests__/auth.js', `const password = "testpassword123";`],
        ['examples/demo.js', `const token = "demo-token-12345678";`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences).toHaveLength(0);
    });

    it('should not flag commented-out code', () => {
      const files = new Map([
        ['src/config.js', `
          // const apiKey = "sk-1234567890abcdefghij";
          /* const password = "secretpassword123"; */
        `],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences).toHaveLength(0);
    });

    it('should not scan non-code files', () => {
      const files = new Map([
        ['README.md', `apiKey = "sk-1234567890abcdefghij"`],
        ['docs/config.txt', `password = "secretpassword123"`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences).toHaveLength(0);
    });
  });

  describe('Rule Metadata', () => {
    it('should have correct rule ID', () => {
      expect(highHardcodedSecret.id).toBe('EG-HIGH-006');
    });

    it('should have correct severity', () => {
      expect(highHardcodedSecret.severity).toBe('high');
    });

    it('should have correct category', () => {
      expect(highHardcodedSecret.category).toBe('hardcoded-secret');
    });

    it('should be enabled by default', () => {
      expect(highHardcodedSecret.enabled).toBe(true);
    });

    it('should have MITRE ATT&CK reference', () => {
      expect(highHardcodedSecret.mitreAttackId).toBe('T1552.001');
    });
  });

  describe('Edge Cases', () => {
    it('should detect multiple secrets in the same file', () => {
      const files = new Map([
        ['src/config.js', `
          const apiKey = "sk-1234567890abcdefghij";
          const password = "mysecretpassword123";
          const awsKey = "AKIAIOSFODNN7EXAMPLE";
        `],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBeGreaterThanOrEqual(3);
    });

    it('should include correct line numbers', () => {
      const files = new Map([
        ['src/config.js', `const x = 1;
const y = 2;
const apiKey = "sk-1234567890abcdefghij";
const z = 3;`],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences.length).toBe(1);
      expect(evidences[0]?.lineNumber).toBe(3);
    });

    it('should handle empty files', () => {
      const files = new Map([
        ['src/empty.js', ''],
      ]);
      const evidences = highHardcodedSecret.detect(files, mockManifest);
      expect(evidences).toHaveLength(0);
    });
  });
});
