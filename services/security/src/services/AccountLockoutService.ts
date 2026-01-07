import { AccountLockoutRepository } from "../repositories/AccountLockoutRepository.js";
import { PasswordPolicyRepository } from "../repositories/PasswordPolicyRepository.js";
import { accountLockoutsTotal, failedLoginsTotal } from "../metrics.js";

export type LockoutStatus =
  | { isLocked: false; failedAttempts: number }
  | { isLocked: true; failedAttempts: number; lockedUntil: string; remainingMinutes: number };

export class AccountLockoutService {
  constructor(
    private readonly repo = new AccountLockoutRepository(),
    private readonly policies = new PasswordPolicyRepository()
  ) {}

  async getStatus(params: { userId: string; schoolId: string }): Promise<LockoutStatus> {
    const row = await this.repo.get(params.userId);
    if (!row || !row.locked_until) return { isLocked: false, failedAttempts: row?.failed_attempts ?? 0 };

    const now = Date.now();
    const until = new Date(row.locked_until).getTime();
    if (now < until) {
      return { isLocked:true, failedAttempts: row.failed_attempts, lockedUntil: row.locked_until, remainingMinutes: Math.ceil((until-now)/60000) };
    }
    await this.repo.reset(params.userId);
    return { isLocked:false, failedAttempts: 0 };
  }

  async recordFailedAttempt(params: { userId: string; schoolId: string; reason: string }) {
    const { userId, schoolId, reason } = params;
    const policy = await this.policies.getActivePolicy(schoolId);
    const lockoutAttempts = policy?.lockout_attempts ?? 5;
    const lockoutDuration = policy?.lockout_duration_minutes ?? 30;

    await this.repo.upsert(userId, schoolId);
    const current = await this.repo.get(userId);
    const failed = (current?.failed_attempts ?? 0) + 1;

    failedLoginsTotal.inc({ school_id: schoolId, reason });

    if (failed >= lockoutAttempts) {
      const lockedUntil = new Date(Date.now() + lockoutDuration * 60000).toISOString();
      await this.repo.update(userId, { failed_attempts: failed, locked_until: lockedUntil, last_failed_attempt: new Date().toISOString() });
      accountLockoutsTotal.inc({ school_id: schoolId, reason });
      return { locked: true, lockedUntil, failedAttempts: failed };
    }

    await this.repo.update(userId, { failed_attempts: failed, locked_until: current?.locked_until ?? null, last_failed_attempt: new Date().toISOString() });
    return { locked: false, failedAttempts: failed };
  }

  async unlock(params: { userId: string }) {
    await this.repo.reset(params.userId);
    return { success:true };
  }
}
