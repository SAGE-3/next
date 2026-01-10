/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RedisClientType } from 'redis';
import RedisStore from 'connect-redis';

import { Express, NextFunction, Request, Response } from 'express';
import * as session from 'express-session';
import * as passport from 'passport';

import { SBAuthDatabase, SBAuthDB, SBAuthSchema } from './SBAuthDatabase';
export type { SBAuthSchema } from './SBAuthDatabase';
export type { JWTPayload } from './adapters';
import {
  passportGoogleSetup,
  SBAuthGoogleConfig,
  passportAppleSetup,
  SBAuthAppleConfig,
  passportJWTSetup,
  SBAuthJWTConfig,
  passportGuestSetup,
  SBAuthGuestConfig,
  passportCILogonSetup,
  SBAuthCILogonConfig,
  passportSpectatorSetup,
  SBAuthSpectatorConfig,
} from './adapters/';

export type SBAuthConfig = {
  sessionMaxAge: number;
  sessionSecret: string;
  strategies: ('google' | 'apple' | 'cilogon' | 'guest' | 'jwt' | 'spectator')[];
  production: boolean;
  googleConfig?: SBAuthGoogleConfig;
  appleConfig?: SBAuthAppleConfig;
  jwtConfig?: SBAuthJWTConfig;
  guestConfig?: SBAuthGuestConfig;
  cilogonConfig?: SBAuthCILogonConfig;
  spectatorConfig?: SBAuthSpectatorConfig;
};

/**
 * The SBAuth instance.
 */
export class SBAuth {
  private _redisClient!: RedisClientType;

  private _prefix!: string;

  private _database!: SBAuthDatabase;

  private _sessionParser!: any;

