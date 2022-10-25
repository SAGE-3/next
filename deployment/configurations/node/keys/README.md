# SSL certificates and JWT siging keys

## Generate self-signed local certificates

 - needs 'openssl' installed
 - ./genSSL-mac or ./genSSL-linux

## Generate the JWT signing keys

 - needs 'openssl' installed
 - ./genJWT_keys.sh

## Generate a token

 - needs node.js installed
 - ./genJWT_token.sh
   - i.e.:
     - node genJWT.js -e <email> -n <name>
     - node genJWT.js -e test2@gmail.com -n test2

