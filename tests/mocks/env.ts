/**
 * Mock for $env/dynamic/private
 * Used in tests to provide environment variables
 */

export const env = {
  AUTH_SECRET: 'test-auth-secret-key-for-testing-purposes-only',
  GITHUB_CLIENT_ID: 'test-github-client-id',
  GITHUB_CLIENT_SECRET: 'test-github-client-secret',
  ENABLE_CREDENTIALS_AUTH: 'true',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379'
};

export default env;
