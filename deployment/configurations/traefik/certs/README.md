# SSL certificate for the server

Traefik handles HTTPS for the whole SAGE3 server. Put your certificate and its private key
in this folder, with these exact names (set in `../dynamic.yml`):

- `certificate.crt`: the server certificate in PEM format, followed by any intermediate
  certificates from your certificate authority (the full chain)
- `private.key`: the private key in PEM format, without a passphrase

```bash
cp CERTIFICATE_FILE certificate.crt
cp PRIVATE_KEY_FILE private.key
```

After replacing the files (for example when renewing the certificate), restart Traefik:
`docker compose restart traefik`.

The node server has no certificate setting: `configurations/node/keys` holds only the JWT keys and token.
