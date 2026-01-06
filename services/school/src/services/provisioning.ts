import axios from "axios";
import { config } from "../config.js";
import { createSchool } from "../repositories/schoolRepo.js";
import type { EventBus } from "@madrasti/event-bus";

export type ProvisionSchoolDTO = {
  slug: string;
  name_ar: string;
  name_en?: string;
  school_type: string;
  subscription_plan?: string;
  admin_user: {
    email: string;
    password: string;
    first_name_ar?: string;
    last_name_ar?: string;
  };
};

export class SchoolProvisioningService {
  constructor(private eventBus: EventBus) {}

  async provision(dto: ProvisionSchoolDTO): Promise<{ school_id: string; admin_user_id: string }> {
    // 1) create school
    const school = await createSchool({
      slug: dto.slug,
      name_ar: dto.name_ar,
      name_en: dto.name_en ?? null,
      school_type: dto.school_type,
      subscription_plan: dto.subscription_plan ?? "basic",
    });

    // 2) create admin user in Auth (internal endpoint)
    const res = await axios.post(
      `${config.authServiceUrl}/internal/v1/users`,
      {
        school_id: school.id,
        email: dto.admin_user.email,
        password: dto.admin_user.password,
        role: "school_admin",
        first_name_ar: dto.admin_user.first_name_ar,
        last_name_ar: dto.admin_user.last_name_ar,
      },
      { headers: { "X-Service-Token": config.authServiceToken } }
    );

    const admin_user_id = res.data?.id as string;

    // 3) emit event
    await this.eventBus.publish("madrasti-events", {
      type: "school.provisioned",
      payload: { school_id: school.id, admin_user_id },
      timestamp: Date.now(),
    });

    return { school_id: school.id, admin_user_id };
  }
}
