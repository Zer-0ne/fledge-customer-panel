import { describe, expect, it } from 'vitest';
import { resolvePushRoute } from './push-foreground-listener';

describe('resolvePushRoute', () => {
  it('routes roommate posts to interests with post highlight', () => {
    expect(resolvePushRoute({ entityType: 'roommate_post', entityId: 'p1' })).toBe(
      '/roommate-interests?tab=incoming&postId=p1',
    );
    expect(resolvePushRoute({ entityType: 'roommate_post' })).toBe('/roommate-interests');
  });
});
