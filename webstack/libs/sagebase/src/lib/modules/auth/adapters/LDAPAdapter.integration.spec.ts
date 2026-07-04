/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Integration tests for LDAP authentication via passport-ldapauth.
 *
 * An ldapjs in-memory server is started for each describe block, so no
 * external infrastructure is required.  Two scenarios are covered:
 *
 *   1. OpenLDAP style  — searchFilter: (uid={{username}})
 *   2. Active Directory style — searchFilter: (sAMAccountName={{username}})
 *
 * Note: ldapjs normalises all filter attribute names to lowercase, so user
 * attribute maps are stored with lowercase keys for `filter.matches()`.
 */

import * as ldap from 'ldapjs';
import * as express from 'express';
import * as supertest from 'supertest';

// SBAuthDB is not needed for these integration tests.
jest.mock('../SBAuthDatabase', () => ({
  SBAuthDB: {
    findOrAddAuth: jest.fn().mockImplementation(async (provider: string, providerId: string, extras: any) => ({
      id: `${provider}-${providerId}`,
      provider,
      providerId,
      displayName: extras?.displayName ?? '',
      email: extras?.email ?? '',
      picture: '',
      password: '',
    })),
  },
}));

// ── Shared constants ──────────────────────────────────────────────────────────

const BASE_DN = 'dc=example,dc=com';
const USERS_DN = `ou=users,${BASE_DN}`;
const SERVICE_DN = `cn=service,${BASE_DN}`;
const SERVICE_PASS = 'service-secret';

const GROUP_ADMIN = 'CN=SAGE3-Admins,OU=Groups,DC=example,DC=com';
const GROUP_USER = 'CN=SAGE3-Users,OU=Groups,DC=example,DC=com';
const GROUP_SPECTATOR = 'CN=SAGE3-Spectators,OU=Groups,DC=example,DC=com';

// ── Test user definitions ─────────────────────────────────────────────────────

interface TestUser {
  dn: string;
  password: string;
  /** Attribute map with ALL keys in lowercase (ldapjs normalises filter attrs). */
  attrs: Record<string, string | string[]>;
}

/** OpenLDAP-style directory: login attribute = uid */
const OPENLDAP_USERS: TestUser[] = [
  {
    dn: `uid=admin-user,${USERS_DN}`,
    password: 'admin-pass',
    attrs: {
      uid: 'admin-user',
      cn: 'Admin User',
      displayname: 'Admin User',
      mail: 'admin@example.com',
      memberof: [GROUP_ADMIN, GROUP_USER],
    },
  },
  {
    dn: `uid=regular-user,${USERS_DN}`,
    password: 'user-pass',
    attrs: {
      uid: 'regular-user',
      cn: 'Regular User',
      displayname: 'Regular User',
      mail: 'user@example.com',
      memberof: [GROUP_USER],
    },
  },
  {
    dn: `uid=spectator-user,${USERS_DN}`,
    password: 'spec-pass',
    attrs: {
      uid: 'spectator-user',
      cn: 'Spectator User',
      displayname: 'Spectator User',
      mail: 'spec@example.com',
      memberof: [GROUP_SPECTATOR],
    },
  },
  {
    dn: `uid=no-group-user,${USERS_DN}`,
    password: 'nogroup-pass',
    attrs: {
      uid: 'no-group-user',
      cn: 'No Group User',
      displayname: 'No Group User',
      mail: 'nogroup@example.com',
      // no memberof attribute
    },
  },
];

/** Active Directory-style directory: login attribute = sAMAccountName */
const AD_USERS: TestUser[] = [
  {
    dn: `CN=ADAdmin,OU=Users,DC=example,DC=com`,
    password: 'adpass',
    attrs: {
      samaccountname: 'ADAdmin',
      cn: 'AD Admin',
      displayname: 'AD Admin',
      mail: 'adadmin@example.com',
      memberof: [GROUP_ADMIN],
    },
  },
  {
    dn: `CN=ADUser,OU=Users,DC=example,DC=com`,
    password: 'aduserpass',
    attrs: {
      samaccountname: 'ADUser',
      cn: 'AD Regular User',
      displayname: 'AD Regular User',
      mail: 'aduser@example.com',
      memberof: [GROUP_USER],
    },
  },
];

// ── In-memory LDAP server ─────────────────────────────────────────────────────

function buildLdapServer(users: TestUser[]): Promise<{ server: ldap.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = ldap.createServer();

    /**
     * Bind handler: covers service account AND all user accounts.
     * ldapjs routes by DN suffix — BASE_DN matches every DN in our directory.
     */
    /**
     * Normalise a DN string for comparison: lowercase and strip all
     * whitespace so that "cn=foo, dc=bar" equals "cn=foo,dc=bar".
     * ldapjs's `req.dn.toString()` inserts spaces after commas.
     */
    const normDN = (dn: string) => dn.toLowerCase().replace(/\s+/g, '');

    server.bind(BASE_DN, (req: any, res: any, next: any) => {
      const reqDN = normDN(req.dn.toString());
      const reqPass: string = typeof req.credentials === 'string' ? req.credentials : req.credentials?.toString?.() ?? '';

      // Service account
      if (reqDN === normDN(SERVICE_DN) && reqPass === SERVICE_PASS) {
        res.end();
        return next();
      }

      // User accounts
      for (const user of users) {
        if (reqDN === normDN(user.dn) && reqPass === user.password) {
          res.end();
          return next();
        }
      }

      return next(new ldap.InvalidCredentialsError());
    });

    /**
     * Search handler: returns entries whose attributes match the LDAP filter.
     * All attribute keys in `user.attrs` are lowercase so that
     * `req.filter.matches()` (which uses the lowercase filter attribute name)
     * resolves them correctly.
     */
    server.search(USERS_DN, (req: any, res: any, next: any) => {
      for (const user of users) {
        if (req.filter.matches(user.attrs)) {
          res.send({ dn: user.dn, attributes: user.attrs });
        }
      }
      res.end();
      return next();
    });

    server.listen(0, '127.0.0.1', () => {
      const address = (server as any).address() as { port: number };
      resolve({ server, port: address.port });
    });

    server.on('error', reject);
  });
}