  /**
   * Creates a generalized OAuth callback handler with enhanced error logging and security validation
   * @param providerName Human-readable provider name (e.g., 'google', 'cilogon', 'apple')
   * @param strategyName Passport strategy name (e.g., 'google', 'openidconnect', 'apple')
   * @returns Express middleware function for handling OAuth callbacks
   */
  private createOAuthCallbackHandler(providerName: string, strategyName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Log OAuth callback details for debugging
      // console.log(`${providerName}> OAuth callback received:`, {
      //   query: req.query,
      //   hasState: !!req.query.state,
      //   hasCode: !!req.query.code,
      //   hasError: !!req.query.error,
      //   sessionId: req.sessionID,
      //   timestamp: new Date().toISOString()
      // });

      // Check for OAuth error in query parameters
      if (req.query.error) {
        console.error(`${providerName}> OAuth provider returned error:`, req.query.error, req.query.error_description);
        return res.redirect(
          `/login?error=${providerName}_oauth_error&details=` +
            encodeURIComponent((req.query.error_description as string) || (req.query.error as string)),
        );
      }

      passport.authenticate(strategyName, (err: any, user: any, info: any) => {
        if (err) {
          console.error(`${providerName}> Authentication error:`, err);
          return res.redirect(`/login?error=${providerName}_error&details=` + encodeURIComponent(err.message || 'Unknown error'));
        }

        if (!user) {
          console.error(`${providerName}> Authentication failed - no user returned:`, info);
          const details = info?.message || info?.reason || 'No user data received';
          return res.redirect(`/login?error=${providerName}_no_user&details=` + encodeURIComponent(details));
        }

        // Log successful authentication with more details
        // console.log(`${providerName}> Successful authentication:`, {
        //   userId: user.id,
        //   email: user.email || user.displayName || 'no-email',
        //   provider: user.provider,
        //   sessionId: req.sessionID,
        //   userAgent: req.get('User-Agent'),
        //   timestamp: new Date().toISOString(),
        // });

        // Establish user session
        req.logIn(user, (loginErr: any) => {
          if (loginErr) {
            console.error(`${providerName}> Session login error:`, loginErr);
            return res.redirect(
              `/login?error=${providerName}_login_failed&details=` + encodeURIComponent(loginErr.message || 'Session creation failed'),
            );
          }

          // console.log(`${providerName}> Session established successfully:`, {
          //   userId: user.id,
          //   email: user.email || user.displayName || 'no-email',
          //   sessionId: req.sessionID,
          //   timestamp: new Date().toISOString(),
          // });

          return res.redirect('/');
        });
      })(req, res, next);
    };
  }

  public async init(redisclient: RedisClientType, prefix: string, config: SBAuthConfig, express: Express): Promise<SBAuth> {
    // Get a REDIS client
    this._redisClient = redisclient.duplicate();
    await this._redisClient.connect();

    this._database = SBAuthDB;
    this._prefix = `${prefix}:AUTH`;
    await this._database.init(this._redisClient, this._prefix);

    // Setup the session parser
    // @ts-ignore
    this._sessionParser = session({
      store: new RedisStore({ client: this._redisClient, prefix: this._prefix + ':SESS:', ttl: config.sessionMaxAge / 1000 }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.production, // if true only transmit cookie over https
        httpOnly: true, // if true prevent client side JS from reading the cookie
        maxAge: config.sessionMaxAge, // session max age in miliseconds
        sameSite: 'lax',
      },
    });
    // Setup the express session parser
    express.use(this._sessionParser);

    // Initialize passport
    express.use(passport.initialize());
    express.use(passport.session());

    // Passport serialize function in order to support login sessions.
    passport.serializeUser(this.serializeUser);

    // Passport deserialize function in order to support login sessions.
    passport.deserializeUser(this.deserializeUser);

    if (config.strategies) {
      // Google Setup
      if (config.strategies.includes('google') && config.googleConfig) {
        if (passportGoogleSetup(config.googleConfig)) {
          express.get(
            config.googleConfig.routeEndpoint,
            passport.authenticate('google', {
              prompt: 'select_account',
              scope: ['profile', 'email'],
              // Note: State parameter validation handled by passport strategy
            }),
          );
          express.get(config.googleConfig.callbackURL, this.createOAuthCallbackHandler('google', 'google'));
        }
      }

      // Apple Setup
      if (config.strategies.includes('apple') && config.appleConfig) {
        if (passportAppleSetup(config.appleConfig)) {
          express.get(config.appleConfig.routeEndpoint, passport.authenticate('apple'));
          express.post(config.appleConfig.callbackURL, this.createOAuthCallbackHandler('apple', 'apple'));
        }
      }

      // JWT Setup
      if (config.strategies.includes('jwt') && config.jwtConfig) {
        if (passportJWTSetup(config.jwtConfig)) {
          express.post(config.jwtConfig.routeEndpoint, passport.authenticate('jwt', { session: false }), (req, res) => {
            res.status(200).send({ success: true, message: 'logged in', user: req.user });
          });
        }
      }

      // Guest Setup
      if (config.strategies.includes('guest') && config.guestConfig) {
        if (passportGuestSetup()) {
          express.post(config.guestConfig.routeEndpoint, passport.authenticate('guest', { successRedirect: '/', failureRedirect: '/' }));
        }
      }

      // Spectator Setup
      if (config.strategies.includes('spectator') && config.spectatorConfig) {
        if (passportSpectatorSetup()) {
          express.post(
            config.spectatorConfig.routeEndpoint,
            passport.authenticate('spectator', { successRedirect: '/', failureRedirect: '/' }),
          );
        }
      }

      // CILogon Setup
      if (config.strategies.includes('cilogon') && config.cilogonConfig) {
        const ready = await passportCILogonSetup(config.cilogonConfig);
        if (ready) {
          express.get(
            config.cilogonConfig.routeEndpoint,
            passport.authenticate('openidconnect', {
              prompt: 'consent',
              scope: ['openid', 'email', 'profile'],
              // Note: State parameter validation handled by OpenID Connect strategy
            }),
          );
          express.get(config.cilogonConfig.callbackURL, this.createOAuthCallbackHandler('cilogon', 'openidconnect'));
        }
      }
    }

    // Route to logout
    express.get('/auth/logout', (req, res, next) => this.logout(req, res, next));

    // Route to quickly verify authentication
    express.get('/auth/verify', this.authenticate, (req, res) => {
      const user = req.user as SBAuthSchema;
      // Get the expiration date from the session cookie
      const exp = req.session.cookie.expires || new Date();
      res.status(200).send({ success: true, authentication: true, auth: user, expire: exp.getTime() });
    });

    // At Init delete all temporary accounts
    await this._database.deleteAllTemporaryAccounts();

    return this;
  }
  /**
   * Express Middleware to Authenticate users
   */
  public async authenticate(req: Request, res: Response, next: NextFunction) {
    const user = req.user as SBAuthSchema;
    const headerToken = req.headers['authorization'];
    if (user) {
      next();
    } else if (headerToken) {
      // if there's a header token, try JWT strategy
      passport.authenticate('jwt', { session: false })(req, res, next);
    } else {
      res.status(403);
      res.send({ success: false, authentication: false, auth: null });
    }
  }

  /**
   * The SessionParser to enable Websocket routes to obtain the session information.
   * Example usage:
   *
   */
  public get sessionParser() {
    return this._sessionParser;
  }

  /**
   * Log the current user out of the session.
   */
  public logout(req: any, res: Response, next: NextFunction): void {
    const user = req.user;
    if (!user) {
      res.send({ success: true });
      return;
    }
    if (req.user?.provider == 'guest') {
      this._database.deleteAuth(req.user.provider, req.user.providerId);
    }
    // req.session.destroy();
    req.session.user = null;

    req.logout({ keepSessionInfo: false }, function (err: Error) {
      if (err) {
        return next(err);
      }
      res.send({ success: true });
    });
  }

  private serializeUser(user: Express.User, done: (err: unknown, id?: unknown) => void): void {
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  }

  private deserializeUser(user: Express.User, done: (err: unknown, user?: false | Express.User | null | undefined) => void): void {
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  }

  public deleteAuthByEmail(email: string): Promise<SBAuthSchema | undefined> {
    return this._database.deleteAuthByEmail(email);
  }
}
