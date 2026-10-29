# JWT signing keys and token

The server's SSL certificate does not go here: Traefik handles HTTPS, and reads the
certificate from `configurations/traefik/certs` (see the README in that folder).

## Generate the JWT signing keys

 - needs 'openssl' installed
 - ./genJWT_keys.sh

## Generate a token

 - needs node.js installed
 - ./genJWT_token.sh
   - i.e.:
     - node genJWT.js -e <email> -n <name>
     - node genJWT.js -e test2@gmail.com -n test2

## Generate self-signed local certificates (testing only)

 - needs 'openssl' installed
 - ./genSSL-mac or ./genSSL-linux
 - creates `<name>-server.crt` and `<name>-server.key` in this folder; to use them,
   copy them into the Traefik folder:
   - `cp localhost-server.crt ../../traefik/certs/certificate.crt`
   - `cp localhost-server.key ../../traefik/certs/private.key`
