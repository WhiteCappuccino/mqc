import * as bcrypt from "bcrypt";
import { PrismaClient, QualityRuleKind, Role } from "@prisma/client";
import {
  QUALITY_CRITERION_TEMPLATES,
  VIOLATION_DICTIONARY_TEMPLATES,
} from "../src/quality/quality-rule-templates";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      username: "admin",
      fullName: "System Administrator",
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  for (const criterion of QUALITY_CRITERION_TEMPLATES) {
    await prisma.qualityRule.upsert({
      where: { code: criterion.code },
      update: {
        kind: QualityRuleKind.CRITERION,
        name: criterion.name,
        description: criterion.description,
        weight: criterion.weight,
        defaultSeverity: null,
        isActive: true,
      },
      create: {
        ...criterion,
        kind: QualityRuleKind.CRITERION,
      },
    });
  }

  for (const violation of VIOLATION_DICTIONARY_TEMPLATES) {
    await prisma.qualityRule.upsert({
      where: { code: violation.code },
      update: {
        kind: QualityRuleKind.VIOLATION,
        name: violation.name,
        description: violation.description,
        weight: null,
        defaultSeverity: violation.defaultSeverity,
        isActive: true,
      },
      create: {
        ...violation,
        kind: QualityRuleKind.VIOLATION,
      },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "false_positive_threshold" },
    update: {},
    create: {
      key: "false_positive_threshold",
      value: "0.2",
      description: "Max acceptable false positive ratio",
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
