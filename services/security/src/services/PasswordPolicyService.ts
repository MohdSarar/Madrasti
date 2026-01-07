import { PasswordPolicyRepository } from "../repositories/PasswordPolicyRepository.js";
import { PasswordHistoryRepository } from "../repositories/PasswordHistoryRepository.js";

export class PasswordValidationError extends Error {
  readonly code = "PASSWORD_POLICY_VIOLATION";
  constructor(public readonly reasons: string[]) {
    super("Password does not satisfy policy");
  }
}

const COMMON = new Set(["password","password123","12345678","qwerty123","admin123","letmein","iloveyou","welcome"]);

export class PasswordPolicyService {
  constructor(
    private readonly policies = new PasswordPolicyRepository(),
    private readonly history = new PasswordHistoryRepository()
  ) {}

  async validatePassword(params: { password: string; schoolId: string; userId?: string }) {
    const { password, schoolId } = params;
    await this.policies.upsertDefaultIfMissing(schoolId);
    const policy = await this.policies.getActivePolicy(schoolId);
    if (!policy) throw new Error("No policy");

    const errors: string[] = [];
    if (password.length < policy.min_length) errors.push(`min_length:${policy.min_length}`);
    if (policy.require_uppercase && !/[A-Z]/.test(password)) errors.push("require_uppercase");
    if (policy.require_lowercase && !/[a-z]/.test(password)) errors.push("require_lowercase");
    if (policy.require_numbers && !/\d/.test(password)) errors.push("require_numbers");
    if (policy.require_special_chars && !/[!@#$%^&*(),.?":{}|<>\[\]\\/\-_=+;']/.test(password)) errors.push("require_special_chars");
    if (COMMON.has(password.toLowerCase())) errors.push("too_common");

    // history check is enforced by auth service; here we only expose prevent_reuse_count
    if (errors.length) throw new PasswordValidationError(errors);

    return { valid: true, policy: {
      min_length: policy.min_length,
      require_uppercase: policy.require_uppercase,
      require_lowercase: policy.require_lowercase,
      require_numbers: policy.require_numbers,
      require_special_chars: policy.require_special_chars,
      max_age_days: policy.max_age_days,
      prevent_reuse_count: policy.prevent_reuse_count
    }};
  }
}