// ── Express app factory ───────────────────────────────────────────────────────

interface LdapConfig {
  url: string;
  searchFilter: string;
  /** Attribute name in LDAP response that holds the display name. */
  displayNameAttr?: string;
  /** Attribute name in LDAP response that holds the email. */
  emailAttr?: string;
}

function buildApp(config: LdapConfig): express.Application {
  // Each test suite gets its own passport instance to prevent strategy leakage.
  const { Passport } = require('passport') as typeof import('passport');
  const testPassport = new (Passport as any)();
  const LdapStrategy = require('passport-ldapauth');

  testPassport.use(
    'ldapauth',
    new LdapStrategy(
      {
        server: {
          url: config.url,
          bindDN: SERVICE_DN,
          bindCredentials: SERVICE_PASS,
          searchBase: USERS_DN,
          searchFilter: config.searchFilter,
          searchAttributes: ['dn', 'uid', 'cn', 'mail', 'displayname', 'memberof', 'samaccountname'],
          tlsOptions: { rejectUnauthorized: false },
        },
      },
      (ldapUser: any, done: any) => {
        // Return a simplified user object so tests can assert on it.
        done(null, {
          dn: ldapUser.dn,
          displayName: ldapUser[config.displayNameAttr ?? 'displayname'] ?? ldapUser.cn ?? '',
          email: ldapUser[config.emailAttr ?? 'mail'] ?? '',
          memberOf: ldapUser.memberof ?? [],
        });
      }
    )
  );

  testPassport.serializeUser((u: any, done: any) => done(null, u));
  testPassport.deserializeUser((u: any, done: any) => done(null, u));

  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(testPassport.initialize());

  app.post('/auth/ldap', (req, res, next) => {
    testPassport.authenticate('ldapauth', (err: any, user: any) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(401).json({ success: false });
      return res.status(200).json({ success: true, user });
    })(req, res, next);
  });

  return app;
}

// ── Test suites ───────────────────────────────────────────────────────────────

jest.setTimeout(15000);

// ─ OpenLDAP style ────────────────────────────────────────────────────────────

describe('LDAPAdapter integration — OpenLDAP style (uid)', () => {
  let server: ldap.Server;
  let app: express.Application;

  beforeAll(async () => {
    ({ server } = await buildLdapServer(OPENLDAP_USERS).then((s) => {
      app = buildApp({
        url: `ldap://127.0.0.1:${s.port}`,
        searchFilter: '(uid={{username}})',
      });
      return s;
    }));
  });

  afterAll(() => server.close(() => {}));

  it('authenticates admin user with correct password', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'admin-user', password: 'admin-pass' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.displayName).toBe('Admin User');
    expect(res.body.user.email).toBe('admin@example.com');
  });

  it('returns memberOf groups for admin user', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'admin-user', password: 'admin-pass' });
    expect(res.status).toBe(200);
    const memberOf: string[] = [].concat(res.body.user.memberOf ?? []);
    expect(memberOf.some((g) => g === GROUP_ADMIN)).toBe(true);
    expect(memberOf.some((g) => g === GROUP_USER)).toBe(true);
  });

  it('authenticates regular user', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'regular-user', password: 'user-pass' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user@example.com');
  });

  it('authenticates spectator user', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'spectator-user', password: 'spec-pass' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('spec@example.com');
  });

  it('authenticates user with no group membership', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'no-group-user', password: 'nogroup-pass' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('nogroup@example.com');
  });

  it('rejects an unknown username', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'nobody', password: 'any' });
    expect(res.status).toBe(401);
  });

  it('rejects a valid username with wrong password', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'regular-user', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

// ─ Active Directory style ─────────────────────────────────────────────────────

describe('LDAPAdapter integration — Active Directory style (sAMAccountName)', () => {
  let server: ldap.Server;
  let app: express.Application;

  beforeAll(async () => {
    ({ server } = await buildLdapServer(AD_USERS).then((s) => {
      app = buildApp({
        url: `ldap://127.0.0.1:${s.port}`,
        searchFilter: '(sAMAccountName={{username}})',
      });
      return s;
    }));
  });

  afterAll(() => server.close(() => {}));

  it('authenticates AD admin user', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'ADAdmin', password: 'adpass' });
    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('AD Admin');
    expect(res.body.user.email).toBe('adadmin@example.com');
  });

  it('AD admin belongs to admin group', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'ADAdmin', password: 'adpass' });
    expect(res.status).toBe(200);
    const memberOf: string[] = [].concat(res.body.user.memberOf ?? []);
    expect(memberOf.some((g) => g === GROUP_ADMIN)).toBe(true);
  });

  it('authenticates AD regular user', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'ADUser', password: 'aduserpass' });
    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('AD Regular User');
  });

  it('rejects wrong password for AD user', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'ADAdmin', password: 'badpass' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown AD username', async () => {
    const res = await supertest(app).post('/auth/ldap').type('form').send({ username: 'UnknownUser', password: 'anything' });
    expect(res.status).toBe(401);
  });
});
