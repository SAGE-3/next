/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { RedisClientType } from 'redis';
import * as passport from 'passport';
import { Express, NextFunction, Request, Response } from 'express';

// eslint-disable-next-line
const session = require('express-session');
// eslint-disable-next-line
const connectRedis = require('connect-redis');

import { SBAuthDatabase, SBAuthDB } from './SBAuthDatabase';
export type { SBAuthSchema } from './SBAuthDatabase';
import { passportGoogleSetup, SBAuthGoogleConfig, passportJWTSetup, SBAuthJWTConfig, passportGuestSetup, SBAuthGuestConfig, passportCILogonSetup, SBAuthCILogonConfig } from './adapters/';


export type SBAuthConfig = {
  sessionMaxAge: number,
  sessionSecret: string,
  strategies: {
    googleConfig?: SBAuthGoogleConfig,
    jwtConfig?: SBAuthJWTConfig,
    guestConfig?: SBAuthGuestConfig,
    cilogonConfig?: SBAuthCILogonConfig,
  }
}

/**
 * The SBAuth instance.
 */
export class SBAuth {

  private _redisClient!: RedisClientType;

  private _prefix!: string;

  private _database!: SBAuthDatabase;

  private _sessionParser!: any;

  public async init(redisclient: RedisClientType, prefix: string, config: SBAuthConfig, express: Express): Promise<SBAuth> {

    this._redisClient = redisclient.duplicate({ legacyMode: true });
    await this._redisClient.connect();

    this._database = SBAuthDB;
    this._prefix = `${prefix}:AUTH`
    await this._database.init(this._redisClient, this._prefix);

    // Passport session stuff
    const RedisStore = connectRedis(session);

    this._sessionParser = session({
      store: new RedisStore({ client: this._redisClient, prefix: this._prefix + ':SESS:', ttl: config.sessionMaxAge / 1000 }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // if true only transmit cookie over https
        httpOnly: false, // if true prevent client side JS from reading the cookie 
        maxAge: config.sessionMaxAge // session max age in miliseconds
      }
    })
    express.use(this._sessionParser);

    express.use(passport.initialize());
    express.use(passport.session());

    /* Passport serialize function in order to support login sessions. */
    passport.serializeUser(this.serializeUser);

    /* Passport deserialize function in order to support login sessions. */
    passport.deserializeUser(this.deserializeUser);

    if (config.strategies) {


      // Google Setup
      if (config.strategies.googleConfig) {
        if (passportGoogleSetup(config.strategies.googleConfig)) {
          express.get(config.strategies.googleConfig.routeEndpoint, passport.authenticate('google', { prompt: 'select_account', scope: ['profile'] }));
          express.get(config.strategies.googleConfig.callbackURL, passport.authenticate('google', { successRedirect: '/', failureRedirect: '/' }));
        }
      }

      // JWT Setup
      if (config.strategies.jwtConfig) {
        if (passportJWTSetup(config.strategies.jwtConfig)) {
          express.post(config.strategies.jwtConfig.routeEndpoint, passport.authenticate("jwt", { session: false }), (req, res) => {
            res.status(200).send({ success: true, message: "logged in", user: req.user });
          });
        }
      }

      // Guest Setup
      if (config.strategies.guestConfig) {
        if (passportGuestSetup()) {
          express.post(config.strategies.guestConfig.routeEndpoint, passport.authenticate('guest', { successRedirect: '/', failureRedirect: '/' }));
        }
      }

      // CILogon Setup
      if (config.strategies.cilogonConfig) {
        if (passportCILogonSetup(config.strategies.cilogonConfig)) {
          express.get(config.strategies.cilogonConfig.routeEndpoint, passport.authenticate('openidconnect', { prompt: 'consent', scope: ['openid'] }));
          express.get(config.strategies.cilogonConfig.callbackURL, passport.authenticate('openidconnect', { successRedirect: '/', failureRedirect: '/' }));
        }
      }
    }

    // Route to logout
    express.get('/auth/logout', (req, res) => this.logout(req, res));

    // Route to quickly verify authentication
    express.get('/auth/verify', this.authenticate, (req, res) => {
      res.status(200).send({ success: true, authentication: true });
    })

    return this;
  }
  /**
   * Express Middleware to Authenticate users
   */
  public async authenticate(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (user) {
      next();
    } else {
      res.status(403);
      res.send({ success: false, authentication: false });
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
  public logout(req: any, res: Response): void {
    if (req.user.provider == 'guest') {
      this._database.deleteAuth(req.user.provider, req.user.providerId);
    }
    req.session.destroy();
    req.logout();
    res.send({ success: true });
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

}