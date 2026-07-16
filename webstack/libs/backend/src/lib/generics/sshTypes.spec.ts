import { isValidSessionName, isHostAllowed } from './sshTypes';

describe('isValidSessionName', () => {
  it('accepts safe tmux session names', () => {
    for (const n of ['demo-session', 'sage3-abc.123', 'a_b', 'X9']) expect(isValidSessionName(n)).toBe(true);
  });
  it('rejects names with shell metacharacters or spaces', () => {
    for (const n of ['a b', 'a;rm -rf', '$(x)', 'a`b`', 'a|b', 'a/b', '', "a'b"]) expect(isValidSessionName(n)).toBe(false);
  });
});

describe('isHostAllowed', () => {
  it('denies everything when the allowlist is empty (secure-by-default)', () => {
    expect(isHostAllowed('any.host', 22, [])).toBe(false);
  });
  it('allows an exact host match (any port) for a bare host entry', () => {
    expect(isHostAllowed('sandbox.lab', 22, ['sandbox.lab'])).toBe(true);
    expect(isHostAllowed('sandbox.lab', 2222, ['sandbox.lab'])).toBe(true);
  });
  it('pins the port when the entry is host:port', () => {
    expect(isHostAllowed('sandbox.lab', 2222, ['sandbox.lab:2222'])).toBe(true);
    expect(isHostAllowed('sandbox.lab', 22, ['sandbox.lab:2222'])).toBe(false);
  });
  it('matches the host case-insensitively', () => {
    expect(isHostAllowed('Sandbox.Lab', 22, ['sandbox.lab'])).toBe(true);
  });
  it('denies a host that is not in the list', () => {
    expect(isHostAllowed('evil.example', 22, ['sandbox.lab'])).toBe(false);
  });
});
